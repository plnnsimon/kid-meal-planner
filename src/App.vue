<script setup lang="ts">
import { RouterView } from 'vue-router'
import BottomNav from '@/components/layout/BottomNav.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <AppHeader />
    <main class="flex-1 overflow-y-auto pb-20">
      <RouterView />
    </main>
    <BottomNav />
  </div>
</template>
