<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import BottomNav from '@/components/layout/BottomNav.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import FeedbackButton from '@/components/common/FeedbackButton.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useSubscriptionStore } from '@/stores/subscription.store'

const auth = useAuthStore()
const subscriptionStore = useSubscriptionStore()
const route = useRoute()

auth.init().then(() => {
  if (auth.isAuthenticated) {
    subscriptionStore.load()
  }
})
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <template v-if="auth.ready">
      <AppHeader v-if="route.name !== 'login' && !route.meta.requiresAdmin" />
      <main class="flex-1 overflow-y-auto" :class="route.meta.requiresAdmin ? '' : 'pb-20'">
        <RouterView />
      </main>
      <BottomNav v-if="route.name !== 'login' && !route.meta.requiresAdmin" />
      <FeedbackButton v-if="auth.isAuthenticated && route.name !== 'login' && !route.meta.requiresAdmin" />
    </template>
    <div v-else class="flex items-center justify-center h-full">
      <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  </div>
</template>
