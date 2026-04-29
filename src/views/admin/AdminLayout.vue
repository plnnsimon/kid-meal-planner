<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()

const displayName = auth.session?.user?.email ?? ''
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <!-- Top bar -->
    <div class="bg-gray-900 text-white px-4 h-14 flex items-center gap-4 shrink-0">
      <span class="text-lg font-bold">{{ t('admin.title') }}</span>
      <span class="text-sm text-gray-400 truncate">{{ displayName }}</span>
      <RouterLink
        to="/plan"
        class="ml-auto shrink-0 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
      >
        ← {{ t('admin.leaveAdmin') }}
      </RouterLink>
    </div>

    <!-- Tab nav -->
    <nav class="bg-white border-b border-gray-200 flex shrink-0">
      <RouterLink
        to="/admin/users"
        class="flex-1 text-center py-3 text-sm font-semibold transition-colors"
        :class="route.path === '/admin/users' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-500'"
      >
        {{ t('admin.users') }}
      </RouterLink>
      <RouterLink
        to="/admin/feedback"
        class="flex-1 text-center py-3 text-sm font-semibold transition-colors"
        :class="route.path === '/admin/feedback' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-500'"
      >
        {{ t('admin.feedback') }}
      </RouterLink>
    </nav>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <RouterView />
    </div>
  </div>
</template>
