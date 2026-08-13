<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/playerStore'
import RetroCassetteTape from './RetroCassetteTape.vue'

const props = defineProps<{
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  remoteManifest: any[]
  downloadProgress: Record<number, number>
  availableSongs: Record<number, any>
}>()

defineEmits<{
  (e: 'startReceiver'): void
  (e: 'cleanup'): void
}>()

const playerStore = usePlayerStore()

const currentPreloadIndices = computed(() => {
  const currentIndex = playerStore.playlist.findIndex(s => s.id === playerStore.currentSong?.id)
  if (currentIndex === -1) return new Set<number>()
  
  const total = props.remoteManifest.length
  const indices = new Set<number>()
  for (let i = -5; i <= 5; i++) {
    let idx = currentIndex + i
    if (total > 0) {
      if (idx < 0) idx = (idx % total) + total
      if (idx >= total) idx = idx % total
      indices.add(idx)
    }
  }
  return indices
})
</script>

<template>
  <div class="flex flex-col items-center justify-center p-4">
    <!-- Premium CSS Casette Graphic -->
    <RetroCassetteTape 
      :title="playerStore.currentSong?.title || ''" 
      :is-spinning="playerStore.isPlaying" 
    />

    <!-- Receiver state messages -->
    <div class="text-center w-full space-y-4">
      
      <!-- Connection status dials -->
      <div class="flex flex-col items-center gap-1.5 mt-4">
        <div class="flex items-center gap-2">
          <span class="relative flex h-3.5 w-3.5">
            <span 
              v-if="connectionStatus !== 'disconnected'"
              class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              :class="connectionStatus === 'connecting' ? 'bg-mustard' : 'bg-emerald-500'"
            ></span>
            <span 
              class="relative inline-flex rounded-full h-3.5 w-3.5 border border-coffee"
              :class="[
                connectionStatus === 'disconnected' ? 'bg-terracotta' : '',
                connectionStatus === 'connecting' ? 'bg-mustard' : '',
                connectionStatus === 'connected' ? 'bg-emerald-500' : ''
              ]"
            ></span>
          </span>
          <span class="font-roboto text-xs font-bold text-coffee uppercase tracking-wider">
            <template v-if="connectionStatus === 'disconnected'">Receptor Inactivo</template>
            <template v-else-if="connectionStatus === 'connecting'">Esperando Emisor (Celular)...</template>
            <template v-else-if="connectionStatus === 'connected'">Conectado y Escuchando</template>
          </span>
        </div>
      </div>

      <!-- Shared Playlist (Shows active preloads) -->
      <div v-if="connectionStatus === 'connected' && remoteManifest.length > 0" class="w-full text-left bg-cream border-2 border-coffee rounded-2xl p-3 shadow-[inset_2px_2px_4px_rgba(92,61,46,0.15)]">
        <p class="font-roboto text-[10px] font-bold text-coffee uppercase tracking-wider mb-2 text-center">Canciones Sincronizadas ({{ remoteManifest.length }})</p>
        <div class="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          <div 
            v-for="song in remoteManifest" 
            :key="song.id" 
            class="p-2 border-2 rounded-xl transition-all font-roboto text-xs cursor-pointer"
            :class="[
               playerStore.currentSong?.id === `webrtc-${song.id}` ? 'bg-mustard text-cream border-coffee shadow-[2px_2px_0px_0px_rgba(92,61,46,1)]' : 'bg-paper text-petrol border-transparent hover:border-coffee/20',
               currentPreloadIndices.has(song.id) ? 'opacity-100' : 'opacity-60'
            ]"
            @click="playerStore.loadSong(playerStore.playlist[song.id], playerStore.playlist)"
          >
            <div class="flex justify-between items-center">
              <span class="truncate font-bold">{{ song.title }}</span>
              <span class="shrink-0 text-[9px] uppercase opacity-80 font-bold" v-if="availableSongs[song.id]">LISTO</span>
            </div>
            <div v-if="currentPreloadIndices.has(song.id) && !availableSongs[song.id]" class="w-full h-1 bg-coffee/20 rounded-full overflow-hidden mt-1.5">
               <div class="h-full bg-emerald-500 transition-all duration-100" :style="{ width: (downloadProgress[song.id] || 0) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <button
        v-if="connectionStatus === 'disconnected'"
        type="button"
        @click="$emit('startReceiver')"
        class="px-6 py-2.5 bg-mustard hover:bg-terracotta text-cream font-roboto font-bold border-2 border-coffee rounded-xl shadow-[3px_3px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer uppercase tracking-wider text-xs"
      >
        Habilitar Recepción
      </button>
      <button
        v-else
        type="button"
        @click="$emit('cleanup')"
        class="px-6 py-2.5 bg-cream hover:bg-paper text-petrol font-roboto font-bold border-2 border-coffee rounded-xl shadow-[3px_3px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer uppercase tracking-wider text-xs"
      >
        Desconectar
      </button>
    </div>
  </div>
</template>
