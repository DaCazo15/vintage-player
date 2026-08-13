import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { auth } from '@/firebase/config'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth'
import type { User } from 'firebase/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = shallowRef<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)

  // Translate Firebase errors to Spanish
  function getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Este correo electrónico ya está registrado.'
      case 'auth/invalid-email':
        return 'El formato del correo electrónico no es válido.'
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.'
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Correo o contraseña incorrectos.'
      case 'auth/popup-closed-by-user':
        return 'Inicio de sesión cancelado por el usuario.'
      case 'auth/user-disabled':
        return 'Esta cuenta ha sido deshabilitada.'
      case 'auth/operation-not-allowed':
        return 'El inicio de sesión mediante este proveedor no está habilitado.'
      default:
        return 'Ocurrió un error inesperado. Por favor, inténtelo de nuevo.'
    }
  }

  // Action: Register with Email and Password
  async function registerWithEmail(email: string, password: string, displayName: string) {
    loading.value = true
    error.value = null
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, { displayName })
      // Sync user profile state
      user.value = auth.currentUser
    } catch (err: any) {
      error.value = getErrorMessage(err.code || '')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Action: Login with Email and Password
  async function loginWithEmail(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      user.value = credential.user
    } catch (err: any) {
      error.value = getErrorMessage(err.code || '')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Action: Login with Google
  async function loginWithGoogle() {
    loading.value = true
    error.value = null
    try {
      const provider = new GoogleAuthProvider()
      const credential = await signInWithPopup(auth, provider)
      user.value = credential.user
    } catch (err: any) {
      error.value = getErrorMessage(err.code || '')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Action: Login with GitHub
  async function loginWithGithub() {
    loading.value = true
    error.value = null
    try {
      const provider = new GithubAuthProvider()
      const credential = await signInWithPopup(auth, provider)
      user.value = credential.user
    } catch (err: any) {
      error.value = getErrorMessage(err.code || '')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Action: Logout
  async function logout() {
    loading.value = true
    error.value = null
    try {
      await signOut(auth)
      user.value = null
    } catch (err: any) {
      error.value = getErrorMessage(err.code || '')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Helper promise for Router Navigation Guards to await current user state
  function getCurrentUser(): Promise<User | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        unsubscribe()
        resolve(currentUser)
      })
    })
  }

  // Auto-subscribe to auth changes on store initialization
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
    isInitialized.value = true
  })

  return {
    user,
    loading,
    error,
    isInitialized,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    loginWithGithub,
    logout,
    getCurrentUser
  }
})
