<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  localSongs: File[]
  folderName: string
  sharedManifest: any[]
  uploadProgress: Record<number, number>
}>()

const emit = defineEmits<{
  (e: 'selectFolder', event: Event): void
  (e: 'changeFolder'): void
  (e: 'startSender'): void
}>()

import { HelpCircle } from 'lucide'
import { useTutorials } from '@/composables/useTutorials'
import { MorphIcon } from 'morphicons/vue'

const { startSenderTutorial } = useTutorials()

const folderInput = ref<HTMLInputElement | null>(null)

const triggerSelect = () => {
  folderInput.value?.click()
}

const onFolderSelect = (e: Event) => {
  emit('selectFolder', e)
}

import { computed } from 'vue'

const activeUploads = computed(() => {
  const ids = Object.keys(props.uploadProgress).map(Number)
  return ids.filter(id => {
    const p = props.uploadProgress[id]
    return p !== undefined && p < 100
  })
})

const isUploading = computed(() => activeUploads.value.length > 0)

const uploadOverallProgress = computed(() => {
  if (activeUploads.value.length === 0) return 0
  let total = 0
  activeUploads.value.forEach(id => {
    total += props.uploadProgress[id] || 0
  })
  return Math.round(total / activeUploads.value.length)
})

const cancelUpload = () => {
  if (folderInput.value) {
    folderInput.value.value = ''
  }
  emit('changeFolder')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Folder Picker (shown when no folder is selected) -->
    <div
      v-if="localSongs.length === 0"
      @click="triggerSelect"
      class="border-4 border-dashed border-coffee/30 hover:border-coffee/60 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
    >
      <input ref="folderInput" type="file" webkitdirectory directory multiple class="hidden" @change="onFolderSelect" />
      <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-coffee/60 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="font-roboto text-sm text-petrol font-bold mb-1">
        Seleccionar carpeta de música
      </span>
          <span class="font-roboto text-[10px] text-coffee">
            Busca y carga todas tus canciones locales
          </span>
          <button 
            @click.stop="startSenderTutorial" 
            class="mt-4 px-3 py-1.5 bg-paper hover:bg-cream text-petrol font-roboto text-[10px] font-bold border border-coffee rounded-xl shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <MorphIcon :icon="HelpCircle" size="14" stroke-width="2.5" />
            Tutorial
          </button>
        </div>

    <!-- Folder playlist view -->
    <div v-else class="space-y-4">
      <div class="flex items-center justify-between border-b border-coffee/10 pb-2">
        <div class="truncate pr-4">
          <p class="font-roboto text-[10px] font-bold text-coffee uppercase tracking-wider">Carpeta Activa</p>
          <h4 class="font-pixelify text-sm font-bold text-petrol truncate">{{ folderName }}</h4>
        </div>
        <button
          type="button"
          @click="$emit('changeFolder')"
          class="px-3 py-1.5 bg-cream hover:bg-paper text-petrol font-roboto text-[10px] font-bold border-2 border-coffee rounded-xl shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer shrink-0"
        >
          Cambiar
        </button>
      </div>

      <!-- Action Button and Connection -->
      <div class="bg-paper border-2 border-coffee rounded-2xl p-4 space-y-4 shadow-[3px_3px_0px_0px_rgba(92,61,46,1)]">
        <div class="flex items-center justify-between text-[11px] font-roboto font-bold text-coffee">
          <span>CONEXIÓN P2P:</span>
          <span v-if="connectionStatus === 'disconnected'" class="text-terracotta uppercase">Desconectado 🔴</span>
          <span v-else-if="connectionStatus === 'connecting'" class="text-mustard uppercase animate-pulse">Conectando... 🟡</span>
          <span v-else-if="connectionStatus === 'connected'" class="text-emerald-600 uppercase">Transmitiendo a PC 🟢</span>
        </div>

        <button
          v-if="connectionStatus === 'disconnected'"
          type="button"
          @click="$emit('startSender')"
          class="w-full py-2.5 bg-mustard hover:bg-terracotta text-cream font-roboto font-bold border-2 border-coffee rounded-xl shadow-[3px_3px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer text-center uppercase tracking-wider text-xs"
        >
          Iniciar Transmisión al PC
        </button>
      </div>

      <!-- Playlist Song list scrollable -->
      <div v-if="connectionStatus === 'connected' && sharedManifest.length > 0">
        <p class="font-roboto text-xs font-bold text-coffee uppercase tracking-wider mb-1.5">
          Canciones compartidas ({{ sharedManifest.length }})
        </p>
        <div class="max-h-60 overflow-y-auto border-2 border-coffee rounded-2xl bg-cream p-2 space-y-1.5 shadow-[inset_2px_2px_4px_rgba(92,61,46,0.15)] scrollbar-thin">
          <div
            v-for="song in sharedManifest"
            :key="song.id"
            class="w-full px-3 py-2.5 text-left text-xs font-roboto border-2 border-transparent rounded-xl flex flex-col justify-between bg-paper text-petrol"
          >
            <div class="flex justify-between items-center mb-1">
              <span class="truncate pr-2 font-bold">{{ song.title }}</span>
              <span class="text-[8px] uppercase tracking-wider shrink-0 opacity-75 font-bold text-coffee">
                {{ (song.totalSize / (1024 * 1024)).toFixed(2) }} MB
              </span>
            </div>
            
            <!-- Progress bar -->
            <div v-if="uploadProgress[song.id] !== undefined" class="w-full h-1.5 bg-coffee/20 rounded-full overflow-hidden mt-1">
              <div class="h-full bg-emerald-500 transition-all duration-100" :style="{ width: uploadProgress[song.id] + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Upload Progress Modal -->
  <Teleport to="body">
    <transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isUploading" class="fixed inset-0 bg-petrol/90 backdrop-blur-sm z-250 flex flex-col items-center justify-center p-6 text-cream">
        <div class="w-full max-w-md bg-paper border-4 border-coffee rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(92,61,46,1)] text-petrol flex flex-col items-center relative">
          <h2 class="font-pixelify text-2xl font-bold mb-2 uppercase text-center">Subiendo Archivos</h2>
          <p class="font-roboto text-sm font-bold text-coffee mb-6 text-center">
            Enviando pistas al PC. ¡No salgas de esta pantalla!
          </p>
          
          <div class="w-full bg-cream border-2 border-coffee p-4 rounded-xl mb-6 relative overflow-hidden shadow-inner">
            <div class="absolute inset-0 bg-mustard/20 origin-left transition-all duration-300" :style="{ transform: `scaleX(${uploadOverallProgress / 100})` }"></div>
            
            <div class="relative flex justify-between items-center z-10 mb-2">
              <span class="font-pixelify text-2xl font-bold">{{ uploadOverallProgress }}%</span>
              <span class="font-roboto text-sm font-bold text-coffee">{{ activeUploads.length }} archivo(s) en curso</span>
            </div>
            
            <div class="w-full h-3 bg-coffee/20 rounded-full overflow-hidden relative z-10 border border-coffee/30">
               <div class="h-full bg-mustard transition-all duration-300" :style="{ width: uploadOverallProgress + '%' }"></div>
            </div>
          </div>

          <div class="flex w-full gap-4">
            <button 
              @click="cancelUpload" 
              class="flex-1 py-3 bg-terracotta hover:bg-terracotta/90 text-cream font-roboto font-bold border-2 border-coffee rounded-xl shadow-[4px_4px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all cursor-pointer"
            >
              Cancelar (Perderás progreso)
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
