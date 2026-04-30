import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { Friendship, UserProfile, ChildProfile, WeekPlan, LeaderboardEntry } from '@/types'

export const useFriendsStore = defineStore('friends', () => {
  const auth = useAuthStore()

  const friends = ref<Friendship[]>([])
  const pendingIncoming = ref<Friendship[]>([])
  // Outgoing pending requests (I am the requester, status = pending)
  const pendingOutgoing = ref<Friendship[]>([])
  const leaderboard = ref<LeaderboardEntry[]>([])
  const leaderboardLoading = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapRow(row: any): Friendship {
    return {
      requesterId: row.requester_id,
      addresseeId: row.addressee_id,
      status: row.status,
      createdAt: row.created_at,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapProfile(row: any): UserProfile {
    return {
      id: row.id,
      displayName: row.display_name ?? '',
      avatarUrl: row.avatar_url ?? null,
      role: row.role ?? 'user',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async function fetchProfiles(ids: string[]): Promise<Map<string, UserProfile>> {
    if (!ids.length) return new Map()
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids)
    if (err) throw err
    const map = new Map<string, UserProfile>()
    for (const row of data ?? []) {
      const p = mapProfile(row)
      map.set(p.id, p)
    }
    return map
  }

  // ── Load accepted friendships ─────────────────────────────────────────────────

  async function loadFriends(): Promise<void> {
    if (!auth.userId) return
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${auth.userId},addressee_id.eq.${auth.userId}`)

      if (err) throw err

      const rows = (data ?? []).map(mapRow)

      const otherIds = rows.map(f =>
        f.requesterId === auth.userId ? f.addresseeId : f.requesterId,
      )
      const profileMap = await fetchProfiles(otherIds)

      friends.value = rows.map(f => ({
        ...f,
        profile: profileMap.get(
          f.requesterId === auth.userId ? f.addresseeId : f.requesterId,
        ),
      }))

      // Also refresh outgoing pending so hasPendingRequest stays accurate
      await _loadOutgoingPending()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  // ── Load pending incoming requests ────────────────────────────────────────────

  async function loadPendingRequests(): Promise<void> {
    if (!auth.userId) return
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'pending')
        .eq('addressee_id', auth.userId)

      if (err) throw err

      const rows = (data ?? []).map(mapRow)

      const requesterIds = rows.map(f => f.requesterId)
      const profileMap = await fetchProfiles(requesterIds)

      pendingIncoming.value = rows.map(f => ({
        ...f,
        profile: profileMap.get(f.requesterId),
      }))
    } catch (e) {
      error.value = (e as Error).message
    }
  }

  // Internal: load outgoing pending (I am requester, status = pending)
  async function _loadOutgoingPending(): Promise<void> {
    if (!auth.userId) return
    const { data, error: err } = await supabase
      .from('friendships')
      .select('*')
      .eq('status', 'pending')
      .eq('requester_id', auth.userId)
    if (err) return
    pendingOutgoing.value = (data ?? []).map(mapRow)
  }

  // ── Send friend request ───────────────────────────────────────────────────────

  async function sendRequest(addresseeId: string): Promise<void> {
    if (!auth.userId) return
    const { error: err } = await supabase.from('friendships').insert({
      requester_id: auth.userId,
      addressee_id: addresseeId,
      status: 'pending',
    })
    if (err) throw err
    await _loadOutgoingPending()
  }

  // ── Accept incoming request ───────────────────────────────────────────────────

  async function accept(requesterId: string): Promise<void> {
    if (!auth.userId) return
    const { error: err } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('requester_id', requesterId)
      .eq('addressee_id', auth.userId)
    if (err) throw err
    await Promise.all([loadFriends(), loadPendingRequests()])
  }

  // ── Reject / decline incoming request ────────────────────────────────────────

  async function reject(requesterId: string): Promise<void> {
    if (!auth.userId) return
    const { error: err } = await supabase
      .from('friendships')
      .delete()
      .eq('requester_id', requesterId)
      .eq('addressee_id', auth.userId)
    if (err) throw err
    await loadPendingRequests()
  }

  // ── Remove an accepted friend ─────────────────────────────────────────────────

  async function removeFriend(otherId: string): Promise<void> {
    if (!auth.userId) return
    // Delete regardless of which side was requester
    await supabase
      .from('friendships')
      .delete()
      .eq('requester_id', auth.userId)
      .eq('addressee_id', otherId)
    await supabase
      .from('friendships')
      .delete()
      .eq('requester_id', otherId)
      .eq('addressee_id', auth.userId)
    await loadFriends()
  }

  // ── Friend social data ────────────────────────────────────────────────────────

  async function loadFriendChildProfile(userId: string): Promise<ChildProfile | null> {
    const { data, error: err } = await supabase
      .from('child_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (err || !data) return null
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      birthDate: data.birth_date ?? null,
      avatarUrl: data.avatar_url ?? null,
      allergies: data.allergies ?? [],
      dietaryRestrictions: data.dietary_restrictions ?? [],
      createdAt: data.created_at,
    }
  }

  async function loadFriendWeekPlan(userId: string): Promise<WeekPlan | null> {
    const today = new Date()
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    const dateStr = monday.toISOString().split('T')[0]

    const { data: planRow } = await supabase
      .from('week_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', dateStr)
      .maybeSingle()

    if (!planRow) return null

    const { data: slotRows, error: sErr } = await supabase
      .from('meal_slots')
      .select('*, recipe:recipes(*)')
      .eq('week_plan_id', planRow.id)

    if (sErr) return null

    return {
      id: planRow.id,
      userId: planRow.user_id,
      weekStartDate: planRow.week_start_date,
      createdAt: planRow.created_at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slots: (slotRows ?? []).map((row: any) => ({
        id: row.id,
        weekPlanId: row.week_plan_id,
        dayOfWeek: row.day_of_week,
        mealType: row.meal_type,
        recipeId: row.recipe_id ?? null,
        recipe: row.recipe ? {
          id: row.recipe.id,
          userId: row.recipe.user_id,
          name: row.recipe.name,
          description: row.recipe.description ?? '',
          imageUrl: row.recipe.image_url ?? null,
          mealTypes: row.recipe.meal_types ?? [],
          prepTime: row.recipe.prep_time ?? 0,
          cookTime: row.recipe.cook_time ?? 0,
          servings: row.recipe.servings ?? 1,
          nutrition: row.recipe.nutrition ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
          ingredients: row.recipe.ingredients ?? [],
          instructions: row.recipe.instructions ?? [],
          allergens: row.recipe.allergens ?? [],
          tags: row.recipe.tags ?? [],
          isFavorite: row.recipe.is_favorite ?? false,
          avgRating: row.recipe.avg_rating ?? 0,
          ratingsCount: row.recipe.ratings_count ?? 0,
          createdAt: row.recipe.created_at,
          updatedAt: row.recipe.updated_at,
        } : undefined,
        servings: row.servings ?? 1,
        notes: row.notes ?? '',
      })),
    }
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────────

  async function loadLeaderboard(): Promise<void> {
    if (!auth.userId) return
    leaderboardLoading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .rpc('get_leaderboard_for_friends', { p_user_id: auth.userId })
      if (err) throw err
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      leaderboard.value = (data ?? []).map((row: any) => ({
        userId: row.user_id,
        displayName: row.display_name ?? '',
        avatarUrl: row.avatar_url ?? null,
        savedCount: row.saved_count ?? 0,
        avgSavedRating: row.avg_saved_rating ?? 0,
        score: row.score ?? 0,
        rank: row.rank ?? 0,
      }))
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      leaderboardLoading.value = false
    }
  }

  // ── Computed helpers ──────────────────────────────────────────────────────────

  const isFriend = computed(() => (userId: string) =>
    friends.value.some(
      f => f.requesterId === userId || f.addresseeId === userId,
    ),
  )

  // Returns true when I have sent a pending request to userId (outgoing)
  const hasPendingRequest = computed(() => (userId: string) =>
    pendingOutgoing.value.some(f => f.addresseeId === userId),
  )

  return {
    friends,
    pendingIncoming,
    loading,
    error,
    loadFriends,
    loadPendingRequests,
    sendRequest,
    accept,
    reject,
    removeFriend,
    isFriend,
    hasPendingRequest,
    loadFriendChildProfile,
    loadFriendWeekPlan,
    leaderboard,
    leaderboardLoading,
    loadLeaderboard,
  }
})
