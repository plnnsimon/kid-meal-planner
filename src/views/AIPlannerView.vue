<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useAIPlannerStore } from '@/stores/aiPlanner.store'
import { useWeekPlanStore } from '@/stores/weekPlan.store'
import { useSubscriptionStore } from '@/stores/subscription.store'

const { t } = useI18n()

const store = useAIPlannerStore()
const weekPlanStore = useWeekPlanStore()
const subscriptionStore = useSubscriptionStore()

const inputText = ref('')
const messagesEl = ref<HTMLDivElement | null>(null)

onMounted(async () => {
  if (weekPlanStore.plan === null) {
    await weekPlanStore.load()
  }
})

watch(
  () => store.messages.length,
  () => {
    nextTick(() => {
      messagesEl.value?.scrollTo({ top: messagesEl.value.scrollHeight, behavior: 'smooth' })
    })
  },
)

watch(
  () => store.loading,
  () => {
    nextTick(() => {
      messagesEl.value?.scrollTo({ top: messagesEl.value.scrollHeight, behavior: 'smooth' })
    })
  },
)

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

async function send() {
  const text = inputText.value.trim()
  if (!text || store.loading) return
  inputText.value = ''
  await store.sendMessage(text)
}
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- Messages area -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto px-4 py-4 space-y-3">

      <!-- Clear history button -->
      <div v-if="store.messages.length > 0" class="flex justify-end">
        <button
          type="button"
          class="text-xs text-gray-400 font-medium px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors min-h-[44px]"
          @click="store.clearHistory()"
        >
          {{ t('aiPlanner.clearHistory') }}
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-if="store.messages.length === 0"
        class="flex items-start gap-2 mt-2"
      >
        <div class="bg-white rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%] shadow-sm text-sm text-gray-700">
          {{ t('aiPlanner.emptyState') }}
        </div>
      </div>

      <!-- Message bubbles -->
      <div
        v-for="(msg, i) in store.messages"
        :key="i"
        :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
      >
        <div
          :class="msg.role === 'user'
            ? 'bg-primary-500 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] ml-auto text-sm'
            : 'bg-white rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%] shadow-sm text-sm text-gray-700'"
        >
          {{ msg.content }}
        </div>
      </div>

      <!-- Loading indicator -->
      <div v-if="store.loading" class="flex justify-start">
        <div class="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm inline-flex gap-1">
          <span class="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
          <span class="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
          <span class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
        </div>
      </div>

    </div>

    <!-- Usage badge (Basic only) -->
    <div v-if="!subscriptionStore.isPro" class="px-4 pt-2 pb-0 flex justify-end">
      <span class="text-xs text-gray-400">
        {{ t('subscription.usageCounter', { used: subscriptionStore.generationsUsed, limit: subscriptionStore.generationsLimit }) }}
      </span>
    </div>

    <!-- Upgrade banner (limit reached) -->
    <div
      v-if="store.error === 'limit_reached'"
      class="bg-amber-50 border-t border-amber-100 px-4 py-3 text-sm text-amber-800"
    >
      <p class="font-medium">{{ t('subscription.limitReached', { limit: subscriptionStore.generationsLimit }) }}</p>
      <RouterLink to="/settings" class="text-primary-500 font-medium underline text-xs mt-1 inline-block">
        {{ t('subscription.upgradeCta') }}
      </RouterLink>
    </div>

    <!-- Generic error banner (non-limit errors only) -->
    <div v-else-if="store.error" class="bg-red-50 text-red-600 text-sm px-4 py-3 border-t border-red-100">
      {{ store.error }}
    </div>

    <!-- Input bar -->
    <div class="border-t border-gray-200 bg-white px-4 py-3 flex gap-2 items-end">
      <textarea
        v-model="inputText"
        rows="1"
        :placeholder="t('aiPlanner.placeholder')"
        :disabled="store.loading"
        class="flex-1 resize-vertical border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-400 disabled:bg-gray-50 disabled:text-gray-400 min-h-[44px] max-h-32 leading-5"
        @keydown="handleKeydown"
      />
      <button
        type="button"
        :disabled="store.loading || !inputText.trim() || store.error === 'limit_reached'"
        class="w-11 h-11 rounded-full bg-primary-500 text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
        @click="send"
      >
        <FontAwesomeIcon icon="paper-plane" class="w-4 h-4" />
      </button>
    </div>

  </div>
</template>
