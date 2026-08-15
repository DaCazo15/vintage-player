import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { db, storage } from '@/firebase/config'
import type { Song, Playlist, Artist } from '@/firebase/config'
import { useAuthStore } from '@/stores/authStore'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore'
import {
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage'

export const useLibraryStore = defineStore('library', () => {
  const authStore = useAuthStore()

  // Reactive State
  const songs = ref<Song[]>([])
  const playlists = ref<Playlist[]>([])
  const artists = ref<Artist[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Real-time listener unsubscribe function holders
  let unsubscribeSongs: (() => void) | null = null
  let unsubscribePlaylists: (() => void) | null = null
  let unsubscribeArtists: (() => void) | null = null

  // Watch for auth changes to bind/unbind Firestore collection listener
  watch(
    () => authStore.user,
    (newUser) => {
      if (unsubscribeSongs) {
        unsubscribeSongs()
        unsubscribeSongs = null
      }
      if (unsubscribePlaylists) {
        unsubscribePlaylists()
        unsubscribePlaylists = null
      }
      if (unsubscribeArtists) {
        unsubscribeArtists()
        unsubscribeArtists = null
      }

      if (newUser) {
        loading.value = true
        
        // Listen to songs
        const qSongs = query(
          collection(db, 'users', newUser.uid, 'songs'),
          orderBy('createdAt', 'desc')
        )

        unsubscribeSongs = onSnapshot(
          qSongs,
          (snapshot) => {
            songs.value = snapshot.docs.map((docEl) => {
              const data = docEl.data()
              return {
                id: docEl.id,
                title: data.title,
                artist: data.artist,
                audioUrl: data.audioUrl,
                audioPath: data.audioPath,
                coverUrl: data.coverUrl,
                coverPath: data.coverPath,
                duration: data.duration,
                favorite: data.favorite,
                createdAt: data.createdAt
              } as Song
            })
            loading.value = false
          },
          (err) => {
            console.error('Firestore library listener error:', err)
            error.value = 'No se pudo sincronizar la biblioteca en tiempo real.'
            loading.value = false
          }
        )

        // Listen to playlists
        const qPlaylists = query(
          collection(db, 'users', newUser.uid, 'playlists'),
          orderBy('createdAt', 'desc')
        )

        unsubscribePlaylists = onSnapshot(
          qPlaylists,
          (snapshot) => {
            playlists.value = snapshot.docs.map((docEl) => {
              return {
                id: docEl.id,
                name: docEl.data().name || 'Lista sin nombre',
                songs: docEl.data().songs || [],
                createdAt: docEl.data().createdAt
              } as Playlist
            })
          },
          (err) => {
            console.error('Firestore playlists listener error:', err)
          }
        )

        // Listen to artists
        const qArtists = query(
          collection(db, 'users', newUser.uid, 'artists'),
          orderBy('createdAt', 'desc')
        )

        unsubscribeArtists = onSnapshot(
          qArtists,
          (snapshot) => {
            artists.value = snapshot.docs.map((docEl) => {
              return {
                id: docEl.id,
                name: docEl.data().name || 'Artista sin nombre',
                createdAt: docEl.data().createdAt
              } as Artist
            })
          },
          (err) => {
            console.error('Firestore artists listener error:', err)
          }
        )
      } else {
        songs.value = []
        playlists.value = []
        artists.value = []
        loading.value = false
        error.value = null
      }
    },
    { immediate: true }
  )

  // Actions
  async function addSong(
    audioFile: File,
    title: string,
    artist: string,
    coverFile: File | null,
    duration: number,
    onProgress?: (progress: number) => void
  ) {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Debe iniciar sesión para añadir canciones.')

    loading.value = true
    error.value = null

    try {
      // 1. Compresión de audio
      const { useAudioCompression } = await import('@/composables/useAudioCompression')
      const { compressSingleSong: doCompress } = useAudioCompression()
      
      let finalAudioFile: File | Blob = audioFile
      try {
        const compressed = await doCompress({
          id: Date.now().toString(),
          title,
          artist,
          file: audioFile
        })
        if (compressed.status === 'success') {
          finalAudioFile = compressed.compressedFile
        }
      } catch (err) {
        console.warn('Compression failed, using original file', err)
      }

      const audioPath = `users/${uid}/audio/${Date.now()}_${audioFile.name}`
      const audioFileRef = storageRef(storage, audioPath)
      const uploadTask = uploadBytesResumable(audioFileRef, finalAudioFile as File)

      const audioSnapshot = await new Promise<import('firebase/storage').UploadTaskSnapshot>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            if (onProgress) onProgress(progress)
          },
          reject,
          () => resolve(uploadTask.snapshot)
        )
      })

      const audioUrl = await getDownloadURL(audioSnapshot.ref)

      let coverUrl: string | null = null
      let coverPath: string | null = null
      if (coverFile) {
        coverPath = `users/${uid}/covers/${Date.now()}_${coverFile.name}`
        const coverFileRef = storageRef(storage, coverPath)
        const coverSnapshot = await uploadBytes(coverFileRef, coverFile)
        coverUrl = await getDownloadURL(coverSnapshot.ref)
      }

      await addDoc(collection(db, 'users', uid, 'songs'), {
        title,
        artist,
        audioUrl,
        audioPath,
        coverUrl,
        coverPath,
        duration,
        favorite: false,
        createdAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Error adding song to library:', err)
      error.value = 'Ocurrió un error al subir la canción.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteSong(songId: string) {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Debe iniciar sesión para eliminar canciones.')

    loading.value = true
    error.value = null

    try {
      const song = songs.value.find((s) => s.id === songId)
      if (song) {
        if (song.audioUrl) {
          try {
            const refToDelete = song.audioPath 
              ? storageRef(storage, song.audioPath)
              : storageRef(storage, song.audioUrl)
            await deleteObject(refToDelete)
          } catch (e: any) { 
            console.error('Error deleting audio from storage:', e)
            error.value = 'Aviso: No se pudo eliminar el archivo de audio del servidor.'
          }
        }
        if (song.coverUrl) {
          try {
            const refToDelete = song.coverPath 
              ? storageRef(storage, song.coverPath)
              : storageRef(storage, song.coverUrl)
            await deleteObject(refToDelete)
          } catch (e: any) { 
            console.error('Error deleting cover from storage:', e)
            error.value = 'Aviso: No se pudo eliminar la portada del servidor.'
          }
        }
      }
      await deleteDoc(doc(db, 'users', uid, 'songs', songId))
    } catch (err: any) {
      console.error('Error deleting song:', err)
      error.value = 'Ocurrió un error al eliminar la canción.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function toggleFavorite(songId: string) {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Debe iniciar sesión para marcar favoritos.')

    try {
      const songRef = doc(db, 'users', uid, 'songs', songId)
      const song = songs.value.find((s) => s.id === songId)
      if (song) {
        await updateDoc(songRef, { favorite: !song.favorite })
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
      throw err
    }
  }

  // Guarda una canción recibida por WebRTC en la biblioteca normal para persistirla.
  // NOTA: Como WebRTC no persiste el blob de audio en Storage automáticamente, 
  // establecemos audioUrl a '' y isPendingSync a true. Esto requiere que el usuario 
  // vuelva a subir el archivo de audio manualmente (o mediante un flujo de sincronización) 
  // si quiere reproducirlo en el futuro offline o en otros dispositivos.
  async function saveWebRTCSongToLibrary(songData: Partial<Song> & { title: string; artist: string }) {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Debe iniciar sesión para guardar canciones temporales.')

    try {
      await addDoc(collection(db, 'users', uid, 'songs'), {
        title: songData.title || 'Desconocido',
        artist: songData.artist || 'Desconocido',
        audioUrl: '',
        audioPath: '',
        coverUrl: songData.coverUrl || null,
        coverPath: '',
        duration: songData.duration || 0,
        favorite: true,
        isPendingSync: true,
        createdAt: serverTimestamp()
      })
    } catch (err) {
      console.error('Error saving WebRTC song to library:', err)
      throw err
    }
  }

  // Create a new playlist
  async function createPlaylist(name: string) {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Debe iniciar sesión para crear una lista.')

    const newPlaylist = {
      name,
      songs: [],
      createdAt: serverTimestamp()
    }
    await addDoc(collection(db, 'users', uid, 'playlists'), newPlaylist)
  }

  async function createArtist(name: string) {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Debe iniciar sesión para crear un artista.')

    const newArtist = {
      name,
      createdAt: serverTimestamp()
    }
    await addDoc(collection(db, 'users', uid, 'artists'), newArtist)
  }

  async function deletePlaylist(playlistId: string) {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Debe iniciar sesión.')
    try {
      const playlistRef = doc(db, 'users', uid, 'playlists', playlistId)
      await deleteDoc(playlistRef)
    } catch (err) {
      console.error('Error deleting playlist:', err)
      throw err
    }
  }

  async function renamePlaylist(playlistId: string, newName: string) {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Debe iniciar sesión.')
    try {
      const playlistRef = doc(db, 'users', uid, 'playlists', playlistId)
      await updateDoc(playlistRef, { name: newName })
    } catch (err) {
      console.error('Error renaming playlist:', err)
      throw err
    }
  }

  // Add song to playlist
  async function addSongToPlaylist(playlistId: string, songData: Partial<Song> & { title: string; artist: string }) {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Debe iniciar sesión.')

    try {
      const playlistRef = doc(db, 'users', uid, 'playlists', playlistId)
      await updateDoc(playlistRef, {
        songs: arrayUnion({
          title: songData.title,
          artist: songData.artist,
          originalId: songData.id || null,
          addedAt: Date.now()
        })
      })
    } catch (err) {
      console.error('Error adding to playlist:', err)
      throw err
    }
  }

  async function removeSongFromPlaylist(playlistId: string, songOriginalId: string) {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Debe iniciar sesión.')
    try {
      const playlist = playlists.value.find(p => p.id === playlistId)
      if (!playlist) return
      
      const updatedSongs = playlist.songs.filter(s => s.originalId !== songOriginalId)
      
      const playlistRef = doc(db, 'users', uid, 'playlists', playlistId)
      await updateDoc(playlistRef, { songs: updatedSongs })
    } catch (err) {
      console.error('Error removing song from playlist:', err)
      throw err
    }
  }

  return {
    songs,
    playlists,
    artists,
    loading,
    error,
    addSong,
    deleteSong,
    toggleFavorite,
    saveWebRTCSongToLibrary,
    createPlaylist,
    createArtist,
    deletePlaylist,
    renamePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist
  }
})
