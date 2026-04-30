import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useChildStore } from '@/stores/child.store'
import type { FoodItem, IngredientCategory } from '@/types'

export const useIngredientsStore = defineStore('ingredients', () => {
  const auth = useAuthStore()
  const child = useChildStore()

  const items = ref<FoodItem[]>([])
  const tastedIds = ref<Set<string>>(new Set())
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const isLoaded = ref(false)

  async function load() {
    if (!auth.userId) return
    loading.value = true
    error.value = null
    try {
      const { data: ingData, error: ingErr } = await supabase
        .from('ingredients')
        .select('*')
        .or(`source.eq.system,user_id.eq.${auth.userId}`)
        .order('category')
        .order('name')
      if (ingErr) throw ingErr
      items.value = (ingData ?? []).map(mapRow)

      if (child.profile?.id) {
        const { data: tastedData, error: tastedErr } = await supabase
          .from('child_tasted_ingredients')
          .select('ingredient_id')
          .eq('child_profile_id', child.profile.id)
        if (tastedErr) throw tastedErr
        tastedIds.value = new Set((tastedData ?? []).map((r: { ingredient_id: string }) => r.ingredient_id))
      }
      isLoaded.value = true
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function toggleTasted(ingredientId: string) {
    if (!child.profile?.id) return
    saving.value = true
    try {
      if (tastedIds.value.has(ingredientId)) {
        const { error: err } = await supabase
          .from('child_tasted_ingredients')
          .delete()
          .eq('child_profile_id', child.profile.id)
          .eq('ingredient_id', ingredientId)
        if (err) throw err
        tastedIds.value = new Set([...tastedIds.value].filter(id => id !== ingredientId))
      } else {
        const { error: err } = await supabase
          .from('child_tasted_ingredients')
          .insert({ child_profile_id: child.profile.id, ingredient_id: ingredientId })
        if (err) throw err
        tastedIds.value = new Set([...tastedIds.value, ingredientId])
      }
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      saving.value = false
    }
  }

  async function addCustom(
    name: string,
    nameUk: string | null,
    category: IngredientCategory,
    nutrition?: {
      caloriesPer100g?: number | null
      proteinPer100g?: number | null
      carbsPer100g?: number | null
      fatPer100g?: number | null
    }
  ): Promise<void> {
    if (!auth.userId) return
    saving.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('ingredients')
        .insert({
          name: name.trim(),
          name_uk: nameUk?.trim() || null,
          category,
          source: 'user',
          user_id: auth.userId,
          calories_per_100g: nutrition?.caloriesPer100g ?? null,
          protein_per_100g: nutrition?.proteinPer100g ?? null,
          carbs_per_100g: nutrition?.carbsPer100g ?? null,
          fat_per_100g: nutrition?.fatPer100g ?? null,
        })
        .select()
        .single()
      if (err) throw err
      items.value = [...items.value, mapRow(data)]
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function loadFriendTasted(friendChildProfileId: string): Promise<FoodItem[]> {
    const { data, error: err } = await supabase
      .from('child_tasted_ingredients')
      .select('ingredient_id, ingredients(*)')
      .eq('child_profile_id', friendChildProfileId)
    if (err) throw err
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => mapRow(r.ingredients))
  }

  async function adoptIngredient(item: FoodItem): Promise<void> {
    if (item.source === 'system') {
      await toggleTasted(item.id)
      return
    }
    // custom ingredient — find own copy or create one
    const existing = items.value.find(
      i => i.source === 'user' && i.userId === auth.userId && i.name === item.name && i.category === item.category
    )
    if (existing) {
      await toggleTasted(existing.id)
    } else {
      await addCustom(item.name, item.nameUk, item.category)
      const newItem = [...items.value].reverse().find(
        i => i.source === 'user' && i.userId === auth.userId && i.name === item.name
      )
      if (newItem) await toggleTasted(newItem.id)
    }
  }

  function isTastedByName(name: string): boolean {
    const lower = name.toLowerCase()
    const match = items.value.find(i => i.name.toLowerCase() === lower)
    return match ? tastedIds.value.has(match.id) : false
  }

  async function updateCustom(
    ingredientId: string,
    name: string,
    nameUk: string | null,
    category: IngredientCategory,
    nutrition?: {
      caloriesPer100g?: number | null
      proteinPer100g?: number | null
      carbsPer100g?: number | null
      fatPer100g?: number | null
    }
  ): Promise<void> {
    if (!auth.userId) return
    saving.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('ingredients')
        .update({
          name: name.trim(),
          name_uk: nameUk?.trim() || null,
          category,
          calories_per_100g: nutrition?.caloriesPer100g ?? null,
          protein_per_100g: nutrition?.proteinPer100g ?? null,
          carbs_per_100g: nutrition?.carbsPer100g ?? null,
          fat_per_100g: nutrition?.fatPer100g ?? null,
        })
        .eq('id', ingredientId)
        .select()
        .single()
      if (err) throw err
      items.value = items.value.map(i => i.id === ingredientId ? mapRow(data) : i)
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function removeCustom(ingredientId: string): Promise<void> {
    saving.value = true
    try {
      const { error: err } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', ingredientId)
      if (err) throw err
      items.value = items.value.filter(i => i.id !== ingredientId)
      tastedIds.value = new Set([...tastedIds.value].filter(id => id !== ingredientId))
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapRow(row: any): FoodItem {
    return {
      id: row.id,
      name: row.name,
      nameUk: row.name_uk ?? null,
      category: row.category as IngredientCategory,
      source: row.source as 'system' | 'user',
      userId: row.user_id ?? null,
      caloriesPer100g: row.calories_per_100g ?? null,
      proteinPer100g: row.protein_per_100g ?? null,
      carbsPer100g: row.carbs_per_100g ?? null,
      fatPer100g: row.fat_per_100g ?? null,
      fiberPer100g: row.fiber_per_100g ?? null,
      sugarPer100g: row.sugar_per_100g ?? null,
      createdAt: row.created_at,
    }
  }

  const explorationPercent = computed((): number => {
    const total = items.value.length
    if (total === 0) return 0
    return Math.round((tastedIds.value.size / total) * 100)
  })

  const currentMilestone = computed((): string | null => {
    const pct = explorationPercent.value
    if (pct >= 100) return 'masterFoodExplorer'
    if (pct >= 75) return 'nutritionChampion'
    if (pct >= 50) return 'flavorAdventurer'
    if (pct >= 25) return 'curiousEater'
    if (pct >= 10) return 'firstTasteExplorer'
    return null
  })

  return { items, tastedIds, loading, saving, error, isLoaded, load, toggleTasted, addCustom, updateCustom, removeCustom, loadFriendTasted, adoptIngredient, isTastedByName, explorationPercent, currentMilestone }
})
