<script setup lang="ts">
import { ref } from 'vue'
import { usePlayerStore } from '@/stores/playerStore'
import { MorphIcon } from 'morphicons/vue'
import { X, Play, GripVertical, Trash } from 'lucide'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const playerStore = usePlayerStore()

// Drag and drop state
const dragIndex = ref<number | null>(null)

const handleDragStart = (e: DragEvent, index: number) => {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.dropEffect = 'move'
    // This is required for Firefox
    e.dataTransfer.setData('text/plain', index.toString())
  }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

const handleDrop = (e: DragEvent, dropIndex: number) => {
  e.preventDefault()
  if (dragIndex.value !== null && dragIndex.value !== dropIndex) {
    playerStore.reorderQueue(dragIndex.value, dropIndex)
  }
  dragIndex.value = null
}

const handleDragEnd = () => {
  dragIndex.value = null
}

</script>

<template>
  <div 
    class="fixed inset-y-0 right-0 w-full sm:w-80 bg-paper border-l-4 border-coffee shadow-[-6px_0px_0px_0px_rgba(92,61,46,1)] z-100 flex flex-col transition-transform duration-300 transform"
    :class="isOpen ? 'translate-x-0' : 'translate-x-full'"
  >
    <!-- Header -->
    <div class="px-6 py-4 border-b-4 border-coffee bg-mustard text-cream flex items-center justify-between shadow-[0px_4px_0px_0px_rgba(92,61,46,1)] z-10 relative">
      <h2 class="font-pixelify text-xl font-bold uppercase tracking-wider">Cola de Reproducción</h2>
      <button 
        @click="$emit('close')"
        class="text-cream hover:text-coffee transition-colors focus:outline-none hover:scale-110"
      >
        <MorphIcon :icon="X" size="24" stroke-width="2.5" />
      </button>
    </div>

    <!-- Queue List -->
    <div class="flex-1 overflow-y-auto p-4 bg-cream/30 space-y-3 scrollbar-thin pb-24">
      <div v-if="playerStore.playlist.length === 0" class="text-center text-coffee/60 font-roboto text-sm py-8 font-bold">
        La cola está vacía.
      </div>
      
      <div 
        v-for="(song, index) in playerStore.playlist" 
        :key="song.id || index"
        class="group flex items-center gap-3 p-3 bg-paper border-2 border-coffee rounded-xl shadow-[4px_4px_0px_0px_rgba(92,61,46,1)] transition-all hover:-translate-y-0.5"
        :class="{
          'border-terracotta ring-2 ring-terracotta/20 bg-cream/50': playerStore.currentSong?.id === song.id,
          'opacity-50': dragIndex === index
        }"
        draggable="true"
        @dragstart="handleDragStart($event, index)"
        @dragover="handleDragOver($event)"
        @drop="handleDrop($event, index)"
        @dragend="handleDragEnd"
      >
        <!-- Drag Handle -->
        <div class="cursor-grab text-coffee/40 hover:text-coffee active:cursor-grabbing px-1">
          <MorphIcon :icon="GripVertical" size="20" stroke-width="2.5" />
        </div>

        <!-- Song Info -->
        <div class="flex-1 min-w-0 flex flex-col cursor-pointer" @click="playerStore.playFromQueue(index)">
          <div class="flex items-center gap-2">
            <span v-if="playerStore.currentSong?.id === song.id" class="text-terracotta">
              <MorphIcon :icon="Play" size="14" stroke-width="3" fill="currentColor" />
            </span>
            <span class="font-pixelify text-sm font-bold text-petrol truncate uppercase">
              {{ song.title }}
            </span>
          </div>
          <span class="font-roboto text-xs text-coffee truncate">
            {{ song.artist }}
          </span>
        </div>

        <!-- Remove Action -->
        <button 
          @click.stop="playerStore.removeFromQueue(index)"
          class="text-coffee/40 hover:text-terracotta transition-colors p-1"
          title="Quitar de la cola"
        >
          <MorphIcon :icon="Trash" size="18" stroke-width="2.5" />
        </button>
      </div>
    </div>
  </div>
  
  <!-- Backdrop for mobile -->
  <div 
    v-if="isOpen" 
    class="fixed inset-0 bg-black/50 z-90 sm:hidden transition-opacity"
    @click="$emit('close')"
  ></div>
</template>

<style scoped>
/* Custom scrollbar for webkit */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: rgba(92, 61, 46, 0.1);
  border-radius: 4px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: var(--color-coffee);
  border-radius: 4px;
}
</style>
