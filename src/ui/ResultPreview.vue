<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Report, RowValues, SheetReport, WellRow } from '../core/model'
import { formatAmount, formatMonth } from './format'

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
        <button role="tab" type="button" :aria-selected="tab === 'total'" @click="tab = 'total'">
          Gesamt {{ report.year ?? '' }}
        </button>
      </div>
      <label class="filter"><input v-model="onlyWithData" type="checkbox" /> nur Bohrungen mit Daten</label>
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
            <td>Summe ({{ rows.length }} Bohrungen)</td>
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
.tabs button {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
}
.tabs button[aria-selected='true'] {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.filter {
  font-size: 0.85rem;
  color: var(--muted);
}
.scroll {
  overflow: auto;
  max-height: 60vh;
  border: 1px solid var(--border);
  border-radius: 8px;
}
table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}
th,
td {
  padding: 0.3rem 0.5rem;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
thead th {
  position: sticky;
  top: 0;
  background: var(--surface-2);
  text-align: left;
}
tfoot td {
  position: sticky;
  bottom: 0;
  background: var(--surface-2);
  font-weight: 600;
}
.num {
  text-align: right;
}
.neg {
  color: var(--danger);
}
.name {
  max-width: 16rem;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
