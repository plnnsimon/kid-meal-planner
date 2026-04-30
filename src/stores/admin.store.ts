import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { AdminUser, Feedback, UserRole } from '@/types'

export const useAdminStore = defineStore('admin', () => {
  const users = ref<AdminUser[]>([])
  const feedback = ref<Feedback[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapAdminUser(row: any): AdminUser {
    return {
      id: row.id,
      displayName: row.display_name ?? '',
      email: row.email ?? '',
      role: row.role ?? 'user',
      avatarUrl: row.avatar_url ?? null,
      createdAt: row.created_at,
      recipeCount: Number(row.recipe_count ?? 0),
      planCount: Number(row.plan_count ?? 0),
      lastLogin: row.last_login ?? null,
      subscriptionTier: (row.subscription_tier as 'basic' | 'pro') ?? 'basic',
      tierExpiresAt: row.tier_expires_at ?? null,
      isBlocked: row.is_blocked ?? false,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapFeedback(row: any): Feedback {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      message: row.message,
      rating: row.rating ?? null,
      createdAt: row.created_at,
      userDisplayName: row.profiles?.display_name ?? '',
    }
  }

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase.rpc('get_admin_user_stats')
      if (err) throw err
      users.value = (data ?? []).map(mapAdminUser)
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function loadFeedback(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('feedback')
        .select('*, profiles!inner(display_name)')
        .order('created_at', { ascending: false })
      if (err) throw err
      feedback.value = (data ?? []).map(mapFeedback)
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function setRole(userId: string, role: UserRole): Promise<void> {
    const { error: err } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
    if (err) throw err
    const target = users.value.find(u => u.id === userId)
    if (target) target.role = role
  }

  async function setTier(userId: string, tier: 'basic' | 'pro', expiresAt: string | null): Promise<void> {
    const { error: err } = await supabase.rpc('set_user_tier', {
      target_user_id: userId,
      new_tier: tier,
      new_expires_at: expiresAt,
    })
    if (err) throw err
    const target = users.value.find(u => u.id === userId)
    if (target) {
      target.subscriptionTier = tier
      target.tierExpiresAt = expiresAt
    }
  }

  async function setBlocked(userId: string, blocked: boolean): Promise<void> {
    const { error: err } = await supabase.rpc('set_user_blocked', {
      target_user_id: userId,
      blocked,
    })
    if (err) throw err
    const target = users.value.find(u => u.id === userId)
    if (target) target.isBlocked = blocked
  }

  return { users, feedback, loading, error, load, loadFeedback, setRole, setTier, setBlocked }
})
