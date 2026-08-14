<script setup lang="ts">
import { RouterView } from 'vue-router'
import { usePlayerStore } from '@/stores/playerStore'
import AudioPlayer from '@/components/AudioPlayer.vue'
import ErrorViewer from '@/components/ErrorViewer.vue'
import PWABadge from '@/components/PWABadge.vue'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

const playerStore = usePlayerStore()
useKeyboardShortcuts()
</script>

<template>
  <div 
    class="min-h-screen bg-cream text-petrol font-roboto flex flex-col selection:bg-mustard selection:text-petrol transition-all duration-300"
    :class="{ 'pb-24': playerStore.currentSong }"
  >
    <RouterView />
    <AudioPlayer />
  </div>

  <PWABadge />
  <ErrorViewer />
</template>
