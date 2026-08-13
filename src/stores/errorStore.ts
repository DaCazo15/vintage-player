import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface AppError {
  id: string
  timestamp: Date
  type: 'vue' | 'unhandled' | 'promise' | 'console'
  message: string
  stack?: string
  componentName?: string
}

export const useErrorStore = defineStore('error', () => {
  const errors = ref<AppError[]>([])

  function addError(error: Omit<AppError, 'id' | 'timestamp'>) {
    errors.value.push({
      ...error,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date()
    })
  }

  function clearErrors() {
    errors.value = []
  }

  return {
    errors,
    addError,
    clearErrors
  }
})
