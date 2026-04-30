import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { ChildProfile } from '@/types'

export const useChildStore = defineStore('child', () => {
  const auth = useAuthStore()

  const children = ref<ChildProfile[]>([])
  const selectedChildId = ref<string | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const selectedChild = computed<ChildProfile | null>(
    () => children.value.find(c => c.id === selectedChildId.value) ?? null
  )

  // Alias kept so all existing consumers (useAllergyCheck, ingredients.store, App.vue) keep working
  const profile = computed<ChildProfile | null>(() => selectedChild.value)

  const hasProfile = computed(() => selectedChild.value !== null)

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
        .order('created_at', { ascending: true })

      if (err) throw err
      children.value = (data ?? []).map(mapRow)

      // Restore persisted selection
      const storageKey = `kid-planner-selected-child-${auth.userId}`
      const stored = localStorage.getItem(storageKey)
      if (stored && children.value.some(c => c.id === stored)) {
        selectedChildId.value = stored
      } else if (children.value.length > 0) {
        // Auto-select first child
        selectedChildId.value = children.value[0].id
        localStorage.setItem(storageKey, children.value[0].id)
      } else {
        selectedChildId.value = null
      }
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  // ── Select ──────────────────────────────────────────────────────────────────

  function select(id: string) {
    selectedChildId.value = id
    if (auth.userId) {
      localStorage.setItem(`kid-planner-selected-child-${auth.userId}`, id)
    }
  }

  // ── Add ─────────────────────────────────────────────────────────────────────

  async function add(payload: Partial<Omit<ChildProfile, 'id' | 'userId' | 'createdAt'>>) {
    if (!auth.userId) return
    saving.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('child_profiles')
        .insert({
          user_id: auth.userId,
          name: payload.name ?? 'My Child',
          birth_date: payload.birthDate ?? null,
          avatar_url: payload.avatarUrl ?? null,
          allergies: payload.allergies ?? [],
          dietary_restrictions: payload.dietaryRestrictions ?? [],
        })
        .select()
        .single()

      if (err) throw err
      const newChild = mapRow(data)
      children.value = [...children.value, newChild]

      // Auto-select if this is the first child
      if (children.value.length === 1) {
        select(newChild.id)
      }

      return newChild
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  async function update(id: string, payload: Partial<Omit<ChildProfile, 'id' | 'userId' | 'createdAt'>>) {
    saving.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('child_profiles')
        .update({
          name: payload.name,
          birth_date: payload.birthDate ?? null,
          avatar_url: payload.avatarUrl ?? null,
          allergies: payload.allergies ?? [],
          dietary_restrictions: payload.dietaryRestrictions ?? [],
        })
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      const updated = mapRow(data)
      children.value = children.value.map(c => c.id === id ? updated : c)
      return updated
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  // ── Remove ──────────────────────────────────────────────────────────────────

  async function remove(id: string) {
    saving.value = true
    error.value = null
    try {
      const { error: err } = await supabase
        .from('child_profiles')
        .delete()
        .eq('id', id)

      if (err) throw err
      children.value = children.value.filter(c => c.id !== id)

      if (selectedChildId.value === id) {
        const next = children.value[0] ?? null
        selectedChildId.value = next?.id ?? null
        if (auth.userId) {
          const storageKey = `kid-planner-selected-child-${auth.userId}`
          if (next) {
            localStorage.setItem(storageKey, next.id)
          } else {
            localStorage.removeItem(storageKey)
          }
        }
      }
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  // ── Avatar upload ────────────────────────────────────────────────────────────
  // childId is optional: omit to use selectedChildId (legacy SettingsView call site)

  async function uploadAvatar(childIdOrFile: string | File, file?: File): Promise<string> {
    if (!auth.userId) throw new Error('Not authenticated')
    let childId: string
    let f: File
    if (typeof childIdOrFile === 'string') {
      childId = childIdOrFile
      f = file!
    } else {
      if (!selectedChildId.value) throw new Error('No child selected')
      childId = selectedChildId.value
      f = childIdOrFile
    }
    const ext = f.name.split('.').pop()
    const path = `${auth.userId}/${childId}/avatar.${ext}`

    const { error: err } = await supabase.storage
      .from('child-avatars')
      .upload(path, f, { upsert: true })

    if (err) throw err

    const { data } = supabase.storage.from('child-avatars').getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}`
  }

  // ── Legacy save() shim — delegates to update/add (used by SettingsView until Phase 22) ──

  async function save(updates: Partial<Omit<ChildProfile, 'id' | 'userId' | 'createdAt'>>) {
    if (selectedChildId.value) {
      await update(selectedChildId.value, updates)
    } else {
      await add(updates)
    }
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

  return {
    children,
    selectedChildId,
    selectedChild,
    profile,
    loading,
    saving,
    error,
    hasProfile,
    load,
    select,
    add,
    update,
    remove,
    uploadAvatar,
    save,
  }
})
