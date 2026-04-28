import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useWeekPlanStore } from '@/stores/weekPlan.store'

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
      error.value = fnErr.message
      messages.value.pop()
    } else {
      messages.value.push({ role: 'assistant', content: data.message })
    }

    loading.value = false
  }

  function clearHistory() {
    messages.value = []
  }

  return { messages, loading, error, sendMessage, clearHistory }
})
