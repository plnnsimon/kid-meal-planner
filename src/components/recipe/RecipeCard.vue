<script setup lang="ts">
import type { Recipe } from '@/types'
import { MEAL_TYPE_LABELS } from '@/types'
import NutritionBadge from './NutritionBadge.vue'

defineProps<{ recipe: Recipe }>()
defineEmits<{ click: []; favorite: [] }>()
</script>

<template>
  <div
    class="bg-white rounded-2xl shadow-sm overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
    @click="$emit('click')"
  >
    <!-- Image -->
    <div class="relative h-36 bg-gray-100">
      <img
        v-if="recipe.imageUrl"
        :src="recipe.imageUrl"
        :alt="recipe.name"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-4xl">
        🍽️
      </div>

      <!-- Favourite button -->
      <button
        type="button"
        class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm"
        @click.stop="$emit('favorite')"
      >
        <span :class="recipe.isFavorite ? 'text-red-500' : 'text-gray-400'">
          {{ recipe.isFavorite ? '♥' : '♡' }}
        </span>
      </button>

      <!-- Meal type chips -->
      <div class="absolute bottom-2 left-2 flex gap-1 flex-wrap">
        <span
          v-for="mt in recipe.mealTypes"
          :key="mt"
          class="text-xs px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-sm"
        >
          {{ MEAL_TYPE_LABELS[mt] }}
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="p-3 space-y-2">
      <h3 class="font-semibold text-gray-900 leading-tight line-clamp-1">{{ recipe.name }}</h3>

      <!-- Time -->
      <div class="flex items-center gap-3 text-xs text-gray-400">
        <span v-if="recipe.prepTime || recipe.cookTime">
          ⏱ {{ recipe.prepTime + recipe.cookTime }} min
        </span>
        <span>🍽 {{ recipe.servings }} serving{{ recipe.servings !== 1 ? 's' : '' }}</span>
      </div>

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
  </div>
</template>
