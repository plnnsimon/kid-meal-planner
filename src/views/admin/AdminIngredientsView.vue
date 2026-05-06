<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIngredientsStore } from '@/stores/ingredients.store'
import { INGREDIENT_CATEGORIES } from '@/types'
import type { FoodItem, IngredientCategory } from '@/types'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import IngredientFormModal from '@/components/admin/IngredientFormModal.vue'
import IngredientList from '@/components/admin/IngredientList.vue'

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

function openAdd() {
  editingItem.value = null
  modalMode.value = 'add'
}

function openEdit(item: FoodItem) {
  editingItem.value = item
  modalMode.value = 'edit'
}

function closeModal() {
  modalMode.value = null
  editingItem.value = null
}

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteTargetId = ref<string | null>(null)

async function handleDelete() {
  if (!deleteTargetId.value) return
  await store.adminDelete(deleteTargetId.value)
  deleteTargetId.value = null
}

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(() => {
  store.loadItems()
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

    <!-- List -->
    <IngredientList
      v-else
      :items="filteredItems"
      @edit="openEdit"
      @delete="deleteTargetId = $event"
    />
  </div>

  <!-- Add / Edit Modal -->
  <IngredientFormModal
    v-if="modalMode !== null"
    :mode="modalMode"
    :item="editingItem"
    @saved="closeModal"
    @cancel="closeModal"
  />

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
