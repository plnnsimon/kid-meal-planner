import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { UserProfile } from '@/types'

export const useProfileStore = defineStore('profile', () => {
  const auth = useAuthStore()

  const profile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  // ── Load own profile ─────────────────────────────────────────────────────────

  async function loadOwn() {
    if (!auth.userId) return
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', auth.userId)
        .maybeSingle()

      if (err) throw err
      profile.value = data ? mapRow(data) : null
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  async function update(updates: { displayName?: string; avatarUrl?: string | null }) {
    if (!auth.userId) return
    saving.value = true
    error.value = null
    try {
      const { error: err } = await supabase
        .from('profiles')
        .upsert({
          id: auth.userId,
          display_name: updates.displayName ?? '',
          avatar_url: updates.avatarUrl ?? null,
        }, { onConflict: 'id' })

      if (err) throw err
      await loadOwn()
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  async function search(query: string): Promise<UserProfile[]> {
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .ilike('display_name', `%${query}%`)
      .limit(20)

    if (err) throw err
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => mapRow(row))
  }

  // ── Upload avatar ────────────────────────────────────────────────────────────

  async function uploadAvatar(file: File): Promise<string> {
    if (!auth.userId) throw new Error('Not authenticated')
    const ext = file.name.split('.').pop()
    const path = `${auth.userId}/avatar.${ext}`

    const { error: err } = await supabase.storage
      .from('profile-avatars')
      .upload(path, file, { upsert: true })

    if (err) throw err

    const { data } = supabase.storage.from('profile-avatars').getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}`
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapRow(row: any): UserProfile {
    return {
      id: row.id,
      displayName: row.display_name ?? '',
      avatarUrl: row.avatar_url ?? null,
      role: row.role ?? 'user',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  return { profile, loading, saving, error, loadOwn, update, search, uploadAvatar }
})
