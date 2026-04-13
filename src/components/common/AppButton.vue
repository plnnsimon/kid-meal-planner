<script setup lang="ts">
defineProps<{
  type?: 'submit' | 'button' | 'reset'
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'danger'
}>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled || loading"
    class="w-full rounded-xl py-3 font-semibold min-h-[44px] disabled:opacity-60 transition-colors"
    :class="(variant ?? 'primary') === 'danger' ? 'bg-red-500 text-white' : 'bg-primary-500 text-white'"
  >
    <span v-if="loading">Loading…</span>
    <slot v-else />
  </button>
</template>
