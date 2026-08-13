import { ref } from 'vue'

export function useAudioMetadata() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Reads the duration of an audio file in seconds.
   * @param file The audio File object
   * @returns A promise resolving to the duration in seconds
   */
  const getDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      loading.value = true
      error.value = null

      const objectUrl = URL.createObjectURL(file)
      const audio = new Audio(objectUrl)

      audio.addEventListener('loadedmetadata', () => {
        loading.value = false
        resolve(audio.duration)
        URL.revokeObjectURL(objectUrl)
      })

      audio.addEventListener('error', (err) => {
        loading.value = false
        error.value = 'No se pudo leer la duración del archivo de audio.'
        reject(err)
        URL.revokeObjectURL(objectUrl)
      })
    })
  }

  return {
    loading,
    error,
    getDuration
  }
}
