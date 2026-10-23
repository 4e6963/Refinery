<script setup lang="ts">
import { computed, reactive, ref, shallowRef } from 'vue'
import type { ParsedFile, Report } from '../core/model'
import DropZone from './DropZone.vue'
import FileList from './FileList.vue'
import ProgressBar from './ProgressBar.vue'
import ResultPreview from './ResultPreview.vue'
import WarningList from './WarningList.vue'
import DownloadButton from './DownloadButton.vue'
import type { FileEntry } from './types'
import { Comlink, worker } from './workerClient'
import { offlineReady } from './pwa'

const entries = ref<FileEntry[]>([])
const report = shallowRef<Report>()
const building = ref(false)
let nextId = 1
let queue = Promise.resolve()

const pending = computed(() => entries.value.filter((e) => e.status === 'queued' || e.status === 'reading'))
const progress = computed(() => {
  const total = entries.value.length
  if (!total) return 0
  const done = entries.value.filter((e) => e.status === 'done' || e.status === 'error').length
  const current = entries.value.find((e) => e.status === 'reading')?.progress ?? 0
  return (done + current) / total
})

function addFiles(files: File[]) {
  const known = new Set(entries.value.map((e) => `${e.file.name}:${e.file.size}`))
  for (const file of files) {
    if (known.has(`${file.name}:${file.size}`)) continue
    const entry = reactive<FileEntry>({ id: nextId++, file, status: 'queued', progress: 0 })
    entries.value.push(entry)
    queue = queue.then(() => read(entry))
  }
  queue = queue.then(rebuild)
}

async function read(entry: FileEntry) {
  if (!entries.value.includes(entry)) return
  entry.status = 'reading'
  const data = await entry.file.arrayBuffer()
  const parsed = await worker().parse(
    entry.file.name,
    Comlink.transfer(data, [data]),
    Comlink.proxy((done: number, total: number) => {
      entry.progress = done / total
    }),
  )
  entry.parsed = parsed
  entry.status = parsed.error ? 'error' : 'done'
}

async function rebuild() {
  const parsed: ParsedFile[] = entries.value.filter((e) => e.parsed?.statement).map((e) => e.parsed!)
  if (!parsed.length) {
    report.value = undefined
    return
  }
  building.value = true
  try {
    // Plain copies: reactive proxies cannot be structured-cloned into the worker.
    report.value = await worker().buildReport(JSON.parse(JSON.stringify(parsed)))
  } finally {
    building.value = false
  }
}

function setMonth(id: number, month: string) {
  const entry = entries.value.find((e) => e.id === id)
  if (!entry?.parsed) return
  entry.parsed = { ...entry.parsed, month, monthSource: 'manual' }
  queue = queue.then(rebuild)
}

function remove(id: number) {
  entries.value = entries.value.filter((e) => e.id !== id)
  queue = queue.then(rebuild)
}

function clear() {
  entries.value = []
  queue = queue.then(rebuild)
}
</script>

<template>
  <header class="top">
    <div>
      <h1>Refinery</h1>
      <p class="sub">Abrechnungs-PDFs → Jahres-Excel · läuft vollständig im Browser</p>
    </div>
    <span v-if="offlineReady" class="badge" title="Die App funktioniert jetzt auch ohne Internet">offline verfügbar</span>
  </header>

  <main>
    <DropZone @files="addFiles" />

    <section v-if="entries.length" class="card">
      <div class="card-head">
        <h2>Dateien ({{ entries.length }})</h2>
        <button type="button" class="link" @click="clear">alle entfernen</button>
      </div>
      <ProgressBar
        v-if="pending.length"
        :value="progress"
        :label="`${entries.length - pending.length} von ${entries.length} Dateien gelesen`"
      />
      <FileList :entries="entries" @month="setMonth" @remove="remove" />
    </section>

    <section v-if="report" class="card">
      <div class="card-head">
        <h2>Ergebnis</h2>
        <DownloadButton :report="report" :disabled="pending.length > 0 || building" />
      </div>
      <WarningList :warnings="report.warnings" />
      <ResultPreview :report="report" />
    </section>
  </main>
</template>

<style scoped>
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--accent);
  color: #fff;
}
h1 {
  margin: 0;
  font-size: 1.4rem;
}
.sub {
  margin: 0.1rem 0 0;
  opacity: 0.85;
  font-size: 0.9rem;
}
.badge {
  font-size: 0.75rem;
  border: 1px solid rgb(255 255 255 / 60%);
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
}
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem 1rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
h2 {
  margin: 0;
  font-size: 1.1rem;
}
.link {
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
}
.card :deep(table.files) {
  display: block;
  overflow-x: auto;
}
</style>
