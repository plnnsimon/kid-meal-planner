<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Recipe } from '@/types'
import { useAllergyCheck } from '@/composables/useAllergyCheck'
import { useIngredientsStore } from '@/stores/ingredients.store'

const { t } = useI18n()

defineProps<{
  recipe: Recipe
}>()

defineEmits<{
  close: []
}>()

const { hasAllergyConflict, conflictingAllergens } = useAllergyCheck()

const ingredients = useIngredientsStore()

onMounted(() => {
  ingredients.loadItems()
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 z-50 flex flex-col justify-end"
      @click.self="$emit('close')"
    >
      <div class="bg-white rounded-t-3xl max-h-[80vh] flex flex-col">

        <!-- Handle -->
        <div class="flex-shrink-0 pt-3 px-4 pb-2">
          <div class="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-3" />
          <div class="flex items-start justify-between gap-2">
            <h2 class="font-bold text-gray-900 text-base leading-tight flex-1">{{ recipe.name }}</h2>
            <button type="button" class="text-gray-400 text-lg p-1 leading-none shrink-0" @click="$emit('close')">✕</button>
          </div>
        </div>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto px-4 pb-8 space-y-4">

          <!-- Image -->
          <div v-if="recipe.imageUrl" class="w-full h-44 rounded-2xl overflow-hidden bg-gray-100">
            <img :src="recipe.imageUrl" class="w-full h-full object-cover" />
          </div>

          <!-- Description -->
          <p v-if="recipe.description" class="text-sm text-gray-600 leading-relaxed">
            {{ recipe.description }}
          </p>

          <!-- Time row -->
          <div v-if="recipe.prepTime || recipe.cookTime" class="flex gap-4">
            <div v-if="recipe.prepTime" class="flex flex-col items-center bg-gray-50 rounded-xl px-4 py-2 flex-1">
              <span class="text-xs text-gray-400">{{ t('recipePreview.prepTime') }}</span>
              <span class="text-sm font-semibold text-gray-800">{{ t('common.minLabel', { n: recipe.prepTime }) }}</span>
            </div>
            <div v-if="recipe.cookTime" class="flex flex-col items-center bg-gray-50 rounded-xl px-4 py-2 flex-1">
              <span class="text-xs text-gray-400">{{ t('recipePreview.cookTime') }}</span>
              <span class="text-sm font-semibold text-gray-800">{{ t('common.minLabel', { n: recipe.cookTime }) }}</span>
            </div>
            <div v-if="recipe.servings" class="flex flex-col items-center bg-gray-50 rounded-xl px-4 py-2 flex-1">
              <span class="text-xs text-gray-400">{{ t('recipePreview.servings') }}</span>
              <span class="text-sm font-semibold text-gray-800">{{ recipe.servings }}</span>
            </div>
          </div>

          <!-- Nutrition -->
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{{ t('recipePreview.nutrition') }}</p>
            <div class="grid grid-cols-4 gap-2">
              <div class="flex flex-col items-center bg-orange-50 rounded-xl py-2">
                <span class="text-sm font-bold text-orange-600">{{ recipe.nutrition.calories }}</span>
                <span class="text-xs text-gray-400">kcal</span>
              </div>
              <div class="flex flex-col items-center bg-blue-50 rounded-xl py-2">
                <span class="text-sm font-bold text-blue-600">{{ recipe.nutrition.protein }}g</span>
                <span class="text-xs text-gray-400">{{ t('recipePreview.protein') }}</span>
              </div>
              <div class="flex flex-col items-center bg-yellow-50 rounded-xl py-2">
                <span class="text-sm font-bold text-yellow-600">{{ recipe.nutrition.carbs }}g</span>
                <span class="text-xs text-gray-400">{{ t('recipePreview.carbs') }}</span>
              </div>
              <div class="flex flex-col items-center bg-red-50 rounded-xl py-2">
                <span class="text-sm font-bold text-red-500">{{ recipe.nutrition.fat }}g</span>
                <span class="text-xs text-gray-400">{{ t('recipePreview.fat') }}</span>
              </div>
            </div>
          </div>

          <!-- Ingredients -->
          <div v-if="recipe.ingredients.length">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{{ t('recipePreview.ingredients') }}</p>
            <div class="space-y-1">
              <div
                v-for="ingredient in recipe.ingredients"
                :key="ingredient.name"
                class="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0"
              >
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="text-sm text-gray-800">{{ ingredient.name }}</span>
                  <FontAwesomeIcon
                    v-if="ingredients.isTastedByName(ingredient.name)"
                    icon="check"
                    class="w-3 h-3 text-green-500 shrink-0"
                  />
                </div>
                <span class="text-sm text-gray-400 shrink-0 ml-2">{{ ingredient.amount }} {{ ingredient.unit }}</span>
              </div>
            </div>
          </div>

          <!-- Allergens -->
          <div v-if="recipe.allergens.length">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{{ t('recipePreview.allergens') }}</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="allergen in recipe.allergens"
                :key="allergen"
                class="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
              >{{ t('allergens.' + allergen, allergen) }}</span>
            </div>
          </div>

          <!-- Allergy conflict warning -->
          <div
            v-if="hasAllergyConflict(recipe)"
            class="flex items-start gap-2 bg-amber-50 rounded-xl p-3"
          >
            <span class="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
            <p class="text-xs text-amber-700">
              {{ t('recipePreview.allergyWarning', { allergens: conflictingAllergens(recipe).join(', ') }) }}
            </p>
          </div>

        </div>
      </div>
    </div>
  </Teleport>
</template>
