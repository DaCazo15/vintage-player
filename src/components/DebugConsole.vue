<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/95 z-[9999] p-4 flex flex-col text-xs font-mono overflow-hidden" style="color: #0f0;">
    <div class="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
      <h2 class="text-white font-bold text-lg">🐞 Debug Console</h2>
      <button @click="isOpen = false" class="text-white bg-red-600 px-3 py-1 rounded font-bold">CERRAR</button>
    </div>
    <div class="flex-1 overflow-y-auto space-y-1 bg-black p-2 rounded">
      <div v-for="(log, idx) in logs" :key="idx" :class="{
        'text-red-500 font-bold': log.type === 'error', 
        'text-yellow-400': log.type === 'warn',
        'text-green-400': log.type === 'log'
      }" class="break-all whitespace-pre-wrap mb-2 border-b border-gray-900 pb-1">
        <span class="text-gray-500">[{{ log.time }}]</span> {{ log.msg }}
      </div>
    </div>
    <button @click="logs = []" class="mt-2 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded w-full font-bold">LIMPIAR</button>
  </div>
  <button v-else @click="isOpen = true" class="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-full z-[9998] shadow-lg opacity-50 hover:opacity-100 font-bold flex items-center justify-center h-12 w-12">
    🐞
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isOpen = ref(false)
const logs = ref<Array<{type: string, msg: string, time: string}>>([])

const originalLog = console.log
const originalError = console.error
const originalWarn = console.warn

function formatArgs(args: any[]) {
  return args.map(a => {
    if (a instanceof Error) return a.message + (a.stack ? `\n${a.stack}` : '')
    if (typeof a === 'object') {
      try {
        return JSON.stringify(a, null, 2)
      } catch (e) {
        return String(a)
      }
    }
    return String(a)
  }).join(' ')
}

onMounted(() => {
  console.log = (...args) => {
    logs.value.push({ type: 'log', msg: formatArgs(args), time: new Date().toLocaleTimeString() })
    originalLog(...args)
  }
  console.error = (...args) => {
    logs.value.push({ type: 'error', msg: formatArgs(args), time: new Date().toLocaleTimeString() })
    originalError(...args)
  }
  console.warn = (...args) => {
    logs.value.push({ type: 'warn', msg: formatArgs(args), time: new Date().toLocaleTimeString() })
    originalWarn(...args)
  }
  
  window.addEventListener('error', (e) => {
    logs.value.push({ type: 'error', msg: e.message + ' ' + (e.filename || '') + ':' + (e.lineno || ''), time: new Date().toLocaleTimeString() })
  })

  window.addEventListener('unhandledrejection', (e) => {
    logs.value.push({ type: 'error', msg: 'Unhandled Promise: ' + String(e.reason), time: new Date().toLocaleTimeString() })
  })
})

onUnmounted(() => {
  console.log = originalLog
  console.error = originalError
  console.warn = originalWarn
})
</script>
