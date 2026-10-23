<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Report, RowValues, SheetReport, WellRow } from '../core/model'
import { formatAmount, formatMonth } from './format'
import { ICONS } from './icons'

const props = defineProps<{ report: Report }>()

const tab = ref('total')
watch(
  () => props.report.months.map((m) => m.month).join(),
  () => {
    if (tab.value !== 'total' && !props.report.months.some((m) => m.month === tab.value)) tab.value = 'total'
  },
)

const sheet = computed<SheetReport>(
  () => props.report.months.find((m) => m.month === tab.value) ?? props.report.total,
)
const onlyWithData = ref(true)
const rows = computed(() =>
  sheet.value.rows.filter((r) => !onlyWithData.value || r.hasRevenue || r.hasExpenses),
)

const COLUMNS: { key: keyof RowValues; label: string; group: 'revenue' | 'expenses' | 'derived' }[] = [
  { key: 'gasVolume', label: 'Mcf Gas', group: 'revenue' },
  { key: 'gasIncome', label: 'Gas Income', group: 'revenue' },
  { key: 'gasTax', label: 'Gas Tax', group: 'revenue' },
  { key: 'oilVolume', label: 'BO Sold', group: 'revenue' },
  { key: 'oilIncome', label: 'Oil Income', group: 'revenue' },
  { key: 'oilTax', label: 'Oil Tax', group: 'revenue' },
  { key: 'leaseEquipment', label: 'Lease Equip.', group: 'expenses' },
  { key: 'operatingExpenses', label: 'L.O.E.', group: 'expenses' },
  { key: 'totalExpenses', label: 'Total Expen.', group: 'derived' },
  { key: 'roi', label: 'R.O.I.', group: 'derived' },
]

function cell(row: WellRow, c: (typeof COLUMNS)[number]): string {
  if (c.group === 'revenue' && !row.hasRevenue) return ''
  if (c.group === 'expenses' && !row.hasExpenses) return ''
  return formatAmount(row[c.key])
}
</script>

<template>
  <section class="preview" data-testid="preview">
    <div class="toolbar">
      <div class="tabs" role="tablist">
        <button
          v-for="m in report.months"
          :key="m.month"
          role="tab"
          type="button"
          :aria-selected="tab === m.month"
          @click="tab = m.month"
        >
          {{ formatMonth(m.month) }}
        </button>
        <button role="tab" type="button" class="total-tab" :aria-selected="tab === 'total'" @click="tab = 'total'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.star" /></svg>
          Total {{ report.year ?? '' }}
        </button>
      </div>
      <label class="filter"><input v-model="onlyWithData" type="checkbox" /> only wells with data</label>
    </div>

    <div class="scroll">
      <table data-testid="preview-table">
        <thead>
          <tr>
            <th>Well Code</th>
            <th>Lease Name</th>
            <th v-for="c in COLUMNS" :key="c.key" class="num">{{ c.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.wellCode">
            <td>{{ row.wellCode }}</td>
            <td class="name">{{ row.wellName }}</td>
            <td v-for="c in COLUMNS" :key="c.key" class="num" :class="{ neg: row[c.key] < 0 && cell(row, c) }">
              {{ cell(row, c) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td />
            <td>Total ({{ rows.length }} wells)</td>
            <td v-for="c in COLUMNS" :key="c.key" class="num" :class="{ neg: sheet.totals[c.key] < 0 }">
              {{ formatAmount(sheet.totals[c.key]) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
/* leather luggage tags */
.tabs button {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  border-radius: 4px 12px 12px 4px;
  padding: 0.25rem 0.75rem 0.25rem 1.1rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  color: var(--text);
  transition: background 0.15s;
}
.tabs button::before {
  content: '';
  position: absolute;
  left: 0.4rem;
  top: 50%;
  width: 0.32rem;
  height: 0.32rem;
  margin-top: -0.16rem;
  border-radius: 50%;
  background: var(--bg);
  box-shadow: inset 0 0 0 1px var(--border-strong);
}
.tabs button:hover {
  background: var(--accent-soft);
}
.tabs button[aria-selected='true'] {
  background: linear-gradient(180deg, var(--saddle), var(--leather));
  border-color: var(--accent-strong);
  color: #fffaf0;
}
.total-tab {
  font-weight: 700;
}
.total-tab svg {
  width: 0.95rem;
  height: 0.95rem;
  fill: var(--ember);
}
.filter {
  font-size: 0.85rem;
  color: var(--muted);
}
.scroll {
  overflow: auto;
  max-height: 60vh;
  border: 2px solid var(--border-strong);
  border-radius: 10px;
}
/* The slab serif is too wide for twelve number columns; use the compact UI font. */
table {
  border-collapse: collapse;
  width: 100%;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}
th,
td {
  padding: 0.3rem 0.45rem;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
thead th {
  white-space: normal;
  vertical-align: bottom;
}
@media (max-width: 1150px) {
  table {
    font-size: 0.76rem;
  }
  th,
  td {
    padding: 0.28rem 0.3rem;
  }
  .name {
    max-width: 9rem;
  }
}
thead th {
  position: sticky;
  top: 0;
  background: var(--crude);
  color: var(--ember);
  text-align: left;
  font-weight: 600;
  letter-spacing: 0.02em;
}
tbody tr:nth-child(even) {
  background: rgb(181 101 43 / 5%);
}
tbody tr:hover {
  background: var(--accent-soft);
}
tfoot td {
  position: sticky;
  bottom: 0;
  background: var(--surface-2);
  border-top: 2px solid var(--leather);
  font-weight: 700;
}
.num {
  text-align: right;
}
.neg {
  color: var(--danger);
}
.name {
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
