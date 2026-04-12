<script setup lang="ts">
import type { IngredientCategory, ShoppingListItem } from '@/types'

defineProps<{
  category: IngredientCategory
  items: ShoppingListItem[]
  checkedIds: Set<string>
}>()

defineEmits<{
  toggle: [key: string]
}>()

function itemKey(item: ShoppingListItem): string {
  return `${item.ingredientName}__${item.unit}`
}

function formatAmount(amount: number): string {
  // Round to 2 decimal places and strip trailing zeros
  const rounded = Math.round(amount * 100) / 100
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2).replace(/\.?0+$/, '')
}

function capitalise(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
</script>

<template>
  <section class="bg-white rounded-2xl shadow-sm overflow-hidden">
    <!-- Category heading -->
    <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
      <h2 class="font-semibold text-gray-800 text-base">{{ capitalise(category) }}</h2>
      <span class="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
        {{ items.length }}
      </span>
    </div>

    <!-- Items -->
    <ul>
      <li
        v-for="item in items"
        :key="itemKey(item)"
        class="px-4 py-3 border-b border-gray-50 last:border-b-0"
      >
        <!-- Checkbox row -->
        <label class="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <button
            type="button"
            class="shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
            :class="checkedIds.has(itemKey(item))
              ? 'bg-primary-500 border-primary-500'
              : 'border-gray-300 bg-white'"
            :aria-label="`Toggle ${item.ingredientName}`"
            @click="$emit('toggle', itemKey(item))"
          >
            <svg
              v-if="checkedIds.has(itemKey(item))"
              class="w-3.5 h-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>

          <div class="flex-1 min-w-0">
            <div
              class="flex items-baseline gap-2 transition-colors"
              :class="checkedIds.has(itemKey(item)) ? 'line-through text-gray-300' : 'text-gray-800'"
            >
              <span class="font-medium text-sm capitalize">{{ item.ingredientName }}</span>
              <span class="text-sm text-gray-500 shrink-0">
                {{ formatAmount(item.totalAmount) }} {{ item.unit }}
              </span>
            </div>

            <!-- Recipe source chips -->
            <div
              v-if="item.recipeNames.length"
              class="flex flex-wrap gap-1 mt-1"
            >
              <span
                v-for="name in item.recipeNames"
                :key="name"
                class="text-xs px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full"
              >
                {{ name }}
              </span>
            </div>
          </div>
        </label>
      </li>
    </ul>
  </section>
</template>
