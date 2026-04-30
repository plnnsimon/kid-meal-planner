<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  childName: string
  when: 'today' | 'yesterday'
}>()
defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div class="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
        <div class="text-6xl leading-none">🎂</div>
        <h2 class="text-2xl font-bold text-gray-900">
          {{ t('birthday.title', { name: childName }) }}
        </h2>
        <p class="text-gray-500 text-sm leading-relaxed">
          {{ when === 'today' ? t('birthday.messageToday', { name: childName }) : t('birthday.messageYesterday', { name: childName }) }}
        </p>
        <button
          class="w-full bg-primary-500 text-white font-semibold py-3 rounded-2xl active:scale-95 transition-transform"
          @click="$emit('close')"
        >
          {{ t('birthday.close') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
