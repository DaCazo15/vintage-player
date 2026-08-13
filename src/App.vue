<script setup lang="ts">
import { RouterView } from 'vue-router'
import { usePlayerStore } from '@/stores/playerStore'
import AudioPlayer from '@/components/AudioPlayer.vue'
import DebugConsole from '@/components/DebugConsole.vue'

const playerStore = usePlayerStore()
</script>

<template>
  <div 
    class="min-h-screen bg-cream text-petrol font-roboto flex flex-col selection:bg-mustard selection:text-petrol transition-all duration-300"
    :class="{ 'pb-24': playerStore.currentSong }"
  >
    <RouterView />
    <AudioPlayer />
    <DebugConsole />
  </div>
</template>
