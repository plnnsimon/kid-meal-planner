<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const titles: Record<string, string> = {
  'week-plan': 'Week Plan',
  'recipe-library': 'Recipes',
  'recipe-new': 'New Recipe',
  'recipe-detail': 'Recipe',
  'shopping-list': 'Shopping List',
  'settings': 'Settings',
  'login': 'Login',
}

const backRoutes = new Set(['recipe-new', 'recipe-detail'])
const showBack = () => backRoutes.has(String(route.name))
</script>

<template>
  <header class="sticky top-0 z-40 bg-white border-b border-gray-200">
    <div class="flex items-center h-14 px-4 gap-3">
      <button
        v-if="showBack()"
        type="button"
        class="text-gray-500 mr-1 -ml-1 p-1"
        @click="router.back()"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <span v-else class="text-2xl">🥗</span>
      <h1 class="text-lg font-bold text-gray-900 flex-1">
        {{ titles[String(route.name)] ?? 'Kid Meal Planner' }}
      </h1>
    </div>
  </header>
</template>
