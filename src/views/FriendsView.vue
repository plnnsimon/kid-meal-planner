<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useFriendsStore } from '@/stores/friends.store'
import { useProfileStore } from '@/stores/profile.store'
import { useAuthStore } from '@/stores/auth.store'
import type { UserProfile } from '@/types'

const { t } = useI18n()

const router = useRouter()
const friends = useFriendsStore()
const profileStore = useProfileStore()
const auth = useAuthStore()

// ── Tabs ──────────────────────────────────────────────────────────────────────

const activeTab = ref(0)
const tabs = computed(() => [t('friends.tabFriends'), t('friends.tabRequests'), t('friends.tabFind'), t('friends.tabLeaderboard')])

watch(activeTab, (val) => {
  if (val === 3 && !friends.leaderboard.length) friends.loadLeaderboard()
})

// ── Find People ───────────────────────────────────────────────────────────────

const searchQuery = ref('')
const searchResults = ref<UserProfile[]>([])
const searching = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || '?'
}

function rankMedal(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank)
}

async function handleSendRequest(userId: string) {
  await friends.sendRequest(userId)
}

async function handleAccept(requesterId: string) {
  await friends.accept(requesterId)
}

async function handleReject(requesterId: string) {
  await friends.reject(requesterId)
}

async function handleRemove(otherId: string) {
  await friends.removeFriend(otherId)
}

function otherPartyId(f: { requesterId: string; addresseeId: string }): string {
  return f.requesterId === auth.userId ? f.addresseeId : f.requesterId
}

// ── Mount ─────────────────────────────────────────────────────────────────────

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

      <!-- ── Tab 0: Friends ─────────────────────────────────────────────────── -->
      <section v-if="activeTab === 0" class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
        <div v-if="!friends.friends.length" class="py-10 text-center text-gray-400 text-sm">
          {{ t('friends.emptyFriends') }}
        </div>
        <div
          v-for="f in friends.friends"
          :key="f.requesterId + f.addresseeId"
          class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
          @click="router.push({ name: 'friend-profile', params: { id: otherPartyId(f) } })"
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

          <!-- Remove -->
          <button
            type="button"
            class="text-xs text-red-400 font-medium px-3 py-2 rounded-xl hover:bg-red-50 transition-colors min-h-[44px]"
            @click.stop="handleRemove(otherPartyId(f))"
          >
            {{ t('friends.remove') }}
          </button>
        </div>
      </section>

      <!-- ── Tab 1: Requests ────────────────────────────────────────────────── -->
      <section v-else-if="activeTab === 1" class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
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

      <!-- ── Tab 2: Find People ─────────────────────────────────────────────── -->
      <section v-else-if="activeTab === 2" class="space-y-3">
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

      <!-- ── Tab 3: Leaderboard ──────────────────────────────────────────────── -->
      <section v-else-if="activeTab === 3">
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

            <!-- Name + saved -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">
                {{ entry.displayName }}
                <span v-if="entry.userId === auth.userId" class="text-xs text-primary-400 font-normal ml-1">({{ t('friends.leaderboardYou') }})</span>
              </p>
              <p class="text-xs text-gray-400">{{ t('friends.leaderboardSaved', { count: entry.savedCount }) }}</p>
            </div>

            <!-- Score -->
            <span class="text-sm font-semibold text-primary-500 shrink-0">{{ entry.score.toFixed(1) }}</span>
          </div>
        </div>
      </section>

    </template>
  </div>
</template>
