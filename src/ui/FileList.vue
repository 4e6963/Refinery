<script setup lang="ts">
import type { FileEntry } from './types'
import { KIND_LABELS } from './format'

defineProps<{ entries: FileEntry[] }>()
const emit = defineEmits<{
  month: [id: number, month: string]
  remove: [id: number]
}>()

function onMonth(id: number, event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (value) emit('month', id, value)
}

const SOURCE_LABEL = { filename: 'from file name', content: 'from content', manual: 'manual' } as const
</script>

<template>
  <table class="files" data-testid="file-list">
    <thead>
      <tr>
        <th>File</th>
        <th>Type</th>
        <th>Format</th>
        <th>Month</th>
        <th>Status</th>
        <th />
      </tr>
    </thead>
    <tbody>
      <tr v-for="e in entries" :key="e.id" :class="e.status">
        <td class="name" :title="e.archive ? `${e.archive} / ${e.file.name}` : e.file.name">
          {{ e.file.name }}<small v-if="e.archive" class="archive">{{ e.archive }}</small>
        </td>
        <td>{{ e.parsed?.kind ? KIND_LABELS[e.parsed.kind] : '–' }}</td>
        <td>{{ e.parsed?.formatId ?? '–' }}</td>
        <td>
          <template v-if="e.parsed?.statement">
            <input
              type="month"
              :value="e.parsed.month ?? ''"
              :aria-label="`Month for ${e.file.name}`"
              @change="onMonth(e.id, $event)"
            />
            <small v-if="e.parsed.monthSource">{{ SOURCE_LABEL[e.parsed.monthSource] }}</small>
          </template>
          <template v-else>–</template>
        </td>
        <td class="status">
          <template v-if="e.status === 'queued'">queued</template>
          <template v-else-if="e.status === 'reading'">reading … {{ Math.round(e.progress * 100) }} %</template>
          <template v-else-if="e.status === 'done'">✓ read</template>
          <span v-else class="error">{{ e.parsed?.error ?? 'Error' }}</span>
        </td>
        <td>
          <button class="icon" type="button" :aria-label="`Remove ${e.file.name}`" @click="emit('remove', e.id)">✕</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.files {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
th,
td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
  white-space: nowrap;
}
th {
  color: var(--muted);
  font-weight: 600;
}
.name {
  max-width: 18rem;
  overflow: hidden;
  text-overflow: ellipsis;
}
small {
  margin-left: 0.4rem;
  color: var(--muted);
}
.archive {
  display: block;
  margin-left: 0;
}
.error {
  color: var(--danger);
  white-space: normal;
}
tr.done .status {
  color: var(--ok);
}
.icon {
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
}
.icon:hover {
  color: var(--danger);
}
input[type='month'] {
  font: inherit;
  padding: 0.1rem 0.25rem;
}
</style>
