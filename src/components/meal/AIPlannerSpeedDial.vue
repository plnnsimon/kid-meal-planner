<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useAIPlannerStore } from '@/stores/aiPlanner.store'
import { useSubscriptionStore } from '@/stores/subscription.store'
import QuickGenerateModal from '@/components/meal/QuickGenerateModal.vue'

const emit = defineEmits<{
  done: []
}>()

const { t } = useI18n()
const aiPlanner = useAIPlannerStore()
const subscription = useSubscriptionStore()

const open = ref(false)
const modalMode = ref<'quick_day' | 'quick_recipe' | null>(null)

function toggle() {
  open.value = !open.value
}

function closeAll() {
  open.value = false
  modalMode.value = null
}

function openModal(mode: 'quick_day' | 'quick_recipe') {
  open.value = false
  modalMode.value = mode
}

async function generateWeek() {
  open.value = false
  const ok = await aiPlanner.quickGenerate('quick_week')
  if (ok) emit('done')
}

function onModalDone() {
  closeAll()
  emit('done')
}
</script>

<template>
  <!-- Backdrop (closes dial on outside tap) -->
  <div
    v-if="open"
    class="fixed inset-0 z-10"
    @click="open = false"
  />

  <!-- Speed dial container -->
  <div class="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
    <!-- Sub-buttons (visible when open) -->
    <Transition name="dial">
      <div v-if="open" class="flex flex-col items-end gap-2">
        <!-- Week -->
        <div class="flex items-center gap-2">
          <span class="bg-white text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap">
            {{ subscription.isPro ? t('aiPlanner.quick.week') : t('aiPlanner.quick.proRequired') }}
          </span>
          <button
            type="button"
            :disabled="!subscription.isPro || aiPlanner.quickLoading"
            class="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center active:bg-gray-50 transition-colors disabled:opacity-40 relative"
            :title="!subscription.isPro ? t('aiPlanner.quick.proRequired') : t('aiPlanner.quick.week')"
            @click="generateWeek"
          >
            <FontAwesomeIcon v-if="aiPlanner.quickLoading" icon="spinner" class="w-5 h-5 text-primary-500 animate-spin" />
            <template v-else>
              <FontAwesomeIcon icon="calendar-week" class="w-5 h-5 text-primary-500" />
              <FontAwesomeIcon
                v-if="!subscription.isPro"
                icon="lock"
                class="w-2.5 h-2.5 text-gray-400 absolute bottom-1 right-1"
              />
            </template>
          </button>
        </div>

        <!-- Day -->
        <div class="flex items-center gap-2">
          <span class="bg-white text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap">
            {{ t('aiPlanner.quick.day') }}
          </span>
          <button
            type="button"
            class="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center active:bg-gray-50 transition-colors"
            @click="openModal('quick_day')"
          >
            <FontAwesomeIcon icon="calendar-day" class="w-5 h-5 text-primary-500" />
          </button>
        </div>

        <!-- Recipe -->
        <div class="flex items-center gap-2">
          <span class="bg-white text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap">
            {{ t('aiPlanner.quick.recipe') }}
          </span>
          <button
            type="button"
            class="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center active:bg-gray-50 transition-colors"
            @click="openModal('quick_recipe')"
          >
            <FontAwesomeIcon icon="utensils" class="w-5 h-5 text-primary-500" />
          </button>
        </div>

        <!-- Chat -->
        <div class="flex items-center gap-2">
          <span class="bg-white text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap">
            {{ t('aiPlanner.quick.chat') }}
          </span>
          <RouterLink
            to="/planner/chat"
            class="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center active:bg-gray-50 transition-colors"
            @click="open = false"
          >
            <FontAwesomeIcon icon="comment-dots" class="w-5 h-5 text-primary-500" />
          </RouterLink>
        </div>
      </div>
    </Transition>

    <!-- Main FAB -->
    <button
      type="button"
      :aria-label="t('aiPlanner.title')"
      class="w-14 h-14 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg active:bg-primary-600 transition-colors"
      @click="toggle"
    >
      <FontAwesomeIcon :icon="open ? 'xmark' : 'robot'" class="w-6 h-6" />
    </button>
  </div>

  <!-- Quick generate modal -->
  <Teleport to="body">
    <template v-if="modalMode">
      <QuickGenerateModal
        :mode="modalMode"
        @done="onModalDone"
        @close="modalMode = null"
      />
    </template>
  </Teleport>
</template>

<style scoped>
.dial-enter-active {
  transition: all 0.15s ease;
}
.dial-leave-active {
  transition: all 0.1s ease;
}
.dial-enter-from,
.dial-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
