<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: number
  readonly?: boolean
  size?: 'sm' | 'md'
}>()

const emit = defineEmits<{ 'update:modelValue': [score: number] }>()

const hoverScore = ref(0)

function onClick(star: number) {
  if (props.readonly) return
  const next = props.modelValue === star ? 0 : star
  emit('update:modelValue', next)
}

function onMouseEnter(star: number) {
  if (props.readonly) return
  hoverScore.value = star
}

function onMouseLeave() {
  if (props.readonly) return
  hoverScore.value = 0
}

function isFilled(star: number): boolean {
  const display = hoverScore.value || props.modelValue
  return star <= Math.round(display)
}
</script>

<template>
  <div class="flex items-center gap-0.5">
    <span
      v-for="star in 5"
      :key="star"
      class="text-amber-400 leading-none select-none"
      :class="[
        size === 'md' ? 'text-xl' : 'text-sm',
        readonly ? 'cursor-default' : 'cursor-pointer',
      ]"
      @click="onClick(star)"
      @mouseenter="onMouseEnter(star)"
      @mouseleave="onMouseLeave"
    >{{ isFilled(star) ? '★' : '☆' }}</span>
  </div>
</template>
