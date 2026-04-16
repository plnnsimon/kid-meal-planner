<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWeekPlanStore } from '@/stores/weekPlan.store'
import DayColumn from '@/components/meal/DayColumn.vue'

const { t } = useI18n()

const weekPlan = useWeekPlanStore()

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
  <div class="flex flex-col h-full">

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

    <!-- Loading -->
    <div v-if="weekPlan.loading" class="flex-1 flex items-center justify-center">
      <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error -->
    <div v-else-if="weekPlan.error" class="m-4 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
      {{ weekPlan.error }}
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

  </div>
</template>
