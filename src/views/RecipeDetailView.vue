<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRecipeStore, emptyPayload, type RecipePayload } from '@/stores/recipe.store'
import RecipeForm from '@/components/recipe/RecipeForm.vue'

const route = useRoute()
const router = useRouter()
const recipeStore = useRecipeStore()

const isNew = computed(() => route.name === 'recipe-new')
const recipeId = computed(() => route.params.id as string | undefined)

const form = ref<RecipePayload>(emptyPayload())
const pendingImage = ref<File | null>(null)
const deleteConfirm = ref(false)

onMounted(async () => {
  if (!isNew.value && recipeId.value) {
    // Ensure recipes are loaded
    if (!recipeStore.recipes.length) await recipeStore.load()
    const recipe = recipeStore.getById(recipeId.value)
    if (recipe) {
      form.value = {
        name: recipe.name,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        mealTypes: [...recipe.mealTypes],
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        nutrition: { ...recipe.nutrition },
        ingredients: recipe.ingredients.map(i => ({ ...i })),
        instructions: [...recipe.instructions],
        allergens: [...recipe.allergens],
        tags: [...recipe.tags],
        isFavorite: recipe.isFavorite,
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
        {{ deleteConfirm ? 'Tap again to delete' : 'Delete' }}
      </button>
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
