<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChildStore } from '@/stores/child.store'
import { useProfileStore } from '@/stores/profile.store'
import { useAuthStore } from '@/stores/auth.store'
import { useSubscriptionStore } from '@/stores/subscription.store'
import { useIngredientsStore } from '@/stores/ingredients.store'
import { useRouter } from 'vue-router'

const { t } = useI18n()

function tAllergen(a: string): string {
  return t('allergens.' + a, a)
}

function tDiet(preset: string): string {
  const key = preset.replace(/\s+(\w)/g, (_, c: string) => c.toUpperCase())
  return t('dietaryRestrictions.' + key, preset)
}
import AllergyChip from '@/components/common/AllergyChip.vue'
import ImageUpload from '@/components/common/ImageUpload.vue'
import AppButton from '@/components/common/AppButton.vue'
import ChildCard from '@/components/common/ChildCard.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { COMMON_ALLERGENS, DIETARY_RESTRICTION_PRESETS } from '@/types'

const child = useChildStore()
const profile = useProfileStore()
const auth = useAuthStore()
const subscription = useSubscriptionStore()
const ingredientsStore = useIngredientsStore()
const router = useRouter()

const showUpgradeInfo = ref(false)
const isAddingNew = ref(false)
const deleteConfirmVisible = ref(false)

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

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
  const p = child.selectedChild
  if (!p) return
  name.value = p.name
  birthDate.value = p.birthDate ?? ''
  avatarUrl.value = p.avatarUrl
  allergies.value = [...p.allergies]
  dietaryRestrictions.value = [...p.dietaryRestrictions]
}

watch(() => profile.profile, syncProfileFromStore)
watch(() => child.selectedChild, syncFromStore)

onMounted(async () => {
  await child.load()
  await profile.loadOwn()
  await subscription.load()
  ingredientsStore.loadItems()
  ingredientsStore.loadTasted()
  syncFromStore()
  syncProfileFromStore()
})

// ── Child selection ───────────────────────────────────────────────────────────

function selectChild(id: string) {
  isAddingNew.value = false
  child.select(id)
  syncFromStore()
}

function startAddChild() {
  isAddingNew.value = true
  name.value = ''
  birthDate.value = ''
  avatarUrl.value = null
  pendingAvatarFile.value = null
  allergies.value = []
  dietaryRestrictions.value = []
}

// ── Allergen helpers ──────────────────────────────────────────────────────────

function toggleAllergen(allergenName: string) {
  const idx = allergies.value.indexOf(allergenName)
  if (idx === -1) allergies.value.push(allergenName)
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

// ── Logout ────────────────────────────────────────────────────────────────────

async function logout() {
  await auth.logout()
  router.push('/login')
}

// ── Age calculation ───────────────────────────────────────────────────────────

const childAge = computed(() => {
  if (!birthDate.value) return null
  const birth = new Date(birthDate.value)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (now.getDate() < birth.getDate()) months--
  if (months < 0) { years--; months += 12 }
  const refDate = new Date(birth)
  refDate.setFullYear(refDate.getFullYear() + years)
  refDate.setMonth(refDate.getMonth() + months)
  const days = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24))
  return { years, months, days }
})

const childAgeText = computed(() => {
  if (!childAge.value) return null
  const { years, months, days } = childAge.value
  if (years > 0 && months > 0 && days > 0) return t('settings.ageYearsMonthsDays', { years, months, days })
  if (years > 0 && months > 0) return t('settings.ageYearsMonths', { years, months })
  if (years > 0 && days > 0) return t('settings.ageYearsDays', { years, days })
  if (years > 0) return t('settings.ageYearsOnly', { years })
  if (months > 0 && days > 0) return t('settings.ageMonthsDays', { months, days })
  if (months > 0) return t('settings.ageMonthsOnly', { months })
  return t('settings.ageDaysOnly', { days })
})

