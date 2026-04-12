import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { Recipe, MealType, NutritionInfo, Ingredient } from '@/types'

export const useRecipeStore = defineStore('recipe', () => {
  const auth = useAuthStore()

  const recipes = ref<Recipe[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  // ── Load all ─────────────────────────────────────────────────────────────────

  async function load() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', auth.userId)
        .order('created_at', { ascending: false })

      if (err) throw err
      recipes.value = (data ?? []).map(mapRow)
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  // ── Get single ───────────────────────────────────────────────────────────────

  function getById(id: string): Recipe | undefined {
    return recipes.value.find(r => r.id === id)
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  async function create(payload: RecipePayload): Promise<Recipe> {
    saving.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('recipes')
        .insert(toRow(auth.userId, payload))
        .select()
        .single()

      if (err) throw err
      const recipe = mapRow(data)
      recipes.value.unshift(recipe)
      return recipe
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  async function update(id: string, payload: RecipePayload): Promise<Recipe> {
    saving.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('recipes')
        .update(toRow(auth.userId, payload))
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      const recipe = mapRow(data)
      const idx = recipes.value.findIndex(r => r.id === id)
      if (idx !== -1) recipes.value[idx] = recipe
      return recipe
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function remove(id: string) {
    const { error: err } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)

    if (err) throw err
    recipes.value = recipes.value.filter(r => r.id !== id)
  }

  // ── Toggle favourite ─────────────────────────────────────────────────────────

  async function toggleFavorite(id: string) {
    const recipe = getById(id)
    if (!recipe) return
    const next = !recipe.isFavorite
    await supabase.from('recipes').update({ is_favorite: next }).eq('id', id)
    recipe.isFavorite = next
  }

  // ── Image upload ─────────────────────────────────────────────────────────────

  async function uploadImage(file: File, recipeId: string): Promise<string> {
    const ext = file.name.split('.').pop()
    const path = `${auth.userId}/${recipeId}.${ext}`

    const { error: err } = await supabase.storage
      .from('recipe-images')
      .upload(path, file, { upsert: true })

    if (err) throw err

    const { data } = supabase.storage.from('recipe-images').getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}`
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapRow(row: any): Recipe {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description ?? '',
      imageUrl: row.image_url ?? null,
      mealTypes: row.meal_types ?? [],
      prepTime: row.prep_time ?? 0,
      cookTime: row.cook_time ?? 0,
      servings: row.servings ?? 1,
      nutrition: row.nutrition ?? defaultNutrition(),
      ingredients: row.ingredients ?? [],
      instructions: row.instructions ?? [],
      allergens: row.allergens ?? [],
      tags: row.tags ?? [],
      isFavorite: row.is_favorite ?? false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  function toRow(userId: string, p: RecipePayload) {
    return {
      user_id: userId,
      name: p.name,
      description: p.description,
      image_url: p.imageUrl ?? null,
      meal_types: p.mealTypes,
      prep_time: p.prepTime,
      cook_time: p.cookTime,
      servings: p.servings,
      nutrition: p.nutrition,
      ingredients: p.ingredients,
      instructions: p.instructions,
      allergens: p.allergens,
      tags: p.tags,
      is_favorite: p.isFavorite,
    }
  }

  return {
    recipes, loading, saving, error,
    load, getById, create, update, remove, toggleFavorite, uploadImage,
  }
})

// ── Types ─────────────────────────────────────────────────────────────────────

export type RecipePayload = {
  name: string
  description: string
  imageUrl: string | null
  mealTypes: MealType[]
  prepTime: number
  cookTime: number
  servings: number
  nutrition: NutritionInfo
  ingredients: Ingredient[]
  instructions: string[]
  allergens: string[]
  tags: string[]
  isFavorite: boolean
}

export function defaultNutrition(): NutritionInfo {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
}

export function emptyPayload(): RecipePayload {
  return {
    name: '',
    description: '',
    imageUrl: null,
    mealTypes: [],
    prepTime: 0,
    cookTime: 0,
    servings: 1,
    nutrition: defaultNutrition(),
    ingredients: [],
    instructions: [],
    allergens: [],
    tags: [],
    isFavorite: false,
  }
}
