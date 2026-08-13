<script setup lang="ts">
import { ref } from 'vue'
import type { Song } from '@/firebase/config'
import { useLibraryStore } from '@/stores/libraryStore'
import { animate } from 'animejs'
import { MorphIcon } from 'morphicons/vue'
import { HeartEmpty, HeartFilled } from '@/assets/brandIcons'
import { usePlatform } from '@/composables/usePlatform'
import { useDpadNavigation } from '@/composables/useDpadNavigation'

const props = defineProps<{
  song: Song
  isActive: boolean
}>()

const emit = defineEmits<{
  (e: 'play', song: Song): void
}>()

const libraryStore = useLibraryStore()
const favBtn = ref<HTMLElement | null>(null)
const deleteBtn = ref<HTMLElement | null>(null)

const { isTV } = usePlatform()
const { handleDpadKeyDown } = useDpadNavigation()
const cardEl = ref<HTMLElement | null>(null)

const handleFocus = () => {
  if (isTV.value && cardEl.value) {
    animate(cardEl.value, {
      scale: 1.05,
      duration: 150,
      ease: 'outQuad'
    })
  }
}

const handleBlur = () => {
  if (isTV.value && cardEl.value) {
    animate(cardEl.value, {
      scale: 1.0,
      duration: 150,
      ease: 'outQuad'
    })
  }
}

const onKeyDown = (e: KeyboardEvent) => {
  if (!isTV.value) return
  
  if (e.key === 'Enter') {
    emit('play', props.song)
    e.preventDefault()
  } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    handleDpadKeyDown(e)
  }
}

// Format duration helper (sec -> mm:ss)
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
};

// Micro-interactions with anime.js
const triggerFavoritePulse = async () => {
  if (favBtn.value) {
    animate(favBtn.value, {
      keyframes: [
        { scale: 0.8, duration: 80 },
        { scale: 1.3, duration: 120 },
        { scale: 1.0, duration: 100 }
      ],
      ease: 'inOutQuad'
    })
  }

  if (props.song.id) {
    try {
      await libraryStore.toggleFavorite(props.song.id)
    } catch (err) {
      console.error(err)
    }
  }
}

const handleDeleteClick = async () => {
  if (deleteBtn.value) {
    animate(deleteBtn.value, {
      scale: 0.9,
      duration: 100,
      ease: 'outQuad'
    })
  }

  if (props.song.id && confirm('¿Estás seguro de que deseas eliminar esta canción de tu biblioteca?')) {
    try {
      await libraryStore.deleteSong(props.song.id)
    } catch (err) {
      console.error(err)
    }
  }
}
</script>

<template>
  <div
    ref="cardEl"
    :tabindex="isTV ? 0 : -1"
    @focus="handleFocus"
    @blur="handleBlur"
    @keydown="onKeyDown"
    class="song-card select-none bg-paper border-2 border-coffee rounded-2xl p-4 flex gap-4 items-center shadow-[4px_4px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-200 focus:outline-none"
    :class="{ 'border-mustard ring-2 ring-mustard/40 bg-cream/10': isActive }"
  >
    <!-- Cover Art / Cassette Placeholder -->
    <div 
      @click="emit('play', song)"
      class="w-14 h-14 rounded-lg border-2 border-coffee shrink-0 relative overflow-hidden bg-cream cursor-pointer flex items-center justify-center"
    >
      <img
        v-if="song.coverUrl"
        :src="song.coverUrl"
        alt="Cover Art"
        class="w-full h-full object-cover"
      />
      <!-- Vintage Cassette Silhouette Placeholder -->
      <div v-else class="w-full h-full p-2 flex flex-col justify-between bg-cream/50 relative">
        <div class="h-4 bg-coffee/20 rounded border border-coffee/40 flex justify-between px-1.5 items-center">
          <div class="w-2 h-2 rounded-full border border-coffee/60 bg-paper"></div>
          <div class="w-2 h-2 rounded-full border border-coffee/60 bg-paper"></div>
        </div>
        <div class="h-1 w-8 bg-coffee/30 mx-auto rounded"></div>
      </div>
      
      <!-- Playing overlay -->
      <div v-if="isActive" class="absolute inset-0 bg-petrol/20 flex items-center justify-center">
        <!-- Minimal vintage equalizer lines animation -->
        <div class="flex gap-0.5 items-end h-5">
          <span class="w-0.5 bg-mustard rounded animate-[bounce_0.8s_infinite_100ms]"></span>
          <span class="w-0.5 h-4 bg-mustard rounded animate-[bounce_0.8s_infinite_300ms]"></span>
          <span class="w-0.5 h-3 bg-mustard rounded animate-[bounce_0.8s_infinite_50ms]"></span>
        </div>
      </div>
    </div>

    <!-- Metadata Details -->
    <div 
      @click="emit('play', song)"
      class="flex-1 min-w-0 flex flex-col justify-center cursor-pointer"
    >
      <h4 class="font-pixelify text-sm font-bold text-petrol truncate uppercase leading-tight">
        {{ song.title }}
      </h4>
      <p class="font-roboto text-xs text-coffee truncate mt-0.5">
        {{ song.artist }}
      </p>
      <span class="font-roboto text-[10px] text-coffee/70 font-bold mt-1">
        {{ formatDuration(song.duration) }}
      </span>
    </div>

    <!-- Interactive Actions -->
    <div class="flex items-center gap-2">
      <!-- Favorite morphicon toggle button -->
      <button
        ref="favBtn"
        type="button"
        @click="triggerFavoritePulse"
        class="w-8 h-8 rounded-full border border-coffee flex items-center justify-center bg-cream hover:bg-paper text-coffee hover:text-terracotta cursor-pointer transition-colors"
        :class="{ 'text-terracotta! bg-terracotta/5': song.favorite }"
        :aria-label="song.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'"
        title="Favorito"
      >
        <MorphIcon 
          :icon="song.favorite ? HeartFilled : HeartEmpty" 
          size="16" 
          color="currentColor"
          stroke-width="2.5"
        />
      </button>

      <!-- Delete button -->
      <button
        ref="deleteBtn"
        type="button"
        @click="handleDeleteClick"
        class="w-8 h-8 rounded-full border border-coffee flex items-center justify-center bg-cream hover:bg-terracotta hover:text-cream text-coffee cursor-pointer transition-all duration-200"
        aria-label="Eliminar canción de la biblioteca"
        title="Eliminar canción"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.song-card:focus,
.song-card:focus-visible {
  outline: 3px solid var(--color-mustard) !important;
  outline-offset: 2px;
}
</style>
