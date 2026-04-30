<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWeekPlanStore } from '@/stores/weekPlan.store'
import { useChildStore } from '@/stores/child.store'
import DayColumn from '@/components/meal/DayColumn.vue'
import ChildCard from '@/components/common/ChildCard.vue'

const { t } = useI18n()

const weekPlan = useWeekPlanStore()
const childStore = useChildStore()

onMounted(() => weekPlan.load())

// Generate Date objects for each day of the current week (Mon=0 … Sun=6)
const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekPlan.currentWeekStart)
    d.setDate(d.getDate() + i)
    return d
  })
)
</script>

<template>
  <div class="relative flex flex-col h-full">

    <!-- Week navigation bar -->
    <div class="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100 shrink-0">
      <button
        type="button"
        class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors"
        @click="weekPlan.prevWeek()"
      >
        <FontAwesomeIcon icon="chevron-left" class="w-4 h-4 text-gray-600" />
      </button>

      <button type="button" class="flex flex-col items-center" @click="weekPlan.goToToday()">
        <span class="text-sm font-semibold text-gray-900">{{ weekPlan.weekLabel }}</span>
        <span class="text-xs text-primary-500 font-medium">{{ t('weekPlan.tapForToday') }}</span>
      </button>

      <button
        type="button"
        class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors"
        @click="weekPlan.nextWeek()"
      >
        <FontAwesomeIcon icon="chevron-right" class="w-4 h-4 text-gray-600" />
      </button>
    </div>

    <!-- Child switcher — visible only when 2+ children -->
    <div
      v-if="childStore.children.length > 1"
      class="flex gap-1 overflow-x-auto px-3 py-2 bg-white border-b border-gray-100 shrink-0"
    >
      <ChildCard
        v-for="c in childStore.children"
        :key="c.id"
        :child="c"
        :active="c.id === childStore.selectedChildId"
        @select="childStore.select(c.id)"
      />
    </div>

    <!-- Loading -->
    <div v-if="weekPlan.loading" class="flex-1 flex items-center justify-center">
      <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error -->
    <div v-else-if="weekPlan.error" class="m-4 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
      {{ weekPlan.error }}
    </div>

    <!-- No child empty state -->
    <div v-else-if="!weekPlan.plan" class="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3 p-8">
      <FontAwesomeIcon icon="child" class="w-16 h-16" />
      <p class="text-base font-medium text-gray-500">{{ t('weekPlan.noChildSelected') }}</p>
      <RouterLink to="/settings" class="text-sm text-primary-500 font-medium">
        {{ t('weekPlan.goToSettings') }}
      </RouterLink>
    </div>

    <!-- 7-day horizontal scroll grid -->
    <div v-else class="flex-1 overflow-x-auto">
      <div class="flex gap-2 px-3 py-3 h-full" style="min-width: max-content; width: 100%;">
        <div
          v-for="(date, idx) in weekDays"
          :key="idx"
          class="shrink-0 flex-1" style="min-width: 9rem;"
        >
          <DayColumn :day-of-week="idx" :date="date" />
        </div>
      </div>
    </div>

    <!-- AI Planner FAB -->
    <RouterLink
      to="/planner/chat"
      class="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg active:bg-primary-600 transition-colors z-10"
      :aria-label="t('aiPlanner.title')"
    >
      <FontAwesomeIcon icon="robot" class="w-6 h-6" />
    </RouterLink>

  </div>
</template>
