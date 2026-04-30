<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useRecipeStore, emptyPayload, type RecipePayload } from '@/stores/recipe.store'
import { useRatingsStore } from '@/stores/ratings.store'
import RecipeForm from '@/components/recipe/RecipeForm.vue'
import StarRating from '@/components/recipe/StarRating.vue'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const recipeStore = useRecipeStore()

const isNew = computed(() => route.name === 'recipe-new')
const recipeId = computed(() => route.params.id as string | undefined)

const ratings = useRatingsStore()
const recipe = computed(() => recipeId.value ? recipeStore.getById(recipeId.value) : null)

const form = ref<RecipePayload>(emptyPayload())
const pendingImage = ref<File | null>(null)
const deleteConfirm = ref(false)

onMounted(async () => {
  if (!isNew.value && recipeId.value) {
    // Ensure recipes are loaded
    if (!recipeStore.recipes.length) await recipeStore.load()
    ratings.load()
    const r = recipeStore.getById(recipeId.value)
    if (r) {
      form.value = {
        name: r.name,
        description: r.description,
        imageUrl: r.imageUrl,
        mealTypes: [...r.mealTypes],
        prepTime: r.prepTime,
        cookTime: r.cookTime,
        servings: r.servings,
        nutrition: { ...r.nutrition },
        ingredients: r.ingredients.map(i => ({ ...i })),
        instructions: [...r.instructions],
        allergens: [...r.allergens],
        tags: [...r.tags],
        isFavorite: r.isFavorite,
      }
    }
  }
})

async function handleSubmit() {
  let finalImageUrl = form.value.imageUrl

  if (pendingImage.value) {
    try {
      // Upload image: use existing id for update, temp uuid for create
      const tempId = recipeId.value ?? crypto.randomUUID()
      finalImageUrl = await recipeStore.uploadImage(pendingImage.value, tempId)
    } catch {
      // Image upload failed — proceed without image
    }
  }

  const payload: RecipePayload = { ...form.value, imageUrl: finalImageUrl }

  if (isNew.value) {
    await recipeStore.create(payload)
  } else if (recipeId.value) {
    await recipeStore.update(recipeId.value, payload)
  }

  router.push({ name: 'recipe-library' })
}

async function handleRate(score: number) {
  if (!recipeId.value) return
  if (score === 0) {
    await ratings.remove(recipeId.value)
  } else {
    await ratings.upsert(recipeId.value, score)
  }
}

async function handleDelete() {
  if (!deleteConfirm.value) {
    deleteConfirm.value = true
    setTimeout(() => (deleteConfirm.value = false), 3000)
    return
  }
  if (recipeId.value) {
    await recipeStore.remove(recipeId.value)
    router.push({ name: 'recipe-library' })
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-4 space-y-4">

    <!-- Back + Delete row -->
    <div class="flex items-center justify-between">
      <button
        type="button"
        class="flex items-center gap-1 text-sm text-gray-500"
        @click="router.back()"
      >
        ← Back
      </button>
      <button
        v-if="!isNew"
        type="button"
        class="text-sm font-medium transition-colors"
        :class="deleteConfirm ? 'text-red-600' : 'text-gray-400'"
        @click="handleDelete"
      >
        {{ deleteConfirm ? t('recipeDetail.deleteConfirm') : t('recipeDetail.delete') }}
      </button>
    </div>

    <!-- Rating section — only when viewing existing recipe -->
    <div v-if="!isNew" class="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between">
      <span class="text-sm text-gray-600">{{ t('rating.myRating') }}</span>
      <div class="flex items-center gap-2">
        <StarRating
          :model-value="ratings.getMyRating(recipeId ?? '')"
          size="md"
          @update:model-value="handleRate"
        />
        <span v-if="recipe?.ratingsCount" class="text-xs text-gray-400">
          {{ t('rating.count', { count: recipe.ratingsCount }) }}
        </span>
      </div>
    </div>

    <RecipeForm
      v-model="form"
      :saving="recipeStore.saving"
      @image-change="pendingImage = $event"
      @submit="handleSubmit"
    />

    <div v-if="recipeStore.error" class="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
      {{ recipeStore.error }}
    </div>

  </div>
</template>
