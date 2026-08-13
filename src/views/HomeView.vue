<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useLibraryStore } from '@/stores/libraryStore'
import { animate } from 'animejs'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import SongList from '@/components/SongList.vue'
import RetroCast from '@/components/RetroCast.vue'
import { usePlatform } from '@/composables/usePlatform'

const { isTV, isMobile } = usePlatform()


const authStore = useAuthStore()
const libraryStore = useLibraryStore()
const router = useRouter()
console.log('UID celular:', authStore.user?.uid, 'email:', authStore.user?.email)

const showTransmitter = ref(false)
const searchQuery = ref('')
const activeFilter = ref<'all' | 'favorites' | 'playlists'>('all')
const activePlaylistId = ref<string>('')

const retroConnectionStatus = ref('disconnected')
const retroRole = ref('receiver')

const handleConnectionStatus = (status: string, role: string) => {
  retroConnectionStatus.value = status
  retroRole.value = role
}

const toggleTransmitterBtn = ref<HTMLElement | null>(null)
const logoutBtn = ref<HTMLElement | null>(null)
const guideBtn = ref<HTMLElement | null>(null)

const startConnectionGuide = () => {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    doneBtnText: '¡Listo!',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Anterior',
    steps: [
      {
        element: '#header-title',
        popover: {
          title: '¡Bienvenido a Vintage Player! 📻',
          description: 'Esta guía te orientará paso a paso para conectar tu teléfono celular y probar la app localmente en tiempo real.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        popover: {
          title: 'Paso 1: Mismo Wi-Fi 📶',
          description: 'Asegúrate de que tu computadora (donde corre el servidor) y tu celular estén conectados a la **misma red Wi-Fi**.'
        }
      },
      {
        popover: {
          title: 'Paso 2: Dirección IP Local 🌐',
          description: 'Busca en la consola de tu computadora la dirección de **Network** (ej: `http://192.168.1.15:5173`). Escribe esa dirección exacta en el navegador de tu celular.'
        }
      },
      {
        popover: {
          title: 'Paso 3: Firewall (Si no carga) 🛡️',
          description: 'Si la página no carga en tu teléfono, asegúrate de que el Firewall de Windows esté configurado para permitir conexiones entrantes en el puerto `5173`.'
        }
      },
      {
        element: '#add-song-btn',
        popover: {
          title: 'Paso 4: Transmite desde el Celular 📡',
          description: 'Una vez conectado, presiona este botón en tu móvil. Podrás seleccionar carpetas de música directamente desde la memoria de tu móvil y transmitirlas a tu PC en tiempo real.',
          side: "left",
          align: 'start'
        }
      },
      {
        element: '#search-songs-input',
        popover: {
          title: 'Paso 5: Sincronización 🔍',
          description: 'Usa este buscador para filtrar tus canciones en tiempo real. ¡Disfruta de tu música vintage en ambos dispositivos!',
          side: "bottom",
          align: 'start'
        }
      }
    ]
  })
  
  driverObj.drive()
}

// Client-side search filtering
const filteredSongs = computed(() => {
  let list = libraryStore.songs

  if (activeFilter.value === 'favorites') {
    list = list.filter(s => s.favorite)
  } else if (activeFilter.value === 'playlists' && activePlaylistId.value) {
    const p = libraryStore.playlists.find(pl => pl.id === activePlaylistId.value)
    if (p) {
      list = p.songs.map(ps => {
         return libraryStore.songs.find(s => s.id === ps.originalId) || { ...ps, id: ps.originalId }
      }).filter(s => s) as any[]
    }
  }

  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return list
  return list.filter(
    (song) =>
      song.title.toLowerCase().includes(query) ||
      song.artist.toLowerCase().includes(query)
  )
})

// Button hover effect
const handleHover = (el: HTMLElement | null, scale: number) => {
  if (!el) return
  animate(el, {
    scale: scale,
    duration: 250,
    ease: 'outQuad'
  })
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push({ name: 'login' })
  } catch (err) {
    console.error('Logout error:', err)
  }
}


</script>

