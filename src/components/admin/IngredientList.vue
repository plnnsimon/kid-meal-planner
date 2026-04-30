<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { FoodItem } from '@/types'

defineProps<{
  items: FoodItem[]
}>()

const emit = defineEmits<{
  edit: [item: FoodItem]
  delete: [id: string]
}>()

const { t } = useI18n()
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
    <!-- Desktop table -->
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 text-left">
            <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">
              {{ t('admin.ingredientImage') }}
            </th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.ingredientName') }}
            </th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.ingredientNameUk') }}
            </th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.ingredientCategory') }}
            </th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.ingredientSource') }}
            </th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.ingredientCalories') }}
            </th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">
              {{ t('admin.colRole') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
            class="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
          >
            <td class="px-4 py-3">
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                :alt="item.name"
                class="w-10 h-10 rounded-lg object-cover"
              />
              <div
                v-else
                class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"
              >
                <FontAwesomeIcon icon="image" class="w-4 h-4 text-gray-300" />
              </div>
            </td>
            <td class="px-4 py-3 font-medium text-gray-900">{{ item.name }}</td>
            <td class="px-4 py-3 text-gray-600">{{ item.nameUk ?? '—' }}</td>
            <td class="px-4 py-3">
              <span class="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {{ t(`ingredientCategories.${item.category}`) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span
                :class="item.source === 'system' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'"
                class="text-xs font-medium px-2 py-0.5 rounded-full"
              >
                {{ item.source === 'system' ? t('admin.ingredientSourceSystem') : t('admin.ingredientSourceUser') }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-600">
              {{ item.caloriesPer100g != null ? item.caloriesPer100g : '—' }}
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 min-h-[32px] transition-colors"
                  @click="emit('edit', item)"
                >
                  {{ t('common.edit') }}
                </button>
                <button
                  type="button"
                  class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 min-h-[32px] transition-colors"
                  @click="emit('delete', item.id)"
                >
                  {{ t('recipeDetail.delete') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile card list -->
    <div class="md:hidden flex flex-col divide-y divide-gray-50">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-center gap-3 px-4 py-3"
      >
        <img
          v-if="item.imageUrl"
          :src="item.imageUrl"
          :alt="item.name"
          class="w-10 h-10 rounded-lg object-cover shrink-0"
        />
        <div
          v-else
          class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"
        >
          <FontAwesomeIcon icon="image" class="w-4 h-4 text-gray-300" />
        </div>

        <div class="flex-1 min-w-0">
          <p class="font-medium text-gray-900 text-sm truncate">{{ item.name }}</p>
          <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span class="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              {{ t(`ingredientCategories.${item.category}`) }}
            </span>
            <span
              :class="item.source === 'system' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'"
              class="text-xs px-1.5 py-0.5 rounded-full"
            >
              {{ item.source === 'system' ? t('admin.ingredientSourceSystem') : t('admin.ingredientSourceUser') }}
            </span>
            <span v-if="item.caloriesPer100g != null" class="text-xs text-gray-400">
              {{ item.caloriesPer100g }} kcal
            </span>
          </div>
        </div>

        <div class="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 min-h-[36px] transition-colors"
            @click="emit('edit', item)"
          >
            {{ t('common.edit') }}
          </button>
          <button
            type="button"
            class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 min-h-[36px] transition-colors"
            @click="emit('delete', item.id)"
          >
            {{ t('recipeDetail.delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
