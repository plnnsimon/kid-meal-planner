<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChildStore } from '@/stores/child.store'
import { useIngredientsStore } from '@/stores/ingredients.store'
import { useLocale } from '@/composables/useLocale'
import { INGREDIENT_CATEGORIES } from '@/types'
import type { FoodItem, IngredientCategory } from '@/types'
import AppButton from '@/components/common/AppButton.vue'

const { t } = useI18n()
const child = useChildStore()
const ingredients = useIngredientsStore()
const { currentLocale } = useLocale()

type TabValue = 'all' | 'tried' | 'not-tried'
const activeTab = ref<TabValue>('all')

const customName = ref('')
const customNameUk = ref('')
const customCategory = ref<IngredientCategory>('produce')
const showNutrition = ref(false)
const customCalories = ref<number | null>(null)
const customProtein = ref<number | null>(null)
const customCarbs = ref<number | null>(null)
const customFat = ref<number | null>(null)
const editingId = ref<string | null>(null)

onMounted(async () => {
  if (!child.profile && !child.loading) {
    await child.load()
  }
  await ingredients.load()
})

function startEdit(item: FoodItem) {
  editingId.value = item.id
  customName.value = item.name
  customNameUk.value = item.nameUk ?? ''
  customCategory.value = item.category
  customCalories.value = item.caloriesPer100g
  customProtein.value = item.proteinPer100g
  customCarbs.value = item.carbsPer100g
  customFat.value = item.fatPer100g
  showNutrition.value = !!(item.caloriesPer100g || item.proteinPer100g || item.carbsPer100g || item.fatPer100g)
}

function cancelEdit() {
  editingId.value = null
  customName.value = ''
  customNameUk.value = ''
  customCategory.value = 'produce'
  showNutrition.value = false
  customCalories.value = null
  customProtein.value = null
  customCarbs.value = null
  customFat.value = null
}

function displayName(item: FoodItem): string {
  return currentLocale.value === 'uk' ? (item.nameUk ?? item.name) : item.name
}

const grouped = computed(() => {
  return INGREDIENT_CATEGORIES.map(cat => {
    const catItems = ingredients.items
      .filter(i => i.category === cat)
      .filter(i => {
        if (activeTab.value === 'tried') return ingredients.tastedIds.has(i.id)
        if (activeTab.value === 'not-tried') return !ingredients.tastedIds.has(i.id)
        return true
      })
    return { cat, items: catItems }
  }).filter(g => g.items.length > 0)
})

