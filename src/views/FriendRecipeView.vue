<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'
import { useRecipeStore } from '@/stores/recipe.store'
import { useIngredientsStore } from '@/stores/ingredients.store'
import NutritionBadge from '@/components/recipe/NutritionBadge.vue'
import type { Recipe } from '@/types'

const route = useRoute()
const { t } = useI18n()
const recipeStore = useRecipeStore()
const ingredients = useIngredientsStore()

const friendId = route.params.friendId as string
const recipeId = route.params.recipeId as string

const recipe = ref<Recipe | null>(null)
const loading = ref(true)

onMounted(async () => {
  if (!ingredients.isLoaded) ingredients.load()

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .eq('user_id', friendId)
    .maybeSingle()

  if (!error && data) {
    recipe.value = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description ?? '',
      imageUrl: data.image_url ?? null,
      mealTypes: data.meal_types ?? [],
      prepTime: data.prep_time ?? 0,
      cookTime: data.cook_time ?? 0,
      servings: data.servings ?? 1,
      nutrition: data.nutrition ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
      ingredients: data.ingredients ?? [],
      instructions: data.instructions ?? [],
      allergens: data.allergens ?? [],
      tags: data.tags ?? [],
      isFavorite: data.is_favorite ?? false,
      avgRating: data.avg_rating ?? 0,
      ratingsCount: data.ratings_count ?? 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  await recipeStore.loadFavoriteIds()
  loading.value = false
})

function toggleSave() {
  if (!recipe.value) return
  if (recipeStore.isSaved(recipe.value.id)) {
    recipeStore.unsaveFavorite(recipe.value.id)
  } else {
    recipeStore.saveFavorite(recipe.value.id)
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-4 space-y-4">

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else-if="recipe">

      <!-- Image -->
      <div class="relative w-full h-56 rounded-2xl overflow-hidden bg-gray-100">
        <img
          v-if="recipe.imageUrl"
          :src="recipe.imageUrl"
          :alt="recipe.name"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full flex items-center justify-center text-6xl">
          🍽️
        </div>

        <!-- Save button -->
        <button
          type="button"
          class="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm"
          @click="toggleSave"
        >
          <span :class="recipeStore.isSaved(recipe.id) ? 'text-primary-500' : 'text-gray-400'">
            {{ recipeStore.isSaved(recipe.id) ? '🔖' : '🏷️' }}
          </span>
        </button>

        <!-- Meal type chips -->
        <div class="absolute bottom-3 left-3 flex gap-1 flex-wrap">
          <span
            v-for="mt in recipe.mealTypes"
            :key="mt"
            class="text-xs px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-sm"
          >
            {{ mt }}
          </span>
        </div>
      </div>

      <!-- Name + meta -->
      <div class="bg-white rounded-2xl shadow-sm px-4 py-4 space-y-3">
        <h2 class="text-xl font-bold text-gray-900">{{ recipe.name }}</h2>

        <div class="flex items-center gap-4 text-sm text-gray-500">
          <span v-if="recipe.prepTime || recipe.cookTime">
            ⏱ {{ recipe.prepTime + recipe.cookTime }} {{ t('common.minLabel', { n: recipe.prepTime + recipe.cookTime }) }}
          </span>
          <span>🍽 {{ t('common.servingLabel', recipe.servings) }}</span>
        </div>

        <p v-if="recipe.description" class="text-sm text-gray-600 leading-relaxed">
          {{ recipe.description }}
        </p>

        <!-- Nutrition -->
        <NutritionBadge :nutrition="recipe.nutrition" />

        <!-- Allergens -->
        <div v-if="recipe.allergens.length" class="flex flex-wrap gap-1">
          <span
            v-for="a in recipe.allergens"
            :key="a"
            class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
          >
            ⚠️ {{ a }}
          </span>
        </div>
      </div>

      <!-- Ingredients -->
      <div v-if="recipe.ingredients.length" class="bg-white rounded-2xl shadow-sm px-4 py-4 space-y-2">
        <h3 class="text-sm font-semibold text-gray-700">{{ t('friendRecipe.ingredients') }}</h3>
        <ul class="space-y-1.5">
          <li
            v-for="(ing, i) in recipe.ingredients"
            :key="i"
            class="flex items-center gap-2 text-sm text-gray-700"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0 mt-0.5" />
            <span class="flex items-center gap-1.5 flex-wrap">
              <span class="font-medium">{{ ing.name }}</span>
              <FontAwesomeIcon
                v-if="ingredients.isTastedByName(ing.name)"
                icon="check"
                class="w-3 h-3 text-green-500 shrink-0"
              />
              <span v-if="ing.amount" class="text-gray-400"> — {{ ing.amount }}{{ ing.unit }}</span>
            </span>
          </li>
        </ul>
      </div>

      <!-- Instructions -->
      <div v-if="recipe.instructions.length" class="bg-white rounded-2xl shadow-sm px-4 py-4 space-y-3">
        <h3 class="text-sm font-semibold text-gray-700">{{ t('friendRecipe.instructions') }}</h3>
        <ol class="space-y-3">
          <li
            v-for="(step, i) in recipe.instructions"
            :key="i"
            class="flex gap-3 text-sm text-gray-700"
          >
            <span class="shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 font-semibold flex items-center justify-center text-xs">
              {{ i + 1 }}
            </span>
            <p class="leading-relaxed pt-0.5">{{ step }}</p>
          </li>
        </ol>
      </div>

    </template>

    <!-- Not found -->
    <div v-else class="text-center py-16 text-gray-400 text-sm">
      {{ t('friendRecipe.notFound') }}
    </div>

  </div>
</template>