<template>
  <div class="flex-1 flex flex-col p-6 md:p-12 max-w-6xl w-full mx-auto select-none">
    <!-- Header Block -->
    <header class="flex flex-col sm:flex-row justify-between items-center gap-4 border-b-4 border-coffee pb-6 mb-8">
      <div>
        <h1 id="header-title" class="font-pixelify text-4xl md:text-5xl font-bold tracking-wider text-petrol flex items-center gap-3">
          VINTAGE PLAYER
          <span class="text-sm px-2 py-1 bg-coffee text-cream rounded-lg tracking-normal flex items-center gap-1 mt-2">
            <template v-if="isTV">📺 TV</template>
            <template v-else-if="isMobile">📱 Celular</template>
            <template v-else>💻 Web</template>
          </span>
        </h1>
        <p class="font-roboto text-xs uppercase tracking-widest text-coffee mt-1">
          Tu Fonoteca Personal de Estilo Retro
        </p>
      </div>

      <!-- User controls -->
      <div v-if="authStore.user" class="flex items-center gap-4 flex-wrap justify-end">
        <div class="text-right hidden sm:block">
          <p class="font-roboto text-xs text-coffee uppercase tracking-wider font-bold">Sesión activa</p>
          <p class="font-roboto text-sm text-petrol font-bold">{{ authStore.user.displayName || authStore.user.email }}</p>
        </div>
        <button
          ref="guideBtn"
          @click="startConnectionGuide"
          @mouseenter="handleHover(guideBtn, 1.05)"
          @mouseleave="handleHover(guideBtn, 1.0)"
          class="px-4 py-2 bg-mustard hover:bg-terracotta text-cream font-roboto font-bold border-2 border-coffee rounded-xl shadow-[3px_3px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer text-xs flex items-center gap-1.5"
          aria-label="Iniciar guía de conexión con el teléfono celular"
        >
          Conectar Celular
        </button>
        <a
          href="/vintage-player.apk"
          download
          class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-cream font-roboto font-bold border-2 border-coffee rounded-xl shadow-[3px_3px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer text-xs flex items-center gap-1.5"
        >
          Descargar APK
        </a>
        <button
          ref="logoutBtn"
          @click="handleLogout"
          @mouseenter="handleHover(logoutBtn, 1.05)"
          @mouseleave="handleHover(logoutBtn, 1.0)"
          class="px-4 py-2 bg-cream hover:bg-paper text-petrol font-roboto font-bold border-2 border-coffee rounded-xl shadow-[3px_3px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer text-xs"
        >
          Cerrar Sesión
        </button>
      </div>
    </header>

    <!-- Search & Toggle Upload Row -->
    <section class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
      <!-- Search Input -->
      <div class="relative w-full sm:max-w-md">
        <input
          id="search-songs-input"
          v-model="searchQuery"
          type="text"
          placeholder="Buscar canción, artista o creador..."
          class="w-full pl-10 pr-4 py-3 bg-paper border-2 border-coffee rounded-xl font-roboto text-sm text-petrol placeholder-coffee/40 outline-none focus:border-mustard shadow-[4px_4px_0px_0px_rgba(92,61,46,1)] focus:shadow-none focus:translate-x-0.5 focus:translate-y-0.5 transition-all duration-200"
        />
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-coffee/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>

      <!-- Action Button -->
      <button
        id="add-song-btn"
        ref="toggleTransmitterBtn"
        @click="showTransmitter = !showTransmitter"
        @mouseenter="handleHover(toggleTransmitterBtn, 1.05)"
        @mouseleave="handleHover(toggleTransmitterBtn, 1.0)"
        class="w-full sm:w-auto px-6 py-3 bg-mustard hover:bg-terracotta text-cream font-roboto font-bold border-2 border-coffee rounded-xl shadow-[4px_4px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <svg v-if="!showTransmitter" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>{{ showTransmitter ? 'Cerrar Transmisor' : 'Abrir Transmisor 📻' }}</span>
      </button>
    </section>

    <!-- Collapsible Retro Cast Section -->
    <transition name="expand">
      <div v-if="showTransmitter" class="overflow-hidden">
        <RetroCast @connectionStatus="handleConnectionStatus" />
      </div>
    </transition>

    <!-- Playlist / Grid Grid Section -->
    <section v-if="!(showTransmitter)" class="flex-1 flex flex-col">
      <!-- Filter Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6">
        <div class="flex items-center border-2 border-coffee rounded-xl overflow-hidden bg-cream shrink-0">
          <button
            @click="activeFilter = 'all'"
            :class="['px-4 py-2 w-full font-roboto text-xs font-bold uppercase transition-colors cursor-pointer', activeFilter === 'all' ? 'bg-mustard text-cream' : 'text-coffee hover:bg-paper']"
          >
            Todas
          </button>
          <button
            @click="activeFilter = 'favorites'"
            :class="['px-4 py-2 w-full flex flex-row justify-center items-center font-roboto text-xs font-bold uppercase transition-colors cursor-pointer', activeFilter === 'favorites' ? 'bg-mustard text-cream' : 'text-coffee hover:bg-paper']"
          >
            Favoritos
          </button>
          <button
            @click="activeFilter = 'playlists'"
            :class="['px-4 py-2 w-full flex flex-row justify-center items-center font-roboto text-xs font-bold uppercase transition-colors cursor-pointer', activeFilter === 'playlists' ? 'bg-mustard text-cream' : 'text-coffee hover:bg-paper']"
          >
            Listas
          </button>
        </div>
        
        <div v-if="activeFilter === 'playlists'" class="">
          <select 
            v-model="activePlaylistId"
            class="w-full sm:w-auto pl-4 pr-10 py-2 bg-paper border-2 border-coffee rounded-xl font-roboto text-sm text-petrol outline-none focus:border-mustard cursor-pointer appearance-none"
          >
            <option disabled value="">Selecciona una lista...</option>
            <option v-for="pl in libraryStore.playlists" :key="pl.id" :value="pl.id">
              {{ pl.id }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="libraryStore.loading && libraryStore.songs.length === 0" class="flex flex-col items-center justify-center p-12 text-center">
        <!-- Retro cassettes loading wheel -->
        <div class="w-12 h-12 rounded-full border-4 border-coffee border-t-mustard animate-spin mb-4"></div>
        <p class="font-roboto text-sm text-coffee">Cargando listas...</p>
      </div>
      <div v-else-if="filteredSongs.length === 0" class="flex flex-col items-center justify-center p-12 text-center border-4 border-dashed border-coffee/15 rounded-3xl bg-cream/10 shadow-[4px_4px_0px_0px_rgba(92,61,46,0.15)]">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-coffee/40 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        <h4 class="font-pixelify text-base font-bold text-petrol uppercase tracking-wider mb-1">Sin resultados</h4>
        <p class="font-roboto text-xs text-coffee max-w-sm">
          No hay canciones para mostrar con el filtro actual.
        </p>
      </div>
      <div v-else>
        <SongList :songs="filteredSongs" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.expand-enter-active {
  transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-out;
  max-height: 800px;
}
.expand-leave-active {
  transition: max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-in;
  max-height: 800px;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
