<script setup lang="ts">
import { ref } from 'vue'
import { isPdf, isZip } from '../core/fileTypes'

const emit = defineEmits<{ files: [files: File[]] }>()
const dragging = ref(false)
const input = ref<HTMLInputElement>()

function accept(list: FileList | null | undefined) {
  const files = [...(list ?? [])].filter((f) => isPdf(f.name) || isZip(f.name))
  if (files.length) emit('files', files)
}

function onDrop(event: DragEvent) {
  dragging.value = false
  accept(event.dataTransfer?.files)
}

function onChange() {
  accept(input.value?.files)
  if (input.value) input.value.value = ''
}
</script>

<template>
  <label
    class="dropzone"
    :class="{ dragging }"
    data-testid="dropzone"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input ref="input" type="file" accept="application/pdf,.pdf,application/zip,.zip" multiple hidden @change="onChange" />

    <svg class="barrel" viewBox="0 0 80 100" aria-hidden="true">
      <defs>
        <clipPath id="barrel-inside">
          <path d="M14 8 H66 Q74 50 66 92 H14 Q6 50 14 8Z" />
        </clipPath>
      </defs>
      <g clip-path="url(#barrel-inside)">
        <rect class="empty" x="0" y="0" width="80" height="100" />
        <path class="wave" d="M-80 0 Q-70 -5 -60 0 T-40 0 T-20 0 T0 0 T20 0 T40 0 T60 0 T80 0 T100 0 V120 H-80Z" />
      </g>
      <path class="shell" d="M14 8 H66 Q74 50 66 92 H14 Q6 50 14 8Z" />
      <path class="hoop" d="M10 30 H70 M8 50 H72 M10 70 H70" />
      <ellipse class="lid" cx="40" cy="8" rx="26" ry="4" />
      <circle class="bung" cx="52" cy="8" r="2" />
    </svg>

    <span class="title">Drop PDFs or ZIP archives here or click to select</span>
    <span class="hint">
      <span>Revenue, JIB and AR statements, any number of months.</span>
      <span>Files never leave your device.</span>
    </span>
  </label>
</template>

<style scoped>
.dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1.6rem 1rem 1.4rem;
  border: 3px dashed var(--border-strong);
  border-radius: 16px;
  background:
    repeating-linear-gradient(-45deg, transparent 0 14px, rgb(181 101 43 / 5%) 14px 28px),
    var(--surface);
  cursor: pointer;
  text-align: center;
  transition:
    border-color 0.2s,
    transform 0.2s,
    box-shadow 0.2s;
  box-shadow: 0 10px 24px -14px rgb(60 30 10 / 45%);
}
.dropzone:hover,
.dropzone.dragging {
  border-color: var(--sunset);
  transform: translateY(-2px);
  box-shadow: 0 16px 30px -16px rgb(232 119 46 / 70%);
}
.barrel {
  width: 70px;
  height: 88px;
  margin-bottom: 0.25rem;
}
.shell {
  fill: none;
  stroke: var(--leather);
  stroke-width: 4;
}
.hoop {
  stroke: var(--leather);
  stroke-width: 3;
  opacity: 0.8;
}
.lid {
  fill: var(--saddle);
  stroke: var(--leather);
  stroke-width: 2;
}
.bung {
  fill: var(--crude);
}
.empty {
  fill: var(--surface-2);
}
/* The barrel fills with crude on hover and while files are dragged over it. */
.wave {
  fill: var(--oil);
  transform: translate(0, 96px);
  transition: transform 0.9s cubic-bezier(0.3, 0.7, 0.3, 1);
}
.dropzone:hover .wave {
  transform: translate(0, 78px);
}
.dropzone.dragging .wave {
  transform: translate(0, 18px);
  animation: slosh 1.4s linear infinite;
}
@keyframes slosh {
  from {
    transform: translate(0, 18px);
  }
  to {
    transform: translate(40px, 18px);
  }
}
.title {
  text-wrap: balance;
  font-family: var(--display);
  font-size: 1.3rem;
  color: var(--accent-strong);
}
.hint {
  color: var(--muted);
  font-size: 0.92rem;
}
/* one sentence per line; if a sentence must wrap, balance it instead of orphaning a word */
.hint > span {
  display: block;
  text-wrap: balance;
}
</style>
