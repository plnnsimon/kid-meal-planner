import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { FeedbackType } from '@/types'

export const useFeedbackStore = defineStore('feedback', () => {
  const auth = useAuthStore()

  const loading = ref(false)

  async function submit(type: FeedbackType, message: string, rating: number | null = null): Promise<void> {
    if (!auth.userId) throw new Error('Not authenticated')
    loading.value = true
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: auth.userId,
        type,
        message,
        ...(rating !== null ? { rating } : {}),
      })
      if (error) throw error
    } finally {
      loading.value = false
    }
  }

  return { loading, submit }
})
