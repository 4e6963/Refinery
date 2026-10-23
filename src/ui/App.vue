<script setup lang="ts">
import { computed, reactive, ref, shallowRef } from 'vue'
import type { ParsedFile, Report } from '../core/model'
import DropZone from './DropZone.vue'
import FileList from './FileList.vue'
import ProgressBar from './ProgressBar.vue'
import ResultPreview from './ResultPreview.vue'
import WarningList from './WarningList.vue'
import DownloadButton from './DownloadButton.vue'
import HeroScene from './HeroScene.vue'
import { ICONS } from './icons'
import type { FileEntry } from './types'
import { Comlink, worker } from './workerClient'
import { offlineReady } from './pwa'
import { isPdf, isZip } from '../core/fileTypes'

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

const archiveErrors = ref<string[]>([])

async function addFiles(files: File[]) {
  archiveErrors.value = []
  addPdfs(files.filter((f) => isPdf(f.name)))
  for (const zip of files.filter((f) => isZip(f.name))) {
    try {
      const data = await zip.arrayBuffer()
      const pdfs = await worker().unzip(Comlink.transfer(data, [data]))
      if (!pdfs.length) archiveErrors.value.push(`${zip.name}: no PDF files found`)
      addPdfs(
        pdfs.map((p) => new File([p.data as BlobPart], p.name, { type: 'application/pdf' })),
        zip.name,
      )
    } catch (err) {
      archiveErrors.value.push(`${zip.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}

function addPdfs(files: File[], archive?: string) {
  if (!files.length) return
  const known = new Set(entries.value.map((e) => `${e.file.name}:${e.file.size}`))
  for (const file of files) {
    if (known.has(`${file.name}:${file.size}`)) continue
    known.add(`${file.name}:${file.size}`)
    const entry = reactive<FileEntry>({ id: nextId++, file, archive, status: 'queued', progress: 0 })
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
    <HeroScene />
    <div class="brand">
      <div>
        <h1>Refinery</h1>
        <p class="sub">Crude statements in, refined spreadsheets out</p>
      </div>
    </div>
  </header>

  <main>
    <DropZone @files="addFiles" />
    <p v-for="(msg, i) in archiveErrors" :key="i" class="archive-error" data-testid="archive-error">{{ msg }}</p>

    <section v-if="entries.length" class="card">
      <div class="card-head">
        <h2><span class="num">{{ entries.length }}</span> barrels in the tank</h2>
        <button type="button" class="link" @click="clear">empty the tank</button>
      </div>
      <ProgressBar
        v-if="pending.length"
        :value="progress"
        :label="`${entries.length - pending.length} of ${entries.length} files read`"
      />
      <FileList :entries="entries" @month="setMonth" @remove="remove" />
    </section>

    <section v-if="report" class="card">
      <div class="card-head">
        <h2>Refined yield</h2>
        <DownloadButton :report="report" :disabled="pending.length > 0 || building" />
      </div>
      <WarningList :warnings="report.warnings" />
      <ResultPreview :report="report" />
    </section>
  </main>

  <footer>
    <span>Refined right here in your browser — not a single drop leaves the ranch.</span>
    <span v-if="offlineReady" class="badge" title="The app now also works without an internet connection">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.star" /></svg>available offline
    </span>
  </footer>
</template>

<style scoped>
.top {
  position: relative;
  /* The scene covers the full width; growing with it keeps the tallest parts
     (derrick, flare) inside the header on wide screens. */
  min-height: max(210px, 17vw);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  /* logo and padding scale with the header so the sky is not left empty on wide screens */
  padding: clamp(1.4rem, 2.6vw, 3.5rem) clamp(1.5rem, 3vw, 4rem);
  overflow: hidden;
  color: #fffaf0;
  border-bottom: 4px solid var(--crude);
}
.brand {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
/* branded into the sky like a ranch sign: crude brown by day, amber by night */
h1 {
  margin: 0;
  font-size: clamp(2rem, 4.2vw, 6.5rem);
  line-height: 1;
  color: var(--crude);
  text-shadow: 0 2px 0 rgb(255 214 150 / 55%);
}
.sub {
  margin: 0.35rem 0 0;
  font-style: italic;
  font-size: clamp(1rem, 1.35vw, 2rem);
  font-weight: 500;
  color: #4a2a17;
}
@media (prefers-color-scheme: dark) {
  h1 {
    color: var(--ember);
    text-shadow: 0 0 18px rgb(242 165 65 / 35%);
  }
  .sub {
    color: #e9c9a0;
  }
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  font-style: normal;
  color: var(--accent-strong);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  padding: 0.2rem 0.7rem 0.2rem 0.45rem;
}
.badge svg {
  width: 1rem;
  height: 1rem;
  fill: var(--ember);
}
main {
  max-width: 1200px;
  margin: -1.5rem auto 0;
  padding: 0 1rem 2rem;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1.1rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-width: 0;
  box-shadow:
    0 1px 0 rgb(255 255 255 / 40%) inset,
    0 10px 24px -14px rgb(60 30 10 / 45%);
  /* riveted steel-plate corners */
  background-image:
    radial-gradient(circle at 12px 12px, var(--border-strong) 2.5px, transparent 3px),
    radial-gradient(circle at calc(100% - 12px) 12px, var(--border-strong) 2.5px, transparent 3px),
    radial-gradient(circle at 12px calc(100% - 12px), var(--border-strong) 2.5px, transparent 3px),
    radial-gradient(circle at calc(100% - 12px) calc(100% - 12px), var(--border-strong) 2.5px, transparent 3px);
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0 0.4rem;
}
h2 {
  margin: 0;
  font-size: 1.35rem;
  color: var(--accent-strong);
}
.num {
  font-family: var(--slab);
  font-weight: 700;
}
.archive-error {
  margin: -0.5rem 0 0;
  color: var(--danger);
  font-weight: 600;
}
.link {
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  text-decoration: underline dotted;
}
footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.8rem;
  text-align: center;
  padding: 1.5rem 1rem 2rem;
  color: var(--muted);
  font-style: italic;
  font-size: 0.9rem;
}
</style>
