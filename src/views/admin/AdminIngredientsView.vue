<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIngredientsStore } from '@/stores/ingredients.store'
import { INGREDIENT_CATEGORIES } from '@/types'
import type { FoodItem, IngredientCategory } from '@/types'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import ImageUpload from '@/components/common/ImageUpload.vue'

const { t } = useI18n()
const store = useIngredientsStore()

// ── Search + filter ───────────────────────────────────────────────────────────
const searchQuery = ref('')
const categoryFilter = ref<IngredientCategory | ''>('')

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return store.items.filter(item => {
    const matchesSearch = !q ||
      item.name.toLowerCase().includes(q) ||
      (item.nameUk ?? '').toLowerCase().includes(q)
    const matchesCategory = !categoryFilter.value || item.category === categoryFilter.value
    return matchesSearch && matchesCategory
  })
})

// ── Modal state ───────────────────────────────────────────────────────────────
const modalMode = ref<'add' | 'edit' | null>(null)
const editingItem = ref<FoodItem | null>(null)

// Form fields
const formName = ref('')
const formNameUk = ref('')
const formCategory = ref<IngredientCategory>('produce')
const formCalories = ref<string>('')
const formProtein = ref<string>('')
const formCarbs = ref<string>('')
const formFat = ref<string>('')
const formFiber = ref<string>('')
const formSugar = ref<string>('')
const pendingImageFile = ref<File | null>(null)
const editingImageUrl = ref<string | null>(null)

function openAdd() {
  formName.value = ''
  formNameUk.value = ''
  formCategory.value = 'produce'
  formCalories.value = ''
  formProtein.value = ''
  formCarbs.value = ''
  formFat.value = ''
  formFiber.value = ''
  formSugar.value = ''
  pendingImageFile.value = null
  editingImageUrl.value = null
  editingItem.value = null
  modalMode.value = 'add'
}

function openEdit(item: FoodItem) {
  formName.value = item.name
  formNameUk.value = item.nameUk ?? ''
  formCategory.value = item.category
  formCalories.value = item.caloriesPer100g != null ? String(item.caloriesPer100g) : ''
  formProtein.value = item.proteinPer100g != null ? String(item.proteinPer100g) : ''
  formCarbs.value = item.carbsPer100g != null ? String(item.carbsPer100g) : ''
  formFat.value = item.fatPer100g != null ? String(item.fatPer100g) : ''
  formFiber.value = item.fiberPer100g != null ? String(item.fiberPer100g) : ''
  formSugar.value = item.sugarPer100g != null ? String(item.sugarPer100g) : ''
  pendingImageFile.value = null
  editingImageUrl.value = item.imageUrl ?? null
  editingItem.value = item
  modalMode.value = 'edit'
}

function closeModal() {
  modalMode.value = null
  editingItem.value = null
}

