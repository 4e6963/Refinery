<script setup lang="ts">
import { ref } from 'vue'
import type { Report } from '../core/model'
import { workbookFileName } from '../core/excel/fileName'
import { worker } from './workerClient'

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
      {{ busy ? 'Erzeuge Excel …' : 'Excel herunterladen' }}
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
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.primary:disabled {
  opacity: 0.5;
  cursor: default;
}
.error {
  color: var(--danger);
}
</style>
