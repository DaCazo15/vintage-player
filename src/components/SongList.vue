<script setup lang="ts">
import { watch, nextTick } from 'vue'
import type { Song } from '@/firebase/config'
import { usePlayerStore } from '@/stores/playerStore'
import SongCard from './SongCard.vue'
import { gsap } from 'gsap'

const props = defineProps<{
  songs: Song[]
}>()

const playerStore = usePlayerStore()

const handlePlaySong = (song: Song) => {
  // Pass the current filtered song list as the playlist context
  playerStore.loadSong(song, props.songs)
}

// Trigger GSAP stagger animation when song list updates
const runStaggerAnimation = () => {
  nextTick(() => {
    const cards = document.querySelectorAll('.song-card-item')
    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        {
          y: 25,
          opacity: 0
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.05,
          ease: 'power3.out',
          overwrite: 'auto'
        }
      )
    }
  })
}

watch(
  () => props.songs,
  () => {
    runStaggerAnimation()
  },
  { immediate: true, deep: true }
)
</script>

<template>
  <div class="w-full">
    <!-- Grid of cards -->
    <div 
      v-if="songs.length > 0"
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
    >
      <div
        v-for="song in songs"
        :key="song.id"
        class="song-card-item opacity-0"
      >
        <SongCard
          :song="song"
          :is-active="playerStore.currentSong?.id === song.id"
          @play="handlePlaySong"
        />
      </div>
    </div>

    <!-- Empty state -->
    <div 
      v-else 
      class="border-4 border-dashed border-coffee/20 rounded-3xl p-12 text-center flex flex-col items-center justify-center select-none bg-paper/20"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-coffee/30 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <h3 class="font-pixelify text-xl font-bold text-petrol mb-1">
        Biblioteca vacía
      </h3>
      <p class="font-roboto text-sm text-coffee max-w-xs">
        No hay canciones guardadas o ninguna coincide con tu búsqueda actual. ¡Arrastra archivos arriba para añadirlas!
      </p>
    </div>
  </div>
</template>
