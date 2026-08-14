import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Song } from '@/firebase/config'

export const usePlayerStore = defineStore('player', () => {
  // HTMLAudioElement Singleton
  const audio = new Audio()

  // Reactive State
  const currentSong = ref<Song | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(Number(localStorage.getItem('vintage-volume') ?? '1.0'))
  const playlist = ref<Song[]>([])

  // Initialize audio volume
  audio.volume = volume.value

  // Bind Audio Listeners once
  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime
  })

  audio.addEventListener('loadedmetadata', () => {
    duration.value = audio.duration
  })

  audio.addEventListener('ended', () => {
    nextTrack()
  })

  audio.addEventListener('play', () => {
    isPlaying.value = true
  })

  audio.addEventListener('pause', () => {
    isPlaying.value = false
  })

  // Sync volume state to localStorage
  watch(volume, (newVol) => {
    audio.volume = newVol
    localStorage.setItem('vintage-volume', String(newVol))
  })

  // Actions
  function updateMediaSession() {
    if ('mediaSession' in navigator && currentSong.value) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.value.title,
        artist: currentSong.value.artist,
        album: 'Vintage Player',
        artwork: currentSong.value.coverUrl ? [
          { src: currentSong.value.coverUrl, sizes: '512x512' }
        ] : []
      })

      navigator.mediaSession.setActionHandler('play', play)
      navigator.mediaSession.setActionHandler('pause', pause)
      navigator.mediaSession.setActionHandler('previoustrack', prevTrack)
      navigator.mediaSession.setActionHandler('nexttrack', nextTrack)
    }
  }

  function loadSong(song: Song, customPlaylist?: Song[]) {
    if (customPlaylist) {
      playlist.value = customPlaylist.sort(() => Math.random() - 0.5) //orden aleatorioz
    }

    currentSong.value = song
    audio.src = song.audioUrl
    currentTime.value = 0
    duration.value = song.duration // Use Firestore duration as initial fallback

    updateMediaSession()
    play()
  }

  function updateAudioSrc(url: string) {
    if (currentSong.value) {
      currentSong.value.audioUrl = url
    }
    const wasPlaying = isPlaying.value
    audio.src = url
    if (wasPlaying) {
      audio.play().catch(err => console.error('Play after update failed:', err))
    }
  }

  function play() {
    if (!currentSong.value && playlist.value.length > 0) {
      loadSong(playlist.value[0])
      return
    }
    if (!currentSong.value) return

    if (!currentSong.value.audioUrl) {
      // Si aún no hay URL de audio (descargando), marcamos como "reproduciendo" 
      // para que updateAudioSrc lo inicie automáticamente cuando termine.
      isPlaying.value = true
      return
    }

    audio.play().then(() => {
      isPlaying.value = true
    }).catch((err) => {
      console.error('Audio playback failed:', err)
      isPlaying.value = false
    })
  }

  function pause() {
    audio.pause()
    isPlaying.value = false
  }

  function stop() {
    audio.pause()
    audio.currentTime = 0
    isPlaying.value = false
    currentSong.value = null
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null
    }
  }

  function togglePlay() {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  function seek(time: number) {
    if (!currentSong.value) return
    audio.currentTime = time
    currentTime.value = time
  }

  function setVolume(value: number) {
    // Clamp volume between 0.0 and 1.0
    const clamped = Math.max(0, Math.min(1, value))
    volume.value = clamped
  }

  function nextTrack() {
    if (playlist.value.length === 0) return
    if (!currentSong.value) {
      loadSong(playlist.value[0])
      return
    }

    const currentIndex = playlist.value.findIndex((s) => s.id === currentSong.value?.id)
    if (currentIndex !== -1 && currentIndex < playlist.value.length - 1) {
      loadSong(playlist.value[currentIndex + 1])
    } else {
      // Loop back to the first song
      loadSong(playlist.value[0])
    }
  }

  function prevTrack() {
    if (playlist.value.length === 0) return
    if (!currentSong.value) {
      loadSong(playlist.value[0])
      return
    }

    // If more than 3 seconds has elapsed, restart the current track
    if (audio.currentTime > 3) {
      seek(0)
      return
    }

    const currentIndex = playlist.value.findIndex((s) => s.id === currentSong.value?.id)
    if (currentIndex > 0) {
      loadSong(playlist.value[currentIndex - 1])
    } else {
      // Loop back to the last song
      loadSong(playlist.value[playlist.value.length - 1])
    }
  }

  return {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    playlist,
    loadSong,
    updateAudioSrc,
    play,
    pause,
    stop,
    togglePlay,
    seek,
    setVolume,
    nextTrack,
    prevTrack
  }
})
