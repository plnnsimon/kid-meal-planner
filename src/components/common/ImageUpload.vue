<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  currentUrl?: string | null
  shape?: 'circle' | 'rect'
  placeholder?: string
}>()

const emit = defineEmits<{
  change: [file: File]
}>()

const inputRef = ref<HTMLInputElement>()
const previewUrl = ref<string | null>(props.currentUrl ?? null)
const hasLocalFile = ref(false)

watch(() => props.currentUrl, (url) => {
  if (!hasLocalFile.value) {
    previewUrl.value = url ?? null
  }
})

function open() {
  inputRef.value?.click()
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  hasLocalFile.value = true
  previewUrl.value = URL.createObjectURL(file)
  emit('change', file)
  // Reset so the same file can be re-selected
  if (inputRef.value) inputRef.value.value = ''
}
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <button
      type="button"
      class="relative overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center transition-colors hover:border-primary-400 focus:outline-none focus:border-primary-500"
      :class="shape === 'circle' ? 'w-24 h-24 rounded-full' : 'w-full h-40 rounded-xl'"
      @click="open"
    >
      <img
        v-if="previewUrl"
        :src="previewUrl"
        alt="Preview"
        class="w-full h-full object-cover"
      />
      <span v-else class="flex flex-col items-center gap-1 text-gray-400 text-xs">
        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path d="M3 16l4-4 4 4 4-6 4 6"/>
          <rect x="3" y="3" width="18" height="18" rx="2"/>
        </svg>
        {{ placeholder ?? 'Upload photo' }}
      </span>
      <!-- Edit overlay when image present -->
      <div
        v-if="previewUrl"
        class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
      >
        <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z"/>
        </svg>
      </div>
    </button>

    <input
      ref="inputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onFileChange"
    />
  </div>
</template>
