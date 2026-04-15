<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useRecipeStore } from '@/stores/recipe.store'
import RecipeCard from '@/components/recipe/RecipeCard.vue'
import { MEAL_TYPES } from '@/types'
import type { MealType } from '@/types'

const { t } = useI18n()

const router = useRouter()
const recipeStore = useRecipeStore()

const search = ref('')
const activeFilter = ref<MealType | 'all' | 'favorites' | 'saved'>('all')

onMounted(() => {
  recipeStore.load()
  recipeStore.loadSavedRecipes()
  recipeStore.loadFavoriteIds()
})

const filtered = computed(() => {
  let list = recipeStore.recipes

  if (activeFilter.value === 'favorites') {
    list = list.filter(r => r.isFavorite)
  } else if (activeFilter.value === 'saved') {
    list = recipeStore.savedRecipes
  } else if (activeFilter.value !== 'all') {
    list = list.filter(r => r.mealTypes.includes(activeFilter.value as MealType))
  }

  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter(r => r.name.toLowerCase().includes(q))
  }

  return list
})

function openRecipe(id: string) {
  router.push({ name: 'recipe-detail', params: { id } })
}
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- Search bar -->
    <div class="px-4 pt-4 pb-2">
      <div class="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
        <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="search"
          type="search"
          :placeholder="t('recipeLibrary.searchPlaceholder')"
          class="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
        />
      </div>
    </div>

    <!-- Filter chips -->
    <div class="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
      <button
        v-for="f in (['all', ...MEAL_TYPES, 'favorites', 'saved'] as const)"
        :key="f"
        type="button"
        class="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
        :class="activeFilter === f
          ? 'bg-primary-500 border-primary-500 text-white'
          : 'bg-white border-gray-200 text-gray-600'"
        @click="activeFilter = f"
      >
        {{ f === 'all' ? t('recipeLibrary.filterAll') : f === 'favorites' ? t('recipeLibrary.filterSaved') : f === 'saved' ? t('recipeLibrary.filterBookmarked') : t('mealTypes.' + f) }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="recipeStore.loading" class="flex-1 flex items-center justify-center">
      <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!filtered.length" class="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3 p-8">
      <span class="text-5xl">🍳</span>
      <p class="font-medium">{{ t('recipeLibrary.emptyNoRecipes') }}</p>
      <p class="text-sm text-center">
        {{ search || activeFilter !== 'all' ? t('recipeLibrary.emptyFilter') : t('recipeLibrary.emptyStart') }}
      </p>
    </div>

    <!-- Recipe grid -->
    <div v-else class="flex-1 overflow-y-auto px-4">
      <div class="grid grid-cols-2 gap-3 pb-4">
        <RecipeCard
          v-for="recipe in filtered"
          :key="recipe.id"
          :recipe="recipe"
          :view-only="activeFilter === 'saved'"
          :saved="recipeStore.isSaved(recipe.id)"
          @click="openRecipe(recipe.id)"
          @favorite="recipeStore.toggleFavorite(recipe.id)"
          @delete="recipeStore.remove(recipe.id)"
          @save="recipeStore.isSaved(recipe.id) ? recipeStore.unsaveFavorite(recipe.id) : recipeStore.saveFavorite(recipe.id)"
        />
      </div>
    </div>

    <!-- FAB -->
    <RouterLink
      to="/recipes/new"
      class="fixed bottom-20 right-4 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl active:scale-95 transition-transform z-30"
    >
      +
    </RouterLink>
  </div>
</template>
