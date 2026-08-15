/**
 * EXPERIMENTAL: Este composable depende de un backend FastAPI externo 
 */
import { ref, computed } from 'vue'

export interface CompressionRequestMetadata {
  id: string | number;
  nombre: string;
  formato_origen: string;
}

export interface CompressionResponse {
  id: string | number;
  nombre: string;
  url_descarga?: string;
  estado: 'exito' | 'error';
  mensaje?: string;
}

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
  responseJson?: CompressionResponse
}

export type CompressionStatus = 'pending' | 'compressing' | 'success' | 'error'

export function useAudioCompression() {
  const isCompressing = ref(false)
  const totalSongs = ref(0)
  const completedSongs = ref(0)
  
  const compressionStatuses = ref<Record<string | number, CompressionStatus>>({})

  // URL base de FastAPI: Prioriza variable de entorno, luego localhost
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

  const progress = computed(() => {
    if (totalSongs.value === 0) return 0
    return Math.round((completedSongs.value / totalSongs.value) * 100)
  })

  async function compressSingleSong(song: SongToCompress): Promise<CompressedSong> {
    compressionStatuses.value[song.id] = 'compressing'
    
    try {
      const formData = new FormData()
      
      const metadata: CompressionRequestMetadata = {
        id: song.id,
        nombre: song.title,
        formato_origen: song.file.type || 'audio/mpeg'
      }
      
      formData.append('metadata', JSON.stringify(metadata))
      formData.append('file', song.file)

      const response = await fetch(`${API_BASE_URL}/api/audio/compress`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type') || ''
      let compressedBlob: Blob
      let responseJson: CompressionResponse | undefined

      if (contentType.includes('application/json')) {
        responseJson = await response.json()
        if (responseJson?.estado === 'error') {
          throw new Error(responseJson.mensaje || 'Error en la compresión backend')
        }
        
        if (responseJson?.url_descarga) {
          const fileResponse = await fetch(responseJson.url_descarga)
          if (!fileResponse.ok) throw new Error('No se pudo descargar el archivo comprimido desde la URL')
          compressedBlob = await fileResponse.blob()
        } else {
          throw new Error('Respuesta JSON del backend no incluye URL de descarga')
        }
      } else {
        compressedBlob = await response.blob()
        responseJson = {
          id: song.id,
          nombre: song.title,
          estado: 'exito'
        }
      }

      compressionStatuses.value[song.id] = 'success'
      return {
        id: song.id,
        title: song.title,
        artist: song.artist,
        compressedFile: compressedBlob,
        status: 'success',
        responseJson
      }

    } catch (error: any) {
      console.error(`Error comprimiendo la canción ${song.title}:`, error)
      compressionStatuses.value[song.id] = 'error'
      return {
        id: song.id,
        title: song.title,
        artist: song.artist,
        compressedFile: song.file,
        status: 'error',
        errorMessage: error.message || 'Error desconocido durante la compresión',
        responseJson: {
          id: song.id,
          nombre: song.title,
          estado: 'error',
          mensaje: error.message || 'Error desconocido'
        }
      }
    }
  }

  async function compressPlaylist(songs: SongToCompress[], concurrency: number = 2): Promise<CompressedSong[]> {
    isCompressing.value = true
    totalSongs.value = songs.length
    completedSongs.value = 0
    compressionStatuses.value = {}
    
    songs.forEach(s => compressionStatuses.value[s.id] = 'pending')

    const results: CompressedSong[] = []
    
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
    isCompressing,
    progress,
    totalSongs,
    completedSongs,
    compressionStatuses,
    compressSingleSong,
    compressPlaylist,
    resetCompressionState
  }
}
