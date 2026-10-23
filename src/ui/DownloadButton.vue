<script setup lang="ts">
import { ref } from 'vue'
import type { Report } from '../core/model'
import { workbookFileName } from '../core/excel/fileName'
import { worker } from './workerClient'
import { ICONS } from './icons'

const props = defineProps<{ report: Report; disabled?: boolean }>()
const busy = ref(false)
const error = ref<string>()

async function download() {
  busy.value = true
  error.value = undefined
  try {
    // Plain object copy: Vue proxies cannot be cloned into the worker.
    const bytes = await worker().exportXlsx(JSON.parse(JSON.stringify(props.report)))
    const blob = new Blob([bytes as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = workbookFileName(props.report)
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="download">
    <button type="button" class="primary" :disabled="disabled || busy" data-testid="download" @click="download">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.drop" /></svg>
      {{ busy ? 'Refining …' : 'Download Excel' }}
    </button>
    <span v-if="error" class="error">{{ error }}</span>
  </div>
</template>

<style scoped>
.download {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(180deg, var(--saddle), var(--leather));
  color: #fffaf0;
  border: 2px solid var(--accent-strong);
  border-radius: 10px;
  padding: 0.6rem 1.3rem;
  font: inherit;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow:
    0 1px 0 rgb(255 255 255 / 35%) inset,
    0 4px 0 var(--accent-strong);
  transition:
    transform 0.1s,
    box-shadow 0.1s;
}
.primary:hover:not(:disabled) {
  transform: translateY(-1px);
}
.primary:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow:
    0 1px 0 rgb(255 255 255 / 35%) inset,
    0 1px 0 var(--accent-strong);
}
.primary svg {
  width: 1.1rem;
  height: 1.1rem;
  fill: var(--crude);
  stroke: #fffaf0;
  stroke-width: 1.5;
}
.primary:disabled {
  opacity: 0.5;
  cursor: default;
}
.error {
  color: var(--danger);
}
</style>
