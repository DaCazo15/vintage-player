import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './assets/theme.css'
import App from './App.vue'
import { useErrorStore } from './stores/errorStore'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

const errorStore = useErrorStore()

// 1. Vue Global Error Handler
app.config.errorHandler = (err: any, instance: any, info: string) => {
  console.warn('Vue Global Error caught:', err, info)
  errorStore.addError({
    type: 'vue',
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    componentName: instance?.$options?.name || instance?.$options?.__name || 'UnknownComponent'
  })
}

// 2. Global Unhandled Errors
window.addEventListener('error', (event) => {
  errorStore.addError({
    type: 'unhandled',
    message: event.message || 'Unknown runtime error',
    stack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`
  })
})

// 3. Global Unhandled Promise Rejections
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  errorStore.addError({
    type: 'promise',
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  })
})

// 4. Wrap console.error to capture caught errors without infinite recursion
const originalConsoleError = console.error
let isLoggingError = false
console.error = (...args: any[]) => {
  originalConsoleError.apply(console, args)
  
  if (isLoggingError) return
  isLoggingError = true
  try {
    const message = args.map(arg => {
      if (arg instanceof Error) return arg.message
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg) } catch { return String(arg) }
      }
      return String(arg)
    }).join(' ')
    
    const errorObj = args.find(arg => arg instanceof Error)
    
    errorStore.addError({
      type: 'console',
      message: message,
      stack: errorObj?.stack
    })
  } catch (e) {
    originalConsoleError.apply(console, ['Error in console.error wrapper:', e])
  } finally {
    isLoggingError = false
  }
}

app.mount('#app')
