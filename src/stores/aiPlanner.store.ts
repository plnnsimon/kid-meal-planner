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

export const useAIPlannerStore = defineStore('aiPlanner', () => {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function sendMessage(content: string) {
    messages.value.push({ role: 'user', content })
    loading.value = true
    error.value = null

    const weekPlanStore = useWeekPlanStore()
    const auth = useAuthStore()

    const weekPlanId = weekPlanStore.plan?.id ?? null
    const userId = auth.userId

    const { data, error: fnErr } = await supabase.functions.invoke('ai-planner', {
      body: {
        messages: messages.value.map(m => ({ role: m.role, content: m.content })),
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

  return { messages, loading, error, sendMessage, clearHistory }
})
