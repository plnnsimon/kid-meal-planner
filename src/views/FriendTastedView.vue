<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useFriendsStore } from '@/stores/friends.store'
import { useIngredientsStore } from '@/stores/ingredients.store'
import { useChildStore } from '@/stores/child.store'
import { useAuthStore } from '@/stores/auth.store'
import { useLocale } from '@/composables/useLocale'
import { INGREDIENT_CATEGORIES } from '@/types'
import type { FoodItem, ChildProfile } from '@/types'

const route = useRoute()
const friendId = route.params.friendId as string
const friends = useFriendsStore()
const ingredients = useIngredientsStore()
const child = useChildStore()
const auth = useAuthStore()
const { t } = useI18n()
const { currentLocale } = useLocale()

const friendChildProfile = ref<ChildProfile | null>(null)
const friendTasted = ref<FoodItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    if (!child.profile) await child.load()
    await ingredients.loadItems()

    friendChildProfile.value = await friends.loadFriendChildProfile(friendId)

    if (friendChildProfile.value?.id) {
      friendTasted.value = await ingredients.loadFriendTasted(friendChildProfile.value.id)
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
})

function displayName(item: FoodItem): string {
  return currentLocale.value === 'uk' ? (item.nameUk ?? item.name) : item.name
}

function isInMyList(item: FoodItem): boolean {
  if (item.source === 'system') return ingredients.tastedIds.has(item.id)
  const own = ingredients.items.find(
    i => i.source === 'user' && i.userId === auth.userId && i.name === item.name && i.category === item.category
  )
  return !!own && ingredients.tastedIds.has(own.id)
}

const grouped = computed(() =>
  INGREDIENT_CATEGORIES
    .map(cat => ({ cat, items: friendTasted.value.filter(i => i.category === cat) }))
    .filter(g => g.items.length > 0)
)
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-6 space-y-4">

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else>
      <!-- Error -->
      <div v-if="error" class="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{{ error }}</div>

      <!-- Empty state -->
      <div
        v-if="!error && friendTasted.length === 0"
        class="bg-white rounded-2xl shadow-sm px-4 py-8 text-center text-gray-400 text-sm"
      >
        {{ t('friendTasted.empty') }}
      </div>

      <!-- Grouped list -->
      <template v-for="group in grouped" :key="group.cat">
        <div>
          <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 pb-1">
            {{ t('ingredientCategories.' + group.cat) }}
          </div>
          <div class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            <div
              v-for="item in group.items"
              :key="item.id"
              class="flex items-center gap-3 px-4 py-3"
            >
              <span class="flex-1 text-sm text-gray-800">{{ displayName(item) }}</span>
              <span
                v-if="item.source === 'user'"
                class="text-xs text-primary-500 font-medium shrink-0"
              >
                {{ t('tastedIngredients.customBadge') }}
              </span>
              <!-- Already in own list -->
              <span
                v-if="isInMyList(item)"
                class="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0"
              >
                <FontAwesomeIcon icon="check" class="w-3 h-3" />
                {{ t('friendTasted.inMyList') }}
              </span>
              <!-- Add button -->
              <button
                v-else
                type="button"
                class="shrink-0 px-3 py-1.5 rounded-xl bg-primary-50 text-primary-600 text-xs font-medium active:bg-primary-100"
                :disabled="ingredients.saving"
                @click="ingredients.adoptIngredient(item)"
              >
                {{ t('friendTasted.addToMyList') }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
