<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useAIPlannerStore } from '@/stores/aiPlanner.store'

const props = defineProps<{
  mode: 'quick_day' | 'quick_recipe'
}>()

const emit = defineEmits<{
  done: []
  close: []
}>()

const { t, tm } = useI18n()
const aiPlanner = useAIPlannerStore()

// Day-of-week: 0=Mon … 6=Sun; default to today
function todayIndex(): number {
  const jsDay = new Date().getDay() // 0=Sun … 6=Sat
  return jsDay === 0 ? 6 : jsDay - 1
}

const selectedDay = ref(todayIndex())
const selectedMeal = ref<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')

const dayNames = computed(() => tm('days.long') as string[])

const mealOptions: Array<{ value: 'breakfast' | 'lunch' | 'dinner' | 'snack'; labelKey: string }> = [
  { value: 'breakfast', labelKey: 'mealTypes.breakfast' },
  { value: 'lunch',     labelKey: 'mealTypes.lunch' },
  { value: 'dinner',    labelKey: 'mealTypes.dinner' },
  { value: 'snack',     labelKey: 'mealTypes.snack' },
]

async function generate() {
  const options =
    props.mode === 'quick_recipe'
      ? { dayOfWeek: selectedDay.value, mealType: selectedMeal.value }
      : { dayOfWeek: selectedDay.value }

  const ok = await aiPlanner.quickGenerate(props.mode, options)
  if (ok) emit('done')
}

const isLimitError = computed(
  () => aiPlanner.quickError === 'limit_reached' || aiPlanner.quickError === 'pro_required',
)
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 bg-black/40 z-30" @click="emit('close')" />

  <!-- Sheet -->
  <div class="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 px-6 pt-5 pb-10">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-base font-semibold text-gray-900">{{ t('aiPlanner.quick.title') }}</h2>
      <button
        type="button"
        class="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
        @click="emit('close')"
      >
        <FontAwesomeIcon icon="xmark" class="w-4 h-4 text-gray-500" />
      </button>
    </div>

    <!-- Day select -->
    <label class="block mb-4">
      <span class="text-sm font-medium text-gray-700 block mb-1">{{ t('aiPlanner.quick.selectDay') }}</span>
      <select
        v-model="selectedDay"
        class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-400 bg-white min-h-[44px]"
      >
        <option v-for="(name, idx) in dayNames" :key="idx" :value="idx">{{ name }}</option>
      </select>
    </label>

    <!-- Meal type select (quick_recipe only) -->
    <label v-if="mode === 'quick_recipe'" class="block mb-5">
      <span class="text-sm font-medium text-gray-700 block mb-1">{{ t('aiPlanner.quick.selectMeal') }}</span>
      <select
        v-model="selectedMeal"
        class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-400 bg-white min-h-[44px]"
      >
        <option v-for="opt in mealOptions" :key="opt.value" :value="opt.value">
          {{ t(opt.labelKey) }}
        </option>
      </select>
    </label>

    <!-- Generate button -->
    <button
      type="button"
      :disabled="aiPlanner.quickLoading"
      class="w-full bg-primary-500 text-white font-semibold rounded-2xl py-3 min-h-[44px] text-sm disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
      @click="generate"
    >
      <span
        v-if="aiPlanner.quickLoading"
        class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
      />
      <span>{{ aiPlanner.quickLoading ? t('aiPlanner.quick.generating') : t('aiPlanner.quick.generate') }}</span>
    </button>

    <!-- Error -->
    <div v-if="aiPlanner.quickError" class="mt-3 text-sm">
      <template v-if="isLimitError">
        <p class="text-amber-700">{{ t('subscription.limitReached', { limit: 10 }) }}</p>
        <RouterLink to="/settings" class="text-primary-500 font-medium underline text-xs mt-1 inline-block">
          {{ t('subscription.upgradeCta') }}
        </RouterLink>
      </template>
      <p v-else class="text-red-600">{{ aiPlanner.quickError }}</p>
    </div>
  </div>
</template>
