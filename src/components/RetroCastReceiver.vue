<script setup lang="ts">
import RetroCassetteTape from './RetroCassetteTape.vue'

defineProps<{
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  transferStatus: 'idle' | 'sending' | 'receiving' | 'assembling' | 'completed' | 'error'
  transferProgress: number
  fileHeader: { title: string; artist: string; totalSize: number } | null
}>()

defineEmits<{
  (e: 'startReceiver'): void
  (e: 'cleanup'): void
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center p-4">
    <!-- Premium CSS Casette Graphic -->
    <RetroCassetteTape 
      :title="fileHeader ? fileHeader.title : ''" 
      :is-spinning="transferStatus === 'receiving'" 
    />

    <!-- Receiver state messages -->
    <div class="text-center w-full space-y-4">
      
      <!-- Connection status dials -->
      <div class="flex flex-col items-center gap-1.5">
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
        
        <p class="font-roboto text-[11px] text-coffee max-w-sm">
          <template v-if="connectionStatus === 'disconnected'">
            Haz clic abajo para habilitar tu PC como receptor y esperar la transmisión de tu móvil.
          </template>
          <template v-else-if="connectionStatus === 'connecting'">
            Abre la app en tu teléfono, selecciona una canción en el modo **"Transmitir"** e inicia la conexión.
          </template>
          <template v-else-if="connectionStatus === 'connected'">
            ¡Vinculado correctamente! Envía una canción desde tu teléfono para que suene aquí.
          </template>
        </p>
      </div>

      <!-- Progress bars and transfer states -->
      <div v-if="transferStatus === 'receiving' || transferStatus === 'assembling' || transferStatus === 'completed'" class="bg-cream border-2 border-coffee rounded-2xl p-4 text-left space-y-2">
        <div class="flex justify-between items-center text-xs font-roboto font-bold text-coffee uppercase">
          <span>
            <template v-if="transferStatus === 'receiving'">Recibiendo Audio Local...</template>
            <template v-else-if="transferStatus === 'assembling'">Procesando Archivo...</template>
            <template v-else-if="transferStatus === 'completed'">¡Canción cargada con éxito! 📻</template>
          </span>
          <span>{{ transferProgress }}%</span>
        </div>
        
        <div class="w-full h-3 bg-coffee/20 rounded-full border-2 border-coffee overflow-hidden">
          <div 
            class="h-full rounded-full transition-all duration-100" 
            :class="transferStatus === 'completed' ? 'bg-emerald-500' : 'bg-mustard'"
            :style="{ width: transferProgress + '%' }"
          ></div>
        </div>
        
        <div v-if="fileHeader" class="text-[10px] font-roboto text-coffee flex items-center justify-between">
          <span class="truncate pr-4">TÍTULO: <b>{{ fileHeader.title }}</b> ({{ fileHeader.artist }})</span>
          <span class="shrink-0">TAMAÑO: {{ (fileHeader.totalSize / (1024 * 1024)).toFixed(2) }} MB</span>
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
