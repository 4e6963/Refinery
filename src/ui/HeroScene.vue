<script setup lang="ts">
// Decorative West Texas oil-field skyline: mesas, refinery with flare, derrick, pumpjack.
import PumpJack from './PumpJack.vue'
import Tumbleweed from './Tumbleweed.vue'
</script>

<template>
  <svg class="scene" viewBox="0 0 1200 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--sky-top)" />
        <stop offset="0.55" stop-color="var(--sky-mid)" />
        <stop offset="1" stop-color="var(--sky-low)" />
      </linearGradient>
      <radialGradient id="sunGlow">
        <stop offset="0" stop-color="var(--sun)" stop-opacity="0.9" />
        <stop offset="1" stop-color="var(--sun)" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="moonGlow">
        <stop offset="0.3" stop-color="#e9e3c8" stop-opacity="0.22" />
        <stop offset="1" stop-color="#e9e3c8" stop-opacity="0" />
      </radialGradient>
      <mask id="crescent">
        <circle r="17" fill="#fff" />
        <circle cx="8" cy="-5" r="15" fill="#000" />
      </mask>
      <radialGradient id="flareGlow">
        <stop offset="0" stop-color="#ffd27a" stop-opacity="0.8" />
        <stop offset="1" stop-color="#ff7a1a" stop-opacity="0" />
      </radialGradient>
    </defs>

    <rect width="1200" height="220" fill="url(#sky)" />
    <g class="stars" fill="#fff">
      <circle cx="80" cy="30" r="1.2" /><circle cx="210" cy="60" r="1" /><circle cx="330" cy="22" r="1.4" />
      <circle cx="480" cy="48" r="1" /><circle cx="610" cy="18" r="1.2" /><circle cx="760" cy="40" r="1" />
      <circle cx="880" cy="25" r="1.3" /><circle cx="1010" cy="55" r="1" /><circle cx="1130" cy="30" r="1.2" />
    </g>
    <g class="sun">
      <circle cx="860" cy="150" r="120" fill="url(#sunGlow)" />
      <circle cx="860" cy="150" r="46" fill="var(--sun)" />
    </g>
    <!-- crescent moon for the night scene -->
    <g class="moon" transform="translate(880 58)">
      <circle r="48" fill="url(#moonGlow)" />
      <g mask="url(#crescent)">
        <circle r="17" fill="#efe6c8" />
        <circle cx="-7" cy="5" r="2.6" fill="#d8ccaa" />
        <circle cx="-10" cy="-4" r="1.6" fill="#d8ccaa" />
        <circle cx="-3" cy="11" r="1.4" fill="#d8ccaa" />
      </g>
    </g>

    <!-- mesas -->
    <path d="M0 170 L90 170 L110 140 L230 140 L250 168 L420 168 L445 128 L560 128 L585 170 L1200 170 L1200 220 L0 220Z" fill="var(--mesa-far)" />
    <path d="M0 190 L300 186 L330 160 L410 160 L436 188 L760 190 L790 166 L900 166 L925 192 L1200 190 L1200 220 L0 220Z" fill="var(--mesa-near)" />

    <g fill="var(--silhouette)">
      <!-- refinery -->
      <g transform="translate(930 0)">
        <rect x="0" y="120" width="16" height="80" />
        <rect x="26" y="96" width="12" height="104" />
        <rect x="24" y="110" width="16" height="4" /><rect x="24" y="140" width="16" height="4" />
        <rect x="48" y="132" width="20" height="68" />
        <rect x="46" y="150" width="24" height="3" /><rect x="46" y="170" width="24" height="3" />
        <path d="M80 200 L80 160 Q102 140 124 160 L124 200Z" />
        <rect x="132" y="70" width="6" height="130" />
        <path d="M128 200 L135 66 L142 200Z" opacity="0.4" />
        <rect x="150" y="165" width="56" height="35" rx="4" />
        <rect x="212" y="175" width="40" height="25" rx="4" />
        <path d="M0 150 H150" stroke="var(--silhouette)" stroke-width="2" />
      </g>
      <g class="flare" transform="translate(1065 68)">
        <circle cy="-6" r="26" fill="url(#flareGlow)" />
        <path class="flame" d="M0 0 C-6 -8 -3 -16 0 -24 C3 -16 6 -8 0 0Z" fill="#ffb347" />
        <path class="flame inner" d="M0 0 C-3 -5 -2 -10 0 -15 C2 -10 3 -5 0 0Z" fill="#fff1b8" />
      </g>
      <g class="smoke" fill="#fff" opacity="0.35">
        <circle cx="962" cy="88" r="6" /><circle cx="968" cy="74" r="9" /><circle cx="978" cy="58" r="12" />
      </g>

      <!-- derrick -->
      <g transform="translate(470 60)" stroke="var(--silhouette)" stroke-width="3" fill="none">
        <path d="M0 140 L24 0 L48 140" />
        <path d="M6 105 L42 105 M10 75 L38 75 M15 45 L33 45 M19 20 L29 20" />
        <path d="M6 105 L38 75 M42 105 L10 75 M10 75 L33 45 M38 75 L15 45 M15 45 L29 20 M33 45 L19 20" stroke-width="1.6" />
      </g>

      <!-- pumpjack -->
      <g transform="translate(610 90)"><PumpJack /></g>

      <!-- ranch fence with a Stetson hung on the end post -->
      <g transform="translate(232 0)">
        <rect x="0" y="168" width="5" height="32" rx="1" />
        <rect x="44" y="164" width="5" height="36" rx="1" />
        <rect x="88" y="170" width="5" height="30" rx="1" />
        <path d="M0 176 L93 174 M0 189 L93 187" stroke="var(--silhouette)" stroke-width="2.2" />
        <path
          transform="translate(-17 150) rotate(-14 20 18)"
          d="M0 15 C3 18 9 20 22 20 C35 20 41 18 44 15 C41 16 37 16.5 34 16 L33 9 C32.5 5 31 3 28 3 C26 3 24 4.5 22 5.5 C20 4.5 18 3 16 3 C13 3 11.5 5 11 9 L10 16 C7 16.5 3 16 0 15Z"
        />
        <path
          transform="translate(-17 150) rotate(-14 20 18)"
          d="M10.6 12.2 H33.4 L33.6 14 H10.4Z"
          fill="var(--sunset)"
          opacity="0.85"
        />
      </g>

      <!-- cactus -->
      <path transform="translate(-690 0)" d="M1040 200 L1040 140 Q1040 130 1048 130 Q1056 130 1056 140 L1056 200Z M1040 168 L1028 168 Q1020 168 1020 160 L1020 150 Q1020 144 1025 144 Q1030 144 1030 150 L1030 158 L1040 158Z M1056 160 L1066 160 L1066 146 Q1066 140 1071 140 Q1076 140 1076 146 L1076 162 Q1076 170 1068 170 L1056 170Z" />
    </g>
    <rect y="200" width="1200" height="20" fill="var(--ground)" />
    <Tumbleweed />
  </svg>
</template>

<style scoped>
.scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.stars,
.moon {
  opacity: 0;
}
@media (prefers-color-scheme: dark) {
  .stars {
    opacity: 0.85;
    animation: twinkle 4s ease-in-out infinite alternate;
  }
  .sun {
    opacity: 0;
  }
  .moon {
    opacity: 1;
  }
}
.flame {
  transform-origin: 0 0;
  animation: flicker 0.9s ease-in-out infinite alternate;
}
.flame.inner {
  animation-duration: 0.6s;
}
.smoke {
  animation: drift 6s ease-in-out infinite;
}
@keyframes flicker {
  from {
    transform: scale(0.85, 0.9) rotate(-4deg);
  }
  to {
    transform: scale(1.1, 1.2) rotate(4deg);
  }
}
@keyframes drift {
  0%,
  100% {
    transform: translate(0, 0);
    opacity: 0.35;
  }
  50% {
    transform: translate(8px, -6px);
    opacity: 0.15;
  }
}
@keyframes twinkle {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 0.95;
  }
}
</style>
