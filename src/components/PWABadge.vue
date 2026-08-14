<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { MorphIcon } from 'morphicons/vue'
import { RefreshCw, X } from 'lucide'
import { computed } from 'vue'

// Replace with a specific interval if polling for updates is needed
const {
  offlineReady,
  needRefresh,
  updateServiceWorker,
} = useRegisterSW()

const close = async () => {
  offlineReady.value = false
  needRefresh.value = false
}

const isVisible = computed(() => offlineReady.value || needRefresh.value)
</script>

<template>
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <div 
      v-if="isVisible" 
      class="fixed bottom-28 sm:bottom-6 right-4 sm:right-6 z-200 max-w-sm w-[calc(100%-2rem)] sm:w-auto p-4 bg-paper border-4 border-coffee rounded-2xl shadow-[4px_4px_0px_0px_rgba(92,61,46,1)] flex items-center justify-between gap-4"
    >
      <div class="flex-1">
        <h4 class="font-pixelify font-bold text-petrol mb-1">
          {{ needRefresh ? 'Actualización Disponible' : 'App lista (Offline)' }}
        </h4>
        <p class="font-roboto text-xs text-coffee leading-tight">
          {{ needRefresh ? 'Hay una nueva versión de Vintage Player.' : 'Puedes usar la app sin conexión a internet.' }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button 
          v-if="needRefresh" 
          @click="updateServiceWorker()"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-mustard text-cream text-xs font-bold font-roboto rounded-xl border-2 border-coffee shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:bg-amber-600 hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          <MorphIcon :icon="RefreshCw" size="14" stroke-width="2.5" />
          Actualizar
        </button>

        <button 
          @click="close"
          class="w-8 h-8 flex items-center justify-center rounded-xl bg-cream text-coffee border-2 border-coffee shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:bg-paper hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          aria-label="Cerrar notificación"
        >
          <MorphIcon :icon="X" size="16" stroke-width="2.5" />
        </button>
      </div>
    </div>
  </transition>
</template>
