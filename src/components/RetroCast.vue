<script setup lang="ts">
import { useRetroCast } from '@/composables/useRetroCast'
import RetroCastSender from './RetroCastSender.vue'
import RetroCastReceiver from './RetroCastReceiver.vue'

const {
  role,
  connectionStatus,
  transferStatus,
  transferProgress,
  errorMessage,
  audioFile,
  title,
  artist,
  fileHeader,
  localSongs,
  folderName,
  handleFolderSelect,
  selectLocalSong,
  changeFolder,
  startReceiver,
  startSender,
  cleanup
} = useRetroCast()
</script>

<template>
  <div class="w-full bg-paper border-4 border-coffee rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(92,61,46,1)] mb-8 select-none">
    
    <!-- Title & Toggle -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b-2 border-coffee/15 pb-4">
      <div>
        <h3 class="font-pixelify text-xl font-bold text-petrol flex items-center gap-2">
          Retro Cast 📻 <span class="text-xs px-2 py-0.5 bg-mustard border border-coffee rounded-md text-cream">P2P LOCAL</span>
        </h3>
        <p class="font-roboto text-xs text-coffee mt-0.5">
          Transmite música directa de tu móvil a tu PC en tiempo real.
        </p>
      </div>

      <!-- Mode selection toggle -->
      <div class="flex items-center border-2 border-coffee rounded-xl overflow-hidden bg-cream shrink-0">
        <button
          type="button"
          @click="role = 'sender'"
          :class="[
            'px-3 py-1.5 font-roboto text-xs font-bold uppercase transition-colors cursor-pointer',
            role === 'sender' ? 'bg-mustard text-cream' : 'text-coffee hover:bg-paper'
          ]"
        >
          📱 Transmitir
        </button>
        <button
          type="button"
          @click="role = 'receiver'"
          :class="[
            'px-3 py-1.5 font-roboto text-xs font-bold uppercase transition-colors cursor-pointer',
            role === 'receiver' ? 'bg-mustard text-cream' : 'text-coffee hover:bg-paper'
          ]"
        >
          💻 Recibir
        </button>
      </div>
    </div>

    <!-- Error notice -->
    <div 
      v-if="errorMessage" 
      class="bg-terracotta/10 border-2 border-terracotta text-terracotta p-3 rounded-xl text-xs font-roboto font-bold mb-4 text-center"
    >
      {{ errorMessage }}
    </div>

    <!-- Render active sub-component based on role -->
    <RetroCastSender
      v-if="role === 'sender'"
      v-model:title="title"
      v-model:artist="artist"
      :audio-file="audioFile"
      :connection-status="connectionStatus"
      :transfer-status="transferStatus"
      :transfer-progress="transferProgress"
      :local-songs="localSongs"
      :folder-name="folderName"
      @select-folder="handleFolderSelect"
      @select-local-song="selectLocalSong"
      @change-folder="changeFolder"
      @start-sender="startSender"
    />
    
    <RetroCastReceiver
      v-else-if="role === 'receiver'"
      :connection-status="connectionStatus"
      :transfer-status="transferStatus"
      :transfer-progress="transferProgress"
      :file-header="fileHeader"
      @start-receiver="startReceiver"
      @cleanup="cleanup"
    />

  </div>
</template>
