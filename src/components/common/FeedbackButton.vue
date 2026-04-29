<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FeedbackModal from './FeedbackModal.vue'

const { t } = useI18n()
const modalOpen = ref(false)
</script>

<template>
  <button
    type="button"
    class="fixed bottom-24 left-4 z-40 w-12 h-12 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center"
    :title="t('feedback.buttonTitle')"
    @click="modalOpen = true"
  >
    <FontAwesomeIcon icon="headset" class="w-5 h-5" />
  </button>
  <FeedbackModal v-model:open="modalOpen" />
</template>
