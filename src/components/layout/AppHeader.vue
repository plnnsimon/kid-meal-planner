<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { currentLocale, setLocale, supportedLocales } = useLocale()

const titles = computed<Record<string, string>>(() => ({
  'week-plan': t('header.weekPlan'),
  'recipe-library': t('header.recipes'),
  'recipe-new': t('header.newRecipe'),
  'recipe-detail': t('header.recipeDetail'),
  'shopping-list': t('header.shoppingList'),
  'settings': t('header.settings'),
  'login': t('header.login'),
  'friends': t('header.friends'),
  'friend-profile': t('header.friendProfile'),
  'friend-recipe': t('header.friendRecipe'),
  'tasted-ingredients': t('header.tastedIngredients'),
  'friend-tasted': t('header.friendTasted'),
  'ai-planner': t('aiPlanner.title'),
}))

const backRoutes = new Set(['recipe-new', 'recipe-detail', 'friend-profile', 'friend-recipe', 'tasted-ingredients', 'friend-tasted', 'ai-planner'])
const showBack = () => backRoutes.has(String(route.name))
</script>

<template>
  <header class="sticky top-0 z-40 bg-white border-b border-gray-200">
    <div class="flex items-center h-14 px-4 gap-3">
      <button
        v-if="showBack()"
        type="button"
        class="text-gray-500 mr-1 -ml-1 p-1"
        @click="router.back()"
      >
        <FontAwesomeIcon icon="chevron-left" class="w-5 h-5" />
      </button>
      <span v-else class="text-2xl">🥗</span>
      <h1 class="text-lg font-bold text-gray-900 flex-1">
        {{ titles[String(route.name)] ?? t('header.appName') }}
      </h1>
      <select
        :value="currentLocale"
        class="text-xs font-semibold px-2 py-1 rounded-full border border-gray-200 text-gray-500 bg-white appearance-none cursor-pointer outline-none focus:border-primary-400 transition-colors shrink-0"
        @change="setLocale(($event.target as HTMLSelectElement).value as 'en' | 'uk')"
      >
        <option
          v-for="loc in supportedLocales"
          :key="loc.code"
          :value="loc.code"
        >{{ loc.label }}</option>
      </select>
    </div>
  </header>
</template>
