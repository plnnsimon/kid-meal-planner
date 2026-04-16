<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n()

const tabs = computed(() => [
  { to: '/plan',     label: t('nav.plan'),     icon: 'calendar-days' },
  { to: '/recipes',  label: t('nav.recipes'),  icon: 'book' },
  { to: '/shopping', label: t('nav.shopping'), icon: 'cart-shopping' },
  { to: '/friends',  label: t('nav.friends'),  icon: 'users' },
  { to: '/settings', label: t('nav.settings'), icon: 'gear' },
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
        <FontAwesomeIcon :icon="tab.icon" class="w-6 h-6" />
        <span class="text-xs font-medium">{{ tab.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>
