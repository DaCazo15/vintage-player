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
  
  const originalPlaylist = ref<Song[]>([])
  const playlist = ref<Song[]>([])
  const isShuffleEnabled = ref(false)
  const repeatMode = ref<'off' | 'all' | 'one'>('off')

  // Web Audio API State
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let source: MediaElementAudioSourceNode | null = null
  const frequencyData = new Uint8Array(32) // fftSize 64 means 32 bins

  function initAudioContext() {
    if (audioContext) return
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    audioContext = new AudioContextClass()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 64
    source = audioContext.createMediaElementSource(audio)
    source.connect(analyser)
    analyser.connect(audioContext.destination)
  }

  function getFrequencyData() {
    if (analyser) {
      analyser.getByteFrequencyData(frequencyData)
    } else {
      frequencyData.fill(0)
    }
    return frequencyData
  }

  function shuffleArray(array: any[]) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

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
      originalPlaylist.value = [...customPlaylist]
      if (isShuffleEnabled.value) {
        playlist.value = shuffleArray(customPlaylist)
      } else {
        playlist.value = [...customPlaylist]
      }
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
    initAudioContext()
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume()
    }

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

  function toggleShuffle() {
    isShuffleEnabled.value = !isShuffleEnabled.value
    if (isShuffleEnabled.value) {
      let shuffled = shuffleArray(originalPlaylist.value)
      if (currentSong.value) {
        shuffled = shuffled.filter(s => s.id !== currentSong.value?.id)
        shuffled.unshift(currentSong.value)
      }
      playlist.value = shuffled
    } else {
      playlist.value = [...originalPlaylist.value]
    }
  }

  function toggleRepeat() {
    if (repeatMode.value === 'off') {
      repeatMode.value = 'all'
    } else if (repeatMode.value === 'all') {
      repeatMode.value = 'one'
    } else {
      repeatMode.value = 'off'
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

    if (repeatMode.value === 'one') {
      seek(0)
      play()
      return
    }

    const currentIndex = playlist.value.findIndex((s) => s.id === currentSong.value?.id)
    if (currentIndex !== -1 && currentIndex < playlist.value.length - 1) {
      loadSong(playlist.value[currentIndex + 1], playlist.value)
    } else {
      // At the end of the playlist
      if (repeatMode.value === 'all') {
        loadSong(playlist.value[0], playlist.value)
      } else {
        // repeatMode === 'off'
        stop()
      }
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
      loadSong(playlist.value[currentIndex - 1], playlist.value) // pass current playlist to prevent reset
    } else {
      if (repeatMode.value === 'all') {
        loadSong(playlist.value[playlist.value.length - 1], playlist.value)
      } else {
        seek(0)
      }
    }
  }

  function playFromQueue(index: number) {
    if (index >= 0 && index < playlist.value.length) {
      const song = playlist.value[index]
      currentSong.value = song
      audio.src = song.audioUrl
      currentTime.value = 0
      duration.value = song.duration
      updateMediaSession()
      play()
    }
  }

  function removeFromQueue(index: number) {
    if (index >= 0 && index < playlist.value.length) {
      playlist.value.splice(index, 1)
    }
  }

  function reorderQueue(fromIndex: number, toIndex: number) {
    if (fromIndex >= 0 && fromIndex < playlist.value.length && toIndex >= 0 && toIndex < playlist.value.length) {
      const item = playlist.value.splice(fromIndex, 1)[0]
      playlist.value.splice(toIndex, 0, item)
    }
  }

  return {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    playlist,
    isShuffleEnabled,
    repeatMode,
    loadSong,
    updateAudioSrc,
    play,
    pause,
    stop,
    togglePlay,
    toggleShuffle,
    toggleRepeat,
    seek,
    setVolume,
    nextTrack,
    prevTrack,
    playFromQueue,
    removeFromQueue,
    reorderQueue,
    getFrequencyData
  }
})
