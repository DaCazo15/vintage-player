import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { db, storage } from '@/firebase/config'
import type { Song } from '@/firebase/config'
import { useAuthStore } from '@/stores/authStore'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  setDoc,
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

export interface Playlist {
  id: string
  songs: any[]
  createdAt: any
}

export const useLibraryStore = defineStore('library', () => {
  const authStore = useAuthStore()

  // Reactive State
  const songs = ref<Song[]>([])
  const playlists = ref<Playlist[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Real-time listener unsubscribe function holders
  let unsubscribeSongs: (() => void) | null = null
  let unsubscribePlaylists: (() => void) | null = null

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
                coverUrl: data.coverUrl,
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
                songs: docEl.data().songs || [],
                createdAt: docEl.data().createdAt
              } as Playlist
            })
          },
          (err) => {
            console.error('Firestore playlists listener error:', err)
          }
        )
      } else {
        songs.value = []
        playlists.value = []
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
      const audioPath = `users/${uid}/audio/${Date.now()}_${audioFile.name}`
      const audioFileRef = storageRef(storage, audioPath)
      const uploadTask = uploadBytesResumable(audioFileRef, audioFile)

      const audioSnapshot = await new Promise<any>((resolve, reject) => {
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
      if (coverFile) {
        const coverPath = `users/${uid}/covers/${Date.now()}_${coverFile.name}`
        const coverFileRef = storageRef(storage, coverPath)
        const coverSnapshot = await uploadBytes(coverFileRef, coverFile)
        coverUrl = await getDownloadURL(coverSnapshot.ref)
      }

      await addDoc(collection(db, 'users', uid, 'songs'), {
        title,
        artist,
        audioUrl,
        coverUrl,
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
            await deleteObject(storageRef(storage, song.audioUrl))
          } catch (e) { }
        }
        if (song.coverUrl) {
          try {
            await deleteObject(storageRef(storage, song.coverUrl))
          } catch (e) { }
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

  // Add a song metadata to favorites collection (works for WebRTC temporary songs too)
  async function addToFavorites(songData: any) {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Debe iniciar sesión para marcar favoritos.')

    try {
      await addDoc(collection(db, 'users', uid, 'favoritos'), {
        title: songData.title,
        artist: songData.artist,
        originalId: songData.id || null,
        createdAt: serverTimestamp()
      })
    } catch (err) {
      console.error('Error toggling favorite:', err)
      throw err
    }
  }

  // Create a new playlist
  async function createPlaylist(name: string) {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Debe iniciar sesión para crear listas.')

    try {
      const playlistRef = doc(db, 'users', uid, 'playlists', name)
      await setDoc(playlistRef, {
        songs: [],
        createdAt: serverTimestamp()
      })
    } catch (err) {
      console.error('Error creating playlist:', err)
      throw err
    }
  }

  // Add song to playlist
  async function addSongToPlaylist(playlistName: string, songData: any) {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Debe iniciar sesión.')

    try {
      const playlistRef = doc(db, 'users', uid, 'playlists', playlistName)
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

  return {
    songs,
    playlists,
    loading,
    error,
    addSong,
    deleteSong,
    toggleFavorite,
    addToFavorites,
    createPlaylist,
    addSongToPlaylist
  }
})
