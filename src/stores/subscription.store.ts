import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

export const useSubscriptionStore = defineStore('subscription', () => {
  const auth = useAuthStore()

  const tier = ref<'basic' | 'pro'>('basic')
  const tierExpiresAt = ref<string | null>(null)
  const generationsUsed = ref(0)
  const generationsLimit = ref<number>(10)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isPro = computed(() => {
    if (tier.value !== 'pro') return false
    if (tierExpiresAt.value === null) return true  // unlimited
    return new Date(tierExpiresAt.value) > new Date()
  })

  async function load() {
    if (!auth.userId) return
    loading.value = true
    error.value = null
    try {
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('subscription_tier, tier_expires_at')
        .eq('id', auth.userId)
        .maybeSingle()

      if (profileErr) throw profileErr

      tier.value = (profileData?.subscription_tier as 'basic' | 'pro') ?? 'basic'
      tierExpiresAt.value = profileData?.tier_expires_at ?? null

      const proActive =
        tier.value === 'pro' &&
        (tierExpiresAt.value === null || new Date(tierExpiresAt.value) > new Date())

      generationsLimit.value = proActive ? Infinity : 10

      const now = new Date()
      const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      const { data: usageData, error: usageErr } = await supabase
        .from('ai_usage')
        .select('generation_count')
        .eq('user_id', auth.userId)
        .eq('period_start', periodStart)
        .maybeSingle()

      if (usageErr) throw usageErr

      generationsUsed.value = usageData?.generation_count ?? 0
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    await load()
  }

  return { tier, tierExpiresAt, generationsUsed, generationsLimit, isPro, loading, error, load, refresh }
})
