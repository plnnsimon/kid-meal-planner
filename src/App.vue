<script setup lang="ts">
import { ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import BottomNav from '@/components/layout/BottomNav.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import FeedbackButton from '@/components/common/FeedbackButton.vue'
import BirthdayModal from '@/components/ui/BirthdayModal.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useSubscriptionStore } from '@/stores/subscription.store'
import { useChildStore } from '@/stores/child.store'
import { useFriendsStore } from '@/stores/friends.store'

const auth = useAuthStore()
const subscriptionStore = useSubscriptionStore()
const childStore = useChildStore()
const friendsStore = useFriendsStore()
const route = useRoute()

const showBirthdayModal = ref(false)
const birthdayWhen = ref<'today' | 'yesterday'>('today')
const birthdayChildName = ref('')

function getBirthdayStatus(birthDateStr: string): 'today' | 'yesterday' | null {
  const birth = new Date(birthDateStr)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (birth.getMonth() === now.getMonth() && birth.getDate() === now.getDate()) return 'today'
  if (birth.getMonth() === yesterday.getMonth() && birth.getDate() === yesterday.getDate()) return 'yesterday'
  return null
}

function checkBirthday() {
  for (const child of childStore.children) {
    if (!child.birthDate || !child.id) continue
    const status = getBirthdayStatus(child.birthDate)
    if (!status) continue
    const key = `birthday_modal_${child.id}`
    const stored = localStorage.getItem(key)
    if (stored && Date.now() - parseInt(stored, 10) < 7 * 24 * 60 * 60 * 1000) continue
    birthdayWhen.value = status
    birthdayChildName.value = child.name
    showBirthdayModal.value = true
    localStorage.setItem(key, Date.now().toString())
    break
  }
}

auth.init().then(async () => {
  if (auth.isAuthenticated && !route.meta.requiresAdmin) {
    subscriptionStore.load()
    friendsStore.loadPendingRequests()
    await childStore.load()
    checkBirthday()
  }
})
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <template v-if="auth.ready">
      <AppHeader v-if="route.name !== 'login' && !route.meta.requiresAdmin" />
      <main class="flex-1 overflow-y-auto" :class="route.meta.requiresAdmin ? '' : 'pb-20'">
        <RouterView />
      </main>
      <BottomNav v-if="route.name !== 'login' && !route.meta.requiresAdmin" />
      <FeedbackButton v-if="auth.isAuthenticated && route.name !== 'login' && !route.meta.requiresAdmin" />
      <BirthdayModal
        v-if="showBirthdayModal && birthdayChildName"
        :child-name="birthdayChildName"
        :when="birthdayWhen"
        @close="showBirthdayModal = false"
      />
    </template>
    <div v-else class="flex items-center justify-center h-full">
      <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  </div>
</template>
