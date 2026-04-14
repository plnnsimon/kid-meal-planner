import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { IngredientCategory } from '@/types'
import rawIngredients from '@/data/common-ingredients.json'

export interface IngredientSuggestion {
  name: string
  category: IngredientCategory
  caloriesPer100g?: number
  proteinPer100g?: number
  carbsPer100g?: number
  fatPer100g?: number
  fiberPer100g?: number
  sugarPer100g?: number
  translations?: Record<string, string>
}

const ingredients = rawIngredients as IngredientSuggestion[]

function getDisplayName(item: IngredientSuggestion, lang: string): string {
  if (lang !== 'en' && item.translations?.[lang]) return item.translations[lang]
  return item.name
}

// ─── Open Food Facts (packaged products) — disabled, re-enable when needed ───
//
// const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl'
//
// function mapCategory(tags: string[] | undefined): IngredientCategory {
//   if (!tags?.length) return 'other'
//   const joined = tags.join(' ').toLowerCase()
//   if (/dairy|milk|cheese|yogurt|butter|cream/.test(joined)) return 'dairy'
//   if (/meat|beef|chicken|pork|poultry|lamb|turkey|sausage|ham|fish|seafood|tuna|salmon/.test(joined)) return 'meat'
//   if (/frozen/.test(joined)) return 'frozen'
//   if (/beverages?|drink|juice|water|soda|coffee|tea/.test(joined)) return 'beverages'
//   if (/bread|bakery|pastry|biscuit|cake/.test(joined)) return 'bakery'
//   if (/fruit|vegetable|produce/.test(joined)) return 'produce'
//   if (/pasta|rice|grain|cereal|flour|oil|sauce|condiment|spice|herb/.test(joined)) return 'pantry'
//   return 'other'
// }
//
// function mapProduct(p: any): IngredientSuggestion {
//   const n = p.nutriments ?? {}
//   return {
//     name: (p.product_name as string).trim(),
//     category: mapCategory(p.categories_tags_en as string[] | undefined),
//     caloriesPer100g: n['energy-kcal_100g'] ?? undefined,
//     proteinPer100g: n['proteins_100g'] ?? undefined,
//     carbsPer100g: n['carbohydrates_100g'] ?? undefined,
//     fatPer100g: n['fat_100g'] ?? undefined,
//     fiberPer100g: n['fiber_100g'] ?? undefined,
//     sugarPer100g: n['sugars_100g'] ?? undefined,
//   }
// }
//
// async function searchOFF(query: string, signal: AbortSignal): Promise<IngredientSuggestion[]> {
//   const url = new URL(OFF_SEARCH)
//   url.searchParams.set('search_terms', query.trim())
//   url.searchParams.set('action', 'process')
//   url.searchParams.set('json', '1')
//   url.searchParams.set('page_size', '15')
//   url.searchParams.set('search_simple', '1')
//   url.searchParams.set('fields', 'product_name,categories_tags_en,nutriments')
//   const res = await fetch(url.toString(), { signal })
//   const data = await res.json()
//   return ((data.products ?? []) as unknown[])
//     .filter((p: any) => typeof p.product_name === 'string' && p.product_name.trim())
//     .map((p: any) => mapProduct(p))
// }

export function useIngredientSearch() {
  const { locale } = useI18n()
  const results = ref<IngredientSuggestion[]>([])
  const loading = ref(false)

  function search(query: string) {
    if (!query.trim()) {
      results.value = []
      return
    }

    const q = query.toLowerCase().trim()
    const lang = locale.value

    results.value = ingredients
      .filter((i) => getDisplayName(i, lang).toLowerCase().includes(q))
      .sort((a, b) => {
        const an = getDisplayName(a, lang).toLowerCase()
        const bn = getDisplayName(b, lang).toLowerCase()
        const aStarts = an.startsWith(q)
        const bStarts = bn.startsWith(q)
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1
        return 0
      })
      .map((i) => ({ ...i, name: getDisplayName(i, lang) }))
      .slice(0, 15)
  }

  function clear() {
    results.value = []
    loading.value = false
  }

  return { results, loading, search, clear }
}
