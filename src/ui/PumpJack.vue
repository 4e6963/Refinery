<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/*
 * Beam pumping unit with real linkage: the crank turns at constant speed, the
 * pitman arm (fixed length) pulls the tail of the walking beam, and the
 * horsehead's arc lets the bridle cable hang straight down while the polished
 * rod moves up and down. Coordinates are local; the ground is at y = 110.
 */
const PIVOT = { x: 70, y: 28 } // saddle bearing on the samson post
const HEAD_RADIUS = 70 // horsehead arc, centered on the pivot
const TAIL = 60 // pivot → equalizer
const CRANK = { x: 130, y: 84 } // gearbox output shaft
const CRANK_RADIUS = 14
const PITMAN = 54
const CARRIER_AT_REST = 70
const WELLHEAD_TOP = 92
const PERIOD_MS = 4200
const HEAD_TOP_ANGLE = 0.384 // horsehead face starts 22° above the beam
const CABLE_OFFSET = 0.9 // cable runs just outside the horsehead face

const deg = (rad: number) => (rad * 180) / Math.PI
const cableX = PIVOT.x - HEAD_RADIUS - CABLE_OFFSET

/** Beam angle (clockwise, radians) at which the pitman arm reaches the crank pin. */
function beamAngle(pin: { x: number; y: number }): number {
  let lo = -0.7
  let hi = 0.7
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const ex = PIVOT.x + TAIL * Math.cos(mid)
    const ey = PIVOT.y + TAIL * Math.sin(mid)
    // The tail moves towards the crank as the angle grows, so the distance shrinks.
    if (Math.hypot(ex - pin.x, ey - pin.y) > PITMAN) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

const crank = ref(0)
const beam = ref(0)
const pin = ref({ x: CRANK.x, y: CRANK.y })
const tail = ref({ x: PIVOT.x + TAIL, y: PIVOT.y })
const carrier = ref(CARRIER_AT_REST)
const bridle = ref('')

function pose(phase: number) {
  const p = { x: CRANK.x + CRANK_RADIUS * Math.cos(phase), y: CRANK.y + CRANK_RADIUS * Math.sin(phase) }
  const theta = beamAngle(p)
  crank.value = deg(phase)
  beam.value = deg(theta)
  pin.value = p
  tail.value = { x: PIVOT.x + TAIL * Math.cos(theta), y: PIVOT.y + TAIL * Math.sin(theta) }
  // Cable wrapped on the horsehead arc: the rod travels arc length R·θ.
  carrier.value = CARRIER_AT_REST - HEAD_RADIUS * theta
  bridle.value = bridlePath(theta)
}

/**
 * The bridle is fastened at the top of the horsehead, follows its curved face
 * down to the point facing the well, and hangs straight from there.
 */
function bridlePath(theta: number): string {
  const r = HEAD_RADIUS + CABLE_OFFSET
  const top = HEAD_TOP_ANGLE + theta // the beam's clockwise turn lifts the left side
  return [
    `M${PIVOT.x - r * Math.cos(top)} ${PIVOT.y - r * Math.sin(top)}`,
    `A${r} ${r} 0 0 0 ${PIVOT.x - r} ${PIVOT.y}`,
    `V${CARRIER_AT_REST - HEAD_RADIUS * theta}`,
  ].join(' ')
}

let frame = 0
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    pose(-Math.PI / 3)
    return
  }
  const start = performance.now()
  const tick = (now: number) => {
    pose(((now - start) / PERIOD_MS) * 2 * Math.PI)
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
})
onBeforeUnmount(() => cancelAnimationFrame(frame))
pose(-Math.PI / 3)

// Horsehead outline: arc on the pivot circle from 22° above to 24° below the beam.
const arcTop = {
  x: PIVOT.x - HEAD_RADIUS * Math.cos(HEAD_TOP_ANGLE),
  y: PIVOT.y - HEAD_RADIUS * Math.sin(HEAD_TOP_ANGLE),
}
const arcBottom = { x: PIVOT.x - HEAD_RADIUS * Math.cos(0.42), y: PIVOT.y + HEAD_RADIUS * Math.sin(0.42) }
const horsehead = [
  `M${arcTop.x} ${arcTop.y}`,
  `A${HEAD_RADIUS} ${HEAD_RADIUS} 0 0 0 ${arcBottom.x} ${arcBottom.y}`,
  `L${PIVOT.x - 52} ${PIVOT.y + 18}`,
  `L${PIVOT.x - 52} ${PIVOT.y - 6}`,
  'Z',
].join(' ')
</script>

