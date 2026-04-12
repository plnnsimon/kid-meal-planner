<script setup lang="ts">
import type { NutritionInfo } from '@/types'

defineProps<{ nutrition: NutritionInfo }>()
</script>

<template>
  <div class="flex gap-2 flex-wrap">
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium">
      🔥 {{ nutrition.calories }} kcal
    </span>
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
      P {{ nutrition.protein }}g
    </span>
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs font-medium">
      C {{ nutrition.carbs }}g
    </span>
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">
      F {{ nutrition.fat }}g
    </span>
  </div>
</template>
