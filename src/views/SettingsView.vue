<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useChildStore } from '@/stores/child.store'
import { useProfileStore } from '@/stores/profile.store'
import AllergyChip from '@/components/common/AllergyChip.vue'
import ImageUpload from '@/components/common/ImageUpload.vue'
import AppButton from '@/components/common/AppButton.vue'
import { COMMON_ALLERGENS, DIETARY_RESTRICTION_PRESETS } from '@/types'

const child = useChildStore()
const profile = useProfileStore()

// ── Local form state ──────────────────────────────────────────────────────────

// Account (user profile)
const displayName = ref('')
const profileAvatarUrl = ref<string | null>(null)
const pendingProfileAvatarFile = ref<File | null>(null)

// Child profile
const name = ref('')
const birthDate = ref('')
const avatarUrl = ref<string | null>(null)
const pendingAvatarFile = ref<File | null>(null)
const allergies = ref<string[]>([])
const dietaryRestrictions = ref<string[]>([])
const customAllergyInput = ref('')
const customDietInput = ref('')
const savedBanner = ref(false)

// ── Sync store → form when profile loads ─────────────────────────────────────

function syncProfileFromStore() {
  const p = profile.profile
  if (!p) return
  displayName.value = p.displayName
  profileAvatarUrl.value = p.avatarUrl
}

function syncFromStore() {
  const p = child.profile
  if (!p) return
  name.value = p.name
  birthDate.value = p.birthDate ?? ''
  avatarUrl.value = p.avatarUrl
  allergies.value = [...p.allergies]
  dietaryRestrictions.value = [...p.dietaryRestrictions]
}

watch(() => profile.profile, syncProfileFromStore)
watch(() => child.profile, syncFromStore)

onMounted(async () => {
  await child.load()
  await profile.loadOwn()
  syncFromStore()
  syncProfileFromStore()
})

// ── Allergen helpers ──────────────────────────────────────────────────────────

function toggleAllergen(name: string) {
  const idx = allergies.value.indexOf(name)
  if (idx === -1) allergies.value.push(name)
  else allergies.value.splice(idx, 1)
}

function addCustomAllergen() {
  const val = customAllergyInput.value.trim().toLowerCase()
  if (val && !allergies.value.includes(val)) {
    allergies.value.push(val)
  }
  customAllergyInput.value = ''
}

function removeAllergen(val: string) {
  allergies.value = allergies.value.filter(a => a !== val)
}

// Custom allergens are ones not in the preset list
const customAllergens = () =>
  allergies.value.filter(a => !(COMMON_ALLERGENS as readonly string[]).includes(a))

// ── Dietary restriction helpers ───────────────────────────────────────────────

function toggleDiet(val: string) {
  const idx = dietaryRestrictions.value.indexOf(val)
  if (idx === -1) dietaryRestrictions.value.push(val)
  else dietaryRestrictions.value.splice(idx, 1)
}

function addCustomDiet() {
  const val = customDietInput.value.trim()
  if (val && !dietaryRestrictions.value.includes(val)) {
    dietaryRestrictions.value.push(val)
  }
  customDietInput.value = ''
}

function removeDiet(val: string) {
  dietaryRestrictions.value = dietaryRestrictions.value.filter(d => d !== val)
}

const customDiets = () =>
  dietaryRestrictions.value.filter(
    d => !(DIETARY_RESTRICTION_PRESETS as readonly string[]).includes(d),
  )

// ── Avatar (profile) ──────────────────────────────────────────────────────────

function onProfileAvatarChange(file: File) {
  pendingProfileAvatarFile.value = file
}

// ── Avatar (child) ────────────────────────────────────────────────────────────

function onAvatarChange(file: File) {
  pendingAvatarFile.value = file
}

// ── Save ──────────────────────────────────────────────────────────────────────

