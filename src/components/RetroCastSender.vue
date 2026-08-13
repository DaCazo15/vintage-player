<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  audioFile: File | null
  title: string
  artist: string
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  transferStatus: 'idle' | 'sending' | 'receiving' | 'assembling' | 'completed' | 'error'
  transferProgress: number
  localSongs: File[]
  folderName: string
}>()

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'update:artist', value: string): void
  (e: 'selectFolder', event: Event): void
  (e: 'selectLocalSong', file: File): void
  (e: 'changeFolder'): void
  (e: 'startSender'): void
}>()

const folderInput = ref<HTMLInputElement | null>(null)

const triggerSelect = () => {
  folderInput.value?.click()
}

const onFolderSelect = (e: Event) => {
  emit('selectFolder', e)
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
      <input
        ref="folderInput"
        type="file"
        webkitdirectory
        directory
        multiple
        class="hidden"
        @change="onFolderSelect"
      />
      <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-coffee/60 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="font-roboto text-sm text-petrol font-bold mb-1">
        Seleccionar carpeta de música
      </span>
      <span class="font-roboto text-xs text-coffee">
        Busca y carga todas tus canciones locales
      </span>
    </div>

    <!-- Folder playlist view (shown once folder is loaded) -->
    <div v-else class="space-y-4">
      <div class="flex items-center justify-between border-b border-coffee/10 pb-2">
        <div class="truncate pr-4">
          <p class="font-roboto text-[10px] font-bold text-coffee uppercase tracking-wider">Carpeta Activa</p>
          <h4 class="font-pixelify text-sm font-bold text-petrol truncate">{{ folderName }}</h4>
        </div>
        <button
          type="button"
          :disabled="transferStatus === 'sending'"
          @click="$emit('changeFolder')"
          class="px-3 py-1.5 bg-cream hover:bg-paper text-petrol font-roboto text-[10px] font-bold border-2 border-coffee rounded-xl shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
        >
          Cambiar
        </button>
      </div>

      <!-- Playlist Song list scrollable -->
      <div>
        <p class="font-roboto text-xs font-bold text-coffee uppercase tracking-wider mb-1.5">
          Canciones encontradas ({{ localSongs.length }})
        </p>
        <div class="max-h-60 overflow-y-auto border-2 border-coffee rounded-2xl bg-cream p-2 space-y-1.5 shadow-[inset_2px_2px_4px_rgba(92,61,46,0.15)] scrollbar-thin">
          <button
            v-for="song in localSongs"
            :key="song.name"
            type="button"
            @click="$emit('selectLocalSong', song)"
            :class="[
              'w-full px-3 py-2.5 text-left text-xs font-roboto border-2 rounded-xl cursor-pointer transition-all duration-150 truncate flex items-center justify-between outline-none select-none',
              audioFile?.name === song.name
                ? 'bg-mustard text-cream border-coffee font-bold shadow-[2px_2px_0px_0px_rgba(92,61,46,1)]'
                : 'bg-paper text-petrol border-transparent hover:border-coffee/20'
            ]"
          >
            <span class="truncate pr-2">{{ song.name.substring(0, song.name.lastIndexOf('.')) || song.name }}</span>
            <span 
              :class="[
                'text-[8px] uppercase tracking-wider shrink-0 opacity-75 font-bold',
                audioFile?.name === song.name ? 'text-cream' : 'text-coffee'
              ]"
            >
              {{ (song.size / (1024 * 1024)).toFixed(2) }} MB
            </span>
          </button>
        </div>
      </div>

      <!-- Active song transmission form (shown only when a song is selected) -->
      <div v-if="audioFile" class="bg-paper border-2 border-coffee rounded-2xl p-4 space-y-4 shadow-[3px_3px_0px_0px_rgba(92,61,46,1)]">
        <h4 class="font-pixelify text-xs font-bold text-petrol uppercase tracking-wider border-b border-coffee/10 pb-1.5">
          Preparando Transmisión 📡
        </h4>
        
        <div>
          <label for="cast-title" class="block font-roboto text-[10px] font-bold text-coffee uppercase tracking-wider mb-1">
            Título en PC
          </label>
          <input
            id="cast-title"
            :value="title"
            @input="$emit('update:title', ($event.target as HTMLInputElement).value)"
            type="text"
            required
            :disabled="transferStatus === 'sending'"
            class="w-full px-3 py-1.5 bg-cream border-2 border-coffee rounded-xl font-roboto text-xs text-petrol outline-none focus:border-mustard transition-colors"
          />
        </div>

        <div>
          <label for="cast-artist" class="block font-roboto text-[10px] font-bold text-coffee uppercase tracking-wider mb-1">
            Artista en PC
          </label>
          <input
            id="cast-artist"
            :value="artist"
            @input="$emit('update:artist', ($event.target as HTMLInputElement).value)"
            type="text"
            required
            :disabled="transferStatus === 'sending'"
            class="w-full px-3 py-1.5 bg-cream border-2 border-coffee rounded-xl font-roboto text-xs text-petrol outline-none focus:border-mustard transition-colors"
          />
        </div>

        <!-- Connection indicators -->
        <div class="flex items-center justify-between text-[11px] font-roboto font-bold text-coffee">
          <span>CONEXIÓN P2P:</span>
          <span v-if="connectionStatus === 'disconnected'" class="text-terracotta uppercase">Desconectado 🔴</span>
          <span v-else-if="connectionStatus === 'connecting'" class="text-mustard uppercase animate-pulse">Conectando... 🟡</span>
          <span v-else-if="connectionStatus === 'connected'" class="text-emerald-600 uppercase">Conectado 🟢</span>
        </div>

        <!-- Progress bar for transmitting -->
        <div v-if="transferStatus === 'sending' || transferStatus === 'completed'" class="pt-2">
          <div class="flex justify-between items-center text-[10px] font-roboto font-bold text-coffee uppercase mb-1">
            <span>{{ transferStatus === 'completed' ? 'Transmitida 🎉' : 'Transmitiendo...' }}</span>
            <span>{{ transferProgress }}%</span>
          </div>
          <div class="w-full h-2.5 bg-coffee/20 rounded-full border-2 border-coffee overflow-hidden">
            <div class="h-full bg-mustard rounded-full transition-all duration-100" :style="{ width: transferProgress + '%' }"></div>
          </div>
        </div>

        <!-- Action Button -->
        <button
          type="button"
          @click="$emit('startSender')"
          :disabled="transferStatus === 'sending'"
          class="w-full py-2.5 bg-mustard hover:bg-terracotta text-cream font-roboto font-bold border-2 border-coffee rounded-xl shadow-[3px_3px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-center uppercase tracking-wider text-xs"
        >
          {{ transferStatus === 'sending' ? 'Enviando...' : 'Transmitir a PC' }}
        </button>
      </div>
    </div>
  </div>
</template>
