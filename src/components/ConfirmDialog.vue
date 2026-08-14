<script setup lang="ts">
const props = withDefaults(defineProps<{
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
}>(), {
  confirmLabel: 'Eliminar',
  cancelLabel: 'Cancelar',
  variant: 'danger'
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/80 z-200 flex items-center justify-center p-4 transition-opacity" @click.self="$emit('cancel')">
    <div class="bg-paper border-4 border-coffee rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(92,61,46,1)] max-w-sm w-full relative">
      <h3 class="font-pixelify text-xl font-bold text-petrol mb-3">{{ title }}</h3>
      <p class="font-roboto text-sm text-coffee mb-6">{{ message }}</p>
      
      <div class="flex gap-3 justify-end">
        <button 
          @click="$emit('cancel')"
          class="px-4 py-2 bg-cream text-coffee font-roboto font-bold rounded-xl border-2 border-coffee hover:bg-paper shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          {{ cancelLabel }}
        </button>
        <button 
          @click="$emit('confirm')"
          :class="[
            'px-4 py-2 text-cream font-roboto font-bold rounded-xl border-2 border-coffee shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all',
            variant === 'danger' ? 'bg-terracotta hover:bg-red-600' : 'bg-mustard hover:bg-amber-600'
          ]"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
