<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RecipePayload } from '@/stores/recipe.store'
import { MEAL_TYPES, COMMON_ALLERGENS, INGREDIENT_CATEGORIES } from '@/types'
import type { Ingredient, MealType, IngredientCategory, NutritionInfo } from '@/types'

const { t } = useI18n()
import ImageUpload from '@/components/common/ImageUpload.vue'
import NutritionBadge from './NutritionBadge.vue'
import IngredientPicker from './IngredientPicker.vue'
import AppInput from '@/components/common/AppInput.vue'

const props = defineProps<{
  modelValue: RecipePayload
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: RecipePayload]
  'image-change': [file: File]
  submit: []
}>()

// Local copy so we can mutate freely and emit on change
const form = ref<RecipePayload>(JSON.parse(JSON.stringify(props.modelValue)))

watch(() => props.modelValue, (v) => {
  form.value = JSON.parse(JSON.stringify(v))
}, { deep: true })

function patch<K extends keyof RecipePayload>(key: K, value: RecipePayload[K]) {
  form.value[key] = value
  emit('update:modelValue', JSON.parse(JSON.stringify(form.value)))
}

// ── Meal types ───────────────────────────────────────────────────────────────

function toggleMealType(mt: MealType) {
  const next = form.value.mealTypes.includes(mt)
    ? form.value.mealTypes.filter(m => m !== mt)
    : [...form.value.mealTypes, mt]
  patch('mealTypes', next)
}

// ── Allergens ─────────────────────────────────────────────────────────────────

function toggleAllergen(a: string) {
  const next = form.value.allergens.includes(a)
    ? form.value.allergens.filter(x => x !== a)
    : [...form.value.allergens, a]
  patch('allergens', next)
}

// ── Ingredients ───────────────────────────────────────────────────────────────

function onIngredientAdded(ingredient: Ingredient) {
  form.value.ingredients.push(ingredient)
  applyAutoNutrition()
  emit('update:modelValue', JSON.parse(JSON.stringify(form.value)))
}

function removeIngredient(idx: number) {
  form.value.ingredients = form.value.ingredients.filter((_, i) => i !== idx)
  applyAutoNutrition()
  emit('update:modelValue', JSON.parse(JSON.stringify(form.value)))
}

function updateIngredient(idx: number, field: keyof Ingredient, value: string | number) {
  form.value.ingredients = form.value.ingredients.map((ing, i) =>
    i === idx ? { ...ing, [field]: value } : ing,
  ) as Ingredient[]
  applyAutoNutrition()
  emit('update:modelValue', JSON.parse(JSON.stringify(form.value)))
}

// ── Auto-nutrition ────────────────────────────────────────────────────────────

const nutritionAutoMode = ref(true)

function toGrams(amount: number, unit: string): number | null {
  const u = unit.trim().toLowerCase()
  if (['g', 'gr', 'gram', 'grams'].includes(u)) return amount
  if (['kg', 'kilogram', 'kilograms'].includes(u)) return amount * 1000
  if (['ml', 'milliliter', 'millilitre', 'milliliters', 'millilitres'].includes(u)) return amount
  if (['l', 'liter', 'litre', 'liters', 'litres'].includes(u)) return amount * 1000
  if (['oz', 'ounce', 'ounces'].includes(u)) return amount * 28.35
  if (['lb', 'lbs', 'pound', 'pounds'].includes(u)) return amount * 453.59
  if (['tsp', 'teaspoon', 'teaspoons'].includes(u)) return amount * 5
  if (['tbsp', 'tablespoon', 'tablespoons'].includes(u)) return amount * 15
  if (['cup', 'cups'].includes(u)) return amount * 240
  if (['piece', 'pieces', 'pc', 'pcs', 'whole'].includes(u)) return amount * 100
  return null
}

function computeNutritionFromIngredients(): NutritionInfo | null {
  const servings = form.value.servings || 1
  let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0, sugar = 0
  let hasAnyData = false

  for (const ing of form.value.ingredients) {
    if (ing.caloriesPer100g == null) continue
    const grams = toGrams(ing.amount, ing.unit)
    if (grams == null) continue
    const factor = grams / 100
    calories += (ing.caloriesPer100g ?? 0) * factor
    protein  += (ing.proteinPer100g  ?? 0) * factor
    carbs    += (ing.carbsPer100g    ?? 0) * factor
    fat      += (ing.fatPer100g      ?? 0) * factor
    fiber    += (ing.fiberPer100g    ?? 0) * factor
    sugar    += (ing.sugarPer100g    ?? 0) * factor
    hasAnyData = true
  }

  if (!hasAnyData) return null

  return {
    calories: Math.round(calories / servings),
    protein:  Math.round((protein  / servings) * 10) / 10,
    carbs:    Math.round((carbs    / servings) * 10) / 10,
    fat:      Math.round((fat      / servings) * 10) / 10,
    fiber:    Math.round((fiber    / servings) * 10) / 10,
    sugar:    Math.round((sugar    / servings) * 10) / 10,
  }
}

