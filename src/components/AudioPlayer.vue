<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePlayerStore } from '@/stores/playerStore'
import { gsap } from 'gsap'
import { animate } from 'animejs'
import { MorphIcon } from 'morphicons/vue'
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Heart, Plus, Shuffle, Repeat, Repeat1, ListMusic, HelpCircle } from 'lucide'
import { usePlatform } from '@/composables/usePlatform'
import { useDpadNavigation } from '@/composables/useDpadNavigation'
import { useLibraryStore } from '@/stores/libraryStore'
import PlaylistModal from './PlaylistModal.vue'
import QueuePanel from './QueuePanel.vue'
import AudioVisualizer from '@/components/AudioVisualizer.vue'
import { globalDownloadProgress } from '@/composables/useRetroCast'
import { useTutorials } from '@/composables/useTutorials'

const { isTV } = usePlatform()
const { startPlayerTutorial } = useTutorials()
const { handleDpadKeyDown } = useDpadNavigation()

const onButtonKeyDown = (e: KeyboardEvent) => {
  if (!isTV.value) return
  
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    handleDpadKeyDown(e)
  }
}

const playerStore = usePlayerStore()
const libraryStore = useLibraryStore()

const isPlaylistModalOpen = ref(false)
const isQueuePanelOpen = ref(false)
const isLiking = ref(false)

const handleLike = async () => {
  if (!playerStore.currentSong) return
  isLiking.value = true
  try {
    const songId = playerStore.currentSong.id;
    if (songId && songId.startsWith('webrtc-')) {
       await libraryStore.saveWebRTCSongToLibrary(playerStore.currentSong)
       playerStore.currentSong.favorite = true
    } else if (songId) {
       await libraryStore.toggleFavorite(songId)
    }
  } catch(e) {
    console.error(e)
  }
  isLiking.value = false
}

const playBtn = ref<HTMLElement | null>(null)
const prevBtn = ref<HTMLElement | null>(null)
const nextBtn = ref<HTMLElement | null>(null)

// Mute toggle storage helper
const preMuteVolume = ref(0.8)

// Format seconds into mm:ss
const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds === Infinity) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Calculate the percentage of the progress bar filled
const progressPercentage = computed(() => {
  if (!playerStore.duration) return 0
  return (playerStore.currentTime / playerStore.duration) * 100
})

// Calculate the percentage of the download buffer filled
const currentDownloadPercentage = computed(() => {
  const song = playerStore.currentSong
  if (!song || !song.id) return 0
  if (song.id.toString().startsWith('webrtc-')) {
    const idx = parseInt(song.id.toString().split('-')[1])
    const p = globalDownloadProgress.value[idx]
    if (p !== undefined) return p
    // If it's not currently downloading but exists in the store with an audioUrl, it's likely finished
    if (song.audioUrl) return 100
    return 0
  }
  return 100
})

// Calculate the percentage of the volume bar filled
const volumePercentage = computed(() => {
  return playerStore.volume * 100
})

// Progress seek action
const handleSeek = (e: Event) => {
  const target = e.target as HTMLInputElement
  playerStore.seek(Number(target.value))
}

// Volume adjust action
const handleVolumeChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  playerStore.setVolume(Number(target.value))
}

// Mute / Unmute toggle action
const toggleMute = () => {
  if (playerStore.volume > 0) {
    preMuteVolume.value = playerStore.volume
    playerStore.setVolume(0)
  } else {
    playerStore.setVolume(preMuteVolume.value)
  }
}

// GSAP Transition events
const onPlayerEnter = (el: Element) => {
  gsap.fromTo(
    el,
    {
      y: '100%',
      opacity: 0
    },
    {
      y: '0%',
      opacity: 1,
      duration: 0.5,
      ease: 'power3.out'
    }
  )
}

const onPlayerLeave = (el: Element) => {
  gsap.to(el, {
    y: '100%',
    opacity: 0,
    duration: 0.4,
    ease: 'power3.in'
  })
}

