<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/playerStore'
import RetroCassetteTape from './RetroCassetteTape.vue'

const props = defineProps<{
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  remoteManifest: any[]
  downloadProgress: Record<number, number>
  availableSongs: Record<number, any>
  isSyncingAll: boolean
}>()

defineEmits<{
  (e: 'startReceiver'): void
  (e: 'cleanup'): void
  (e: 'syncAll'): void
  (e: 'cancelSyncAll'): void
}>()

const playerStore = usePlayerStore()

const currentPreloadIndices = computed(() => {
  if (props.isSyncingAll) {
    const indices = new Set<number>()
    for (let i = 0; i < props.remoteManifest.length; i++) indices.add(i)
    return indices
  }

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

const syncAllProgress = computed(() => {
  if (props.remoteManifest.length === 0) return 0
  
  let downloadedBytes = 0
  let totalBytes = 0
  
  props.remoteManifest.forEach((song, idx) => {
    totalBytes += song.totalSize || 0
    if (props.availableSongs[idx]) {
       downloadedBytes += song.totalSize || 0
    } else {
       const p = props.downloadProgress[idx] || 0
       downloadedBytes += (song.totalSize || 0) * (p / 100)
    }
  })
  
  if (totalBytes === 0) return 0
  return Math.round((downloadedBytes / totalBytes) * 100)
})

const completedCount = computed(() => {
  return Object.keys(props.availableSongs).length
})

const isSyncComplete = computed(() => {
  return completedCount.value === props.remoteManifest.length && props.remoteManifest.length > 0
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
        <div class="flex justify-between items-center mb-2">
          <p class="font-roboto text-[10px] font-bold text-coffee uppercase tracking-wider">Sincronizadas ({{ remoteManifest.length }})</p>
          <button 
            @click="$emit('syncAll')"
            class="px-2 py-1 bg-mustard hover:bg-terracotta text-cream font-roboto text-[9px] font-bold border-2 border-coffee rounded-lg shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
          >
            Descargar Todas ⬇️
          </button>
        </div>
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

    <!-- Sync All Blocking Modal -->
    <Teleport to="body">
      <transition
        enter-active-class="transition-opacity duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isSyncingAll" class="fixed inset-0 bg-petrol/90 backdrop-blur-sm z-100 flex flex-col items-center justify-center p-6 text-cream">
          <div class="w-full max-w-md bg-paper border-4 border-coffee rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(92,61,46,1)] text-petrol flex flex-col items-center relative">
            <h2 class="font-pixelify text-3xl font-bold mb-2">Descargando Todo</h2>
            <p class="font-roboto text-sm font-bold text-coffee mb-6 text-center">
              Asegurando tu colección en la caché de este dispositivo...
            </p>
            
            <div class="w-full bg-cream border-2 border-coffee p-4 rounded-xl mb-6 relative overflow-hidden shadow-inner">
              <div class="absolute inset-0 bg-mustard/20 origin-left transition-all duration-300" :style="{ transform: `scaleX(${syncAllProgress / 100})` }"></div>
              
              <div class="relative flex justify-between items-center z-10 mb-2">
                <span class="font-pixelify text-2xl font-bold">{{ syncAllProgress }}%</span>
                <span class="font-roboto text-sm font-bold text-coffee">{{ completedCount }} / {{ remoteManifest.length }} completados</span>
              </div>
              
              <div class="w-full h-3 bg-coffee/20 rounded-full overflow-hidden relative z-10 border border-coffee/30">
                 <div class="h-full bg-emerald-500 transition-all duration-300" :style="{ width: syncAllProgress + '%' }"></div>
              </div>
            </div>

            <div class="flex w-full gap-4">
              <button 
                v-if="!isSyncComplete"
                @click="$emit('cancelSyncAll')" 
                class="flex-1 py-3 bg-terracotta hover:bg-terracotta/90 text-cream font-roboto font-bold border-2 border-coffee rounded-xl shadow-[4px_4px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              
              <button 
                v-if="isSyncComplete"
                @click="$emit('cancelSyncAll')" 
                class="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-cream font-roboto font-bold border-2 border-coffee rounded-xl shadow-[4px_4px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all cursor-pointer"
              >
                Cerrar y Escuchar
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>
