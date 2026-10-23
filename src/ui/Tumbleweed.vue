<script setup lang="ts">
/*
 * A tangled ball of dry twigs that rolls across the scene, hopping now and then.
 * The twigs are generated once from a fixed seed, so the shape is the same on
 * every visit. Local coordinates: center at (0, 0), radius about 11.
 */
const RADIUS = 11

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

const random = seeded(7)
const point = (r: number) => {
  const a = random() * Math.PI * 2
  const d = r * (0.35 + 0.65 * Math.sqrt(random()))
  return [Math.cos(a) * d, Math.sin(a) * d * 0.92]
}
const fmt = (n: number) => n.toFixed(2)

interface Twig {
  d: string
  width: number
}

const twigs: Twig[] = []
// Curved strands wound around the center give the ball its round, woven look.
for (let i = 0; i < 36; i++) {
  const r = RADIUS * (0.25 + 0.75 * random())
  const a1 = random() * Math.PI * 2
  const a2 = a1 + (0.6 + random() * 1.8) * (random() < 0.5 ? -1 : 1)
  const squash = 0.85 + random() * 0.3
  const sweep = a2 > a1 ? 1 : 0
  const large = Math.abs(a2 - a1) > Math.PI ? 1 : 0
  twigs.push({
    d: `M${fmt(Math.cos(a1) * r)} ${fmt(Math.sin(a1) * r * squash)} A${fmt(r)} ${fmt(r * squash)} 0 ${large} ${sweep} ${fmt(Math.cos(a2) * r)} ${fmt(Math.sin(a2) * r * squash)}`,
    width: 0.45 + random() * 0.6,
  })
}
// A few strands straight through the middle.
for (let i = 0; i < 6; i++) {
  const [x1, y1] = point(RADIUS)
  const [x2, y2] = point(RADIUS)
  const [cx, cy] = point(RADIUS * 0.6)
  twigs.push({ d: `M${fmt(x1)} ${fmt(y1)} Q${fmt(cx)} ${fmt(cy)} ${fmt(x2)} ${fmt(y2)}`, width: 0.4 + random() * 0.4 })
}
// Short dry ends poking out of the outline.
for (let i = 0; i < 12; i++) {
  const a = random() * Math.PI * 2
  const r1 = RADIUS * 0.85
  const r2 = RADIUS * (1.05 + random() * 0.18)
  const bend = (random() - 0.5) * 0.4
  twigs.push({
    d: `M${fmt(Math.cos(a) * r1)} ${fmt(Math.sin(a) * r1)} L${fmt(Math.cos(a + bend) * r2)} ${fmt(Math.sin(a + bend) * r2)}`,
    width: 0.35 + random() * 0.3,
  })
}
</script>

<template>
  <g class="track">
    <ellipse class="shadow" cx="0" :cy="RADIUS + 1" rx="10" ry="1.8" />
    <g class="dust">
      <circle cx="-11" :cy="RADIUS" r="1.6" />
      <circle cx="-7" :cy="RADIUS - 1.5" r="2.2" />
      <circle cx="-2" :cy="RADIUS + 0.5" r="1.4" />
      <circle cx="6" :cy="RADIUS - 1" r="1.9" />
      <circle cx="11" :cy="RADIUS" r="1.3" />
    </g>
    <g class="hop">
      <g class="spin">
        <circle class="core" r="7" />
        <path v-for="(t, i) in twigs" :key="i" :d="t.d" :stroke-width="t.width" />
      </g>
    </g>
  </g>
</template>

<style scoped>
.track {
  animation: track 18s linear infinite;
}
.hop,
.spin,
.shadow,
.dust {
  transform-origin: 0 0;
}
.hop {
  animation: hop 3.6s infinite;
}
.spin {
  /* one turn per circumference travelled: 2π·11 ≈ 69 units at ~72 units/s */
  animation: spin 0.95s linear infinite;
}
.spin path {
  fill: none;
  stroke: var(--silhouette);
  stroke-linecap: round;
}
.core {
  fill: var(--silhouette);
  opacity: 0.12;
}
.shadow {
  fill: var(--silhouette);
  opacity: 0.35;
  animation: shadow 3.6s infinite;
}
.dust {
  fill: var(--dust);
  opacity: 0;
  animation: dust 3.6s infinite;
}

@keyframes track {
  from {
    transform: translate(1250px, 187px);
  }
  to {
    transform: translate(-50px, 187px);
  }
}
@keyframes spin {
  to {
    transform: rotate(-360deg);
  }
}
/* rolling, a big hop, a landing squash, a small hop, then rolling again */
@keyframes hop {
  0%,
  30% {
    transform: translateY(0) scale(1, 1);
    animation-timing-function: cubic-bezier(0.2, 0.6, 0.4, 1);
  }
  44% {
    transform: translateY(-22px) scale(1, 1);
    animation-timing-function: cubic-bezier(0.6, 0, 0.8, 0.4);
  }
  57% {
    transform: translateY(0) scale(1.08, 0.88);
    animation-timing-function: ease-out;
  }
  62% {
    transform: translateY(-1px) scale(1, 1);
    animation-timing-function: cubic-bezier(0.2, 0.6, 0.4, 1);
  }
  69% {
    transform: translateY(-8px) scale(1, 1);
    animation-timing-function: cubic-bezier(0.6, 0, 0.8, 0.4);
  }
  76% {
    transform: translateY(0) scale(1.04, 0.94);
    animation-timing-function: ease-out;
  }
  80%,
  100% {
    transform: translateY(0) scale(1, 1);
  }
}
@keyframes shadow {
  0%,
  30%,
  57%,
  76%,
  100% {
    transform: scale(1);
    opacity: 0.35;
  }
  44% {
    transform: scale(0.55);
    opacity: 0.15;
  }
  69% {
    transform: scale(0.8);
    opacity: 0.25;
  }
}
@keyframes dust {
  0%,
  55%,
  74%,
  100% {
    opacity: 0;
    transform: translateY(0) scale(0.6);
  }
  58%,
  77% {
    opacity: 0.4;
    transform: translateY(-1px) scale(1);
  }
  68%,
  88% {
    opacity: 0;
    transform: translateY(-3px) scale(1.9, 1.4);
  }
}
</style>
