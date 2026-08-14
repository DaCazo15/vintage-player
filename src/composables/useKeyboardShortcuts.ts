import { onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/playerStore'
import { usePlatform } from '@/composables/usePlatform'

export function useKeyboardShortcuts() {
  const playerStore = usePlayerStore()
  const { isTV } = usePlatform()

  const handleKeydown = (e: KeyboardEvent) => {
    // If it's TV, D-pad navigation handles keys. Do not interfere.
    if (isTV.value) return

    // Ignore if user is typing in an input, textarea, or select
    const activeEl = document.activeElement
    if (activeEl) {
      const tagName = activeEl.tagName.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return
      }
    }

    // Handle shortcuts
    switch (e.code) {
      case 'Space':
        e.preventDefault()
        playerStore.togglePlay()
        break
      case 'ArrowRight':
        e.preventDefault()
        playerStore.nextTrack()
        break
      case 'ArrowLeft':
        e.preventDefault()
        playerStore.prevTrack()
        break
      case 'ArrowUp':
        e.preventDefault()
        playerStore.setVolume(playerStore.volume + 0.05)
        break
      case 'ArrowDown':
        e.preventDefault()
        playerStore.setVolume(playerStore.volume - 0.05)
        break
      case 'KeyM':
        e.preventDefault()
        // Simple mute toggle implementation
        if (playerStore.volume > 0) {
          // Store volume somewhere or just set to 0. 
          // Assuming playerStore handles it, but since we just have setVolume:
          ;(playerStore as any)._preMuteVolume = playerStore.volume
          playerStore.setVolume(0)
        } else {
          playerStore.setVolume((playerStore as any)._preMuteVolume || 0.8)
        }
        break
      case 'KeyS':
        e.preventDefault()
        playerStore.toggleShuffle()
        break
      case 'KeyR':
        e.preventDefault()
        playerStore.toggleRepeat()
        break
    }
  }

  onMounted(() => {
    if (!isTV.value) {
      document.addEventListener('keydown', handleKeydown)
    }
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}
