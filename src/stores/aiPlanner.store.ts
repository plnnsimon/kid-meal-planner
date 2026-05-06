import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useWeekPlanStore } from '@/stores/weekPlan.store'
import { useSubscriptionStore } from '@/stores/subscription.store'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Keep last N messages to limit token cost on long conversations (5 turns = 10 messages)
const HISTORY_WINDOW = 10

export const useAIPlannerStore = defineStore('aiPlanner', () => {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const quickLoading = ref(false)
  const quickError = ref<string | null>(null)

  async function quickGenerate(
    mode: 'quick_week' | 'quick_day' | 'quick_recipe',
    options: { dayOfWeek?: number; mealType?: string } = {},
  ): Promise<boolean> {
    quickLoading.value = true
    quickError.value = null

    const weekPlanStore = useWeekPlanStore()
    const auth = useAuthStore()
    const subscriptionStore = useSubscriptionStore()

    const locale = localStorage.getItem('locale') ?? 'en'

    const { data, error: fnErr } = await supabase.functions.invoke('ai-planner', {
      body: {
        mode,
        locale,
        userId: auth.userId,
        weekPlanId: weekPlanStore.plan?.id ?? null,
        ...options,
      },
    })

    if (fnErr) {
      let errorCode: string | null = null
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await (fnErr as any).context?.json?.()
        errorCode = body?.error ?? null
      } catch { /* ignore */ }
      if (errorCode === 'limit_reached' || errorCode === 'pro_required') {
        quickError.value = errorCode
      } else {
        quickError.value = fnErr.message
      }
      quickLoading.value = false
      return false
    }

    void data
    await subscriptionStore.refresh()
    quickLoading.value = false
    return true
  }

  async function sendMessage(content: string) {
    messages.value.push({ role: 'user', content })
    loading.value = true
    error.value = null

    const weekPlanStore = useWeekPlanStore()
    const auth = useAuthStore()

    const weekPlanId = weekPlanStore.plan?.id ?? null
    const userId = auth.userId

    const trimmed = messages.value.slice(-HISTORY_WINDOW)
    const { data, error: fnErr } = await supabase.functions.invoke('ai-planner', {
      body: {
        messages: trimmed.map(m => ({ role: m.role, content: m.content })),
        userId,
        weekPlanId,
      },
    })

    if (fnErr) {
      let isLimitReached = false
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await (fnErr as any).context?.json?.()
        isLimitReached = body?.error === 'limit_reached'
      } catch { /* ignore */ }
      error.value = isLimitReached ? 'limit_reached' : fnErr.message
      messages.value.pop()
    } else {
      messages.value.push({ role: 'assistant', content: data.message })
      const subscriptionStore = useSubscriptionStore()
      await subscriptionStore.refresh()
    }

    loading.value = false
  }

  function clearHistory() {
    messages.value = []
  }

  return { messages, loading, error, quickLoading, quickError, sendMessage, quickGenerate, clearHistory }
})
