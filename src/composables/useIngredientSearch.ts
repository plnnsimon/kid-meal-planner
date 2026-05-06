import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FoodItem } from '@/types'
import { useIngredientsStore } from '@/stores/ingredients.store'

export function useIngredientSearch() {
  const { locale } = useI18n()
  const ingredientsStore = useIngredientsStore()

  // Non-blocking pre-load so results are ready when user opens search
  ingredientsStore.loadItems()

  const results = ref<FoodItem[]>([])
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
  }

  function clear() {
    results.value = []
  }

  return { results, loading, search, clear }
}
