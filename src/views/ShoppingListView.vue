<script setup lang="ts">
import { onMounted } from 'vue'
import { useWeekPlanStore } from '@/stores/weekPlan.store'
import { useShoppingList } from '@/composables/useShoppingList'
import ShoppingGroupSection from '@/components/shopping/ShoppingGroupSection.vue'
import type { IngredientCategory } from '@/types'

const CATEGORY_ORDER: IngredientCategory[] = [
  'produce',
  'meat',
  'dairy',
  'bakery',
  'frozen',
  'pantry',
  'beverages',
  'other',
]

const weekPlanStore = useWeekPlanStore()
const { groupedItems, checkedIds, toggle, clearChecked, totalItems, checkedCount } = useShoppingList()

onMounted(() => {
  if (!weekPlanStore.plan) {
    weekPlanStore.load()
  }
})
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- Header -->
    <div class="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
      <div class="flex items-baseline gap-2">
        <h1 class="text-xl font-bold text-gray-900">Shopping List</h1>
        <span class="text-sm text-gray-500">
          {{ totalItems }} item{{ totalItems !== 1 ? 's' : '' }}
          <template v-if="checkedCount > 0"> · {{ checkedCount }} checked</template>
        </span>
      </div>
      <button
        v-if="checkedCount > 0"
        type="button"
        class="text-sm font-medium text-primary-500 active:opacity-70 transition-opacity shrink-0"
        @click="clearChecked"
      >
        Clear checked
      </button>
    </div>

    <!-- Loading -->
    <div v-if="weekPlanStore.loading" class="flex-1 flex items-center justify-center">
      <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="totalItems === 0"
      class="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3 p-8"
    >
      <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <p class="text-lg font-medium">No items yet</p>
      <p class="text-sm text-center">Plan some meals this week and your shopping list will appear here.</p>
    </div>

    <!-- Grouped sections -->
    <div v-else class="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
      <ShoppingGroupSection
        v-for="cat in CATEGORY_ORDER"
        :key="cat"
        v-show="groupedItems[cat].length > 0"
        :category="cat"
        :items="groupedItems[cat]"
        :checked-ids="checkedIds"
        @toggle="toggle"
      />
    </div>

  </div>
</template>
