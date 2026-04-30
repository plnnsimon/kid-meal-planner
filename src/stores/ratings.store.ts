import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

export const useRatingsStore = defineStore('ratings', () => {
  const auth = useAuthStore()

  const myRatings = ref<Map<string, number>>(new Map())
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    if (!auth.userId) return
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('recipe_ratings')
        .select('recipe_id, score')
        .eq('user_id', auth.userId)
      if (err) throw err
      const map = new Map<string, number>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (data ?? []) as any[]) {
        map.set(row.recipe_id, row.score)
      }
      myRatings.value = map
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function upsert(recipeId: string, score: number): Promise<void> {
    if (!auth.userId) return
    // Optimistic update
    myRatings.value = new Map(myRatings.value).set(recipeId, score)
    saving.value = true
    error.value = null
    try {
      const { error: err } = await supabase
        .from('recipe_ratings')
        .upsert(
          { user_id: auth.userId, recipe_id: recipeId, score, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,recipe_id' },
        )
      if (err) throw err
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      saving.value = false
    }
  }

  async function remove(recipeId: string): Promise<void> {
    if (!auth.userId) return
    const updated = new Map(myRatings.value)
    updated.delete(recipeId)
    myRatings.value = updated
    saving.value = true
    error.value = null
    try {
      const { error: err } = await supabase
        .from('recipe_ratings')
        .delete()
        .eq('user_id', auth.userId)
        .eq('recipe_id', recipeId)
      if (err) throw err
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      saving.value = false
    }
  }

  const getMyRating = computed(() => (recipeId: string) => myRatings.value.get(recipeId) ?? 0)

  return { myRatings, loading, saving, error, load, upsert, remove, getMyRating }
})
