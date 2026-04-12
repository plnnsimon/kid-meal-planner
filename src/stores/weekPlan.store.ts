import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { WeekPlan, MealSlot, MealType, Recipe } from '@/types'

// Returns the Monday of the week containing `date`
export function weekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function addWeeks(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n * 7)
  return d
}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const useWeekPlanStore = defineStore('weekPlan', () => {
  const auth = useAuthStore()

  const plan = ref<WeekPlan | null>(null)
  const currentWeekStart = ref<Date>(weekStart())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const weekLabel = computed(() => {
    const start = currentWeekStart.value
    const end = addWeeks(start, 1)
    end.setDate(end.getDate() - 1)
    const fmt = (d: Date) =>
      d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
    return `${fmt(start)} – ${fmt(end)}`
  })

  // ── Navigate ─────────────────────────────────────────────────────────────────

  async function prevWeek() {
    currentWeekStart.value = addWeeks(currentWeekStart.value, -1)
    await load()
  }

  async function nextWeek() {
    currentWeekStart.value = addWeeks(currentWeekStart.value, 1)
    await load()
  }

  async function goToToday() {
    currentWeekStart.value = weekStart()
    await load()
  }

  // ── Load (or create) plan for current week ───────────────────────────────────

  async function load() {
    loading.value = true
    error.value = null
    try {
      const dateStr = toISODate(currentWeekStart.value)

      // Find or create the week plan row
      let { data: planRow } = await supabase
        .from('week_plans')
        .select('*')
        .eq('user_id', auth.userId)
        .eq('week_start_date', dateStr)
        .maybeSingle()

      if (!planRow) {
        const { data, error: err } = await supabase
          .from('week_plans')
          .insert({ user_id: auth.userId, week_start_date: dateStr })
          .select()
          .single()
        if (err) throw err
        planRow = data
      }

      // Load slots with recipe data
      const { data: slotRows, error: sErr } = await supabase
        .from('meal_slots')
        .select(`
          *,
          recipe:recipes(*)
        `)
        .eq('week_plan_id', planRow.id)

      if (sErr) throw sErr

      plan.value = {
        id: planRow.id,
        userId: planRow.user_id,
        weekStartDate: planRow.week_start_date,
        createdAt: planRow.created_at,
        slots: (slotRows ?? []).map(mapSlotRow),
      }
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  // ── Get slot for a given day + meal type ──────────────────────────────────────

  function getSlot(dayOfWeek: number, mealType: MealType): MealSlot | undefined {
    return plan.value?.slots.find(s => s.dayOfWeek === dayOfWeek && s.mealType === mealType)
  }

  // ── Assign recipe to a slot ───────────────────────────────────────────────────

  async function assignRecipe(dayOfWeek: number, mealType: MealType, recipe: Recipe, servings = 1) {
    if (!plan.value) return

    const existing = getSlot(dayOfWeek, mealType)

    if (existing) {
      // Update
      const { error: err } = await supabase
        .from('meal_slots')
        .update({ recipe_id: recipe.id, servings })
        .eq('id', existing.id)
      if (err) throw err
      existing.recipeId = recipe.id
      existing.recipe = recipe
      existing.servings = servings
    } else {
      // Insert
      const { data, error: err } = await supabase
        .from('meal_slots')
        .insert({
          week_plan_id: plan.value.id,
          day_of_week: dayOfWeek,
          meal_type: mealType,
          recipe_id: recipe.id,
          servings,
        })
        .select(`*, recipe:recipes(*)`)
        .single()
      if (err) throw err
      plan.value.slots.push(mapSlotRow(data))
    }
  }

  // ── Remove recipe from slot ───────────────────────────────────────────────────

  async function clearSlot(dayOfWeek: number, mealType: MealType) {
    if (!plan.value) return
    const existing = getSlot(dayOfWeek, mealType)
    if (!existing) return

    const { error: err } = await supabase
      .from('meal_slots')
      .delete()
      .eq('id', existing.id)
    if (err) throw err

    plan.value.slots = plan.value.slots.filter(s => s.id !== existing.id)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapSlotRow(row: any): MealSlot {
    return {
      id: row.id,
      weekPlanId: row.week_plan_id,
      dayOfWeek: row.day_of_week,
      mealType: row.meal_type,
      recipeId: row.recipe_id ?? null,
      recipe: row.recipe ? mapRecipe(row.recipe) : undefined,
      servings: row.servings ?? 1,
      notes: row.notes ?? '',
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapRecipe(r: any): Recipe {
    return {
      id: r.id,
      userId: r.user_id,
      name: r.name,
      description: r.description ?? '',
      imageUrl: r.image_url ?? null,
      mealTypes: r.meal_types ?? [],
      prepTime: r.prep_time ?? 0,
      cookTime: r.cook_time ?? 0,
      servings: r.servings ?? 1,
      nutrition: r.nutrition ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
      ingredients: r.ingredients ?? [],
      instructions: r.instructions ?? [],
      allergens: r.allergens ?? [],
      tags: r.tags ?? [],
      isFavorite: r.is_favorite ?? false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }
  }

  return {
    plan, loading, error, currentWeekStart, weekLabel,
    load, prevWeek, nextWeek, goToToday,
    getSlot, assignRecipe, clearSlot,
  }
})
