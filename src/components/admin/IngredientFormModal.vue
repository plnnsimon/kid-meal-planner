<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIngredientsStore } from '@/stores/ingredients.store'
import { INGREDIENT_CATEGORIES } from '@/types'
import type { FoodItem, IngredientCategory } from '@/types'
import ImageUpload from '@/components/common/ImageUpload.vue'

const props = defineProps<{
  mode: 'add' | 'edit'
  item?: FoodItem | null
}>()

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const { t } = useI18n()
const store = useIngredientsStore()

// ── Form state (initialized from props — component mounts fresh each open) ────
const formName = ref(props.item?.name ?? '')
const formNameUk = ref(props.item?.nameUk ?? '')
const formCategory = ref<IngredientCategory>(props.item?.category ?? 'produce')
const formCalories = ref(props.item?.caloriesPer100g != null ? String(props.item.caloriesPer100g) : '')
const formProtein = ref(props.item?.proteinPer100g != null ? String(props.item.proteinPer100g) : '')
const formCarbs = ref(props.item?.carbsPer100g != null ? String(props.item.carbsPer100g) : '')
const formFat = ref(props.item?.fatPer100g != null ? String(props.item.fatPer100g) : '')
const formFiber = ref(props.item?.fiberPer100g != null ? String(props.item.fiberPer100g) : '')
const formSugar = ref(props.item?.sugarPer100g != null ? String(props.item.sugarPer100g) : '')
const pendingImageFile = ref<File | null>(null)
const editingImageUrl = ref<string | null>(props.item?.imageUrl ?? null)

function parseNum(val: string): number | null {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

async function handleImageChange(file: File) {
  if (props.mode === 'edit' && props.item) {
    const url = await store.adminUploadImage(props.item.id, file)
    editingImageUrl.value = url
  } else {
    pendingImageFile.value = file
    editingImageUrl.value = URL.createObjectURL(file)
  }
}

async function handleSave() {
  if (!formName.value.trim()) return

  const payload = {
    name: formName.value,
    nameUk: formNameUk.value.trim() || null,
    category: formCategory.value,
    caloriesPer100g: parseNum(formCalories.value),
    proteinPer100g: parseNum(formProtein.value),
    carbsPer100g: parseNum(formCarbs.value),
    fatPer100g: parseNum(formFat.value),
    fiberPer100g: parseNum(formFiber.value),
    sugarPer100g: parseNum(formSugar.value),
  }

  if (props.mode === 'add') {
    await store.adminCreate(payload)
    if (pendingImageFile.value) {
      const newItem = [...store.items]
        .reverse()
        .find(i => i.source === 'system' && i.name === payload.name.trim() && i.category === payload.category)
      if (newItem) {
        await store.adminUploadImage(newItem.id, pendingImageFile.value)
      }
    }
  } else if (props.mode === 'edit' && props.item) {
    await store.adminUpdate(props.item.id, payload)
  }

  emit('saved')
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
      @click.self="emit('cancel')"
    >
      <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="text-base font-bold text-gray-900">
            {{ mode === 'add' ? t('admin.ingredientAdd') : t('admin.ingredientEdit') }}
          </h2>
          <button
            type="button"
            class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            @click="emit('cancel')"
          >
            ✕
          </button>
        </div>

        <form class="p-4 flex flex-col gap-4" @submit.prevent="handleSave">
          <!-- Image -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('admin.ingredientImage') }}
            </label>
            <ImageUpload
              :current-url="editingImageUrl"
              shape="rect"
              :placeholder="t('admin.ingredientImage')"
              @change="handleImageChange"
            />
          </div>

          <!-- Name EN -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('admin.ingredientName') }} <span class="text-red-400">*</span>
            </label>
            <input
              v-model="formName"
              type="text"
              required
              class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
            />
          </div>

          <!-- Name UK -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('admin.ingredientNameUk') }}
            </label>
            <input
              v-model="formNameUk"
              type="text"
              class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
            />
          </div>

          <!-- Category -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('admin.ingredientCategory') }}
            </label>
            <select
              v-model="formCategory"
              class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400 bg-white"
            >
              <option v-for="cat in INGREDIENT_CATEGORIES" :key="cat" :value="cat">
                {{ t(`ingredientCategories.${cat}`) }}
              </option>
            </select>
          </div>

          <!-- Nutrition grid -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">
                {{ t('admin.ingredientCalories') }}
              </label>
              <input
                v-model="formCalories"
                type="number"
                min="0"
                step="0.1"
                class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">
                {{ t('admin.ingredientProtein') }}
              </label>
              <input
                v-model="formProtein"
                type="number"
                min="0"
                step="0.1"
                class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">
                {{ t('admin.ingredientCarbs') }}
              </label>
              <input
                v-model="formCarbs"
                type="number"
                min="0"
                step="0.1"
                class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">
                {{ t('admin.ingredientFat') }}
              </label>
              <input
                v-model="formFat"
                type="number"
                min="0"
                step="0.1"
                class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">
                {{ t('admin.ingredientFiber') }}
              </label>
              <input
                v-model="formFiber"
                type="number"
                min="0"
                step="0.1"
                class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">
                {{ t('admin.ingredientSugar') }}
              </label>
              <input
                v-model="formSugar"
                type="number"
                min="0"
                step="0.1"
                class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              class="flex-1 text-sm font-semibold px-4 py-3 rounded-xl bg-gray-100 text-gray-700 min-h-[44px] hover:bg-gray-200 transition-colors"
              @click="emit('cancel')"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="store.saving || !formName.trim()"
              class="flex-1 text-sm font-semibold px-4 py-3 rounded-xl bg-primary-500 text-white min-h-[44px] hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {{ store.saving ? t('recipeForm.saving') : t('admin.ingredientSave') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
