<script setup lang="ts">
import type { Warning } from '../core/model'
import { formatMonth } from './format'
import { ICONS } from './icons'

defineProps<{ warnings: Warning[] }>()
</script>

<template>
  <section v-if="warnings.length" class="warnings" data-testid="warnings">
    <h3>Hold your horses — {{ warnings.length }} issue{{ warnings.length === 1 ? '' : 's' }} to review</h3>
    <ul>
      <li v-for="(w, i) in warnings" :key="i" :class="w.level">
        <strong v-if="w.month">{{ formatMonth(w.month) }}</strong>
        <span v-if="w.fileName" class="file">{{ w.fileName }}</span>
        {{ w.message }}
      </li>
    </ul>
  </section>
  <p v-else class="ok" data-testid="no-warnings">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.star" /></svg>
    <span>✓ All totals and invoices match the documents.</span>
  </p>
</template>

<style scoped>
.warnings {
  border: 2px solid var(--warn);
  background:
    repeating-linear-gradient(-45deg, transparent 0 10px, rgb(201 138 18 / 7%) 10px 20px),
    var(--warn-soft);
  border-radius: 10px;
  padding: 0.7rem 1rem;
}
h3 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  color: var(--accent-strong);
}
ul {
  margin: 0;
  padding-left: 1.1rem;
  max-height: 12rem;
  overflow: auto;
  font-size: 0.88rem;
}
li.error {
  color: var(--danger);
}
.file {
  color: var(--muted);
  margin: 0 0.3rem;
}
.ok {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--ok);
  font-weight: 600;
}
.ok svg {
  width: 1.6rem;
  height: 1.6rem;
  fill: var(--ember);
  stroke: var(--leather);
  stroke-width: 1;
  animation: shine 2.4s ease-in-out infinite;
}
@keyframes shine {
  50% {
    transform: rotate(18deg) scale(1.1);
  }
}
</style>