async function submitForm() {
  if (!customName.value.trim()) return
  const nutrition = showNutrition.value ? {
    caloriesPer100g: customCalories.value,
    proteinPer100g: customProtein.value,
    carbsPer100g: customCarbs.value,
    fatPer100g: customFat.value,
  } : undefined
  if (editingId.value) {
    await ingredients.updateCustom(
      editingId.value,
      customName.value,
      customNameUk.value || null,
      customCategory.value,
      nutrition,
    )
  } else {
    await ingredients.addCustom(
      customName.value,
      customNameUk.value || null,
      customCategory.value,
      nutrition,
    )
  }
  cancelEdit()
}
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-6 space-y-4">

    <!-- Filter tabs -->
    <div class="flex gap-2">
      <button
        v-for="tab in ([
          { value: 'all', label: t('tastedIngredients.tabAll') },
          { value: 'tried', label: t('tastedIngredients.tabTried') },
          { value: 'not-tried', label: t('tastedIngredients.tabNotTried') },
        ] as const)"
        :key="tab.value"
        type="button"
        class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
        :class="activeTab === tab.value
          ? 'bg-primary-500 text-white'
          : 'bg-gray-100 text-gray-600'"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading skeleton -->
    <template v-if="ingredients.loading">
      <div class="animate-pulse space-y-3">
        <div class="h-4 w-24 bg-gray-200 rounded" />
        <div class="bg-white rounded-2xl shadow-sm">
          <div v-for="n in 5" :key="n" class="h-12 border-b border-gray-100 last:border-0 px-4 flex items-center">
            <div class="w-5 h-5 rounded-full bg-gray-200 shrink-0" />
            <div class="ml-3 h-3 bg-gray-200 rounded w-32" />
          </div>
        </div>
      </div>
    </template>

    <!-- Error state -->
    <template v-else-if="ingredients.error">
      <p class="text-sm text-red-500 text-center py-4">{{ ingredients.error }}</p>
    </template>

    <!-- Empty state -->
    <template v-else-if="grouped.length === 0">
      <p class="text-sm text-gray-400 text-center py-8">
        <template v-if="activeTab === 'tried'">{{ t('tastedIngredients.emptyTried') }}</template>
        <template v-else-if="activeTab === 'not-tried'">{{ t('tastedIngredients.emptyNotTried') }}</template>
        <template v-else>{{ t('tastedIngredients.emptyTried') }}</template>
      </p>
    </template>

    <!-- Grouped list -->
    <template v-else>
      <div v-for="group in grouped" :key="group.cat" class="space-y-1">
        <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-2">
          {{ t('ingredientCategories.' + group.cat) }}
        </div>
        <div class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            class="flex items-center gap-3 w-full py-3 px-4 text-left active:bg-gray-50"
            @click="ingredients.toggleTasted(item.id)"
          >
            <span
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
              :class="ingredients.tastedIds.has(item.id) ? 'bg-primary-500 border-primary-500' : 'border-gray-300'"
            >
              <FontAwesomeIcon v-if="ingredients.tastedIds.has(item.id)" icon="check" class="w-3 h-3 text-white" />
            </span>
            <span class="flex-1 text-sm text-gray-800">{{ displayName(item) }}</span>
            <span v-if="item.source === 'user'" class="text-xs text-primary-500 font-medium">{{ t('tastedIngredients.customBadge') }}</span>
            <button
              v-if="item.source === 'user'"
              type="button"
              class="p-1 text-gray-400 hover:text-primary-500"
              @click.stop="startEdit(item)"
            >
              <FontAwesomeIcon icon="pencil" class="w-4 h-4" />
            </button>
            <button
              v-if="item.source === 'user'"
              type="button"
              class="p-1 text-gray-400 hover:text-red-500"
              @click.stop="ingredients.removeCustom(item.id)"
            >
              <FontAwesomeIcon icon="trash" class="w-4 h-4" />
            </button>
          </button>
        </div>
      </div>
    </template>

    <!-- Add / edit custom ingredient -->
    <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-700">
          {{ editingId ? t('tastedIngredients.editCustomTitle') : t('tastedIngredients.addCustomTitle') }}
        </h2>
        <button
          v-if="editingId"
          type="button"
          class="text-xs text-gray-400 hover:text-gray-600"
          @click="cancelEdit"
        >
          {{ t('tastedIngredients.cancelEdit') }}
        </button>
      </div>
      <input
        v-model="customName"
        type="text"
        :placeholder="t('tastedIngredients.customNamePlaceholder')"
        class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary-400"
      />
      <input
        v-model="customNameUk"
        type="text"
        :placeholder="t('tastedIngredients.customNameUkPlaceholder')"
        class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary-400"
      />
      <select
        v-model="customCategory"
        class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary-400 bg-white"
      >
        <option v-for="cat in INGREDIENT_CATEGORIES" :key="cat" :value="cat">
          {{ t('ingredientCategories.' + cat) }}
        </option>
      </select>
      <!-- Nutrition toggle -->
      <button
        type="button"
        class="text-xs text-primary-500 font-medium text-left"
        @click="showNutrition = !showNutrition"
      >
        {{ showNutrition ? '▲' : '▼' }} {{ t('ingredientPicker.nutritionOptional') }}
      </button>

      <!-- Nutrition fields (collapsible) -->
      <div v-if="showNutrition" class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-xs text-gray-400">{{ t('ingredientPicker.caloriesLabel') }}</label>
          <input
            v-model.number="customCalories"
            type="number" min="0" step="1"
            class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary-400 mt-0.5"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400">{{ t('ingredientPicker.proteinLabel') }}</label>
          <input
            v-model.number="customProtein"
            type="number" min="0" step="0.1"
            class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary-400 mt-0.5"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400">{{ t('ingredientPicker.carbsLabel') }}</label>
          <input
            v-model.number="customCarbs"
            type="number" min="0" step="0.1"
            class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary-400 mt-0.5"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400">{{ t('ingredientPicker.fatLabel') }}</label>
          <input
            v-model.number="customFat"
            type="number" min="0" step="0.1"
            class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary-400 mt-0.5"
          />
        </div>
      </div>

      <AppButton
        type="button"
        :loading="ingredients.saving"
        :disabled="!customName.trim()"
        @click="submitForm"
      >
        {{ editingId ? t('tastedIngredients.saveCustomButton') : t('tastedIngredients.addCustomButton') }}
      </AppButton>
    </section>

  </div>
</template>
