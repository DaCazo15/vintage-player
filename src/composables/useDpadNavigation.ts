export function useDpadNavigation() {
  function handleDpadKeyDown(e: KeyboardEvent) {
    const activeEl = document.activeElement as HTMLElement
    if (!activeEl) return

    // Standard remote navigation keys
    const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
    if (!isArrow) return

    // Special exception for input range sliders: let ArrowLeft/Right change values,
    // only use ArrowUp/Down to navigate away.
    if (activeEl instanceof HTMLInputElement && activeEl.type === 'range') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Return and allow native slider behavior
        return
      }
    }

    // Query all potentially focusable elements
    const candidates = Array.from(
      document.querySelectorAll('button, a, input, select, textarea, [tabindex="0"]')
    ) as HTMLElement[]

    // Filter out inactive/hidden/disabled elements
    const focusableElements = candidates.filter((el) => {
      if (el === activeEl) return false
      if (el.hasAttribute('disabled')) return false
      
      // Check tabindex is not -1
      const tabIndexAttr = el.getAttribute('tabindex')
      if (tabIndexAttr === '-1') return false

      // Check visibility in DOM
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return false

      // Verify computed styling is not display: none, visibility: hidden, or fully transparent
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false

      // Prevent navigating to closed debug console elements
      const inClosedDebug = el.closest('#debug-drawer') && !el.closest('#debug-drawer')?.classList.contains('translate-y-0')
      if (inClosedDebug) return false

      return true
    })

    if (focusableElements.length === 0) return

    const activeRect = activeEl.getBoundingClientRect()
    const activeCenterX = activeRect.left + activeRect.width / 2
    const activeCenterY = activeRect.top + activeRect.height / 2

    let bestElement: HTMLElement | null = null
    let bestScore = Infinity

    for (const el of focusableElements) {
      const rect = el.getBoundingClientRect()
      const elCenterX = rect.left + rect.width / 2
      const elCenterY = rect.top + rect.height / 2

      const dx = elCenterX - activeCenterX
      const dy = elCenterY - activeCenterY

      let isCorrectDirection = false
      let score = 0

      // Distance calculation: prioritize horizontal alignment for left/right
      // and vertical alignment for up/down.
      if (e.key === 'ArrowRight') {
        isCorrectDirection = dx > 5 // Must be to the right (with small margin)
        score = dx + Math.abs(dy) * 2.5
      } else if (e.key === 'ArrowLeft') {
        isCorrectDirection = dx < -5 // Must be to the left (with small margin)
        score = -dx + Math.abs(dy) * 2.5
      } else if (e.key === 'ArrowDown') {
        isCorrectDirection = dy > 5 // Must be below
        score = dy + Math.abs(dx) * 2.5
      } else if (e.key === 'ArrowUp') {
        isCorrectDirection = dy < -5 // Must be above
        score = -dy + Math.abs(dx) * 2.5
      }

      if (isCorrectDirection) {
        if (score < bestScore) {
          bestScore = score
          bestElement = el
        }
      }
    }

    if (bestElement) {
      bestElement.focus()
      
      // Scroll focused element into view smoothly if out of viewport
      bestElement.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
      
      e.preventDefault()
    }
  }

  return {
    handleDpadKeyDown
  }
}
