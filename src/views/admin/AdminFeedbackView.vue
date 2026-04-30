<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '@/stores/admin.store'

const { t } = useI18n()
const adminStore = useAdminStore()

onMounted(() => {
  adminStore.loadFeedback()
})

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString()
}

async function handleMarkRead(id: string) {
  await adminStore.markRead(id)
}

async function handleMarkAllRead() {
  await adminStore.markAllRead()
}
</script>

<template>
  <div class="p-4">
    <!-- Header row -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h1 class="text-xl font-bold text-gray-900">{{ t('admin.feedbackTitle') }}</h1>
        <span
          v-if="adminStore.unreadCount > 0"
          class="text-xs font-semibold bg-primary-500 text-white px-2 py-0.5 rounded-full"
        >
          {{ t('admin.unreadBadge', { count: adminStore.unreadCount }) }}
        </span>
      </div>
      <button
        v-if="adminStore.unreadCount > 0"
        class="text-sm text-primary-600 font-medium"
        @click="handleMarkAllRead"
      >
        {{ t('admin.markAllRead') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="adminStore.loading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error -->
    <p v-else-if="adminStore.error" class="text-red-500 text-sm text-center py-8">
      {{ t('admin.loadError') }}
    </p>

    <!-- Empty -->
    <p v-else-if="adminStore.feedback.length === 0" class="text-gray-500 text-sm text-center py-8">
      {{ t('admin.noFeedback') }}
    </p>

    <!-- List -->
    <div v-else class="flex flex-col gap-3">
      <div
        v-for="item in adminStore.feedback"
        :key="item.id"
        class="bg-white rounded-2xl shadow-sm p-4 transition-opacity"
        :class="item.isRead ? 'opacity-60' : ''"
      >
        <div class="flex items-start gap-3">
          <!-- Unread dot -->
          <span
            class="shrink-0 mt-2 w-2 h-2 rounded-full"
            :class="item.isRead ? 'bg-transparent' : 'bg-primary-500'"
          />

          <!-- Type badge -->
          <span
            class="shrink-0 mt-0.5 text-xs font-semibold px-2 py-1 rounded-full"
            :class="item.type === 'bug' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'"
          >
            {{ item.type === 'bug' ? t('admin.typeBug') : t('admin.typeFeature') }}
          </span>

          <div class="flex-1 min-w-0">
            <!-- User + date -->
            <div class="flex items-center justify-between gap-2 mb-1">
              <span
                class="text-sm truncate"
                :class="item.isRead ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'"
              >
                {{ item.userDisplayName }}
              </span>
              <span class="text-xs text-gray-400 shrink-0">{{ formatDate(item.createdAt) }}</span>
            </div>
            <!-- Stars -->
            <div v-if="item.rating" class="text-yellow-400 text-sm mb-1">
              <span v-for="s in 5" :key="s">{{ s <= item.rating! ? '★' : '☆' }}</span>
            </div>
            <!-- Message -->
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ item.message }}</p>
            <!-- Mark read -->
            <button
              v-if="!item.isRead"
              class="mt-2 text-xs text-primary-600 font-medium"
              @click="handleMarkRead(item.id)"
            >
              {{ t('admin.markRead') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
