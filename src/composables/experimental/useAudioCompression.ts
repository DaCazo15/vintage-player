/**
 * EXPERIMENTAL: Este composable depende de un backend FastAPI externo 
 * que no está incluido en este repositorio. Actualmente no está conectado 
 * a ningún flujo de la UI principal.
 */
import { ref, computed } from 'vue'

export interface SongToCompress {
  id: number | string
  title: string
  artist: string
  file: File
}

export interface CompressedSong {
  id: number | string
  title: string
  artist: string
  compressedFile: Blob
  status: 'success' | 'error'
  errorMessage?: string
}

export type CompressionStatus = 'pending' | 'compressing' | 'success' | 'error'

export function useAudioCompression() {
  const isCompressing = ref(false)
  const totalSongs = ref(0)
  const completedSongs = ref(0)
  
  // Guardamos el estado de compresión de cada canción por su ID
  const compressionStatuses = ref<Record<string | number, CompressionStatus>>({})

  // URL base de FastAPI: Prioriza variable de entorno, luego localhost
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

  const progress = computed(() => {
    if (totalSongs.value === 0) return 0
    return Math.round((completedSongs.value / totalSongs.value) * 100)
  })

  /**
   * Comprime una sola canción enviándola al backend FastAPI.
   * Asume que el endpoint es POST /api/audio/compress y recibe un FormData
   */
  async function compressSingleSong(song: SongToCompress): Promise<CompressedSong> {
    compressionStatuses.value[song.id] = 'compressing'
    
    try {
      const formData = new FormData()
      formData.append('id', String(song.id))
      formData.append('name', song.title)
      formData.append('artist', song.artist)
      formData.append('file', song.file)

      const response = await fetch(`${API_BASE_URL}/api/audio/compress`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`)
      }

      // Verificamos si la respuesta es el blob directamente (audio) o un JSON con URL
      const contentType = response.headers.get('content-type') || ''
      let compressedBlob: Blob

      if (contentType.includes('application/json')) {
        const jsonResponse = await response.json()
        if (jsonResponse.status === 'error') {
          throw new Error(jsonResponse.errorMessage || 'Error en la compresión backend')
        }
        
        // Si devuelve una URL para descargar el archivo comprimido
        if (jsonResponse.compressed_url) {
          const fileResponse = await fetch(jsonResponse.compressed_url)
          if (!fileResponse.ok) throw new Error('No se pudo descargar el archivo comprimido desde la URL')
          compressedBlob = await fileResponse.blob()
        } else {
          throw new Error('Respuesta JSON del backend no incluye URL de descarga ni archivo')
        }
      } else {
        // Asumimos que la respuesta ES el binario de audio directamente
        compressedBlob = await response.blob()
      }

      compressionStatuses.value[song.id] = 'success'
      return {
        id: song.id,
        title: song.title,
        artist: song.artist,
        compressedFile: compressedBlob,
        status: 'success'
      }

    } catch (error: any) {
      console.error(`Error comprimiendo la canción ${song.title}:`, error)
      compressionStatuses.value[song.id] = 'error'
      return {
        id: song.id,
        title: song.title,
        artist: song.artist,
        // Usamos el archivo original como fallback si falla la compresión
        compressedFile: song.file,
        status: 'error',
        errorMessage: error.message || 'Error desconocido durante la compresión'
      }
    }
  }

  /**
   * Toma una lista de canciones y las comprime controlando la concurrencia.
   * @param songs Lista de canciones a comprimir
   * @param concurrency Máximo número de canciones a procesar al mismo tiempo
   */
  async function compressPlaylist(songs: SongToCompress[], concurrency: number = 2): Promise<CompressedSong[]> {
    isCompressing.value = true
    totalSongs.value = songs.length
    completedSongs.value = 0
    compressionStatuses.value = {}
    
    songs.forEach(s => compressionStatuses.value[s.id] = 'pending')

    const results: CompressedSong[] = []
    
    // Función auxiliar para procesar en chunks paralelos controlados
    const queue = [...songs]
    const workers = Array(concurrency).fill(null).map(async () => {
      while (queue.length > 0) {
        const song = queue.shift()!
        const result = await compressSingleSong(song)
        results.push(result)
        completedSongs.value++
      }
    })

    await Promise.all(workers)

    isCompressing.value = false
    
    // Ordenamos los resultados para mantener el orden original del array de entrada
    return results.sort((a, b) => {
      const idxA = songs.findIndex(s => s.id === a.id)
      const idxB = songs.findIndex(s => s.id === b.id)
      return idxA - idxB
    })
  }

  function resetCompressionState() {
    isCompressing.value = false
    totalSongs.value = 0
    completedSongs.value = 0
    compressionStatuses.value = {}
  }

  return {
    // Estado
    isCompressing,
    progress,
    totalSongs,
    completedSongs,
    compressionStatuses,
    
    // Métodos
    compressSingleSong,
    compressPlaylist,
    resetCompressionState
  }
}
