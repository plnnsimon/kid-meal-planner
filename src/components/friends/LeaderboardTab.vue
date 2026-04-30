<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useFriendsStore } from '@/stores/friends.store'
import { useAuthStore } from '@/stores/auth.store'

const { t } = useI18n()
const friends = useFriendsStore()
const auth = useAuthStore()

function initials(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || '?'
}

function rankMedal(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank)
}
</script>

<template>
  <section>
    <div v-if="friends.leaderboardLoading" class="flex justify-center py-10">
      <div class="w-8 h-8 rounded-full border-2 border-primary-300 border-t-primary-500 animate-spin" />
    </div>
    <div v-else-if="!friends.leaderboard.length" class="py-10 text-center text-gray-400 text-sm">
      {{ t('friends.emptyLeaderboard') }}
    </div>
    <div v-else class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
      <div
        v-for="entry in friends.leaderboard"
        :key="entry.userId"
        class="flex items-center gap-3 px-4 py-3"
        :class="entry.userId === auth.userId ? 'bg-primary-50' : ''"
      >
        <!-- Rank -->
        <span class="w-7 text-center text-base shrink-0">{{ rankMedal(entry.rank) }}</span>

        <!-- Avatar -->
        <div class="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center">
          <img v-if="entry.avatarUrl" :src="entry.avatarUrl" :alt="entry.displayName" class="w-full h-full object-cover" />
          <span v-else class="text-primary-500 font-semibold text-xs">{{ initials(entry.displayName) }}</span>
        </div>

        <!-- Name + ratings -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 truncate">
            {{ entry.displayName }}
            <span v-if="entry.userId === auth.userId" class="text-xs text-primary-400 font-normal ml-1">({{ t('friends.leaderboardYou') }})</span>
          </p>
          <p v-if="entry.ownRatingsCount > 0" class="text-xs text-gray-400">
            {{ t('friends.leaderboardRatings', { count: entry.ownRatingsCount }) }}
            &middot;
            {{ t('friends.leaderboardAvgRating', { rating: entry.ownAvgRating.toFixed(1) }) }}
          </p>
          <p v-else class="text-xs text-gray-400">{{ t('friends.leaderboardNoRatings') }}</p>
        </div>

        <!-- Score -->
        <span class="text-sm font-semibold text-primary-500 shrink-0">{{ entry.score.toFixed(1) }}</span>
      </div>
    </div>
  </section>
</template>