const milestoneLabel = computed(() => {
  const key = ingredientsStore.currentMilestone
  if (!key) return null
  return t(`explorer.milestones.${key}`)
})

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
  if (isAddingNew.value) {
    const newChild = await child.add({
      name: name.value || 'My Child',
      birthDate: birthDate.value || null,
      avatarUrl: null,
      allergies: allergies.value,
      dietaryRestrictions: dietaryRestrictions.value,
    })
    if (newChild && pendingAvatarFile.value) {
      try {
        const url = await child.uploadAvatar(newChild.id, pendingAvatarFile.value)
        await child.update(newChild.id, { ...newChild, avatarUrl: url })
        pendingAvatarFile.value = null
      } catch { /* ignore avatar failure */ }
    }
    isAddingNew.value = false
  } else if (child.selectedChildId) {
    let finalAvatarUrl = avatarUrl.value
    if (pendingAvatarFile.value) {
      try {
        finalAvatarUrl = await child.uploadAvatar(child.selectedChildId, pendingAvatarFile.value)
        pendingAvatarFile.value = null
      } catch {
        // Avatar upload failed — save rest of profile without avatar change
      }
    }

    await child.update(child.selectedChildId, {
      name: name.value || 'My Child',
      birthDate: birthDate.value || null,
      avatarUrl: finalAvatarUrl,
      allergies: allergies.value,
      dietaryRestrictions: dietaryRestrictions.value,
    })
  }

  savedBanner.value = true
  setTimeout(() => (savedBanner.value = false), 2500)
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteChild() {
  if (!child.selectedChildId) return
  await child.remove(child.selectedChildId)
  deleteConfirmVisible.value = false
  syncFromStore()
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
        <h2 class="text-sm font-semibold text-gray-700">{{ t('settings.accountSection') }}</h2>
        <div class="flex flex-col items-center gap-2">
          <ImageUpload
            :current-url="profileAvatarUrl"
            shape="circle"
            placeholder="Photo"
            @change="onProfileAvatarChange"
          />
          <p class="text-xs text-gray-400">{{ t('settings.tapToChangeAvatar') }}</p>
        </div>
        <div class="flex items-center gap-3 px-0 py-1 border-b border-gray-100">
          <label class="text-sm font-medium text-gray-500 w-24 shrink-0">{{ t('settings.displayNameLabel') }}</label>
          <input
            v-model="displayName"
            type="text"
            :placeholder="t('settings.displayNamePlaceholder')"
            class="flex-1 text-sm text-gray-900 bg-transparent outline-none placeholder-gray-300"
          />
        </div>
      </section>

      <!-- ── Children ───────────────────────────────────────────────────────────── -->
      <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-700">{{ t('child.sectionTitle') }}</h2>
        </div>

        <!-- Child list + Add button -->
        <div class="flex gap-2 overflow-x-auto pb-1">
          <ChildCard
            v-for="c in child.children"
            :key="c.id"
            :child="c"
            :active="!isAddingNew && c.id === child.selectedChildId"
            @select="selectChild(c.id)"
          />
          <!-- Add new child button -->
          <button
            type="button"
            class="flex flex-col items-center px-2 py-2 rounded-xl min-h-[44px] shrink-0"
            :class="isAddingNew ? 'bg-primary-50' : ''"
            @click="startAddChild"
          >
            <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <FontAwesomeIcon icon="plus" class="w-5 h-5" />
            </div>
            <span class="text-xs font-medium text-gray-500 mt-1">{{ t('child.addChild') }}</span>
          </button>
        </div>

        <!-- No children message -->
        <p v-if="child.children.length === 0 && !isAddingNew" class="text-sm text-gray-400">
          {{ t('child.noChildren') }}
        </p>
      </section>

      <!-- ── Child-specific sections ───────────────────────────────────────────── -->
      <template v-if="child.selectedChild || isAddingNew">

        <!-- ── Child avatar ──────────────────────────────────────────────────────── -->
        <section class="flex flex-col items-center gap-2">
          <ImageUpload
            :current-url="avatarUrl"
            shape="circle"
            placeholder="Photo"
            @change="onAvatarChange"
          />
          <p class="text-xs text-gray-400">{{ t('settings.tapToChangeChildPhoto') }}</p>
        </section>

        <!-- ── Basic info ─────────────────────────────────────────────────────── -->
        <section class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          <div class="flex items-center gap-3 px-4 py-3">
            <label class="text-sm font-medium text-gray-500 w-24 shrink-0">{{ t('settings.nameLabel') }}</label>
            <input
              v-model="name"
              type="text"
              :placeholder="t('settings.namePlaceholder')"
              class="flex-1 text-sm text-gray-900 bg-transparent outline-none placeholder-gray-300"
            />
          </div>
          <div class="flex items-center gap-3 px-4 py-3">
            <label class="text-sm font-medium text-gray-500 w-24 shrink-0">{{ t('settings.birthdayLabel') }}</label>
            <input
              v-model="birthDate"
              type="date"
              class="flex-1 text-sm text-gray-900 bg-transparent outline-none"
            />
            <span
              v-if="childAgeText"
              class="shrink-0 text-xs font-medium text-primary-600 bg-primary-50 rounded-full px-2 py-0.5"
            >
              {{ childAgeText }}
            </span>
          </div>
        </section>

        <!-- ── Allergies ──────────────────────────────────────────────────────── -->
        <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 class="text-sm font-semibold text-gray-700">{{ t('settings.allergiesSection') }}</h2>

          <!-- Common allergens -->
          <div class="flex flex-wrap gap-2">
            <AllergyChip
              v-for="allergen in COMMON_ALLERGENS"
              :key="allergen"
              :label="tAllergen(allergen)"
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
              :placeholder="t('settings.addAllergyPlaceholder')"
              class="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary-400"
              @keydown.enter.prevent="addCustomAllergen"
            />
            <button
              type="button"
              class="px-3 py-2 rounded-xl bg-primary-50 text-primary-600 text-sm font-medium"
              @click="addCustomAllergen"
            >
              {{ t('settings.addAllergyButton') }}
            </button>
          </div>
        </section>

        <!-- ── Dietary restrictions ───────────────────────────────────────────── -->
        <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 class="text-sm font-semibold text-gray-700">{{ t('settings.dietarySection') }}</h2>

          <!-- Preset restrictions -->
          <div class="flex flex-wrap gap-2">
            <AllergyChip
              v-for="preset in DIETARY_RESTRICTION_PRESETS"
              :key="preset"
              :label="tDiet(preset)"
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
              :placeholder="t('settings.addRestrictionPlaceholder')"
              class="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary-400"
              @keydown.enter.prevent="addCustomDiet"
            />
            <button
              type="button"
              class="px-3 py-2 rounded-xl bg-primary-50 text-primary-600 text-sm font-medium"
              @click="addCustomDiet"
            >
              {{ t('settings.addRestrictionButton') }}
            </button>
          </div>
        </section>

        <!-- ── Tasted ingredients ────────────────────────────────────────────────── -->
        <section class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          <RouterLink to="/tasted-ingredients" class="flex items-center gap-3 px-4 py-3">
            <span class="text-sm font-medium text-gray-700 flex-1">{{ t('settings.tastedIngredientsTitle') }}</span>
            <FontAwesomeIcon icon="chevron-right" class="w-4 h-4 text-gray-400" />
          </RouterLink>
        </section>

        <!-- ── Food Explorer Progress ─────────────────────────────────────────── -->
        <section v-if="child.selectedChild" class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-700">{{ t('explorer.title') }}</h2>
            <span v-if="milestoneLabel" class="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
              {{ milestoneLabel }}
            </span>
          </div>
          <div class="flex items-center justify-between text-xs text-gray-400">
            <span>{{ t('explorer.progress', { tried: ingredientsStore.tastedIds.size, total: ingredientsStore.items.length }) }}</span>
            <span class="font-semibold text-gray-700">{{ ingredientsStore.explorationPercent }}%</span>
          </div>
          <!-- Progress bar -->
          <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-primary-500 rounded-full transition-all duration-500"
              :style="{ width: ingredientsStore.explorationPercent + '%' }"
            />
          </div>
        </section>

        <!-- ── Delete child ────────────────────────────────────────────────────── -->
        <div v-if="!isAddingNew && child.selectedChild" class="pt-2">
          <button
            type="button"
            class="w-full h-11 rounded-xl bg-red-50 text-red-500 text-sm font-semibold"
            @click="deleteConfirmVisible = true"
          >
            {{ t('child.deleteChild') }}
          </button>
        </div>

        <ConfirmModal
          v-if="deleteConfirmVisible"
          :title="t('child.deleteConfirmTitle')"
          :message="t('child.deleteConfirmMessage')"
          :confirm-label="t('child.deleteConfirmButton')"
          variant="danger"
          @confirm="deleteChild"
          @cancel="deleteConfirmVisible = false"
        />

      </template>

      <!-- ── Subscription ─────────────────────────────────────────────────────────────── -->
      <section class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 class="text-sm font-semibold text-gray-700">{{ t('subscription.sectionTitle') }}</h2>

        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-500">{{ t('subscription.planLabel') }}</span>
          <span
            :class="subscription.isPro
              ? 'bg-primary-50 text-primary-600'
              : 'bg-gray-100 text-gray-600'"
            class="text-xs font-semibold px-2 py-0.5 rounded-full"
          >
            {{ subscription.isPro ? t('subscription.proLabel') : t('subscription.basicLabel') }}
          </span>
        </div>

        <div v-if="subscription.isPro && subscription.tierExpiresAt" class="flex items-center justify-between">
          <span class="text-sm text-gray-500">{{ t('subscription.expiresLabel') }}</span>
          <span class="text-sm text-gray-700">{{ formatExpiry(subscription.tierExpiresAt) }}</span>
        </div>

        <div v-if="!subscription.isPro" class="flex items-center justify-between">
          <span class="text-sm text-gray-500">{{ t('subscription.usageThisMonth') }}</span>
          <span class="text-sm text-gray-700">
            {{ t('subscription.usageCounter', { used: subscription.generationsUsed, limit: subscription.generationsLimit }) }}
          </span>
        </div>

        <div v-if="!subscription.isPro" class="pt-1">
          <button
            type="button"
            class="w-full h-11 rounded-xl bg-primary-500 text-white text-sm font-semibold"
            @click="showUpgradeInfo = true"
          >
            {{ t('subscription.upgradeCta') }}
          </button>
        </div>
      </section>

      <!-- Upgrade info modal (placeholder) -->
      <div
        v-if="showUpgradeInfo"
        class="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
        @click.self="showUpgradeInfo = false"
      >
        <div class="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4">
          <h3 class="text-base font-semibold text-gray-900">{{ t('subscription.upgradeTitle') }}</h3>
          <p class="text-sm text-gray-600">{{ t('subscription.upgradeBody') }}</p>
          <button
            type="button"
            class="w-full h-11 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold"
            @click="showUpgradeInfo = false"
          >
            {{ t('subscription.upgradeClose') }}
          </button>
        </div>
      </div>

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
          {{ t('settings.saved') }}
        </div>
      </Transition>

      <!-- ── Save button ─────────────────────────────────────────────────────── -->
      <AppButton type="button" :loading="child.saving" @click="save">
        {{ t('settings.saveProfile') }}
      </AppButton>

      <!-- ── Admin button ───────────────────────────────────────────────────── -->
      <RouterLink
        v-if="profile.profile?.role === 'admin'"
        to="/admin"
        class="flex items-center justify-center w-full h-11 rounded-xl bg-gray-900 text-white text-sm font-semibold"
      >
        {{ t('settings.enterAdmin') }}
      </RouterLink>

      <!-- ── Logout button ──────────────────────────────────────────────────── -->
      <AppButton type="button" variant="danger" @click="logout">
        {{ t('settings.logout') }}
      </AppButton>

    </template>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
