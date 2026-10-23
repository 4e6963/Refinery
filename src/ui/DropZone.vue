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
    <span class="title">Drop PDFs or ZIP archives here or click to select</span>
    <span class="hint">Revenue, JIB and AR statements, any number of months. Files never leave your device.</span>
  </label>
</template>

<style scoped>
.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 2.2rem 1rem;
  border: 2px dashed var(--border-strong);
  border-radius: 12px;
  background: var(--surface);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
}
.dropzone:hover,
.dropzone.dragging {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.title {
  font-weight: 600;
  font-size: 1.05rem;
}
.hint {
  color: var(--muted);
  font-size: 0.9rem;
}
</style>
