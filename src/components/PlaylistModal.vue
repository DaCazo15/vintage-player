<script setup lang="ts">
import { ref } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

import type { Song } from '@/firebase/config'

const props = defineProps<{
  songData: Song | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const libraryStore = useLibraryStore()
const newPlaylistName = ref('')
const loading = ref(false)

const handleCreate = async () => {
  if (!newPlaylistName.value.trim()) return
  loading.value = true
  try {
    await libraryStore.createPlaylist(newPlaylistName.value.trim())
    newPlaylistName.value = ''
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleAddToPlaylist = async (playlistName: string) => {
  if (!props.songData) return
  loading.value = true
  try {
    await libraryStore.addSongToPlaylist(playlistName, props.songData)
    emit('close')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
import { MorphIcon } from 'morphicons/vue'
import { Trash, Pencil } from 'lucide'

const promptRename = async (pl: any) => {
  const newName = prompt('Nuevo nombre para la lista:', pl.name)
  if (newName && newName.trim() && newName !== pl.name) {
    loading.value = true
    try {
      await libraryStore.renamePlaylist(pl.id, newName.trim())
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }
}

const showConfirmDelete = ref(false)
const playlistToDelete = ref<string | null>(null)

const handleDelete = (id: string) => {
  playlistToDelete.value = id
  showConfirmDelete.value = true
}

const onConfirmDelete = async () => {
  if (playlistToDelete.value) {
    loading.value = true
    try {
      await libraryStore.deletePlaylist(playlistToDelete.value)
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
      showConfirmDelete.value = false
      playlistToDelete.value = null
    }
  }
}

const onCancelDelete = () => {
  showConfirmDelete.value = false
  playlistToDelete.value = null
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/80 z-100 flex items-center justify-center p-4 transition-opacity" @click.self="$emit('close')">
    <div class="bg-paper border-4 border-coffee rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(92,61,46,1)] max-w-sm w-full relative">
      <!-- Close button absolute top right -->
      <button @click="$emit('close')" class="absolute top-4 right-4 text-coffee hover:text-terracotta">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>

      <h3 class="font-pixelify text-xl font-bold text-petrol mb-4">Añadir a Playlist</h3>
      
      <p class="font-roboto text-xs text-coffee mb-4 truncate">Canción: <b>{{ songData?.title }}</b></p>
      
      <!-- Existing Playlists -->
      <div class="max-h-48 overflow-y-auto mb-4 border-2 border-coffee bg-cream rounded-xl p-2 space-y-2 scrollbar-thin">
        <div v-if="libraryStore.playlists.length === 0" class="text-xs text-center text-coffee py-4">No hay listas creadas</div>
        <div v-for="pl in libraryStore.playlists" :key="pl.id" class="flex gap-2 w-full">
          <button
            @click="handleAddToPlaylist(pl.id)"
            :disabled="loading"
            class="flex-1 text-left bg-mustard text-cream px-3 py-2 rounded-lg font-roboto text-sm font-bold border-2 border-coffee hover:bg-terracotta hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:shadow-none transition-all"
          >
            {{ pl.name }} <span class="text-[10px] opacity-75">({{ pl.songs.length }})</span>
          </button>
          
          <button
            @click="promptRename(pl)"
            :disabled="loading"
            class="w-10 h-10 flex items-center justify-center bg-cream text-coffee rounded-lg border-2 border-coffee hover:bg-mustard hover:text-cream shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
             <MorphIcon :icon="Pencil" size="14" stroke-width="2.5" />
          </button>
          
          <button
            @click="handleDelete(pl.id)"
            :disabled="loading"
            class="w-10 h-10 flex items-center justify-center bg-cream text-coffee rounded-lg border-2 border-coffee hover:bg-terracotta hover:text-cream shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
             <MorphIcon :icon="Trash" size="14" stroke-width="2.5" />
          </button>
        </div>
      </div>

      <!-- Create New -->
      <div class="border-t-2 border-coffee/10 pt-4">
        <label class="block font-roboto text-[10px] font-bold text-coffee uppercase tracking-wider mb-2">Crear nueva lista</label>
        <div class="flex gap-2">
          <input 
            v-model="newPlaylistName" 
            type="text" 
            placeholder="Nombre de lista" 
            class="flex-1 px-3 py-2 bg-cream border-2 border-coffee rounded-xl font-roboto text-xs outline-none focus:border-mustard"
            @keyup.enter="handleCreate"
          >
          <button 
            @click="handleCreate" 
            :disabled="loading || !newPlaylistName.trim()" 
            class="px-4 py-2 bg-emerald-500 text-cream font-bold rounded-xl border-2 border-coffee hover:bg-emerald-600 shadow-[2px_2px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50"
          >
            +
          </button>
        </div>
      </div>
      
    </div>

    <ConfirmDialog
      :is-open="showConfirmDelete"
      title="Eliminar Playlist"
      message="¿Seguro que deseas eliminar esta lista de reproducción?"
      @confirm="onConfirmDelete"
      @cancel="onCancelDelete"
    />
  </div>
</template>
