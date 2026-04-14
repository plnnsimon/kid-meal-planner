import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { Friendship, UserProfile } from '@/types'

export const useFriendsStore = defineStore('friends', () => {
  const auth = useAuthStore()

  const friends = ref<Friendship[]>([])
  const pendingIncoming = ref<Friendship[]>([])
  // Outgoing pending requests (I am the requester, status = pending)
  const pendingOutgoing = ref<Friendship[]>([])
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
  }
})
