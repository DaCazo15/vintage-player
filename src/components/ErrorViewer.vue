<script setup lang="ts">
import { useErrorStore } from '@/stores/errorStore'
import { storeToRefs } from 'pinia'

const errorStore = useErrorStore()
const { errors } = storeToRefs(errorStore)
const { clearErrors } = errorStore
</script>

<template>
  <div v-if="errors.length > 0" class="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-y-auto bg-red-900 text-white rounded-lg shadow-lg p-4 border border-red-700">
    <div class="flex justify-between items-center mb-2">
      <h3 class="font-bold text-lg">App Errors ({{ errors.length }})</h3>
      <button @click="clearErrors" class="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-sm transition-colors">
        Clear All
      </button>
    </div>
    
    <div class="space-y-3">
      <div v-for="error in errors" :key="error.id" class="bg-red-800 p-3 rounded text-sm">
        <div class="flex justify-between text-red-300 text-xs mb-1">
          <span class="uppercase font-bold">{{ error.type }}</span>
          <span>{{ new Date(error.timestamp).toLocaleTimeString() }}</span>
        </div>
        <div class="font-semibold mb-1">{{ error.message }}</div>
        <div v-if="error.componentName" class="text-xs text-red-200 mb-1">
          Component: {{ error.componentName }}
        </div>
        <div v-if="error.stack" class="text-xs font-mono bg-red-950 p-2 rounded mt-2 overflow-x-auto whitespace-pre-wrap opacity-80">
          {{ error.stack }}
        </div>
      </div>
    </div>
  </div>
</template>
