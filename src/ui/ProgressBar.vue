<script setup lang="ts">
defineProps<{ value: number; label: string }>()
</script>

<template>
  <div class="progress" role="progressbar" :aria-valuenow="Math.round(value * 100)" aria-valuemin="0" aria-valuemax="100">
    <div class="bar" :style="{ width: `${Math.round(value * 100)}%` }" />
    <span class="label">{{ label }}</span>
  </div>
</template>

<style scoped>
.progress {
  position: relative;
  height: 1.6rem;
  border-radius: 8px;
  background: var(--surface-2);
  overflow: hidden;
}
.bar {
  height: 100%;
  background: var(--accent);
  transition: width 0.2s;
}
.label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  mix-blend-mode: difference;
  color: #fff;
}
</style>
