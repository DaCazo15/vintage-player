import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'

export function usePlatform() {
  const isTV = ref(false)
  const isNative = ref(false)
  const isWeb = ref(true)
  const isMobile = ref(false)

  // 1. Detect if running natively in Capacitor
  isNative.value = Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'web'

  // 2. Detect if running on TV
  const ua = navigator.userAgent.toLowerCase()
  const isTvUA = ua.includes('tv') || 
                  ua.includes('googletv') || 
                  ua.includes('androidtv') || 
                  ua.includes('leanback') || 
                  ua.includes('smarttv') || 
                  ua.includes('chromecast') ||
                  ua.includes('firetv')
                  
  // Aspect-ratio and touch properties helper for TV
  const isTvScreen = window.screen.width >= 960 && !('ontouchstart' in window)

  // Developer override helper to test TV mode easily in browser: ?tv=true
  const urlParams = new URLSearchParams(window.location.search)
  const forceTV = urlParams.get('tv') === 'true' || localStorage.getItem('force-tv') === 'true'

  isTV.value = (isNative.value && (isTvUA || isTvScreen)) || forceTV
  isWeb.value = !isNative.value
  
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)
  isMobile.value = isMobileUA || (isNative.value && !isTV.value)

  return {
    isTV,
    isNative,
    isWeb,
    isMobile
  }
}
