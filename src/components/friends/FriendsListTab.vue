<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useFriendsStore } from '@/stores/friends.store'
import { useAuthStore } from '@/stores/auth.store'

const { t } = useI18n()
const router = useRouter()
const friends = useFriendsStore()
const auth = useAuthStore()

function initials(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || '?'
}

function otherPartyId(f: { requesterId: string; addresseeId: string }): string {
  return f.requesterId === auth.userId ? f.addresseeId : f.requesterId
}

async function handleRemove(otherId: string) {
  await friends.removeFriend(otherId)
}
</script>

<template>
  <section class="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
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
</template>
