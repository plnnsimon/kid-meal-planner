<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Ingredient, IngredientCategory } from '@/types'
import { INGREDIENT_CATEGORIES } from '@/types'
import { useIngredientSearch, type IngredientSuggestion } from '@/composables/useIngredientSearch'

const { t } = useI18n()

const emit = defineEmits<{
  add: [ingredient: Ingredient]
}>()

const { results, loading, search, clear } = useIngredientSearch()

type State = 'idle' | 'searching' | 'confirming'
const state = ref<State>('idle')

const query = ref('')
const searchInputRef = ref<HTMLInputElement>()

// confirming state
const selectedName = ref('')
const selectedCategory = ref<IngredientCategory>('other')
const fromOff = ref<Omit<IngredientSuggestion, 'name' | 'category'>>({})
const amount = ref(0)
const unit = ref('g')
const category = ref<IngredientCategory>('other')
const isManual = ref(false)

// manual nutrition fields (per 100g)
const manualCalories = ref<number | null>(null)
const manualProtein = ref<number | null>(null)
const manualCarbs = ref<number | null>(null)
const manualFat = ref<number | null>(null)

async function openSearch() {
  state.value = 'searching'
  query.value = ''
  clear()
  await nextTick()
  searchInputRef.value?.focus()
}

function onQueryInput(q: string) {
  query.value = q
  search(q)
}

function selectSuggestion(s: IngredientSuggestion) {
  selectedName.value = s.name
  selectedCategory.value = s.category
  fromOff.value = {
    caloriesPer100g: s.caloriesPer100g,
    proteinPer100g: s.proteinPer100g,
    carbsPer100g: s.carbsPer100g,
    fatPer100g: s.fatPer100g,
    fiberPer100g: s.fiberPer100g,
    sugarPer100g: s.sugarPer100g,
  }
  amount.value = 0
  unit.value = 'g'
  category.value = s.category
  isManual.value = false
  state.value = 'confirming'
  clear()
}

function addManually() {
  selectedName.value = query.value.trim()
  selectedCategory.value = 'other'
  fromOff.value = {}
  amount.value = 0
  unit.value = 'g'
  category.value = 'other'
  isManual.value = true
  manualCalories.value = null
  manualProtein.value = null
  manualCarbs.value = null
  manualFat.value = null
  state.value = 'confirming'
  clear()
}

function confirm() {
  if (!selectedName.value.trim()) return
  const nutrition: Omit<IngredientSuggestion, 'name' | 'category'> = isManual.value
    ? {
        caloriesPer100g: manualCalories.value ?? undefined,
        proteinPer100g: manualProtein.value ?? undefined,
        carbsPer100g: manualCarbs.value ?? undefined,
        fatPer100g: manualFat.value ?? undefined,
      }
    : fromOff.value
  const ingredient: Ingredient = {
    name: selectedName.value.trim(),
    amount: amount.value,
    unit: unit.value,
    category: category.value,
    ...nutrition,
  }
  emit('add', ingredient)
  reset()
}

function reset() {
  state.value = 'idle'
  query.value = ''
  selectedName.value = ''
  fromOff.value = {}
  isManual.value = false
  manualCalories.value = null
  manualProtein.value = null
  manualCarbs.value = null
  manualFat.value = null
  clear()
}

const hasNutrition = () =>
  fromOff.value.caloriesPer100g !== undefined
</script>

