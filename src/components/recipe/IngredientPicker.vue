<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { Ingredient, IngredientCategory } from '@/types'
import { INGREDIENT_CATEGORIES } from '@/types'
import { useIngredientSearch, type IngredientSuggestion } from '@/composables/useIngredientSearch'

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
  state.value = 'confirming'
  clear()
}

function confirm() {
  if (!selectedName.value.trim()) return
  const ingredient: Ingredient = {
    name: selectedName.value.trim(),
    amount: amount.value,
    unit: unit.value,
    category: category.value,
    ...fromOff.value,
  }
  emit('add', ingredient)
  reset()
}

function reset() {
  state.value = 'idle'
  query.value = ''
  selectedName.value = ''
  fromOff.value = {}
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
    + Add ingredient
  </button>

  <!-- ── SEARCHING ───────────────────────────────────────────────────────────── -->
  <div v-else-if="state === 'searching'" class="space-y-2">
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <input
          ref="searchInputRef"
          :value="query"
          type="text"
          placeholder="Search ingredient…"
          class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-primary-400 pr-8"
          @input="onQueryInput(($event.target as HTMLInputElement).value)"
        />
        <span
          v-if="loading"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-gray-300 border-t-primary-400 rounded-full animate-spin"
        />
      </div>
      <button type="button" class="text-sm text-gray-400 shrink-0 px-1" @click="reset">
        Cancel
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
        + Add "{{ query.trim() || 'custom ingredient' }}" manually
      </button>
    </div>
  </div>

  <!-- ── CONFIRMING ──────────────────────────────────────────────────────────── -->
  <div v-else-if="state === 'confirming'" class="border border-primary-200 rounded-xl p-3 space-y-3 bg-primary-50/40">

    <!-- Name -->
    <div>
      <label class="text-xs font-medium text-gray-400">Name</label>
      <input
        v-if="!hasNutrition()"
        v-model="selectedName"
        type="text"
        placeholder="Ingredient name"
        class="w-full text-sm text-gray-900 border-b border-gray-200 bg-transparent outline-none py-1 mt-0.5 focus:border-primary-400"
      />
      <p v-else class="text-sm font-medium text-gray-900 mt-0.5 line-clamp-2">{{ selectedName }}</p>
    </div>

    <!-- OFF nutrition badge -->
    <div
      v-if="hasNutrition()"
      class="text-xs text-gray-500 bg-white rounded-lg px-2.5 py-1.5 border border-gray-100 leading-relaxed"
    >
      Per 100 g:
      <strong>{{ Math.round(fromOff.caloriesPer100g!) }} kcal</strong>
      · {{ fromOff.proteinPer100g?.toFixed(1) }} g protein
      · {{ fromOff.carbsPer100g?.toFixed(1) }} g carbs
      · {{ fromOff.fatPer100g?.toFixed(1) }} g fat
    </div>

    <!-- Amount / Unit / Category -->
    <div class="flex gap-2">
      <div class="w-24 shrink-0">
        <label class="text-xs font-medium text-gray-400">Amount</label>
        <input
          v-model.number="amount"
          type="number"
          min="0"
          class="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none mt-0.5 focus:border-primary-400"
        />
      </div>
      <div class="w-20 shrink-0">
        <label class="text-xs font-medium text-gray-400">Unit</label>
        <input
          v-model="unit"
          type="text"
          placeholder="g / ml"
          class="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none mt-0.5 focus:border-primary-400"
        />
      </div>
      <div class="flex-1 min-w-0">
        <label class="text-xs font-medium text-gray-400">Category</label>
        <select
          v-model="category"
          class="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white mt-0.5 focus:border-primary-400"
        >
          <option v-for="cat in INGREDIENT_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
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
        Add
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 active:bg-gray-50"
        @click="reset"
      >
        Cancel
      </button>
    </div>
  </div>
</template>