function parseNum(val: string): number | null {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

async function handleImageChange(file: File) {
  if (modalMode.value === 'edit' && editingItem.value) {
    // Upload immediately in edit mode
    const url = await store.adminUploadImage(editingItem.value.id, file)
    editingImageUrl.value = url
    // Keep editingItem in sync
    editingItem.value = { ...editingItem.value, imageUrl: url }
  } else {
    // Store for deferred upload after create
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

  if (modalMode.value === 'add') {
    await store.adminCreate(payload)
    // Upload image to the newly created item (last item added after reload)
    if (pendingImageFile.value) {
      // find the newly inserted item by name + category
      const newItem = [...store.items]
        .reverse()
        .find(i => i.source === 'system' && i.name === payload.name.trim() && i.category === payload.category)
      if (newItem) {
        await store.adminUploadImage(newItem.id, pendingImageFile.value)
      }
    }
  } else if (modalMode.value === 'edit' && editingItem.value) {
    await store.adminUpdate(editingItem.value.id, payload)
  }

  closeModal()
}

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteTargetId = ref<string | null>(null)

function confirmDelete(id: string) {
  deleteTargetId.value = id
}

async function handleDelete() {
  if (!deleteTargetId.value) return
  await store.adminDelete(deleteTargetId.value)
  deleteTargetId.value = null
}

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(() => {
  if (!store.isLoaded) {
    store.load()
  }
})
</script>

<template>
  <div class="p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-gray-900">{{ t('admin.ingredientsTitle') }}</h1>
      <button
        type="button"
        class="bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl min-h-[44px] hover:bg-primary-600 transition-colors"
        @click="openAdd"
      >
        {{ t('admin.ingredientAdd') }}
      </button>
    </div>

    <!-- Search + category filter -->
    <div class="flex gap-2 mb-4">
      <input
        v-model="searchQuery"
        type="search"
        :placeholder="t('admin.ingredientsSearch')"
        class="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400 bg-white"
      />
      <select
        v-model="categoryFilter"
        class="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400 bg-white"
      >
        <option value="">{{ t('admin.ingredientCategory') }}: {{ t('common.all') }}</option>
        <option v-for="cat in INGREDIENT_CATEGORIES" :key="cat" :value="cat">
          {{ t('ingredientCategories.' + cat) }}
        </option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error -->
    <p v-else-if="store.error" class="text-red-500 text-sm text-center py-8">
      {{ t('admin.loadError') }}
    </p>

    <!-- Empty -->
    <p v-else-if="filteredItems.length === 0" class="text-gray-500 text-sm text-center py-8">
      {{ t('admin.noUsers') }}
    </p>

    <!-- Table (desktop) / Cards (mobile) -->
    <div v-else class="bg-white rounded-2xl shadow-sm overflow-hidden">
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
              v-for="item in filteredItems"
              :key="item.id"
              class="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
            >
              <!-- Image -->
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
              <!-- Name EN -->
              <td class="px-4 py-3 font-medium text-gray-900">{{ item.name }}</td>
              <!-- Name UK -->
              <td class="px-4 py-3 text-gray-600">{{ item.nameUk ?? '—' }}</td>
              <!-- Category -->
              <td class="px-4 py-3">
                <span class="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {{ t(`ingredientCategories.${item.category}`) }}
                </span>
              </td>
              <!-- Source -->
              <td class="px-4 py-3">
                <span
                  :class="item.source === 'system'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-orange-50 text-orange-600'"
                  class="text-xs font-medium px-2 py-0.5 rounded-full"
                >
                  {{ item.source === 'system' ? t('admin.ingredientSourceSystem') : t('admin.ingredientSourceUser') }}
                </span>
              </td>
              <!-- Calories -->
              <td class="px-4 py-3 text-gray-600">
                {{ item.caloriesPer100g != null ? item.caloriesPer100g : '—' }}
              </td>
              <!-- Actions -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 min-h-[32px] transition-colors"
                    @click="openEdit(item)"
                  >
                    {{ t('common.edit') }}
                  </button>
                  <button
                    type="button"
                    class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 min-h-[32px] transition-colors"
                    @click="confirmDelete(item.id)"
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
          v-for="item in filteredItems"
          :key="item.id"
          class="flex items-center gap-3 px-4 py-3"
        >
          <!-- Image -->
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

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 text-sm truncate">{{ item.name }}</p>
            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span class="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {{ t(`ingredientCategories.${item.category}`) }}
              </span>
              <span
                :class="item.source === 'system'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-orange-50 text-orange-600'"
                class="text-xs px-1.5 py-0.5 rounded-full"
              >
                {{ item.source === 'system' ? t('admin.ingredientSourceSystem') : t('admin.ingredientSourceUser') }}
              </span>
              <span v-if="item.caloriesPer100g != null" class="text-xs text-gray-400">
                {{ item.caloriesPer100g }} kcal
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-1 shrink-0">
            <button
              type="button"
              class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 min-h-[36px] transition-colors"
              @click="openEdit(item)"
            >
              Edit
            </button>
            <button
              type="button"
              class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 min-h-[36px] transition-colors"
              @click="confirmDelete(item.id)"
            >
              {{ t('recipeDetail.delete') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add / Edit Modal -->
  <Teleport to="body">
    <div
      v-if="modalMode !== null"
      class="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="text-base font-bold text-gray-900">
            {{ modalMode === 'add' ? t('admin.ingredientAdd') : t('admin.ingredientEdit') }}
          </h2>
          <button
            type="button"
            class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            @click="closeModal"
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
              @click="closeModal"
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

  <!-- Delete confirm -->
  <ConfirmModal
    v-if="deleteTargetId !== null"
    :title="t('recipeDetail.delete')"
    :message="t('admin.ingredientDeleteConfirm')"
    :confirm-label="t('recipeDetail.delete')"
    :cancel-label="t('common.cancel')"
    variant="danger"
    @confirm="handleDelete"
    @cancel="deleteTargetId = null"
  />
</template>
