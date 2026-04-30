import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const REMEMBER_KEY = 'remember_me'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const ready = ref(false)
  let _initPromise: Promise<void> | null = null

  const userId = computed<string | null>(() => session.value?.user.id ?? null)
  const isAuthenticated = computed(() => !!session.value)

  function init(): Promise<void> {
    if (_initPromise) return _initPromise
    _initPromise = _doInit()
    return _initPromise
  }

  async function _doInit() {
    const { data } = await supabase.auth.getSession()

    if (data.session) {
      const remembered = localStorage.getItem(REMEMBER_KEY) === 'true'
      const sessionOnly = sessionStorage.getItem(REMEMBER_KEY) === 'true'
      if (!remembered && !sessionOnly) {
        await supabase.auth.signOut()
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_blocked')
          .eq('id', data.session.user.id)
          .single()
        if (profile?.is_blocked) {
          await supabase.auth.signOut()
        } else {
          session.value = data.session
        }
      }
    }

    supabase.auth.onAuthStateChange((_event, s) => {
      session.value = s
    })

    ready.value = true
  }

  async function login(email: string, password: string, rememberMe: boolean) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    // Check if blocked
    if (data.user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_blocked')
        .eq('id', data.user.id)
        .single()
      if (profile?.is_blocked) {
        await supabase.auth.signOut()
        throw new Error('account_blocked')
      }
    }

    // Fire-and-forget login activity event
    if (data.user?.id) {
      supabase.from('activity_events').insert({ user_id: data.user.id, event: 'login' }).then(() => {})
    }

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, 'true')
      sessionStorage.removeItem(REMEMBER_KEY)
    } else {
      sessionStorage.setItem(REMEMBER_KEY, 'true')
      localStorage.removeItem(REMEMBER_KEY)
    }
  }

  async function register(email: string, password: string, displayName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem(REMEMBER_KEY)
    sessionStorage.removeItem(REMEMBER_KEY)
  }

  return { session, ready, userId, isAuthenticated, init, login, register, logout }
})
