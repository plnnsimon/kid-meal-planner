<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useFriendsStore } from '@/stores/friends.store'
import { useRecipeStore } from '@/stores/recipe.store'
import RecipeCard from '@/components/recipe/RecipeCard.vue'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '@/types'
import type { UserProfile, ChildProfile, WeekPlan, Recipe } from '@/types'

const route = useRoute()
const router = useRouter()
const friendId = route.params.id as string
const friends = useFriendsStore()
const recipeStore = useRecipeStore()
const { t } = useI18n()

const profile = ref<UserProfile | null>(null)
const childProfile = ref<ChildProfile | null>(null)
const weekPlan = ref<WeekPlan | null>(null)
const friendRecipes = ref<Recipe[]>([])
const loading = ref(true)

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

onMounted(async () => {
  let friendship = friends.friends.find(f =>
    f.requesterId === friendId || f.addresseeId === friendId,
  )
  profile.value = friendship?.profile ?? null

  if (!profile.value) {
    await friends.loadFriends()
    friendship = friends.friends.find(f =>
      f.requesterId === friendId || f.addresseeId === friendId,
    )
    profile.value = friendship?.profile ?? null
  }

  await Promise.all([
    friends.loadFriendChildProfile(friendId).then(p => { childProfile.value = p }),
    friends.loadFriendWeekPlan(friendId).then(p => { weekPlan.value = p }),
    recipeStore.loadByUser(friendId).then(r => { friendRecipes.value = r }),
    recipeStore.loadFavoriteIds(),
  ])
  loading.value = false
})

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function toggleSave(recipeId: string) {
  if (recipeStore.isSaved(recipeId)) {
    recipeStore.unsaveFavorite(recipeId)
  } else {
    recipeStore.saveFavorite(recipeId)
  }
}

function slotRecipeName(dayIndex: number, mealType: string): string {
  if (!weekPlan.value) return '–'
  const slot = weekPlan.value.slots.find(
    s => s.dayOfWeek === dayIndex && s.mealType === mealType,
  )
  if (!slot?.recipe) return '–'
  const name = slot.recipe.name
  return name.length > 8 ? name.slice(0, 7) + '…' : name
}

const hasPlanSlots = () =>
  !!weekPlan.value && weekPlan.value.slots.some(s => s.recipe)
</script>

<template>
  <div class="px-4 py-6 space-y-4 max-w-lg mx-auto">

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else>

      <!-- Profile header -->
      <div class="bg-white rounded-2xl shadow-sm flex items-center gap-4 px-4 py-5">
        <div class="shrink-0 w-16 h-16 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center">
          <img
            v-if="profile?.avatarUrl"
            :src="profile.avatarUrl"
            :alt="profile.displayName"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-primary-500 font-bold text-xl">
            {{ initials(profile?.displayName ?? '') }}
          </span>
        </div>
        <div>
          <h2 class="text-lg font-bold text-gray-900 leading-tight">
            {{ profile?.displayName ?? 'Unknown' }}
          </h2>
          <p class="text-sm text-gray-400">{{ t('friends.friendsStatus') }}</p>
        </div>
      </div>

      <!-- Child profile card -->
      <div v-if="childProfile" class="bg-white rounded-2xl shadow-sm px-4 py-4 space-y-2">
        <h3 class="text-sm font-semibold text-gray-700">{{ t('friendProfile.childProfileTitle') }}</h3>
        <div class="flex items-center gap-3">
          <div class="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center">
            <img
              v-if="childProfile.avatarUrl"
              :src="childProfile.avatarUrl"
              :alt="childProfile.name"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-amber-500 font-semibold text-sm">
              {{ initials(childProfile.name) }}
            </span>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-800">{{ childProfile.name }}</p>
            <p v-if="childProfile.birthDate" class="text-xs text-gray-400">
              {{ t('friendProfile.birthdayLabel') }}: {{ childProfile.birthDate }}
            </p>
          </div>
        </div>
        <div v-if="childProfile.allergies.length" class="space-y-1">
          <p class="text-xs text-gray-500 font-medium">{{ t('friendProfile.allergiesLabel') }}</p>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="a in childProfile.allergies"
              :key="a"
              class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
            >
              ⚠️ {{ a }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="bg-white rounded-2xl shadow-sm px-4 py-4">
        <p class="text-sm text-gray-400">{{ t('friendProfile.noChild') }}</p>
      </div>

      <!-- Week plan mini-grid -->
      <div class="bg-white rounded-2xl shadow-sm px-4 py-4 space-y-2">
        <h3 class="text-sm font-semibold text-gray-700">{{ t('friendProfile.weekPlanTitle') }}</h3>
        <div v-if="hasPlanSlots()" class="overflow-x-auto">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th class="text-left pr-2 py-1 text-gray-400 font-medium w-16 shrink-0"></th>
                <th
                  v-for="(day, i) in DAY_ABBR"
                  :key="i"
                  class="text-center px-1 py-1 text-gray-500 font-medium"
                >
                  {{ day }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mt in MEAL_TYPES" :key="mt" class="border-t border-gray-100">
                <td class="pr-2 py-1.5 text-gray-400 font-medium whitespace-nowrap">
                  {{ MEAL_TYPE_LABELS[mt] }}
                </td>
                <td
                  v-for="(_, dayIndex) in DAY_ABBR"
                  :key="dayIndex"
                  class="text-center px-1 py-1.5"
                  :class="slotRecipeName(dayIndex, mt) !== '–' ? 'text-gray-800' : 'text-gray-300'"
                >
                  {{ slotRecipeName(dayIndex, mt) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-sm text-gray-400">{{ t('friendProfile.noWeekPlan') }}</p>
      </div>

      <!-- Recipes -->
      <div class="space-y-3">
        <h3 class="text-sm font-semibold text-gray-700 px-1">{{ t('friendProfile.recipesTitle') }}</h3>
        <div v-if="friendRecipes.length" class="grid grid-cols-2 gap-3">
          <RecipeCard
            v-for="recipe in friendRecipes"
            :key="recipe.id"
            :recipe="recipe"
            :view-only="true"
            :saved="recipeStore.isSaved(recipe.id)"
            @click="router.push({ name: 'friend-recipe', params: { friendId, recipeId: recipe.id } })"
            @save="toggleSave(recipe.id)"
          />
        </div>
        <div v-else class="bg-white rounded-2xl shadow-sm px-4 py-8 text-center text-gray-400 text-sm">
          {{ t('friendProfile.noRecipes') }}
        </div>
      </div>

    </template>
  </div>
</template>
