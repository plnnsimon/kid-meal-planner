<script setup lang="ts">
defineProps<{
  label: string
  active: boolean
  removable?: boolean
}>()

defineEmits<{
  toggle: []
  remove: []
}>()
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors select-none"
    :class="active
      ? 'bg-primary-500 border-primary-500 text-white'
      : 'bg-white border-gray-300 text-gray-600'"
    @click="$emit('toggle')"
  >
    {{ label }}
    <span
      v-if="removable && active"
      class="ml-0.5 text-white/80 hover:text-white leading-none"
      @click.stop="$emit('remove')"
    >✕</span>
  </button>
</template>
