<script setup lang="ts">
import type { ChildProfile } from '@/types'

defineProps<{
  child: ChildProfile
  active?: boolean
}>()
defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    class="flex flex-col items-center px-2 py-2 rounded-xl min-h-[44px] shrink-0"
    :class="active ? 'bg-primary-50' : ''"
    @click="$emit('select')"
  >
    <div
      class="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-base font-semibold"
      :class="[
        active ? 'ring-2 ring-primary-500' : '',
        !child.avatarUrl ? 'bg-gray-200 text-gray-500' : '',
      ]"
    >
      <img
        v-if="child.avatarUrl"
        :src="child.avatarUrl"
        :alt="child.name"
        class="w-full h-full object-cover"
      />
      <span v-else>{{ child.name.charAt(0).toUpperCase() }}</span>
    </div>
    <span class="text-xs font-medium text-gray-700 mt-1 text-center max-w-[72px] truncate">
      {{ child.name }}
    </span>
  </button>
</template>