// Mutates form.value.nutrition in place — no emit, caller handles that
function applyAutoNutrition() {
  if (!nutritionAutoMode.value) return
  const computed = computeNutritionFromIngredients()
  form.value.nutrition = computed ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
}

function onNutritionManualEdit(field: keyof NutritionInfo, value: number) {
  nutritionAutoMode.value = false
  patch('nutrition', { ...form.value.nutrition, [field]: value })
}

const hasMissingNutritionData = computed(() =>
  nutritionAutoMode.value &&
  form.value.ingredients.some(ing => ing.caloriesPer100g == null)
)

function enableAutoNutrition() {
  nutritionAutoMode.value = true
  applyAutoNutrition()
  emit('update:modelValue', JSON.parse(JSON.stringify(form.value)))
}

function patchServings(value: number) {
  form.value.servings = value
  applyAutoNutrition()
  emit('update:modelValue', JSON.parse(JSON.stringify(form.value)))
}

// ── Instructions ─────────────────────────────────────────────────────────────

function addStep() {
  patch('instructions', [...form.value.instructions, ''])
}

function removeStep(idx: number) {
  patch('instructions', form.value.instructions.filter((_, i) => i !== idx))
}

function updateStep(idx: number, value: string) {
  patch('instructions', form.value.instructions.map((s, i) => (i === idx ? value : s)))
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="$emit('submit')">

    <!-- ── Photo ──────────────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm p-4">
      <ImageUpload
        :current-url="form.imageUrl"
        shape="rect"
        :placeholder="t('recipeForm.addPhoto')"
        @change="$emit('image-change', $event)"
      />
    </section>

    <!-- ── Basic info ─────────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
      <div class="px-4 py-3">
        <AppInput
          :label="t('recipeForm.nameLabel')"
          :model-value="form.name"
          type="text"
          :placeholder="t('recipeForm.namePlaceholder')"
          required
          @update:model-value="patch('name', $event)"
        />
      </div>
      <div class="px-4 py-3">
        <label class="block text-xs font-medium text-gray-400 mb-1">{{ t('recipeForm.descriptionLabel') }}</label>
        <textarea
          :value="form.description"
          :placeholder="t('recipeForm.descriptionPlaceholder')"
          rows="2"
          class="w-full text-sm text-gray-900 outline-none resize-none placeholder-gray-300"
          @input="patch('description', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </section>

    <!-- ── Meal types ─────────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm p-4 space-y-2">
      <label class="block text-xs font-medium text-gray-400">{{ t('recipeForm.mealTypesLabel') }}</label>
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="mt in MEAL_TYPES"
          :key="mt"
          type="button"
          class="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
          :class="form.mealTypes.includes(mt)
            ? 'bg-primary-500 border-primary-500 text-white'
            : 'bg-white border-gray-300 text-gray-600'"
          @click="toggleMealType(mt)"
        >
          {{ t('mealTypes.' + mt) }}
        </button>
      </div>
    </section>

    <!-- ── Time & servings ────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
      <div class="flex items-center px-4 py-3 gap-3">
        <label class="text-sm text-gray-500 w-28 shrink-0">{{ t('recipeForm.prepTimeLabel') }}</label>
        <input
          :value="form.prepTime"
          type="number" min="0" max="480"
          class="flex-1 text-sm text-gray-900 text-right outline-none"
          @input="patch('prepTime', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="flex items-center px-4 py-3 gap-3">
        <label class="text-sm text-gray-500 w-28 shrink-0">{{ t('recipeForm.cookTimeLabel') }}</label>
        <input
          :value="form.cookTime"
          type="number" min="0" max="480"
          class="flex-1 text-sm text-gray-900 text-right outline-none"
          @input="patch('cookTime', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="flex items-center px-4 py-3 gap-3">
        <label class="text-sm text-gray-500 w-28 shrink-0">{{ t('recipeForm.servingsLabel') }}</label>
        <input
          :value="form.servings"
          type="number" min="1" max="20"
          class="flex-1 text-sm text-gray-900 text-right outline-none"
          @input="patchServings(Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </section>

    <!-- ── Ingredients ────────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <label class="block text-xs font-medium text-gray-400">{{ t('recipeForm.ingredientsLabel') }}</label>

      <div v-if="!form.ingredients.length" class="text-sm text-gray-300 text-center py-2">
        {{ t('recipeForm.noIngredients') }}
      </div>

      <div
        v-for="(ing, idx) in form.ingredients"
        :key="idx"
        class="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50"
      >
        <div class="flex gap-2">
          <input
            :value="ing.name"
            type="text"
            :placeholder="t('ingredientPicker.namePlaceholder')"
            class="flex-1 text-sm border-b border-gray-200 bg-transparent outline-none pb-1 placeholder-gray-300"
            @input="updateIngredient(idx, 'name', ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            class="text-gray-300 hover:text-red-400 text-lg leading-none"
            @click="removeIngredient(idx)"
          >×</button>
        </div>
        <div class="flex gap-2">
          <input
            :value="ing.amount"
            type="number" min="0"
            :placeholder="t('ingredientPicker.amountLabel')"
            class="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none"
            @input="updateIngredient(idx, 'amount', Number(($event.target as HTMLInputElement).value))"
          />
          <input
            :value="ing.unit"
            type="text"
            :placeholder="t('ingredientPicker.unitPlaceholder')"
            class="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none"
            @input="updateIngredient(idx, 'unit', ($event.target as HTMLInputElement).value)"
          />
          <select
            :value="ing.category"
            class="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none bg-white"
            @change="updateIngredient(idx, 'category', ($event.target as HTMLSelectElement).value as IngredientCategory)"
          >
            <option v-for="cat in INGREDIENT_CATEGORIES" :key="cat" :value="cat">
              {{ t('ingredientCategories.' + cat) }}
            </option>
          </select>
        </div>
      </div>

      <IngredientPicker @add="onIngredientAdded" />
    </section>

    <!-- ── Nutrition ──────────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-medium text-gray-400">{{ t('recipeForm.nutritionLabel') }}</label>
        <button
          v-if="!nutritionAutoMode"
          type="button"
          class="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-600 font-medium"
          @click="enableAutoNutrition"
        >{{ t('recipeForm.nutritionAuto') }}</button>
        <span v-else class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
          {{ t('recipeForm.nutritionAutoActive') }}
        </span>
      </div>
      <NutritionBadge :nutrition="form.nutrition" />
      <p v-if="hasMissingNutritionData" class="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
        {{ t('recipeForm.nutritionIncompleteWarning') }}
      </p>
      <div class="grid grid-cols-2 gap-2">
        <div v-for="field in (['calories','protein','carbs','fat','fiber','sugar'] as const)" :key="field"
          class="flex flex-col border border-gray-100 rounded-xl p-2"
        >
          <label class="text-xs text-gray-400 capitalize">{{ t('recipeForm.' + field) }}</label>
          <input
            :value="form.nutrition[field]"
            type="number" min="0"
            class="text-sm font-medium text-gray-900 outline-none mt-1"
            @input="onNutritionManualEdit(field, Number(($event.target as HTMLInputElement).value))"
          />
        </div>
      </div>
    </section>

    <!-- ── Allergens ──────────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm p-4 space-y-2">
      <label class="block text-xs font-medium text-gray-400">{{ t('recipeForm.allergensLabel') }}</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="a in COMMON_ALLERGENS"
          :key="a"
          type="button"
          class="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
          :class="form.allergens.includes(a)
            ? 'bg-amber-400 border-amber-400 text-white'
            : 'bg-white border-gray-300 text-gray-600'"
          @click="toggleAllergen(a)"
        >
          {{ t('allergens.' + a) }}
        </button>
      </div>
    </section>

    <!-- ── Instructions ───────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-medium text-gray-400">{{ t('recipeForm.instructionsLabel') }}</label>
        <button type="button" class="text-sm text-primary-500 font-medium" @click="addStep">
          {{ t('recipeForm.addStep') }}
        </button>
      </div>

      <div v-if="!form.instructions.length" class="text-sm text-gray-300 text-center py-2">
        {{ t('recipeForm.noSteps') }}
      </div>

      <div
        v-for="(step, idx) in form.instructions"
        :key="idx"
        class="flex gap-2 items-start"
      >
        <span class="mt-2 w-6 h-6 shrink-0 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center">
          {{ idx + 1 }}
        </span>
        <textarea
          :value="step"
          :placeholder="t('recipeForm.stepPlaceholder')"
          rows="2"
          class="flex-1 text-sm border border-gray-100 rounded-xl p-2 outline-none resize-none focus:border-primary-300 placeholder-gray-300"
          @input="updateStep(idx, ($event.target as HTMLTextAreaElement).value)"
        />
        <button type="button" class="mt-2 text-gray-300 hover:text-red-400 text-lg" @click="removeStep(idx)">×</button>
      </div>
    </section>

    <!-- ── Submit ─────────────────────────────────────────────────────────── -->
    <button
      type="submit"
      class="w-full py-4 rounded-2xl bg-primary-500 text-white font-semibold text-base shadow-sm active:bg-primary-600 disabled:opacity-50 transition-colors"
      :disabled="saving || !form.name.trim()"
    >
      <span v-if="saving">{{ t('recipeForm.saving') }}</span>
      <span v-else>{{ t('recipeForm.save') }}</span>
    </button>

  </form>
</template>
