import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '@/stores/admin.store'
import type { TableColumn } from '@/components/ui/DataTable.vue'
import type { AdminUser, UserRole } from '@/types'

type TierEdit = { tier: 'basic' | 'pro'; expiryMode: 'unlimited' | 'date'; expiresAt: string }

export function useAdminUsers() {
  const { t } = useI18n()
  const adminStore = useAdminStore()

  onMounted(() => adminStore.load())

  // ─── Table ──────────────────────────────────────────────────────────────────

  const columns = computed<TableColumn[]>(() => [
    { key: 'name',      label: t('admin.colName') },
    { key: 'email',     label: t('admin.colEmail'),     cellClass: 'text-gray-600' },
    { key: 'role',      label: t('admin.colRole') },
    { key: 'tier',      label: t('admin.colTier') },
    { key: 'recipes',   label: t('admin.colRecipes'),   cellClass: 'text-gray-600' },
    { key: 'plans',     label: t('admin.colPlans'),     cellClass: 'text-gray-600' },
    { key: 'lastLogin', label: t('admin.colLastLogin'), cellClass: 'text-gray-600' },
    { key: 'blocked',   label: t('admin.blockedLabel') },
  ])

  function rowClass(user: AdminUser): string {
    return user.isBlocked ? 'opacity-60 bg-red-50' : ''
  }

  function formatDate(date: string | null): string {
    if (!date) return t('admin.never')
    return new Date(date).toLocaleDateString()
  }

  // ─── Role ────────────────────────────────────────────────────────────────────

  function handleRoleChange(userId: string, event: Event) {
    const role = (event.target as HTMLSelectElement).value as UserRole
    adminStore.setRole(userId, role)
  }

  // ─── Tier ────────────────────────────────────────────────────────────────────

  const tierEditMap = ref<Record<string, TierEdit>>({})

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

  // ─── Block ───────────────────────────────────────────────────────────────────

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

  return {
    // store state
    users: computed(() => adminStore.users),
    loading: computed(() => adminStore.loading),
    error: computed(() => adminStore.error),
    // table
    columns,
    rowClass,
    formatDate,
    // role
    handleRoleChange,
    // tier
    tierEditMap,
    handleTierChange,
    applyTier,
    // block
    blockConfirm,
    toggleBlock,
    confirmBlock,
  }
}
