<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '@/stores/admin.store'
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
              {{ t('admin.colRecipes') }}
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.colPlans') }}
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {{ t('admin.colLastLogin') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="user in adminStore.users" :key="user.id">
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
            <td class="px-4 py-3 text-sm text-gray-600">{{ user.recipeCount }}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ user.planCount }}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ formatDate(user.lastLogin) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
