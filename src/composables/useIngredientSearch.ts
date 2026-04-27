import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { IngredientCategory, FoodItem } from '@/types'
import { useIngredientsStore } from '@/stores/ingredients.store'

export interface IngredientSuggestion {
  name: string
  category: IngredientCategory
  caloriesPer100g?: number
  proteinPer100g?: number
  carbsPer100g?: number
  fatPer100g?: number
  fiberPer100g?: number
  sugarPer100g?: number
}

function mapToSuggestion(item: FoodItem, lang: string): IngredientSuggestion {
  return {
    name: lang === 'uk' && item.nameUk ? item.nameUk : item.name,
    category: item.category,
    caloriesPer100g: item.caloriesPer100g ?? undefined,
    proteinPer100g: item.proteinPer100g ?? undefined,
    carbsPer100g: item.carbsPer100g ?? undefined,
    fatPer100g: item.fatPer100g ?? undefined,
    fiberPer100g: item.fiberPer100g ?? undefined,
    sugarPer100g: item.sugarPer100g ?? undefined,
  }
}

export function useIngredientSearch() {
  const { locale } = useI18n()
  const ingredientsStore = useIngredientsStore()

  // Non-blocking pre-load so results are ready when user opens search
  if (!ingredientsStore.isLoaded) {
    ingredientsStore.load()
  }

  const results = ref<IngredientSuggestion[]>([])
  // Reflect store loading state so IngredientPicker shows spinner during DB fetch
  const loading = computed(() => ingredientsStore.loading)

  function search(query: string) {
    if (!query.trim()) {
      results.value = []
      return
    }

    const q = query.toLowerCase().trim()
    const lang = locale.value

    results.value = ingredientsStore.items
      .filter(item => {
        const enMatch = item.name.toLowerCase().includes(q)
        const ukMatch = (item.nameUk ?? '').toLowerCase().includes(q)
        return enMatch || ukMatch
      })
      .sort((a, b) => {
        const an = (lang === 'uk' && a.nameUk ? a.nameUk : a.name).toLowerCase()
        const bn = (lang === 'uk' && b.nameUk ? b.nameUk : b.name).toLowerCase()
        if (an.startsWith(q) && !bn.startsWith(q)) return -1
        if (!an.startsWith(q) && bn.startsWith(q)) return 1
        return 0
      })
      .slice(0, 15)
      .map(item => mapToSuggestion(item, lang))
  }

  function clear() {
    results.value = []
  }

  return { results, loading, search, clear }
}
