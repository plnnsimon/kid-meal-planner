<script setup lang="ts">
import { ref, watch } from 'vue'
import type { RecipePayload } from '@/stores/recipe.store'
import { MEAL_TYPES, MEAL_TYPE_LABELS, COMMON_ALLERGENS, INGREDIENT_CATEGORIES } from '@/types'
import type { Ingredient, MealType, IngredientCategory } from '@/types'
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
  patch('ingredients', [...form.value.ingredients, ingredient])
}

function removeIngredient(idx: number) {
  patch('ingredients', form.value.ingredients.filter((_, i) => i !== idx))
}

function updateIngredient(idx: number, field: keyof Ingredient, value: string | number) {
  const next = form.value.ingredients.map((ing, i) =>
    i === idx ? { ...ing, [field]: value } : ing,
  )
  patch('ingredients', next as Ingredient[])
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
        placeholder="Add recipe photo"
        @change="$emit('image-change', $event)"
      />
    </section>

    <!-- ── Basic info ─────────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
      <div class="px-4 py-3">
        <AppInput
          label="Recipe name"
          :model-value="form.name"
          type="text"
          placeholder="e.g. Banana Oat Pancakes"
          required
          @update:model-value="patch('name', $event)"
        />
      </div>
      <div class="px-4 py-3">
        <label class="block text-xs font-medium text-gray-400 mb-1">Description</label>
        <textarea
          :value="form.description"
          placeholder="Short description…"
          rows="2"
          class="w-full text-sm text-gray-900 outline-none resize-none placeholder-gray-300"
          @input="patch('description', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </section>

    <!-- ── Meal types ─────────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm p-4 space-y-2">
      <label class="block text-xs font-medium text-gray-400">Meal types</label>
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
          {{ MEAL_TYPE_LABELS[mt] }}
        </button>
      </div>
    </section>

    <!-- ── Time & servings ────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
      <div class="flex items-center px-4 py-3 gap-3">
        <label class="text-sm text-gray-500 w-28 shrink-0">Prep time (min)</label>
        <input
          :value="form.prepTime"
          type="number" min="0" max="480"
          class="flex-1 text-sm text-gray-900 text-right outline-none"
          @input="patch('prepTime', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="flex items-center px-4 py-3 gap-3">
        <label class="text-sm text-gray-500 w-28 shrink-0">Cook time (min)</label>
        <input
          :value="form.cookTime"
          type="number" min="0" max="480"
          class="flex-1 text-sm text-gray-900 text-right outline-none"
          @input="patch('cookTime', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="flex items-center px-4 py-3 gap-3">
        <label class="text-sm text-gray-500 w-28 shrink-0">Servings</label>
        <input
          :value="form.servings"
          type="number" min="1" max="20"
          class="flex-1 text-sm text-gray-900 text-right outline-none"
          @input="patch('servings', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </section>

    <!-- ── Ingredients ────────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <label class="block text-xs font-medium text-gray-400">Ingredients</label>

      <div v-if="!form.ingredients.length" class="text-sm text-gray-300 text-center py-2">
        No ingredients yet
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
            placeholder="Ingredient name"
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
            placeholder="Amount"
            class="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none"
            @input="updateIngredient(idx, 'amount', Number(($event.target as HTMLInputElement).value))"
          />
          <input
            :value="ing.unit"
            type="text"
            placeholder="g / ml / pcs"
            class="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none"
            @input="updateIngredient(idx, 'unit', ($event.target as HTMLInputElement).value)"
          />
          <select
            :value="ing.category"
            class="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none bg-white"
            @change="updateIngredient(idx, 'category', ($event.target as HTMLSelectElement).value as IngredientCategory)"
          >
            <option v-for="cat in INGREDIENT_CATEGORIES" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
        </div>
      </div>

      <IngredientPicker @add="onIngredientAdded" />
    </section>

    <!-- ── Nutrition ──────────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <label class="block text-xs font-medium text-gray-400">Nutrition (per serving)</label>
      <NutritionBadge :nutrition="form.nutrition" />
      <div class="grid grid-cols-2 gap-2">
        <div v-for="field in (['calories','protein','carbs','fat','fiber','sugar'] as const)" :key="field"
          class="flex flex-col border border-gray-100 rounded-xl p-2"
        >
          <label class="text-xs text-gray-400 capitalize">{{ field }}{{ field === 'calories' ? ' (kcal)' : ' (g)' }}</label>
          <input
            :value="form.nutrition[field]"
            type="number" min="0"
            class="text-sm font-medium text-gray-900 outline-none mt-1"
            @input="patch('nutrition', { ...form.nutrition, [field]: Number(($event.target as HTMLInputElement).value) })"
          />
        </div>
      </div>
    </section>

    <!-- ── Allergens ──────────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm p-4 space-y-2">
      <label class="block text-xs font-medium text-gray-400">Contains allergens</label>
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
          {{ a }}
        </button>
      </div>
    </section>

    <!-- ── Instructions ───────────────────────────────────────────────────── -->
    <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-medium text-gray-400">Instructions</label>
        <button type="button" class="text-sm text-primary-500 font-medium" @click="addStep">
          + Step
        </button>
      </div>

      <div v-if="!form.instructions.length" class="text-sm text-gray-300 text-center py-2">
        No steps yet
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
          placeholder="Describe this step…"
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
      <span v-if="saving">Saving…</span>
      <span v-else>Save Recipe</span>
    </button>

  </form>
</template>
