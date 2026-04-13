import { ref } from 'vue'
import type { IngredientCategory } from '@/types'

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

const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl'

function mapCategory(tags: string[] | undefined): IngredientCategory {
  if (!tags?.length) return 'other'
  const joined = tags.join(' ').toLowerCase()
  if (/dairy|milk|cheese|yogurt|butter|cream/.test(joined)) return 'dairy'
  if (/meat|beef|chicken|pork|poultry|lamb|turkey|sausage|ham|fish|seafood|tuna|salmon/.test(joined)) return 'meat'
  if (/frozen/.test(joined)) return 'frozen'
  if (/beverages?|drink|juice|water|soda|coffee|tea/.test(joined)) return 'beverages'
  if (/bread|bakery|pastry|biscuit|cake/.test(joined)) return 'bakery'
  if (/fruit|vegetable|produce/.test(joined)) return 'produce'
  if (/pasta|rice|grain|cereal|flour|oil|sauce|condiment|spice|herb/.test(joined)) return 'pantry'
  return 'other'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(p: any): IngredientSuggestion {
  const n = p.nutriments ?? {}
  return {
    name: (p.product_name as string).trim(),
    category: mapCategory(p.categories_tags_en as string[] | undefined),
    caloriesPer100g: n['energy-kcal_100g'] ?? undefined,
    proteinPer100g: n['proteins_100g'] ?? undefined,
    carbsPer100g: n['carbohydrates_100g'] ?? undefined,
    fatPer100g: n['fat_100g'] ?? undefined,
    fiberPer100g: n['fiber_100g'] ?? undefined,
    sugarPer100g: n['sugars_100g'] ?? undefined,
  }
}

export function useIngredientSearch() {
  const results = ref<IngredientSuggestion[]>([])
  const loading = ref(false)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let abortController: AbortController | null = null

  async function search(query: string) {
    if (debounceTimer) clearTimeout(debounceTimer)

    if (!query.trim()) {
      results.value = []
      return
    }

    debounceTimer = setTimeout(async () => {
      abortController?.abort()
      abortController = new AbortController()
      loading.value = true

      try {
        const url = new URL(OFF_SEARCH)
        url.searchParams.set('search_terms', query.trim())
        url.searchParams.set('action', 'process')
        url.searchParams.set('json', '1')
        url.searchParams.set('page_size', '15')
        url.searchParams.set('search_simple', '1')
        url.searchParams.set('fields', 'product_name,categories_tags_en,nutriments')

        const res = await fetch(url.toString(), {
          signal: abortController.signal,
        })
        const data = await res.json()

        results.value = ((data.products ?? []) as unknown[])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((p: any) => typeof p.product_name === 'string' && p.product_name.trim())
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((p: any) => mapProduct(p))
      } catch (e) {
        if ((e as Error).name !== 'AbortError') results.value = []
      } finally {
        loading.value = false
      }
    }, 400)
  }

  function clear() {
    if (debounceTimer) clearTimeout(debounceTimer)
    abortController?.abort()
    results.value = []
    loading.value = false
  }

  return { results, loading, search, clear }
}
