import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'

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
      path: '/friends/:friendId/tasted',
      name: 'friend-tasted',
      component: () => import('@/views/FriendTastedView.vue'),
    },
    {
      path: '/friends/:friendId/recipes/:recipeId',
      name: 'friend-recipe',
      component: () => import('@/views/FriendRecipeView.vue'),
    },
    {
      path: '/tasted-ingredients',
      name: 'tasted-ingredients',
      component: () => import('@/views/TastedIngredientsView.vue'),
    },
    {
      path: '/planner/chat',
      name: 'ai-planner',
      component: () => import('@/views/AIPlannerView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
    {
      path: '/admin',
      redirect: '/admin/users',
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      meta: { requiresAdmin: true },
      children: [
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/views/admin/AdminUsersView.vue'),
        },
        {
          path: 'feedback',
          name: 'admin-feedback',
          component: () => import('@/views/admin/AdminFeedbackView.vue'),
        },
      ],
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

  if (to.meta.requiresAdmin) {
    if (!auth.userId) return { path: '/' }
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.userId)
      .single()
    if (data?.role !== 'admin') return { path: '/' }
  }
})

export default router
