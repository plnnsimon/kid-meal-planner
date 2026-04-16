<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: string | number
  label: string
  type?: string
  placeholder?: string
  error?: string | null
  disabled?: boolean
  required?: boolean
  autocomplete?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPassword = ref(false)

const resolvedType = computed(() => {
  if (props.type === 'password') return showPassword.value ? 'text' : 'password'
  return props.type ?? 'text'
})
</script>

<template>
  <div class="flex flex-col gap-1">
    <label class="text-sm font-medium text-gray-700">{{ label }}</label>
    <div class="relative">
      <input
        :value="modelValue"
        :type="resolvedType"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :autocomplete="autocomplete"
        class="w-full border rounded-xl px-4 py-3 outline-none focus:border-primary-400 disabled:opacity-50"
        :class="[error ? 'border-red-400' : 'border-gray-200', type === 'password' ? 'pr-11' : '']"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="type === 'password'"
        type="button"
        tabindex="-1"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        @click="showPassword = !showPassword"
      >
        <FontAwesomeIcon :icon="showPassword ? 'eye-slash' : 'eye'" class="w-5 h-5" />
      </button>
    </div>
    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
  </div>
</template>