<template>
  <g class="pumpjack">
    <!-- skid, motor and belt guard -->
    <rect x="-38" y="107" width="196" height="4" rx="1" />
    <path :d="`M${CRANK.x} ${CRANK.y - 6} L${CRANK.x + 30} 96 L${CRANK.x + 30} 106 L${CRANK.x} 106Z`" opacity="0.75" />
    <rect :x="CRANK.x + 18" y="94" width="18" height="13" rx="3" />
    <rect :x="CRANK.x + 34" y="97" width="4" height="7" />

    <!-- samson post -->
    <g class="lines" stroke-width="4">
      <path :d="`M46 108 L${PIVOT.x} ${PIVOT.y} L94 108`" />
      <path :d="`M${PIVOT.x} ${PIVOT.y + 4} L${PIVOT.x + 6} 108`" stroke-width="3" />
    </g>
    <g class="lines" stroke-width="1.5">
      <path d="M53 88 L87 88 M58 68 L82 68 M63 48 L77 48 M53 88 L82 68 M87 88 L58 68 M58 68 L77 48 M82 68 L63 48" />
    </g>
    <path class="lines" :d="`M${PIVOT.x - 3} 40 L${PIVOT.x - 3} 108`" stroke-width="1.5" />

    <!-- gearbox with turning crank and counterweight -->
    <rect :x="CRANK.x - 13" y="94" width="26" height="14" rx="2" />
    <rect :x="CRANK.x - 11" :y="CRANK.y - 9" width="22" height="20" rx="6" />
    <g :transform="`rotate(${crank} ${CRANK.x} ${CRANK.y})`">
      <path
        :d="`M${CRANK.x} ${CRANK.y - 4} L${CRANK.x + CRANK_RADIUS} ${CRANK.y - 3} L${CRANK.x + CRANK_RADIUS} ${CRANK.y + 3} L${CRANK.x} ${CRANK.y + 4}Z`"
      />
      <path
        :d="`M${CRANK.x - 3} ${CRANK.y - 6} L${CRANK.x - 17} ${CRANK.y - 11} A12 12 0 0 0 ${CRANK.x - 17} ${CRANK.y + 11} L${CRANK.x - 3} ${CRANK.y + 6}Z`"
      />
    </g>
    <circle :cx="CRANK.x" :cy="CRANK.y" r="2.4" class="hole" />

    <!-- pitman arm from crank pin to equalizer -->
    <path class="lines" :d="`M${pin.x} ${pin.y} L${tail.x} ${tail.y}`" stroke-width="3" />
    <circle :cx="pin.x" :cy="pin.y" r="2.6" />

    <!-- walking beam with horsehead and equalizer -->
    <g :transform="`rotate(${beam} ${PIVOT.x} ${PIVOT.y})`">
      <rect :x="PIVOT.x - 56" :y="PIVOT.y - 4.5" :width="56 + TAIL + 6" height="9" rx="1.5" />
      <path class="lines rib" :d="`M${PIVOT.x - 50} ${PIVOT.y} H${PIVOT.x + TAIL}`" stroke-width="1" />
      <path :d="horsehead" />
      <rect :x="PIVOT.x + TAIL - 4" :y="PIVOT.y - 3" width="8" height="12" rx="2" />
    </g>
    <circle :cx="PIVOT.x" :cy="PIVOT.y" r="4.5" />
    <circle :cx="PIVOT.x" :cy="PIVOT.y" r="1.8" class="hole" />

    <!-- bridle: over the horsehead face, then straight down to the carrier bar -->
    <path class="lines" :d="bridle" stroke-width="1.6" />
    <rect :x="cableX - 5" :y="carrier" width="10" height="2.5" rx="1" />
    <path class="lines" :d="`M${cableX} ${carrier + 2} V${WELLHEAD_TOP}`" stroke-width="1.6" />

    <!-- wellhead: stuffing box, tee and flowline -->
    <rect :x="cableX - 2.5" :y="WELLHEAD_TOP" width="5" height="6" rx="1" />
    <rect :x="cableX - 6" :y="WELLHEAD_TOP + 6" width="12" height="5" rx="1" />
    <rect :x="cableX - 2" :y="WELLHEAD_TOP + 11" width="4" height="8" />
    <rect :x="cableX - 34" :y="WELLHEAD_TOP + 7" width="28" height="3" />
  </g>
</template>

<style scoped>
.pumpjack {
  fill: var(--silhouette);
}
.lines {
  fill: none;
  stroke: var(--silhouette);
  stroke-linecap: round;
}
.rib {
  stroke: var(--sky-mid);
  opacity: 0.5;
}
.hole {
  fill: var(--sky-low);
}
</style>
