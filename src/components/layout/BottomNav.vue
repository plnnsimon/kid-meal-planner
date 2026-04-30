<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useFriendsStore } from '@/stores/friends.store'

const route = useRoute()
const { t } = useI18n()
const friendsStore = useFriendsStore()

const pendingCount = computed(() => friendsStore.pendingIncoming.length)

const tabs = computed(() => [
  { to: '/plan',     label: t('nav.plan'),     icon: 'calendar-days', badge: 0 },
  { to: '/recipes',  label: t('nav.recipes'),  icon: 'book',          badge: 0 },
  { to: '/shopping', label: t('nav.shopping'), icon: 'cart-shopping', badge: 0 },
  { to: '/friends',  label: t('nav.friends'),  icon: 'users',         badge: pendingCount.value  },
  { to: '/settings', label: t('nav.settings'), icon: 'gear',          badge: 0 },
])

function isActive(path: string) {
  return route.path.startsWith(path)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
    <div class="flex items-stretch h-16">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors"
        :class="isActive(tab.to) ? 'text-primary-500' : 'text-gray-400'"
      >
        <div class="relative">
          <FontAwesomeIcon :icon="tab.icon" class="w-6 h-6" />
          <span
            v-if="tab.badge > 0"
            class="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none"
          >
            {{ tab.badge > 99 ? '99+' : tab.badge }}
          </span>
        </div>
        <span class="text-xs font-medium">{{ tab.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>
