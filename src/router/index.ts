import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

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
      path: '/friends',
      name: 'friends',
      component: () => import('@/views/FriendsView.vue'),
    },
    {
      path: '/friends/:id',
      name: 'friend-profile',
      component: () => import('@/views/FriendProfileView.vue'),
    },
    {
      path: '/friends/:friendId/recipes/:recipeId',
      name: 'friend-recipe',
      component: () => import('@/views/FriendRecipeView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
  ],
})

// ── Auth guard ────────────────────────────────────────────────────────────────
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (!auth.isAuthenticated && to.name !== 'login') {
    return { name: 'login' }
  }
  if (auth.isAuthenticated && to.name === 'login') {
    return { name: 'week-plan' }
  }
})

export default router
