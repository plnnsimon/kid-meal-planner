<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MealSlot, MealType } from '@/types'
import { useAllergyCheck } from '@/composables/useAllergyCheck'
import RecipePreviewModal from './RecipePreviewModal.vue'

const { t } = useI18n()

defineProps<{
  slot?: MealSlot
  mealType: MealType
}>()

defineEmits<{
  tap: []
  clear: []
}>()

const { hasAllergyConflict } = useAllergyCheck()

const showPreview = ref(false)
</script>

<template>
  <div class="w-full">

    <!-- Recipe preview modal -->
    <RecipePreviewModal
      v-if="showPreview && slot?.recipe"
      :recipe="slot.recipe"
      @close="showPreview = false"
    />

    <!-- Filled slot -->
    <div
      v-else-if="slot?.recipe"
      class="w-full border border-gray-200 rounded-xl p-2 bg-white shadow-sm"
    >
      <div class="flex items-center gap-2 active:scale-[0.97] transition-transform cursor-pointer" @click="$emit('tap')">
        <!-- Recipe thumb -->
        <div class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
          <img v-if="slot.recipe.imageUrl" :src="slot.recipe.imageUrl" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-lg">🍽️</div>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-gray-800 leading-tight truncate">{{ slot.recipe.name }}</p>
          <p class="text-xs text-gray-400">{{ slot.recipe.nutrition.calories }} kcal</p>
        </div>

        <!-- Allergy warning -->
        <span v-if="hasAllergyConflict(slot.recipe)" class="text-amber-500 text-sm">⚠️</span>

        <!-- Preview button -->
        <button
          type="button"
          class="text-gray-300 hover:text-gray-500 p-1 leading-none"
          @click.stop="showPreview = true"
        >
          <FontAwesomeIcon icon="eye" class="w-3.5 h-3.5" />
        </button>

        <!-- Clear button -->
        <button
          type="button"
          class="text-gray-300 hover:text-gray-500 text-base leading-none p-1"
          @click.stop="$emit('clear')"
        >×</button>
      </div>
      <p class="text-xs text-gray-400 mt-1 text-center">{{ t('mealTypes.' + mealType) }}</p>
    </div>

    <!-- Empty slot -->
    <button
      v-else
      type="button"
      class="w-full flex items-center gap-2 border border-dashed border-gray-200 rounded-xl p-2 text-gray-300 active:border-primary-300 active:text-primary-400 transition-colors"
      @click="$emit('tap')"
    >
      <span class="text-xs">+</span>
      <span class="text-xs">{{ t('mealTypes.' + mealType) }}</span>
    </button>
  </div>
</template>
