<script setup lang="ts">
defineProps<{
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
</script>

<template>
  <div class="flex flex-col gap-1">
    <label class="text-sm font-medium text-gray-700">{{ label }}</label>
    <input
      :value="modelValue"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :autocomplete="autocomplete"
      class="w-full border rounded-xl px-4 py-3 outline-none focus:border-primary-400 disabled:opacity-50"
      :class="error ? 'border-red-400' : 'border-gray-200'"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
  </div>
</template>
