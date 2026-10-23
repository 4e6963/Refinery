<script setup lang="ts">
defineProps<{ value: number; label: string }>()
</script>

<template>
  <div class="pipeline">
    <span class="flange left" aria-hidden="true" />
    <div
      class="pipe"
      role="progressbar"
      :aria-valuenow="Math.round(value * 100)"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="label"
    >
      <div class="crude" :style="{ width: `${Math.round(value * 100)}%` }" />
      <span class="label">{{ label }}</span>
    </div>
    <span class="flange right" aria-hidden="true" />
  </div>
</template>

<style scoped>
.pipeline {
  display: flex;
  align-items: center;
}
.flange {
  width: 10px;
  height: 2.2rem;
  background: linear-gradient(90deg, #6d6a66, #b8b4ad, #6d6a66);
  border-radius: 3px;
  flex: none;
}
.pipe {
  position: relative;
  flex: 1;
  height: 1.7rem;
  overflow: hidden;
  background: linear-gradient(180deg, #d9d4cb 0%, #f4f0ea 35%, #b9b3a8 100%);
  box-shadow: inset 0 -2px 4px rgb(0 0 0 / 25%);
}
.crude {
  height: 100%;
  background:
    repeating-linear-gradient(110deg, rgb(255 255 255 / 0%) 0 18px, rgb(255 255 255 / 12%) 18px 26px),
    linear-gradient(180deg, #3a2a20 0%, var(--oil) 60%, #000 100%);
  background-size:
    52px 100%,
    100% 100%;
  animation: flow 0.9s linear infinite;
  transition: width 0.3s;
}
@keyframes flow {
  to {
    background-position:
      52px 0,
      0 0;
  }
}
.label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  mix-blend-mode: difference;
}
</style>
