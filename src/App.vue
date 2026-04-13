<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import BottomNav from '@/components/layout/BottomNav.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const route = useRoute()

auth.init()
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <template v-if="auth.ready">
      <AppHeader v-if="route.name !== 'login'" />
      <main class="flex-1 overflow-y-auto pb-20">
        <RouterView />
      </main>
      <BottomNav v-if="route.name !== 'login'" />
    </template>
    <div v-else class="flex items-center justify-center h-full">
      <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  </div>
</template>
