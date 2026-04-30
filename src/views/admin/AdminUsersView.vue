<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import DataTable from '@/components/ui/DataTable.vue'
import { useAdminUsers } from '@/composables/useAdminUsers'

const { t } = useI18n()
const {
  users, loading, error,
  searchQuery,
  columns, rowClass, formatDate,
  handleRoleChange,
  tierEditMap, handleTierChange, applyTier,
  blockConfirm, toggleBlock, confirmBlock,
} = useAdminUsers()
</script>

<template>
  <div class="p-4">
    <h1 class="text-xl font-bold text-gray-900 mb-4">{{ t('admin.usersTitle') }}</h1>

    <input
      v-model="searchQuery"
      type="search"
      :placeholder="t('admin.searchPlaceholder')"
      class="w-full mb-4 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400 bg-white"
    />

    <DataTable
      :columns="columns"
      :rows="users"
      row-key="id"
      :row-class="rowClass"
      :loading="loading"
      :error="error ? t('admin.loadError') : undefined"
      :empty="t('admin.noUsers')"
    >
      <!-- Name -->
      <template #name="{ row }">
        <div class="flex items-center gap-2">
          <img
            v-if="row.avatarUrl"
            :src="row.avatarUrl"
            :alt="row.displayName"
            class="w-7 h-7 rounded-full object-cover shrink-0"
          />
          <div v-else class="w-7 h-7 rounded-full bg-gray-200 shrink-0 flex items-center justify-center">
            <FontAwesomeIcon icon="user" class="w-3 h-3 text-gray-400" />
          </div>
          <span class="font-medium text-gray-900">{{ row.displayName }}</span>
        </div>
      </template>

      <!-- Email -->
      <template #email="{ row }">{{ row.email }}</template>

      <!-- Role -->
      <template #role="{ row }">
        <select
          :value="row.role"
          class="text-sm rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-primary-400 bg-white"
          @change="handleRoleChange(row.id, $event)"
        >
          <option value="user">{{ t('admin.roleUser') }}</option>
          <option value="admin">{{ t('admin.roleAdmin') }}</option>
        </select>
      </template>

      <!-- Tier -->
      <template #tier="{ row }">
        <template v-if="!tierEditMap[row.id]">
          <div class="flex items-center gap-2">
            <span
              :class="row.subscriptionTier === 'pro'
                ? 'bg-primary-50 text-primary-600'
                : 'bg-gray-100 text-gray-600'"
              class="text-xs font-semibold px-2 py-0.5 rounded-full"
            >
              {{ row.subscriptionTier === 'pro' ? t('subscription.proLabel') : t('subscription.basicLabel') }}
            </span>
            <span v-if="row.subscriptionTier === 'pro'" class="text-xs text-gray-400">
              {{ row.tierExpiresAt ? formatDate(row.tierExpiresAt) : '∞' }}
            </span>
            <select
              :value="row.subscriptionTier"
              class="text-xs rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-primary-400 bg-white"
              @change="handleTierChange(row.id, $event)"
            >
              <option value="basic">{{ t('subscription.basicLabel') }}</option>
              <option value="pro">{{ t('subscription.proLabel') }}</option>
            </select>
          </div>
        </template>
        <template v-else>
          <div class="flex flex-col gap-1 min-w-[160px]">
            <select
              :value="tierEditMap[row.id].tier"
              class="text-xs rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-primary-400 bg-white"
              @change="handleTierChange(row.id, $event)"
            >
              <option value="basic">{{ t('subscription.basicLabel') }}</option>
              <option value="pro">{{ t('subscription.proLabel') }}</option>
            </select>

            <template v-if="tierEditMap[row.id].tier === 'pro'">
              <div class="flex gap-2 text-xs">
                <label class="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    :name="`expiry-${row.id}`"
                    value="unlimited"
                    :checked="tierEditMap[row.id].expiryMode === 'unlimited'"
                    @change="tierEditMap[row.id].expiryMode = 'unlimited'"
                  />
                  {{ t('admin.tierUnlimited') }}
                </label>
                <label class="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    :name="`expiry-${row.id}`"
                    value="date"
                    :checked="tierEditMap[row.id].expiryMode === 'date'"
                    @change="tierEditMap[row.id].expiryMode = 'date'"
                  />
                  {{ t('admin.tierUntilDate') }}
                </label>
              </div>
              <input
                v-if="tierEditMap[row.id].expiryMode === 'date'"
                v-model="tierEditMap[row.id].expiresAt"
                type="date"
                class="text-xs rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-primary-400"
              />
            </template>

            <button
              type="button"
              class="text-xs bg-primary-500 text-white rounded-lg px-3 py-1 font-semibold min-h-[32px]"
              @click="applyTier(row.id)"
            >
              {{ t('admin.applyTier') }}
            </button>
          </div>
        </template>
      </template>

      <!-- Recipes -->
      <template #recipes="{ row }">{{ row.recipeCount }}</template>

      <!-- Plans -->
      <template #plans="{ row }">{{ row.planCount }}</template>

      <!-- Last login -->
      <template #lastLogin="{ row }">{{ formatDate(row.lastLogin) }}</template>

      <!-- Blocked -->
      <template #blocked="{ row }">
        <button
          type="button"
          :class="row.isBlocked
            ? 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700'
            : 'bg-red-50 text-red-600 hover:bg-red-100'"
          class="text-xs font-semibold px-3 py-1 rounded-lg min-h-[32px] transition-colors"
          @click="toggleBlock(row.id, row.isBlocked)"
        >
          {{ row.isBlocked ? t('admin.unblockUser') : t('admin.blockUser') }}
        </button>
      </template>
    </DataTable>
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
