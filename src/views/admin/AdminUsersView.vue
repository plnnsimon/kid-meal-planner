<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '@/stores/admin.store'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import type { UserRole } from '@/types'

const { t } = useI18n()
const adminStore = useAdminStore()

onMounted(() => {
  adminStore.load()
})

function formatDate(date: string | null): string {
  if (!date) return t('admin.never')
  return new Date(date).toLocaleDateString()
}

function handleRoleChange(userId: string, event: Event) {
  const role = (event.target as HTMLSelectElement).value as UserRole
  adminStore.setRole(userId, role)
}

const tierEditMap = ref<Record<string, { tier: 'basic' | 'pro'; expiryMode: 'unlimited' | 'date'; expiresAt: string }>>({})

function getDefaultExpiry(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

function handleTierChange(userId: string, event: Event) {
  const tier = (event.target as HTMLSelectElement).value as 'basic' | 'pro'
  const user = adminStore.users.find(u => u.id === userId)
  if (!user) return
  const currentExpiry = user.tierExpiresAt ? user.tierExpiresAt.split('T')[0] : getDefaultExpiry()
  const expiryMode = user.tierExpiresAt === null && user.subscriptionTier === 'pro' ? 'unlimited' : 'date'
  tierEditMap.value[userId] = {
    tier,
    expiryMode: tier === 'basic' ? 'date' : expiryMode,
    expiresAt: currentExpiry,
  }
}

const blockConfirm = ref<{ userId: string; currentlyBlocked: boolean } | null>(null)

function toggleBlock(userId: string, currentlyBlocked: boolean) {
  if (currentlyBlocked) {
    adminStore.setBlocked(userId, false)
    return
  }
  blockConfirm.value = { userId, currentlyBlocked }
}

async function confirmBlock() {
  if (!blockConfirm.value) return
  await adminStore.setBlocked(blockConfirm.value.userId, true)
  blockConfirm.value = null
}

async function applyTier(userId: string) {
  const edit = tierEditMap.value[userId]
  if (!edit) return
  let expiresAt: string | null = null
  if (edit.tier === 'pro' && edit.expiryMode === 'date') {
    expiresAt = new Date(edit.expiresAt).toISOString()
  }
  await adminStore.setTier(userId, edit.tier, expiresAt)
  delete tierEditMap.value[userId]
}
</script>

<template>
  <div class="p-4">
    <h1 class="text-xl font-bold text-gray-900 mb-4">{{ t('admin.usersTitle') }}</h1>

    <!-- Loading -->
    <div v-if="adminStore.loading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error -->
    <p v-else-if="adminStore.error" class="text-red-500 text-sm text-center py-8">
      {{ t('admin.loadError') }}
    </p>

    <!-- Empty -->
    <p v-else-if="adminStore.users.length === 0" class="text-gray-500 text-sm text-center py-8">
      {{ t('admin.noUsers') }}
    </p>

    <!-- Table -->
    <div v-else class="overflow-x-auto rounded-2xl shadow-sm bg-white">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.colName') }}
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.colEmail') }}
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.colRole') }}
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.colTier') }}
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.colRecipes') }}
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.colPlans') }}
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.colLastLogin') }}
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.blockedLabel') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="user in adminStore.users" :key="user.id" :class="user.isBlocked ? 'opacity-60 bg-red-50' : ''">
            <td class="px-4 py-3 text-sm">
              <div class="flex items-center gap-2">
                <img
                  v-if="user.avatarUrl"
                  :src="user.avatarUrl"
                  :alt="user.displayName"
                  class="w-7 h-7 rounded-full object-cover shrink-0"
                />
                <div v-else class="w-7 h-7 rounded-full bg-gray-200 shrink-0 flex items-center justify-center">
                  <FontAwesomeIcon icon="user" class="w-3 h-3 text-gray-400" />
                </div>
                <span class="font-medium text-gray-900">{{ user.displayName }}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ user.email }}</td>
            <td class="px-4 py-3 text-sm">
              <select
                :value="user.role"
                class="text-sm rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-primary-400 bg-white"
                @change="handleRoleChange(user.id, $event)"
              >
                <option value="user">{{ t('admin.roleUser') }}</option>
                <option value="admin">{{ t('admin.roleAdmin') }}</option>
              </select>
            </td>
            <td class="px-4 py-3 text-sm">
              <template v-if="!tierEditMap[user.id]">
                <!-- Static badge -->
                <div class="flex items-center gap-2">
                  <span
                    :class="user.subscriptionTier === 'pro'
                      ? 'bg-primary-50 text-primary-600'
                      : 'bg-gray-100 text-gray-600'"
                    class="text-xs font-semibold px-2 py-0.5 rounded-full"
                  >
                    {{ user.subscriptionTier === 'pro' ? t('subscription.proLabel') : t('subscription.basicLabel') }}
                  </span>
                  <span v-if="user.subscriptionTier === 'pro'" class="text-xs text-gray-400">
                    {{ user.tierExpiresAt ? formatDate(user.tierExpiresAt) : '∞' }}
                  </span>
                  <select
                    :value="user.subscriptionTier"
                    class="text-xs rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-primary-400 bg-white"
                    @change="handleTierChange(user.id, $event)"
                  >
                    <option value="basic">{{ t('subscription.basicLabel') }}</option>
                    <option value="pro">{{ t('subscription.proLabel') }}</option>
                  </select>
                </div>
              </template>
              <template v-else>
                <div class="flex flex-col gap-1 min-w-[160px]">
                  <!-- Tier select -->
                  <select
                    :value="tierEditMap[user.id].tier"
                    class="text-xs rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-primary-400 bg-white"
                    @change="handleTierChange(user.id, $event)"
                  >
                    <option value="basic">{{ t('subscription.basicLabel') }}</option>
                    <option value="pro">{{ t('subscription.proLabel') }}</option>
                  </select>

                  <!-- Expiry mode (Pro only) -->
                  <template v-if="tierEditMap[user.id].tier === 'pro'">
                    <div class="flex gap-2 text-xs">
                      <label class="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          :name="`expiry-${user.id}`"
                          value="unlimited"
                          :checked="tierEditMap[user.id].expiryMode === 'unlimited'"
                          @change="tierEditMap[user.id].expiryMode = 'unlimited'"
                        />
                        {{ t('admin.tierUnlimited') }}
                      </label>
                      <label class="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          :name="`expiry-${user.id}`"
                          value="date"
                          :checked="tierEditMap[user.id].expiryMode === 'date'"
                          @change="tierEditMap[user.id].expiryMode = 'date'"
                        />
                        {{ t('admin.tierUntilDate') }}
                      </label>
                    </div>
                    <input
                      v-if="tierEditMap[user.id].expiryMode === 'date'"
                      v-model="tierEditMap[user.id].expiresAt"
                      type="date"
                      class="text-xs rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-primary-400"
                    />
                  </template>

                  <button
                    type="button"
                    class="text-xs bg-primary-500 text-white rounded-lg px-3 py-1 font-semibold min-h-[32px]"
                    @click="applyTier(user.id)"
                  >
                    {{ t('admin.applyTier') }}
                  </button>
                </div>
              </template>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ user.recipeCount }}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ user.planCount }}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ formatDate(user.lastLogin) }}</td>
            <td class="px-4 py-3 text-sm">
              <button
                type="button"
                :class="user.isBlocked
                  ? 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'"
                class="text-xs font-semibold px-3 py-1 rounded-lg min-h-[32px] transition-colors"
                @click="toggleBlock(user.id, user.isBlocked)"
              >
                {{ user.isBlocked ? t('admin.unblockUser') : t('admin.blockUser') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <ConfirmModal
    v-if="blockConfirm"
    :title="t('admin.blockUser')"
    :message="t('admin.blockConfirm')"
    :confirm-label="t('admin.blockUser')"
    :cancel-label="t('common.cancel')"
    variant="danger"
    @confirm="confirmBlock"
    @cancel="blockConfirm = null"
  />
</template>
