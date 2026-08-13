<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { animate } from 'animejs'
import { MorphIcon } from 'morphicons/vue'
import { Google, Github } from '@/assets/brandIcons'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const formError = ref<string | null>(null)

// DOM refs for button animations
const submitBtn = ref<HTMLElement | null>(null)
const googleBtn = ref<HTMLElement | null>(null)
const githubBtn = ref<HTMLElement | null>(null)

// Button hover effect
const handleHover = (el: HTMLElement | null, scale: number) => {
  if (!el) return
  animate(el, {
    scale: scale,
    duration: 250,
    ease: 'outQuad'
  })
}

// Basic form validation
const validateForm = () => {
  formError.value = null
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email.value || !emailRegex.test(email.value)) {
    formError.value = 'Por favor, ingrese un correo electrónico válido.'
    return false
  }
  if (!password.value || password.value.length < 6) {
    formError.value = 'La contraseña debe tener al menos 6 caracteres.'
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (!validateForm()) return
  try {
    await authStore.loginWithEmail(email.value, password.value)
    router.push({ name: 'home' })
  } catch (err) {
    // Error is handled in the store
  }
}

const handleGoogleLogin = async () => {
  try {
    await authStore.loginWithGoogle()
    router.push({ name: 'home' })
  } catch (err) {
    // Error is handled in the store
  }
}

const handleGithubLogin = async () => {
  try {
    await authStore.loginWithGithub()
    router.push({ name: 'home' })
  } catch (err) {
    // Error is handled in the store
  }
}
</script>

<template>
  <div class="flex-1 flex items-center justify-center p-6 select-none">
    <div class="w-full max-w-md bg-paper border-4 border-coffee rounded-3xl p-8 shadow-[8px_8px_0px_0px_rgba(92,61,46,1)]">
      <!-- Title -->
      <div class="text-center mb-8">
        <h1 class="font-pixelify text-4xl font-bold tracking-wider text-petrol">
          VINTAGE PLAYER
        </h1>
        <p class="font-roboto text-xs uppercase tracking-widest text-coffee mt-2">
          Iniciar Sesión
        </p>
      </div>

      <!-- Error display -->
      <div 
        v-if="authStore.error || formError" 
        class="bg-terracotta/10 border-2 border-terracotta text-terracotta p-4 rounded-xl text-sm font-roboto font-bold mb-6 text-center"
      >
        {{ formError || authStore.error }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div>
          <label for="email" class="block font-roboto text-xs font-bold text-coffee uppercase tracking-wider mb-2">
            Correo Electrónico
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="ejemplo@correo.com"
            required
            :disabled="authStore.loading"
            class="w-full px-4 py-3 bg-cream border-2 border-coffee rounded-xl font-roboto text-petrol placeholder-coffee/40 outline-none focus:border-mustard transition-colors duration-200"
          />
        </div>

        <div>
          <label for="password" class="block font-roboto text-xs font-bold text-coffee uppercase tracking-wider mb-2">
            Contraseña
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            required
            :disabled="authStore.loading"
            class="w-full px-4 py-3 bg-cream border-2 border-coffee rounded-xl font-roboto text-petrol placeholder-coffee/40 outline-none focus:border-mustard transition-colors duration-200"
          />
        </div>

        <!-- Submit Button -->
        <button
          ref="submitBtn"
          type="submit"
          :disabled="authStore.loading"
          @mouseenter="handleHover(submitBtn, 1.03)"
          @mouseleave="handleHover(submitBtn, 1.0)"
          class="w-full py-3 bg-mustard hover:bg-terracotta text-cream font-roboto font-bold border-2 border-coffee rounded-xl shadow-[4px_4px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="authStore.loading">Cargando...</span>
          <span v-else>Entrar</span>
        </button>
      </form>

      <!-- Divider -->
      <div class="relative flex py-5 items-center">
        <div class="grow border-t border-coffee/30"></div>
        <span class="shrink mx-4 text-xs font-roboto text-coffee uppercase tracking-wider">o continuar con</span>
        <div class="grow border-t border-coffee/30"></div>
      </div>

      <!-- Social Logins -->
      <div class="flex gap-4">
        <!-- Google Login -->
        <button
          ref="googleBtn"
          type="button"
          :disabled="authStore.loading"
          @click="handleGoogleLogin"
          @mouseenter="handleHover(googleBtn, 1.04)"
          @mouseleave="handleHover(googleBtn, 1.0)"
          class="flex-1 flex items-center justify-center gap-2 py-3 bg-cream hover:bg-cream/80 text-petrol font-roboto font-bold border-2 border-coffee rounded-xl shadow-[4px_4px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          <MorphIcon :icon="Google" size="18" color="currentColor" stroke-width="2.5" />
          <span>Google</span>
        </button>

        <!-- Github Login -->
        <button
          ref="githubBtn"
          type="button"
          :disabled="authStore.loading"
          @click="handleGithubLogin"
          @mouseenter="handleHover(githubBtn, 1.04)"
          @mouseleave="handleHover(githubBtn, 1.0)"
          class="flex-1 flex items-center justify-center gap-2 py-3 bg-cream hover:bg-cream/80 text-petrol font-roboto font-bold border-2 border-coffee rounded-xl shadow-[4px_4px_0px_0px_rgba(92,61,46,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          <MorphIcon :icon="Github" size="18" color="currentColor" stroke-width="2.5" />
          <span>GitHub</span>
        </button>
      </div>

      <!-- Footer navigation -->
      <div class="text-center mt-8">
        <p class="font-roboto text-sm text-coffee">
          ¿No tienes una cuenta?
          <router-link to="/signup" class="font-bold text-petrol hover:text-terracotta underline ml-1">
            Crea una cuenta aquí
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>
