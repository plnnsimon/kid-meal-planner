import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { ChildProfile } from '@/types'

export const useChildStore = defineStore('child', () => {
  const auth = useAuthStore()

  const profile = ref<ChildProfile | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const hasProfile = computed(() => profile.value !== null)

  // ── Load ────────────────────────────────────────────────────────────────────

  async function load() {
    if (!auth.userId) return
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('child_profiles')
        .select('*')
        .eq('user_id', auth.userId)
        .maybeSingle()

      if (err) throw err
      profile.value = data ? mapRow(data) : null
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  // ── Save (upsert) ───────────────────────────────────────────────────────────

  async function save(updates: Partial<Omit<ChildProfile, 'id' | 'userId' | 'createdAt'>>) {
    if (!auth.userId) return
    saving.value = true
    error.value = null
    try {
      if (profile.value?.id) {
        // Update existing
        const { data, error: err } = await supabase
          .from('child_profiles')
          .update({
            name: updates.name,
            birth_date: updates.birthDate ?? null,
            avatar_url: updates.avatarUrl ?? null,
            allergies: updates.allergies ?? [],
            dietary_restrictions: updates.dietaryRestrictions ?? [],
          })
          .eq('id', profile.value.id)
          .select()
          .single()

        if (err) throw err
        profile.value = mapRow(data)
      } else {
        // Insert new
        const { data, error: err } = await supabase
          .from('child_profiles')
          .insert({
            user_id: auth.userId,
            name: updates.name ?? 'My Child',
            birth_date: updates.birthDate ?? null,
            avatar_url: updates.avatarUrl ?? null,
            allergies: updates.allergies ?? [],
            dietary_restrictions: updates.dietaryRestrictions ?? [],
          })
          .select()
          .single()

        if (err) throw err
        profile.value = mapRow(data)
      }
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  // ── Avatar upload ────────────────────────────────────────────────────────────

  async function uploadAvatar(file: File): Promise<string> {
    if (!auth.userId) throw new Error('Not authenticated')
    const ext = file.name.split('.').pop()
    const path = `${auth.userId}/avatar.${ext}`

    const { error: err } = await supabase.storage
      .from('child-avatars')
      .upload(path, file, { upsert: true })

    if (err) throw err

    const { data } = supabase.storage.from('child-avatars').getPublicUrl(path)
    // Bust cache by appending timestamp
    return `${data.publicUrl}?t=${Date.now()}`
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapRow(row: any): ChildProfile {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      birthDate: row.birth_date ?? null,
      avatarUrl: row.avatar_url ?? null,
      allergies: row.allergies ?? [],
      dietaryRestrictions: row.dietary_restrictions ?? [],
      createdAt: row.created_at,
    }
  }

  return { profile, loading, saving, error, hasProfile, load, save, uploadAvatar }
})
