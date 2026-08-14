<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { usePlayerStore } from '@/stores/playerStore'

const props = withDefaults(defineProps<{
  width?: number
  height?: number
  barCount?: number
  barColor?: string
  gap?: number
}>(), {
  width: 24,
  height: 20,
  barCount: 5,
  barColor: 'var(--color-mustard)',
  gap: 2
})

const playerStore = usePlayerStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number | null = null

const draw = () => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const data = playerStore.getFrequencyData()
  const width = canvas.width
  const height = canvas.height
  const count = props.barCount
  const gap = props.gap
  
  // Retro aesthetic: round to integers so bars are pixel-perfect
  const barWidth = Math.max(1, Math.floor((width - gap * (count - 1)) / count))
  // Center drawing horizontally if there's remaining space
  const totalContentWidth = count * barWidth + (count - 1) * gap
  const startX = Math.floor((width - totalContentWidth) / 2)

  ctx.clearRect(0, 0, width, height)
  
  for (let i = 0; i < count; i++) {
    let barHeight = 2 // Resting height
    if (playerStore.isPlaying) {
      // Avoid the very first low freq bins and the very highest empty bins
      // 32 bins total. Let's sample from index 2 to 24.
      const startBin = 2
      const endBin = 24
      const range = endBin - startBin
      const dataIndex = startBin + Math.floor(i * (range / count))
      
      const value = data[dataIndex] || 0
      const percent = value / 255
      barHeight = Math.max(Math.floor(percent * height), 2)
    }

    const x = startX + i * (barWidth + gap)
    const y = height - barHeight

    ctx.fillStyle = props.barColor
    ctx.fillRect(x, y, barWidth, barHeight)
  }

  if (playerStore.isPlaying) {
    animationFrameId = requestAnimationFrame(draw)
  }
}

watch(() => playerStore.isPlaying, (isPlaying) => {
  if (isPlaying) {
    if (!animationFrameId) {
      draw()
    }
  } else {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    // Draw one last time to settle
    draw()
  }
})

onMounted(() => {
  draw()
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<template>
  <canvas 
    ref="canvasRef" 
    :width="width" 
    :height="height"
    class="block"
  ></canvas>
</template>