async function save() {
  // Save user profile first
  let finalProfileAvatarUrl = profileAvatarUrl.value

  if (pendingProfileAvatarFile.value) {
    try {
      finalProfileAvatarUrl = await profile.uploadAvatar(pendingProfileAvatarFile.value)
      pendingProfileAvatarFile.value = null
    } catch {
      // Avatar upload failed — save rest of profile without avatar change
    }
  }

  await profile.update({
    displayName: displayName.value,
    avatarUrl: finalProfileAvatarUrl,
  })

  // Save child profile
  let finalAvatarUrl = avatarUrl.value

  if (pendingAvatarFile.value) {
    try {
      finalAvatarUrl = await child.uploadAvatar(pendingAvatarFile.value)
      pendingAvatarFile.value = null
    } catch {
      // Avatar upload failed — save rest of profile without avatar change
    }
  }

  await child.save({
    name: name.value || 'My Child',
    birthDate: birthDate.value || null,
    avatarUrl: finalAvatarUrl,
    allergies: allergies.value,
    dietaryRestrictions: dietaryRestrictions.value,
  })

  savedBanner.value = true
  setTimeout(() => (savedBanner.value = false), 2500)
}
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-6 space-y-6">

    <!-- Loading skeleton -->
    <template v-if="child.loading">
      <div class="animate-pulse space-y-4">
        <div class="h-24 w-24 rounded-full bg-gray-200 mx-auto" />
        <div class="h-10 bg-gray-200 rounded-xl" />
        <div class="h-10 bg-gray-200 rounded-xl" />
      </div>
    </template>

    <template v-else>

      <!-- ── Account ──────────────────────────────────────────────────────────── -->
      <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 class="text-sm font-semibold text-gray-700">Account</h2>
        <div class="flex flex-col items-center gap-2">
          <ImageUpload
            :current-url="profileAvatarUrl"
            shape="circle"
            placeholder="Photo"
            @change="onProfileAvatarChange"
          />
          <p class="text-xs text-gray-400">Tap to change avatar</p>
        </div>
        <div class="flex items-center gap-3 px-0 py-1 border-b border-gray-100">
          <label class="text-sm font-medium text-gray-500 w-24 shrink-0">Display name</label>
          <input
            v-model="displayName"
            type="text"
            placeholder="Your name"
            class="flex-1 text-sm text-gray-900 bg-transparent outline-none placeholder-gray-300"
          />
        </div>
      </section>

      <!-- ── Child avatar ──────────────────────────────────────────────────────── -->
      <section class="flex flex-col items-center gap-2">
        <ImageUpload
          :current-url="avatarUrl"
          shape="circle"
          placeholder="Photo"
          @change="onAvatarChange"
        />
        <p class="text-xs text-gray-400">Tap to change child's photo</p>
      </section>

      <!-- ── Basic info ─────────────────────────────────────────────────────── -->
      <section class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
        <div class="flex items-center gap-3 px-4 py-3">
          <label class="text-sm font-medium text-gray-500 w-24 shrink-0">Name</label>
          <input
            v-model="name"
            type="text"
            placeholder="Child's name"
            class="flex-1 text-sm text-gray-900 bg-transparent outline-none placeholder-gray-300"
          />
        </div>
        <div class="flex items-center gap-3 px-4 py-3">
          <label class="text-sm font-medium text-gray-500 w-24 shrink-0">Birthday</label>
          <input
            v-model="birthDate"
            type="date"
            class="flex-1 text-sm text-gray-900 bg-transparent outline-none"
          />
        </div>
      </section>

      <!-- ── Allergies ──────────────────────────────────────────────────────── -->
      <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 class="text-sm font-semibold text-gray-700">Allergies</h2>

        <!-- Common allergens -->
        <div class="flex flex-wrap gap-2">
          <AllergyChip
            v-for="allergen in COMMON_ALLERGENS"
            :key="allergen"
            :label="allergen"
            :active="allergies.includes(allergen)"
            @toggle="toggleAllergen(allergen)"
          />
        </div>

        <!-- Custom allergens (added by user) -->
        <div v-if="customAllergens().length" class="flex flex-wrap gap-2">
          <AllergyChip
            v-for="ca in customAllergens()"
            :key="ca"
            :label="ca"
            :active="true"
            :removable="true"
            @toggle="removeAllergen(ca)"
            @remove="removeAllergen(ca)"
          />
        </div>

        <!-- Add custom allergen -->
        <div class="flex gap-2 mt-1">
          <input
            v-model="customAllergyInput"
            type="text"
            placeholder="Add other allergy…"
            class="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary-400"
            @keydown.enter.prevent="addCustomAllergen"
          />
          <button
            type="button"
            class="px-3 py-2 rounded-xl bg-primary-50 text-primary-600 text-sm font-medium"
            @click="addCustomAllergen"
          >
            Add
          </button>
        </div>
      </section>

      <!-- ── Dietary restrictions ───────────────────────────────────────────── -->
      <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 class="text-sm font-semibold text-gray-700">Dietary Restrictions</h2>

        <!-- Preset restrictions -->
        <div class="flex flex-wrap gap-2">
          <AllergyChip
            v-for="preset in DIETARY_RESTRICTION_PRESETS"
            :key="preset"
            :label="preset"
            :active="dietaryRestrictions.includes(preset)"
            @toggle="toggleDiet(preset)"
          />
        </div>

        <!-- Custom restrictions -->
        <div v-if="customDiets().length" class="flex flex-wrap gap-2">
          <AllergyChip
            v-for="cd in customDiets()"
            :key="cd"
            :label="cd"
            :active="true"
            :removable="true"
            @toggle="removeDiet(cd)"
            @remove="removeDiet(cd)"
          />
        </div>

        <!-- Add custom restriction -->
        <div class="flex gap-2">
          <input
            v-model="customDietInput"
            type="text"
            placeholder="Add other restriction…"
            class="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary-400"
            @keydown.enter.prevent="addCustomDiet"
          />
          <button
            type="button"
            class="px-3 py-2 rounded-xl bg-primary-50 text-primary-600 text-sm font-medium"
            @click="addCustomDiet"
          >
            Add
          </button>
        </div>
      </section>

      <!-- ── Error ──────────────────────────────────────────────────────────── -->
      <div v-if="child.error" class="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
        {{ child.error }}
      </div>

      <!-- ── Saved banner ────────────────────────────────────────────────────── -->
      <Transition name="fade">
        <div
          v-if="savedBanner"
          class="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3 text-center font-medium"
        >
          Saved!
        </div>
      </Transition>

      <!-- ── Save button ─────────────────────────────────────────────────────── -->
      <AppButton type="button" :loading="child.saving" @click="save">
        Save Profile
      </AppButton>

    </template>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
