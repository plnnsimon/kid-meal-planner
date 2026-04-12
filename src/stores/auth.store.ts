/**
 * Auth store — STUBBED for single-user mode.
 *
 * Auth is intentionally skipped for now. A hardcoded userId is used so all
 * data models stay consistent. When real auth is needed:
 *   1. Replace LOCAL_USER_ID with the Supabase session user id
 *   2. Implement login() / logout() via supabase.auth
 *   3. Uncomment the route guard in router/index.ts
 *   4. Enable RLS policies in the Supabase migration
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Stable placeholder used as the owner id for all DB records.
export const LOCAL_USER_ID = 'local-user'

export const useAuthStore = defineStore('auth', () => {
  const userId = ref<string>(LOCAL_USER_ID)
  const isAuthenticated = computed(() => !!userId.value)

  // Stubs — replace with real Supabase auth calls when needed
  async function login(_email: string, _password: string) {
    // TODO: supabase.auth.signInWithPassword(...)
  }

  async function logout() {
    // TODO: supabase.auth.signOut()
  }

  return { userId, isAuthenticated, login, logout }
})
