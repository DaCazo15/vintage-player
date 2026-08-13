import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import SignupView from '@/views/SignupView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true }
    },
    {
      path: '/signup',
      name: 'signup',
      component: SignupView,
      meta: { guestOnly: true }
    }
  ]
})

// Router Navigation Guard
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // Ensure Firebase Auth is initialized before evaluating the route
  let currentUser = authStore.user
  if (!authStore.isInitialized) {
    currentUser = await authStore.getCurrentUser()
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const guestOnly = to.matched.some(record => record.meta.guestOnly)

  if (requiresAuth && !currentUser) {
    return { name: 'login' }
  }
  if (guestOnly && currentUser) {
    return { name: 'home' }
  }
})

export default router
