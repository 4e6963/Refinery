<script setup lang="ts">
import type { Warning } from '../core/model'
import { formatMonth } from './format'

defineProps<{ warnings: Warning[] }>()
</script>

<template>
  <section v-if="warnings.length" class="warnings" data-testid="warnings">
    <h3>{{ warnings.length }} issue{{ warnings.length === 1 ? '' : 's' }} to review</h3>
    <ul>
      <li v-for="(w, i) in warnings" :key="i" :class="w.level">
        <strong v-if="w.month">{{ formatMonth(w.month) }}</strong>
        <span v-if="w.fileName" class="file">{{ w.fileName }}</span>
        {{ w.message }}
      </li>
    </ul>
  </section>
  <p v-else class="ok" data-testid="no-warnings">✓ All totals and invoices match the documents.</p>
</template>

<style scoped>
.warnings {
  border: 1px solid var(--warn);
  background: var(--warn-soft);
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
}
h3 {
  margin: 0 0 0.3rem;
  font-size: 0.95rem;
}
ul {
  margin: 0;
  padding-left: 1.1rem;
  max-height: 12rem;
  overflow: auto;
  font-size: 0.85rem;
}
li.error {
  color: var(--danger);
}
.file {
  color: var(--muted);
  margin: 0 0.3rem;
}
.ok {
  color: var(--ok);
  margin: 0;
}
</style>
