<script setup lang="ts">
defineProps<{
  title: string
  isSpinning: boolean
}>()
</script>

<template>
  <div class="relative w-64 h-36 bg-petrol border-4 border-coffee rounded-2xl p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(92,61,46,1)] mb-6 select-none">
    <!-- Cassette Tape Lines and details -->
    <div class="w-full h-1/2 bg-cream border-2 border-coffee rounded-lg flex items-center justify-between px-6 relative overflow-hidden">
      <!-- Tape Reels -->
      <div class="w-8 h-8 rounded-full border-4 border-coffee bg-paper flex items-center justify-center relative">
        <div 
          :class="[
            'w-4 h-4 rounded-full border-2 border-dashed border-coffee bg-cream',
            isSpinning ? 'spin-reels' : ''
          ]"
        ></div>
      </div>
      
      <!-- Middle Window -->
      <div class="w-16 h-6 bg-petrol/15 border-2 border-coffee rounded flex items-center justify-center overflow-hidden">
        <div class="w-10 h-0.5 bg-coffee/80"></div>
      </div>
      
      <div class="w-8 h-8 rounded-full border-4 border-coffee bg-paper flex items-center justify-center relative">
        <div 
          :class="[
            'w-4 h-4 rounded-full border-2 border-dashed border-coffee bg-cream',
            isSpinning ? 'spin-reels' : ''
          ]"
        ></div>
      </div>
    </div>
    
    <!-- Label Area -->
    <div class="w-full bg-mustard border-2 border-coffee rounded-md px-2 py-0.5 text-center truncate">
      <span class="font-pixelify text-[10px] text-cream uppercase tracking-widest font-bold">
        {{ title || 'Retro Receiver' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spin-reels {
  animation: spin 3s linear infinite;
}
</style>
