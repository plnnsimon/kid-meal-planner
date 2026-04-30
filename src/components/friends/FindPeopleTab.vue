<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFriendsStore } from '@/stores/friends.store'
import { useProfileStore } from '@/stores/profile.store'
import type { UserProfile } from '@/types'

const { t } = useI18n()
const friends = useFriendsStore()
const profileStore = useProfileStore()

const searchQuery = ref('')
const searchResults = ref<UserProfile[]>([])
const searching = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function initials(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || '?'
}

function onSearchInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const q = searchQuery.value.trim()
    if (!q) {
      searchResults.value = []
      return
    }
    searching.value = true
    try {
      searchResults.value = await profileStore.search(q)
    } finally {
      searching.value = false
    }
  }, 400)
}

async function handleSendRequest(userId: string) {
  await friends.sendRequest(userId)
}
</script>

<template>
  <section class="space-y-3">
    <!-- Search input -->
    <input
      v-model="searchQuery"
      type="search"
      :placeholder="t('friends.searchPlaceholder')"
      class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-400"
      @input="onSearchInput"
    />

    <!-- Searching spinner -->
    <div v-if="searching" class="flex justify-center py-6">
      <div class="w-6 h-6 rounded-full border-2 border-primary-300 border-t-primary-500 animate-spin" />
    </div>

    <!-- Results -->
    <div v-else-if="searchResults.length" class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
      <div
        v-for="user in searchResults"
        :key="user.id"
        class="flex items-center gap-3 px-4 py-3"
      >
        <!-- Avatar -->
        <div class="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center">
          <img
            v-if="user.avatarUrl"
            :src="user.avatarUrl"
            :alt="user.displayName"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-primary-500 font-semibold text-sm">
            {{ initials(user.displayName) }}
          </span>
        </div>

        <!-- Name -->
        <span class="flex-1 text-sm font-medium text-gray-800 truncate">
          {{ user.displayName }}
        </span>

        <!-- Action -->
        <button
          v-if="friends.isFriend(user.id)"
          type="button"
          class="text-xs text-gray-400 font-medium px-3 py-2 rounded-xl bg-gray-100 min-h-[44px] cursor-default"
          disabled
        >
          {{ t('friends.friendsStatus') }}
        </button>
        <button
          v-else-if="friends.hasPendingRequest(user.id)"
          type="button"
          class="text-xs text-gray-400 font-medium px-3 py-2 rounded-xl bg-gray-100 min-h-[44px] cursor-default"
          disabled
        >
          {{ t('friends.pendingStatus') }}
        </button>
        <button
          v-else
          type="button"
          class="text-xs text-white font-medium px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 transition-colors min-h-[44px]"
          @click="handleSendRequest(user.id)"
        >
          {{ t('friends.addFriend') }}
        </button>
      </div>
    </div>

    <!-- Empty state after search -->
    <div
      v-else-if="searchQuery.trim() && !searching"
      class="py-10 text-center text-gray-400 text-sm"
    >
      {{ t('friends.noUsers') }}
    </div>

    <!-- Prompt -->
    <div v-else class="py-10 text-center text-gray-400 text-sm">
      {{ t('friends.searchPrompt') }}
    </div>
  </section>
</template>
