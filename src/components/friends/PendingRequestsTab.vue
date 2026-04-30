<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useFriendsStore } from '@/stores/friends.store'

const { t } = useI18n()
const friends = useFriendsStore()

function initials(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || '?'
}

async function handleAccept(requesterId: string) {
  await friends.accept(requesterId)
}

async function handleReject(requesterId: string) {
  await friends.reject(requesterId)
}
</script>

<template>
  <section class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
    <div v-if="!friends.pendingIncoming.length" class="py-10 text-center text-gray-400 text-sm">
      {{ t('friends.emptyRequests') }}
    </div>
    <div
      v-for="f in friends.pendingIncoming"
      :key="f.requesterId"
      class="flex items-center gap-3 px-4 py-3"
    >
      <!-- Avatar -->
      <div class="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center">
        <img
          v-if="f.profile?.avatarUrl"
          :src="f.profile.avatarUrl"
          :alt="f.profile?.displayName"
          class="w-full h-full object-cover"
        />
        <span v-else class="text-primary-500 font-semibold text-sm">
          {{ initials(f.profile?.displayName ?? '') }}
        </span>
      </div>

      <!-- Name -->
      <span class="flex-1 text-sm font-medium text-gray-800 truncate">
        {{ f.profile?.displayName ?? 'Unknown' }}
      </span>

      <!-- Accept / Decline -->
      <div class="flex gap-2">
        <button
          type="button"
          class="text-xs text-white font-medium px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 transition-colors min-h-[44px]"
          @click="handleAccept(f.requesterId)"
        >
          {{ t('friends.accept') }}
        </button>
        <button
          type="button"
          class="text-xs text-gray-500 font-medium px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors min-h-[44px]"
          @click="handleReject(f.requesterId)"
        >
          {{ t('friends.decline') }}
        </button>
      </div>
    </div>
  </section>
</template>
