<script setup lang="ts">
defineProps<{
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
      @click.self="$emit('cancel')"
    >
      <div class="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6 flex flex-col gap-4">
        <div>
          <p class="text-base font-semibold text-gray-900">{{ title }}</p>
          <p class="text-sm text-gray-500 mt-1">{{ message }}</p>
        </div>

        <div class="flex gap-3 justify-end">
          <button
            type="button"
            class="text-sm font-semibold px-4 py-2 rounded-xl bg-gray-100 text-gray-700 min-h-[40px] hover:bg-gray-200 transition-colors"
            @click="$emit('cancel')"
          >
            {{ cancelLabel ?? 'Cancel' }}
          </button>
          <button
            type="button"
            :class="variant === 'danger'
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-primary-500 hover:bg-primary-600 text-white'"
            class="text-sm font-semibold px-4 py-2 rounded-xl min-h-[40px] transition-colors"
            @click="$emit('confirm')"
          >
            {{ confirmLabel ?? 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
