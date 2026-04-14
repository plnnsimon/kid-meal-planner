<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import AppInput from '@/components/common/AppInput.vue'
import AppButton from '@/components/common/AppButton.vue'

const auth = useAuthStore()
const router = useRouter()

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const displayName = ref('')
const rememberMe = ref(true)
const loading = ref(false)
const error = ref<string | null>(null)
const nameError = ref<string | null>(null)
const emailError = ref<string | null>(null)
const passwordError = ref<string | null>(null)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_RE = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/

function validate(): boolean {
  nameError.value = null
  emailError.value = null
  passwordError.value = null

  if (mode.value === 'register') {
    const name = displayName.value.trim()
    if (!name) {
      nameError.value = 'Name is required'
      return false
    }
    if (name.length > 50) {
      nameError.value = 'Name must be 50 characters or fewer'
      return false
    }
  }

  if (!EMAIL_RE.test(email.value)) {
    emailError.value = 'Enter a valid email address'
    return false
  }

  const pw = password.value
  if (pw.length < 8) {
    passwordError.value = 'Password must be at least 8 characters'
    return false
  }
  if (pw.length > 20) {
    passwordError.value = 'Password must be 20 characters or fewer'
    return false
  }
  if (!PASSWORD_RE.test(pw)) {
    passwordError.value = 'Password must contain only Latin characters'
    return false
  }

  return true
}

async function submit() {
  error.value = null
  if (!validate()) return

  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(email.value, password.value, rememberMe.value)
    } else {
      await auth.register(email.value, password.value, displayName.value)
    }
    router.push('/plan')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  displayName.value = ''
  email.value = ''
  password.value = ''
  rememberMe.value = true
  error.value = null
  nameError.value = null
  emailError.value = null
  passwordError.value = null
}
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full p-6">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
      <h1 class="text-2xl font-bold text-gray-800 text-center">Kid Meal Planner</h1>
      <h2 class="text-base font-semibold text-gray-600 text-center">
        {{ mode === 'login' ? 'Sign in to your account' : 'Create an account' }}
      </h2>

      <form class="flex flex-col gap-3" novalidate @submit.prevent="submit">
        <AppInput
          v-if="mode === 'register'"
          v-model="displayName"
          label="Name"
          type="text"
          placeholder="Your name"
          autocomplete="name"
          :disabled="loading"
          required
          :error="nameError"
        />

        <AppInput
          v-model="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          :disabled="loading"
          required
          :error="emailError"
        />

        <AppInput
          v-model="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          autocomplete="current-password"
          :disabled="loading"
          required
          :error="passwordError"
        />

        <label v-if="mode === 'login'" class="flex items-center gap-2 cursor-pointer select-none">
          <input
            v-model="rememberMe"
            type="checkbox"
            class="w-4 h-4 accent-primary-500"
          />
          <span class="text-sm text-gray-600">Remember me</span>
        </label>

        <div v-if="error" class="text-sm text-red-500 text-center">{{ error }}</div>

        <AppButton type="submit" :loading="loading">
          {{ mode === 'login' ? 'Sign in' : 'Create account' }}
        </AppButton>
      </form>

      <p class="text-sm text-center text-gray-500">
        {{ mode === 'login' ? "Don't have an account?" : 'Already have an account?' }}
        <button
          type="button"
          class="text-primary-500 font-medium ml-1"
          @click="toggleMode"
        >
          {{ mode === 'login' ? 'Register' : 'Sign in' }}
        </button>
      </p>
    </div>
  </div>
</template>
