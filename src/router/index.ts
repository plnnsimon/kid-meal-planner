import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/plan',
    },
    {
      path: '/plan',
      name: 'week-plan',
      component: () => import('@/views/WeekPlanView.vue'),
    },
    {
      path: '/recipes',
      name: 'recipe-library',
      component: () => import('@/views/RecipeLibraryView.vue'),
    },
    {
      path: '/recipes/new',
      name: 'recipe-new',
      component: () => import('@/views/RecipeDetailView.vue'),
    },
    {
      path: '/recipes/:id',
      name: 'recipe-detail',
      component: () => import('@/views/RecipeDetailView.vue'),
    },
    {
      path: '/shopping',
      name: 'shopping-list',
      component: () => import('@/views/ShoppingListView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
    // Auth stub — not linked in nav yet
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
  ],
})

// ── Auth guard (disabled — enable when real auth is wired up) ─────────────────
// router.beforeEach(async (to) => {
//   const auth = useAuthStore()
//   if (!auth.isAuthenticated && to.name !== 'login') {
//     return { name: 'login' }
//   }
// })

export default router