// anime.js button micro-interactions
const handlePlayClick = () => {
  if (playBtn.value) {
    animate(playBtn.value, {
      keyframes: [
        { scale: 0.9, duration: 80 },
        { scale: 1.15, duration: 120 },
        { scale: 1.0, duration: 100 }
      ],
      ease: 'inOutQuad'
    })
  }
  playerStore.togglePlay()
}

const handlePrevClick = () => {
  const btn = prevBtn.value
  if (btn) {
    animate(btn, {
      scale: 0.88,
      duration: 100,
      complete: () => {
        animate(btn, { scale: 1.0, duration: 100, ease: 'outQuad' })
      }
    })
  }
  playerStore.prevTrack()
}

const handleNextClick = () => {
  const btn = nextBtn.value
  if (btn) {
    animate(btn, {
      scale: 0.88,
      duration: 100,
      complete: () => {
        animate(btn, { scale: 1.0, duration: 100, ease: 'outQuad' })
      }
    })
  }
  playerStore.nextTrack()
}
</script>

<template>
  <transition
    name="player-slide"
    @enter="onPlayerEnter"
    @leave="onPlayerLeave"
    :css="false"
  >
    <div
      v-if="playerStore.currentSong"
      class="fixed bottom-0 left-0 right-0 h-24 bg-paper border-t-4 border-coffee shadow-[0_-8px_24px_rgba(92,61,46,0.15)] px-6 flex items-center justify-between z-50 select-none"
    >
      <!-- Left Column: Cover Thumbnail & Song Meta -->
      <div class="flex items-center gap-3 min-w-0 flex-1 sm:max-w-xs">
        <div class="w-12 h-12 rounded-lg border-2 border-coffee shrink-0 relative overflow-hidden bg-cream flex items-center justify-center shadow-sm">
          <img
            v-if="playerStore.currentSong.coverUrl"
            :src="playerStore.currentSong.coverUrl"
            alt="Track cover"
            class="w-full h-full object-cover"
          />
          <!-- Mini cassette placeholder -->
          <div v-else class="w-full h-full p-1.5 flex flex-col justify-between bg-cream/50 relative">
            <div class="h-3 bg-coffee/20 rounded border border-coffee/40 flex justify-between px-1 items-center">
              <div class="w-1.5 h-1.5 rounded-full border border-coffee/60 bg-paper"></div>
              <div class="w-1.5 h-1.5 rounded-full border border-coffee/60 bg-paper"></div>
            </div>
            <div class="h-0.5 w-6 bg-coffee/30 mx-auto rounded"></div>
          </div>
        </div>

        <div class="min-w-0 flex flex-col justify-center">
          <div class="flex items-center gap-2">
            <h4 class="font-pixelify text-sm font-bold text-petrol truncate uppercase leading-tight">
              {{ playerStore.currentSong.title }}
            </h4>
            <AudioVisualizer class="hidden sm:block" :width="20" :height="14" :bar-count="5" :gap="2" bar-color="var(--color-petrol)" />
          </div>
          <p class="font-roboto text-xs text-coffee truncate mt-0.5 mb-1">
            {{ playerStore.currentSong.artist }}
          </p>
        </div>
      </div>

      <!-- Center Column: Core controls & seeker progress bar -->
      <div class="flex flex-col items-center gap-1.5 flex-1 max-w-xl px-4">
        <!-- Control buttons -->
        <div class="flex items-center gap-4">
          <!-- Shuffle button -->
          <button
            type="button"
            @click="playerStore.toggleShuffle"
            class="w-8 h-8 rounded-full border border-coffee flex items-center justify-center cursor-pointer transition-colors focus:outline-none"
            :class="playerStore.isShuffleEnabled ? 'bg-mustard hover:bg-terracotta text-cream' : 'bg-cream hover:bg-paper text-petrol'"
            aria-label="Modo aleatorio"
            title="Aleatorio"
          >
            <MorphIcon :icon="Shuffle" size="14" color="currentColor" stroke-width="2.5" />
          </button>

          <!-- Prev button -->
          <button
            ref="prevBtn"
            type="button"
            @click="handlePrevClick"
            @keydown="onButtonKeyDown"
            class="w-8 h-8 rounded-full border border-coffee flex items-center justify-center bg-cream hover:bg-paper text-petrol cursor-pointer transition-colors focus:outline-none"
            aria-label="Canción anterior"
            title="Anterior"
          >
            <MorphIcon :icon="SkipBack" size="14" color="currentColor" stroke-width="2.5" />
          </button>

          <!-- Play / Pause central button -->
          <button
            ref="playBtn"
            type="button"
            @click="handlePlayClick"
            @keydown="onButtonKeyDown"
            class="w-11 h-11 rounded-full border-2 border-coffee flex items-center justify-center bg-mustard hover:bg-terracotta text-cream cursor-pointer transition-colors focus:outline-none"
            :aria-label="playerStore.isPlaying ? 'Pausar reproducción' : 'Iniciar reproducción'"
            title="Reproducir / Pausar"
          >
            <MorphIcon 
              :icon="playerStore.isPlaying ? Pause : Play" 
              size="20" 
              color="currentColor"
              stroke-width="2.5"
            />
          </button>

          <!-- Next button -->
          <button
            ref="nextBtn"
            type="button"
            @click="handleNextClick"
            @keydown="onButtonKeyDown"
            class="w-8 h-8 rounded-full border border-coffee flex items-center justify-center bg-cream hover:bg-paper text-petrol cursor-pointer transition-colors focus:outline-none"
            aria-label="Siguiente canción"
            title="Siguiente"
          >
            <MorphIcon :icon="SkipForward" size="14" color="currentColor" stroke-width="2.5" />
          </button>

          <!-- Repeat button -->
          <button
            type="button"
            @click="playerStore.toggleRepeat"
            class="w-8 h-8 rounded-full border border-coffee flex items-center justify-center cursor-pointer transition-colors focus:outline-none"
            :class="playerStore.repeatMode !== 'off' ? 'bg-mustard hover:bg-terracotta text-cream' : 'bg-cream hover:bg-paper text-petrol'"
            aria-label="Modo repetición"
            title="Repetir"
          >
            <MorphIcon :icon="playerStore.repeatMode === 'one' ? Repeat1 : Repeat" size="14" color="currentColor" stroke-width="2.5" />
          </button>


        </div>

        <!-- Seeker progress bar -->
        <div class="w-full flex items-center gap-3">
          <span class="font-roboto text-[10px] text-coffee/80 font-bold w-8 text-right select-none">
            {{ formatTime(playerStore.currentTime) }}
          </span>

          <div class="relative w-full h-2 flex items-center">
            <div class="absolute inset-0 bg-coffee/15 rounded-full overflow-hidden border border-coffee pointer-events-none">
              <div class="h-full bg-coffee/30 transition-all duration-200" :style="{ width: currentDownloadPercentage + '%' }"></div>
            </div>
            <input
              type="range"
              min="0"
              :max="playerStore.duration || 1"
              :value="playerStore.currentTime"
              @input="handleSeek"
              @keydown="onButtonKeyDown"
              class="progress-slider w-full h-2 rounded-full appearance-none cursor-pointer outline-none focus:outline-none relative z-10 bg-transparent"
              :style="{
                background: `linear-gradient(to right, var(--color-mustard) ${progressPercentage}%, transparent ${progressPercentage}%)`
              }"
            />
          </div>

          <span class="font-roboto text-[10px] text-coffee/80 font-bold w-8 text-left select-none">
            {{ formatTime(playerStore.duration) }}
          </span>
        </div>
      </div>

      <!-- Right Column: Volume Control & Extra Actions -->
      <div class="hidden sm:flex items-center gap-4 shrink-0 sm:max-w-xs justify-end flex-1 sm:flex-initial">
        <!-- Extra Actions -->
        <div class="flex items-center gap-3 mr-2">
          <!-- Favorite button -->
          <button 
            @click="handleLike" 
            :disabled="isLiking" 
            class="flex text-terracotta hover:scale-110 transition-transform"
            aria-label="Añadir a favoritos"
            title="Añadir a Favoritos"
          >
            <MorphIcon :icon="Heart" size="20" :fill="playerStore.currentSong.favorite ? 'currentColor' : 'none'" stroke-width="2.5" />
          </button>

          <!-- Playlist button -->
          <button 
            @click="isPlaylistModalOpen = true" 
            class="flex text-coffee hover:text-mustard hover:scale-110 transition-transform"
            aria-label="Ver playlist"
            title="Añadir a Lista de Reproducción"
          >
            <MorphIcon :icon="Plus" size="22" stroke-width="2.5" />
          </button>

          <!-- Queue button -->
          <button 
            @click="isQueuePanelOpen = true" 
            class="flex text-coffee hover:text-petrol hover:scale-110 transition-transform"
            aria-label="Ver cola de reproducción"
            title="Cola de Reproducción"
          >
            <MorphIcon :icon="ListMusic" size="20" stroke-width="2.5" />
          </button>
          <!-- Tutorial button -->
          <button 
            @click="startPlayerTutorial" 
            class="flex text-coffee hover:text-mustard hover:scale-110 transition-transform"
            aria-label="Ver tutorial"
            title="Ayuda / Tutorial"
          >
            <MorphIcon :icon="HelpCircle" size="20" stroke-width="2.5" />
          </button>
        </div>
        
        <button
          type="button"
          @click="toggleMute"
          @keydown="onButtonKeyDown"
          class="text-coffee hover:text-terracotta cursor-pointer transition-colors focus:outline-none"
          :aria-label="playerStore.volume > 0 ? 'Silenciar sonido' : 'Activar sonido'"
          title="Silenciar / Activar sonido"
        >
          <MorphIcon 
            :icon="playerStore.volume > 0 ? Volume2 : VolumeX" 
            size="18" 
            color="currentColor" 
            stroke-width="2.5" 
          />
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="playerStore.volume"
          @input="handleVolumeChange"
          @keydown="onButtonKeyDown"
          class="volume-slider w-20 sm:w-24 h-1.5 rounded-full appearance-none cursor-pointer outline-none border border-coffee/60 focus:outline-none"
          :style="{
            background: `linear-gradient(to right, var(--color-mustard) ${volumePercentage}%, rgba(92,61,46,0.15) ${volumePercentage}%)`
          }"
        />
      </div>
    </div>
  </transition>
  
  <PlaylistModal 
    :is-open="isPlaylistModalOpen" 
    :song-data="playerStore.currentSong"
    @close="isPlaylistModalOpen = false"
  />

  <QueuePanel
    :is-open="isQueuePanelOpen"
    @close="isQueuePanelOpen = false"
  />
</template>

<style scoped>
/* Range Slider Cross-Browser styling */
input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-coffee);
  border: 2px solid var(--color-cream);
  cursor: pointer;
  box-shadow: 1px 1px 2px rgba(0,0,0,0.15);
  transition: transform 0.1s ease;
}

input[type='range']::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  background: var(--color-terracotta);
}

input[type='range']::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-coffee);
  border: 2px solid var(--color-cream);
  cursor: pointer;
  box-shadow: 1px 1px 2px rgba(0,0,0,0.15);
  transition: transform 0.1s ease;
}

input[type='range']::-moz-range-thumb:hover {
  transform: scale(1.2);
  background: var(--color-terracotta);
}

button:focus,
button:focus-visible,
input[type="range"]:focus,
input[type="range"]:focus-visible {
  outline: 3px solid var(--color-mustard) !important;
  outline-offset: 2px;
}
</style>
