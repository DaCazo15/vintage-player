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
  deleteDoc,
  updateDoc,
  serverTimestamp
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
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Real-time listener unsubscribe function holder
  let unsubscribe: (() => void) | null = null

  // Watch for auth changes to bind/unbind Firestore collection listener
  watch(
    () => authStore.user,
    (newUser) => {
      // Always unsubscribe from previous listeners on change
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }

      if (newUser) {
        loading.value = true
        const q = query(
          collection(db, 'users', newUser.uid, 'songs'),
          orderBy('createdAt', 'desc')
        )

        unsubscribe = onSnapshot(
          q,
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
      } else {
        // Clear songs list upon logout
        songs.value = []
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
    if (!uid) {
      throw new Error('Debe iniciar sesión para añadir canciones.')
    }

    loading.value = true
    error.value = null

    try {
      // 1. Upload audio file to Storage using uploadBytesResumable
      const audioPath = `users/${uid}/audio/${Date.now()}_${audioFile.name}`
      const audioFileRef = storageRef(storage, audioPath)

      const uploadTask = uploadBytesResumable(audioFileRef, audioFile)

      const audioSnapshot = await new Promise<any>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            if (onProgress) {
              onProgress(progress)
            }
          },
          (err) => {
            reject(err)
          },
          () => {
            resolve(uploadTask.snapshot)
          }
        )
      })

      const audioUrl = await getDownloadURL(audioSnapshot.ref)

      // 2. Upload cover art file to Storage if provided
      let coverUrl: string | null = null
      if (coverFile) {
        const coverPath = `users/${uid}/covers/${Date.now()}_${coverFile.name}`
        const coverFileRef = storageRef(storage, coverPath)
        const coverSnapshot = await uploadBytes(coverFileRef, coverFile)
        coverUrl = await getDownloadURL(coverSnapshot.ref)
      }

      // 3. Save song metadata to Firestore under user path
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
      error.value = 'Ocurrió un error al subir la canción a la biblioteca.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteSong(songId: string) {
    const uid = authStore.user?.uid
    if (!uid) {
      throw new Error('Debe iniciar sesión para eliminar canciones.')
    }

    loading.value = true
    error.value = null

    try {
      // 1. Retrieve the local song properties to delete associated Storage files
      const song = songs.value.find((s) => s.id === songId)
      if (song) {
        // Delete audio from Storage
        if (song.audioUrl) {
          try {
            const audioFileRef = storageRef(storage, song.audioUrl)
            await deleteObject(audioFileRef)
          } catch (e) {
            console.warn('Could not delete audio file from Storage:', e)
          }
        }

        // Delete cover from Storage
        if (song.coverUrl) {
          try {
            const coverFileRef = storageRef(storage, song.coverUrl)
            await deleteObject(coverFileRef)
          } catch (e) {
            console.warn('Could not delete cover file from Storage:', e)
          }
        }
      }

      // 2. Delete Firestore metadata record
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
    if (!uid) {
      throw new Error('Debe iniciar sesión para marcar favoritos.')
    }

    const song = songs.value.find((s) => s.id === songId)
    if (!song) return

    try {
      const songRef = doc(db, 'users', uid, 'songs', songId)
      await updateDoc(songRef, {
        favorite: !song.favorite
      })
    } catch (err) {
      console.error('Error toggling favorite:', err)
      error.value = 'No se pudo actualizar el estado de favorito.'
      throw err
    }
  }

  return {
    songs,
    loading,
    error,
    addSong,
    deleteSong,
    toggleFavorite
  }
})
