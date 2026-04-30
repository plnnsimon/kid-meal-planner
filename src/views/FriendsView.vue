<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFriendsStore } from '@/stores/friends.store'
import FriendsListTab from '@/components/friends/FriendsListTab.vue'
import PendingRequestsTab from '@/components/friends/PendingRequestsTab.vue'
import FindPeopleTab from '@/components/friends/FindPeopleTab.vue'
import LeaderboardTab from '@/components/friends/LeaderboardTab.vue'

const { t } = useI18n()
const friends = useFriendsStore()

const activeTab = ref(0)
const tabs = computed(() => [t('friends.tabFriends'), t('friends.tabRequests'), t('friends.tabFind'), t('friends.tabLeaderboard')])

watch(activeTab, (val) => {
  if (val === 3 && !friends.leaderboard.length) friends.loadLeaderboard()
})

onMounted(async () => {
  await Promise.all([friends.loadFriends(), friends.loadPendingRequests()])
})
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-6 space-y-4">

    <!-- Tab bar -->
    <div class="flex bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        v-for="(tab, i) in tabs"
        :key="tab"
        type="button"
        class="flex-1 py-3 text-sm font-medium transition-colors"
        :class="activeTab === i
          ? 'text-primary-500 border-b-2 border-primary-500'
          : 'text-gray-400'"
        @click="activeTab = i"
      >
        {{ tab }}
        <span
          v-if="i === 1 && friends.pendingIncoming.length"
          class="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-500 text-white text-xs"
        >{{ friends.pendingIncoming.length }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="friends.loading" class="flex justify-center py-10">
      <div class="w-8 h-8 rounded-full border-2 border-primary-300 border-t-primary-500 animate-spin" />
    </div>

    <!-- Error -->
    <div v-else-if="friends.error" class="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
      {{ friends.error }}
    </div>

    <template v-else>
      <FriendsListTab v-if="activeTab === 0" />
      <PendingRequestsTab v-else-if="activeTab === 1" />
      <FindPeopleTab v-else-if="activeTab === 2" />
      <LeaderboardTab v-else-if="activeTab === 3" />
    </template>

  </div>
</template>
