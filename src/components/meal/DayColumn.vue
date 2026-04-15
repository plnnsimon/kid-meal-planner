<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWeekPlanStore } from '@/stores/weekPlan.store'
import { useLocale } from '@/composables/useLocale'
import MealSlotCard from './MealSlotCard.vue'
import MealPickerModal from './MealPickerModal.vue'
import { MEAL_TYPES } from '@/types'
import type { MealType, Recipe } from '@/types'

const { t, tm } = useI18n()
const { currentLocale } = useLocale()

const props = defineProps<{
  dayOfWeek: number   // 0=Mon … 6=Sun
  date: Date
}>()

const weekPlan = useWeekPlanStore()

const pickerOpen = ref(false)
const activeMealType = ref<MealType>('breakfast')

const dayShort = computed(() => (tm('days.short') as string[])[props.dayOfWeek])

const isToday = () => {
  const today = new Date()
  return props.date.toDateString() === today.toDateString()
}

const dateLabel = () =>
  props.date.toLocaleDateString(currentLocale.value === 'uk' ? 'uk-UA' : 'en', { month: 'short', day: 'numeric' })

function openPicker(mealType: MealType) {
  activeMealType.value = mealType
  pickerOpen.value = true
}

async function onRecipeSelected(recipe: Recipe) {
  pickerOpen.value = false
  await weekPlan.assignRecipe(props.dayOfWeek, activeMealType.value, recipe)
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <!-- Day header -->
    <div
      class="text-center pb-1 sticky top-0 bg-gray-50 z-10"
    >
      <p class="text-xs font-bold" :class="isToday() ? 'text-primary-500' : 'text-gray-500'">
        {{ dayShort }}
      </p>
      <p class="text-xs" :class="isToday() ? 'text-primary-400' : 'text-gray-400'">
        {{ dateLabel() }}
      </p>
    </div>

    <!-- Meal slots -->
    <MealSlotCard
      v-for="mealType in MEAL_TYPES"
      :key="mealType"
      :meal-type="mealType"
      :slot="weekPlan.getSlot(dayOfWeek, mealType)"
      @tap="openPicker(mealType)"
      @clear="weekPlan.clearSlot(dayOfWeek, mealType)"
    />

    <!-- Picker modal -->
    <MealPickerModal
      v-if="pickerOpen"
      :meal-type="activeMealType"
      :day-label="`${dayShort}, ${dateLabel()}`"
      @select="onRecipeSelected"
      @close="pickerOpen = false"
    />
  </div>
</template>
