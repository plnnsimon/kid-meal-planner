import { computed, ref } from 'vue'
import { useWeekPlanStore } from '@/stores/weekPlan.store'
import type { IngredientCategory, ShoppingListItem } from '@/types'

const CATEGORY_ORDER: IngredientCategory[] = [
  'produce',
  'meat',
  'dairy',
  'bakery',
  'frozen',
  'pantry',
  'beverages',
  'other',
]

const LS_KEY = 'shopping-checked'

function loadCheckedFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as string[]
      return new Set(parsed)
    }
  } catch {
    // ignore
  }
  return new Set()
}

function saveCheckedToStorage(ids: Set<string>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // ignore
  }
}

export function useShoppingList() {
  const weekPlanStore = useWeekPlanStore()

  const checkedIds = ref<Set<string>>(loadCheckedFromStorage())

  // Derive the flat list of shopping items from the week plan
  const allItems = computed<ShoppingListItem[]>(() => {
    const plan = weekPlanStore.plan
    if (!plan) return []

    // Map keyed by `${name}__${unit}` → accumulated item
    const map = new Map<string, ShoppingListItem>()

    for (const slot of plan.slots) {
      const recipe = slot.recipe
      if (!recipe || !recipe.ingredients.length) continue

      const scale = recipe.servings > 0 ? slot.servings / recipe.servings : 1

      for (const ingredient of recipe.ingredients) {
        const key = `${ingredient.name}__${ingredient.unit}`
        const existing = map.get(key)
        if (existing) {
          existing.totalAmount += ingredient.amount * scale
          if (!existing.recipeNames.includes(recipe.name)) {
            existing.recipeNames.push(recipe.name)
          }
        } else {
          map.set(key, {
            ingredientName: ingredient.name,
            totalAmount: ingredient.amount * scale,
            unit: ingredient.unit,
            category: ingredient.category,
            checked: false,
            recipeNames: [recipe.name],
          })
        }
      }
    }

    return Array.from(map.values())
  })

  // Group by category, sorted alphabetically within each group
  const groupedItems = computed<Record<IngredientCategory, ShoppingListItem[]>>(() => {
    const result = {} as Record<IngredientCategory, ShoppingListItem[]>

    for (const cat of CATEGORY_ORDER) {
      result[cat] = []
    }

    for (const item of allItems.value) {
      const cat = item.category in result ? item.category : 'other'
      result[cat].push(item)
    }

    // Sort alphabetically within each group
    for (const cat of CATEGORY_ORDER) {
      result[cat].sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
    }

    return result
  })

  const totalItems = computed(() => allItems.value.length)

  const checkedCount = computed(() => {
    let count = 0
    for (const item of allItems.value) {
      const key = `${item.ingredientName}__${item.unit}`
      if (checkedIds.value.has(key)) count++
    }
    return count
  })

  function toggle(key: string): void {
    const next = new Set(checkedIds.value)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    checkedIds.value = next
    saveCheckedToStorage(next)
  }

  function clearChecked(): void {
    checkedIds.value = new Set()
    saveCheckedToStorage(new Set())
  }

  return {
    groupedItems,
    checkedIds,
    toggle,
    clearChecked,
    totalItems,
    checkedCount,
  }
}
