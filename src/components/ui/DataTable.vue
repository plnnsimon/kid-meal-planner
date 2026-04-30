<script setup lang="ts" generic="T extends object">
export interface TableColumn {
  key: string
  label: string
  headerClass?: string
  cellClass?: string
}

const props = defineProps<{
  columns: TableColumn[]
  rows: T[]
  rowKey?: string
  rowClass?: (row: T) => string
  loading?: boolean
  error?: string
  empty?: string
}>()

function getRowKey(row: T, index: number): string | number {
  if (props.rowKey) return String((row as Record<string, unknown>)[props.rowKey])
  return index
}
</script>

<template>
  <div v-if="props.loading" class="flex justify-center py-12">
    <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
  </div>

  <p v-else-if="props.error" class="text-red-500 text-sm text-center py-8">
    {{ props.error }}
  </p>

  <p v-else-if="props.rows.length === 0" class="text-gray-500 text-sm text-center py-8">
    {{ props.empty }}
  </p>

  <div v-else class="overflow-x-auto rounded-2xl shadow-sm bg-white">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th
            v-for="col in props.columns"
            :key="col.key"
            :class="col.headerClass"
            class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr
          v-for="(row, index) in props.rows"
          :key="getRowKey(row, index)"
          :class="props.rowClass?.(row)"
        >
          <td
            v-for="col in props.columns"
            :key="col.key"
            :class="col.cellClass"
            class="px-4 py-3 text-sm"
          >
            <slot :name="col.key" :row="row">
              {{ (row as Record<string, unknown>)[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
