# Refinery

Browser app (PWA, works offline, no backend) that reads monthly statement PDFs
(Revenue, Joint Interest Billing, Accounts Receivable), validates them and
exports a year-end Excel workbook (`.xlsx`). PDFs can be dropped individually or
as ZIP archives (folders and nested archives are supported). All data stays in the browser.

## Development

```sh
npm install
npm run dev          # development server
npm run typecheck    # includes core without DOM types (tsconfig.core.json)
npm test             # Vitest (unit + integration)
npm run test:e2e     # Playwright against the production build (incl. offline test)
npm run build        # production build into dist/
```

Pushes to `main` are deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## Architecture

| Path | Contents |
| --- | --- |
| `src/core/pdf` | Text extraction with positions, line/fixed-width reconstruction from x/y |
| `src/core/formats` | Format plug-ins; `registry.ts` lists all formats |
| `src/core/formats/legacy` | Parsers for the legacy layout (Revenue, JIB, AR) |
| `src/core/calc` | Pure functions: amounts, month assignment, aggregation, validation |
| `src/core/excel` | Export with ExcelJS (values only, no formulas) |
| `src/worker` | Web Worker exposing `parse`, `buildReport`, `exportXlsx` via Comlink |
| `src/ui` | Vue components |

`src/core` has no browser/DOM dependencies and also runs under Node.
Amounts are stored internally as integer hundredths.

### Calculation rules (month sheet)

- Gas/Oil: sum of the net lines per well, including adjustments from prior
  periods ("Revenue from Prior Statements").
- Lease Equip. = JIB sections Equipment + Income (+ unknown sections),
  L.O.E. = Lease Operating Expenses + Intangible Drilling Costs.
- Total Expen. = Lease Equip. + L.O.E. + Int. Drilling Cost,
  R.O.I. = income − taxes − expenses.

### Validation

Parsed values are checked against the printed totals (revenue totals, JIB section
and invoice totals), and AR invoices are cross-checked against the JIB. Any
differences are shown as issues in the app.

### Removing the legacy format

1. Delete `src/core/formats/legacy/`
2. Remove its import and entry in `src/core/formats/registry.ts`
3. Delete `tests/unit/legacy-format.test.ts`, `tests/integration/legacy.test.ts` and `tests/fixtures/legacy/`

An architecture test ensures formats are only referenced through the registry.

## Test fixtures

Real statements contain personal data and are **not** committed (`.gitignore`).
For the integration and end-to-end tests, place them locally:

```
tests/fixtures/legacy/input/YYYY-MM {REV,JIB,AR}.pdf
tests/fixtures/legacy/expected.xlsx      # reference workbook
npm run fixtures:expected                # creates expected.json (codes and numbers only)
```

If these files are missing, those tests are skipped. Helper scripts:
`npx tsx scripts/dump-pdf.ts <pdf>` (reconstructed text),
`npx tsx scripts/report-debug.ts` (differences against the reference).
