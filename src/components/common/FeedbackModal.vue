<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeedbackStore } from '@/stores/feedback.store'
import type { FeedbackType } from '@/types'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useI18n()
const feedbackStore = useFeedbackStore()

const selectedType = ref<FeedbackType>('bug')
const message = ref('')
const rating = ref<number | null>(null)
const successVisible = ref(false)
const errorMessage = ref('')

function close() {
  emit('update:open', false)
}

function reset() {
  selectedType.value = 'bug'
  message.value = ''
  rating.value = null
  successVisible.value = false
  errorMessage.value = ''
}

async function submit() {
  errorMessage.value = ''
  try {
    await feedbackStore.submit(selectedType.value, message.value, rating.value)
    successVisible.value = true
    setTimeout(() => {
      close()
      reset()
    }, 2000)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : t('common.error')
  }
}

function handleClose() {
  close()
  reset()
}
</script>

<template>
  <Teleport to="body">
    <template v-if="props.open">
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-black/50 z-50"
        @click="handleClose"
      />
      <!-- Sheet -->
      <div class="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 p-6">
        <h2 class="text-lg font-bold text-gray-900 mb-4">{{ t('feedback.modalTitle') }}</h2>

        <!-- Type toggle -->
        <div class="flex gap-2 mb-4">
          <button
            type="button"
            class="flex-1 h-11 rounded-xl text-sm font-semibold transition-colors"
            :class="selectedType === 'bug' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'"
            @click="selectedType = 'bug'"
          >
            {{ t('feedback.typeBug') }}
          </button>
          <button
            type="button"
            class="flex-1 h-11 rounded-xl text-sm font-semibold transition-colors"
            :class="selectedType === 'feature' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'"
            @click="selectedType = 'feature'"
          >
            {{ t('feedback.typeFeature') }}
          </button>
        </div>

        <!-- Textarea -->
        <textarea
          v-model="message"
          rows="4"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400 resize-none mb-4"
          :placeholder="t('feedback.messagePlaceholder')"
        />

        <!-- Star rating (optional) -->
        <div class="flex items-center gap-1 mb-4">
          <span class="text-sm text-gray-500 mr-2">{{ t('feedback.ratingLabel') }}</span>
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            class="text-2xl leading-none transition-colors"
            :class="rating !== null && star <= rating ? 'text-yellow-400' : 'text-gray-300'"
            @click="rating = rating === star ? null : star"
          >★</button>
        </div>

        <!-- Success -->
        <p v-if="successVisible" class="text-green-600 text-sm font-medium mb-3">
          {{ t('feedback.success') }}
        </p>

        <!-- Error -->
        <p v-if="errorMessage" class="text-red-500 text-sm mb-3">
          {{ errorMessage }}
        </p>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600"
            @click="handleClose"
          >
            {{ t('feedback.cancel') }}
          </button>
          <button
            type="button"
            class="flex-1 h-11 rounded-xl bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
            :disabled="feedbackStore.loading || !message.trim()"
            @click="submit"
          >
            {{ feedbackStore.loading ? t('feedback.submitting') : t('feedback.submit') }}
          </button>
        </div>
      </div>
    </template>
  </Teleport>
</template>