<template>
  <!-- ── IDLE ────────────────────────────────────────────────────────────────── -->
  <button
    v-if="state === 'idle'"
    type="button"
    class="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-primary-500 font-medium hover:border-primary-300 active:bg-primary-50 transition-colors"
    @click="openSearch"
  >
    {{ t('ingredientPicker.addIngredient') }}
  </button>

  <!-- ── SEARCHING ───────────────────────────────────────────────────────────── -->
  <div v-else-if="state === 'searching'" class="space-y-2">
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <input
          ref="searchInputRef"
          :value="query"
          type="text"
          :placeholder="t('ingredientPicker.searchPlaceholder')"
          class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-primary-400 pr-8"
          @input="onQueryInput(($event.target as HTMLInputElement).value)"
        />
        <span
          v-if="loading"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-gray-300 border-t-primary-400 rounded-full animate-spin"
        />
      </div>
      <button type="button" class="text-sm text-gray-400 shrink-0 px-1" @click="reset">
        {{ t('ingredientPicker.cancel') }}
      </button>
    </div>

    <!-- Results dropdown -->
    <div
      v-if="results.length || (query.trim() && !loading)"
      class="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm"
    >
      <button
        v-for="(s, i) in results"
        :key="i"
        type="button"
        class="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
        @click="selectSuggestion(s)"
      >
        <span class="text-sm font-medium text-gray-800 line-clamp-1 min-w-0">{{ s.name }}</span>
        <div class="flex items-center gap-2 shrink-0 text-xs text-gray-400">
          <span v-if="s.caloriesPer100g">{{ Math.round(s.caloriesPer100g) }} kcal</span>
          <span class="capitalize">{{ s.category }}</span>
        </div>
      </button>

      <button
        type="button"
        class="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary-500 font-medium hover:bg-primary-50 transition-colors"
        @click="addManually"
      >
        {{ query.trim() ? t('ingredientPicker.addManually', { query: query.trim() }) : t('ingredientPicker.addManuallyEmpty') }}
      </button>
    </div>
  </div>

  <!-- ── CONFIRMING ──────────────────────────────────────────────────────────── -->
  <div v-else-if="state === 'confirming'" class="border border-primary-200 rounded-xl p-3 space-y-3 bg-primary-50/40">

    <!-- Name -->
    <div>
      <label class="text-xs font-medium text-gray-400">{{ t('ingredientPicker.nameLabel') }}</label>
      <input
        v-if="!hasNutrition()"
        v-model="selectedName"
        type="text"
        :placeholder="t('ingredientPicker.namePlaceholder')"
        class="w-full text-sm text-gray-900 border-b border-gray-200 bg-transparent outline-none py-1 mt-0.5 focus:border-primary-400"
      />
      <p v-else class="text-sm font-medium text-gray-900 mt-0.5 line-clamp-2">{{ selectedName }}</p>
    </div>

    <!-- Nutrition badge (from search result) -->
    <div
      v-if="hasNutrition()"
      class="text-xs text-gray-500 bg-white rounded-lg px-2.5 py-1.5 border border-gray-100 leading-relaxed"
    >
      {{ t('ingredientPicker.per100g') }}
      <strong>{{ Math.round(fromOff.caloriesPer100g!) }} kcal</strong>
      · {{ fromOff.proteinPer100g?.toFixed(1) }} g protein
      · {{ fromOff.carbsPer100g?.toFixed(1) }} g carbs
      · {{ fromOff.fatPer100g?.toFixed(1) }} g fat
    </div>

    <!-- Manual nutrition fields -->
    <div v-if="isManual" class="space-y-2">
      <label class="text-xs font-medium text-gray-400">{{ t('ingredientPicker.nutritionOptional') }}</label>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-xs text-gray-400">{{ t('ingredientPicker.caloriesLabel') }}</label>
          <input
            v-model.number="manualCalories"
            type="number"
            min="0"
            step="1"
            class="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none mt-0.5 focus:border-primary-400"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400">{{ t('ingredientPicker.proteinLabel') }}</label>
          <input
            v-model.number="manualProtein"
            type="number"
            min="0"
            step="0.1"
            class="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none mt-0.5 focus:border-primary-400"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400">{{ t('ingredientPicker.carbsLabel') }}</label>
          <input
            v-model.number="manualCarbs"
            type="number"
            min="0"
            step="0.1"
            class="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none mt-0.5 focus:border-primary-400"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400">{{ t('ingredientPicker.fatLabel') }}</label>
          <input
            v-model.number="manualFat"
            type="number"
            min="0"
            step="0.1"
            class="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none mt-0.5 focus:border-primary-400"
          />
        </div>
      </div>
    </div>

    <!-- Amount / Unit / Category -->
    <div class="flex gap-2">
      <div class="w-24 shrink-0">
        <label class="text-xs font-medium text-gray-400">{{ t('ingredientPicker.amountLabel') }}</label>
        <input
          v-model.number="amount"
          type="number"
          min="0"
          class="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none mt-0.5 focus:border-primary-400"
        />
      </div>
      <div class="w-20 shrink-0">
        <label class="text-xs font-medium text-gray-400">{{ t('ingredientPicker.unitLabel') }}</label>
        <input
          v-model="unit"
          type="text"
          :placeholder="t('ingredientPicker.unitPlaceholder')"
          class="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none mt-0.5 focus:border-primary-400"
        />
      </div>
      <div class="flex-1 min-w-0">
        <label class="text-xs font-medium text-gray-400">{{ t('ingredientPicker.categoryLabel') }}</label>
        <select
          v-model="category"
          class="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white mt-0.5 focus:border-primary-400"
        >
          <option v-for="cat in INGREDIENT_CATEGORIES" :key="cat" :value="cat">{{ t('ingredientCategories.' + cat) }}</option>
        </select>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 pt-0.5">
      <button
        type="button"
        class="flex-1 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold disabled:opacity-40 active:bg-primary-600 transition-colors"
        :disabled="!selectedName.trim()"
        @click="confirm"
      >
        {{ t('ingredientPicker.add') }}
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 active:bg-gray-50"
        @click="reset"
      >
        {{ t('ingredientPicker.cancel') }}
      </button>
    </div>
  </div>
</template>
