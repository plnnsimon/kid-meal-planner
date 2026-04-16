<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRecipeStore } from '@/stores/recipe.store'
import { useAllergyCheck } from '@/composables/useAllergyCheck'
import type { Recipe, MealType } from '@/types'

const { t } = useI18n()

const props = defineProps<{
  mealType: MealType
  dayLabel: string
}>()

defineEmits<{
  select: [recipe: Recipe]
  close: []
}>()

const recipeStore = useRecipeStore()
const { hasAllergyConflict, conflictingAllergens } = useAllergyCheck()

const search = ref('')
const showAll = ref(false)

onMounted(() => {
  if (!recipeStore.recipes.length) recipeStore.load()
  if (!recipeStore.savedRecipes.length) recipeStore.loadSavedRecipes()
})

const allRecipes = computed(() => {
  const seen = new Set<string>()
  const merged: typeof recipeStore.recipes = []
  for (const r of [...recipeStore.recipes, ...recipeStore.savedRecipes]) {
    if (!seen.has(r.id)) { seen.add(r.id); merged.push(r) }
  }
  return merged
})

const filtered = computed(() => {
  let list = allRecipes.value

  // Default: filter by meal type — toggle off with "Show all"
  if (!showAll.value) {
    list = list.filter(r => r.mealTypes.includes(props.mealType))
  }

  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter(r => r.name.toLowerCase().includes(q))
  }

  return list
})
</script>

<template>
  <!-- Backdrop -->
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 z-50 flex flex-col justify-end"
      @click.self="$emit('close')"
    >
      <!-- Sheet -->
      <div class="bg-white rounded-t-3xl max-h-[80vh] flex flex-col">

        <!-- Handle + header -->
        <div class="flex-shrink-0 px-4 pt-3 pb-2">
          <div class="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-3" />
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-400">{{ dayLabel }}</p>
              <h2 class="font-bold text-gray-900">{{ t('mealTypes.' + mealType) }}</h2>
            </div>
            <button type="button" class="text-gray-400 text-lg p-1" @click="$emit('close')">✕</button>
          </div>
        </div>

        <!-- Search -->
        <div class="px-4 pb-2 flex-shrink-0">
          <div class="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <FontAwesomeIcon icon="magnifying-glass" class="w-4 h-4 text-gray-400 shrink-0" />
            <input
              v-model="search"
              type="search"
              :placeholder="t('mealPicker.searchPlaceholder', { mealType: t('mealTypes.' + mealType).toLowerCase() })"
              class="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <button
            type="button"
            class="mt-2 text-xs text-primary-500 font-medium"
            @click="showAll = !showAll"
          >
            {{ showAll ? t('mealPicker.showMealType', { mealType: t('mealTypes.' + mealType) }) : t('mealPicker.showAll') }}
          </button>
        </div>

        <!-- Recipe list -->
        <div class="flex-1 overflow-y-auto px-4 pb-6 space-y-2">

          <div v-if="!filtered.length" class="text-center text-gray-400 text-sm py-8">
            {{ t('mealPicker.noRecipes') }}
          </div>

          <button
            v-for="recipe in filtered"
            :key="recipe.id"
            type="button"
            class="w-full flex items-center gap-3 p-3 rounded-2xl bg-gray-50 active:bg-gray-100 text-left transition-colors"
            @click="$emit('select', recipe)"
          >
            <!-- Thumb -->
            <div class="w-14 h-14 rounded-xl overflow-hidden bg-gray-200 shrink-0">
              <img v-if="recipe.imageUrl" :src="recipe.imageUrl" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 leading-tight truncate">{{ recipe.name }}</p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ recipe.nutrition.calories }} kcal
                <span v-if="recipe.prepTime || recipe.cookTime">
                  · {{ recipe.prepTime + recipe.cookTime }} min
                </span>
              </p>

              <!-- Allergy warning -->
              <p v-if="hasAllergyConflict(recipe)" class="text-xs text-amber-600 font-medium mt-0.5">
                {{ t('mealPicker.allergyWarning', { allergens: conflictingAllergens(recipe).join(', ') }) }}
              </p>
            </div>

            <FontAwesomeIcon icon="chevron-right" class="w-4 h-4 text-gray-300 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
