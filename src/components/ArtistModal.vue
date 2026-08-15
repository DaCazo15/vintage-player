<script setup lang="ts">
import { ref } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { MorphIcon } from 'morphicons/vue'
import { Trash } from 'lucide'
import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const libraryStore = useLibraryStore()
const authStore = useAuthStore()
const newArtistName = ref('')
const loading = ref(false)

const handleCreate = async () => {
  if (!newArtistName.value.trim()) return
  loading.value = true
  try {
    await libraryStore.createArtist(newArtistName.value.trim())
    newArtistName.value = ''
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// Delete functionality for artists
const showConfirmDelete = ref(false)
const artistToDelete = ref<string | null>(null)

const handleDelete = (id: string) => {
  artistToDelete.value = id
  showConfirmDelete.value = true
}

const onConfirmDelete = async () => {
  if (!artistToDelete.value) return
  loading.value = true
  try {
    const uid = authStore.user?.uid
    if (uid) {
      await deleteDoc(doc(db, 'users', uid, 'artists', artistToDelete.value))
    }
  } catch (err) {
    console.error('Error deleting artist:', err)
  } finally {
    loading.value = false
    showConfirmDelete.value = false
    artistToDelete.value = null
  }
}

const onCancelDelete = () => {
  showConfirmDelete.value = false
  artistToDelete.value = null
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-petrol/80 backdrop-blur-sm flex items-center justify-center z-100 p-4" @click.self="$emit('close')">
    <div class="bg-paper border-4 border-coffee rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(92,61,46,1)] w-full max-w-sm flex flex-col">
      <div class="flex justify-between items-start mb-2">
        <h3 class="font-pixelify text-xl font-bold text-petrol">Gestionar Artistas</h3>
        <button @click="$emit('close')" class="text-coffee hover:text-terracotta transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Existing Artists -->
      <div class="max-h-48 overflow-y-auto my-4 border-2 border-coffee bg-cream rounded-xl p-2 space-y-2 scrollbar-thin">
        <div v-if="libraryStore.artists?.length === 0" class="text-xs text-center text-coffee py-4">No hay artistas creados</div>
        <div v-for="artist in libraryStore.artists" :key="artist.id" class="flex gap-2 w-full items-center bg-mustard text-cream px-3 py-2 rounded-lg font-roboto text-sm font-bold border-2 border-coffee">
          <span class="flex-1 truncate">{{ artist.name }}</span>
          
          <button
            @click="handleDelete(artist.id)"
            :disabled="loading"
            class="w-8 h-8 flex items-center justify-center bg-cream text-coffee rounded-lg border-2 border-coffee hover:bg-terracotta hover:text-cream shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
             <MorphIcon :icon="Trash" size="14" stroke-width="2.5" />
          </button>
        </div>
      </div>

      <!-- Create New -->
      <div class="border-t-2 border-coffee/10 pt-4">
        <label class="block font-roboto text-[10px] font-bold text-coffee uppercase tracking-wider mb-2">Agregar Artista</label>
        <div class="flex gap-2">
          <input 
            v-model="newArtistName" 
            type="text" 
            placeholder="Nombre del artista" 
            class="flex-1 px-3 py-2 bg-cream border-2 border-coffee rounded-xl font-roboto text-xs outline-none focus:border-mustard"
            @keyup.enter="handleCreate"
          >
          <button 
            @click="handleCreate" 
            :disabled="loading || !newArtistName.trim()" 
            class="px-4 py-2 bg-emerald-500 text-cream font-bold rounded-xl border-2 border-coffee hover:bg-emerald-600 shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50"
          >
            +
          </button>
        </div>
      </div>
      
    </div>

    <ConfirmDialog
      :is-open="showConfirmDelete"
      title="Eliminar Artista"
      message="¿Seguro que deseas eliminar este artista?"
      @confirm="onConfirmDelete"
      @cancel="onCancelDelete"
    />
  </div>
</template>
