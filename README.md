# Refinery

Browser-App (PWA, offline-fähig, ohne Backend), die monatliche Abrechnungs-PDFs
(Revenue, Joint Interest Billing, Accounts Receivable) einliest, prüft und als
Jahres-Excel (`.xlsx`) ausgibt. Alle Daten bleiben im Browser.

## Entwicklung

```sh
npm install
npm run dev          # Entwicklungsserver
npm run typecheck    # inkl. core ohne DOM-Typen (tsconfig.core.json)
npm test             # Vitest (Unit + Integration)
npm run test:e2e     # Playwright gegen den Produktions-Build (inkl. Offline-Test)
npm run build        # Produktions-Build nach dist/
```

## Architektur

| Pfad | Inhalt |
| --- | --- |
| `src/core/pdf` | Textextraktion mit Positionen, Zeilen-/Festbreiten-Rekonstruktion über x/y |
| `src/core/formats` | Format-Plug-ins; `registry.ts` listet alle Formate |
| `src/core/formats/legacy` | Parser für das Legacy-Layout (Revenue, JIB, AR) |
| `src/core/calc` | Reine Funktionen: Beträge, Monatszuordnung, Aggregation, Prüfungen |
| `src/core/excel` | Export mit ExcelJS (nur Werte, keine Formeln) |
| `src/worker` | Web Worker, stellt `parse`, `buildReport`, `exportXlsx` via Comlink bereit |
| `src/ui` | Vue-Komponenten |

`src/core` hat keine Browser-/DOM-Abhängigkeiten und läuft auch unter Node.
Beträge werden intern als ganzzahlige Hundertstel geführt.

### Rechenregeln (Monatsblatt)

- Gas/Oil: Summe der Net-Zeilen je Bohrung, inkl. Korrekturen aus Vorperioden
  („Revenue from Prior Statements“).
- Lease Equip. = JIB-Abschnitte Equipment + Income (+ unbekannte Abschnitte),
  L.O.E. = Lease Operating Expenses + Intangible Drilling Costs.
- Total Expen. = Lease Equip. + L.O.E. + Int. Drilling Cost, R.O.I. = Erlöse − Steuern − Kosten.

### Prüfungen

Gelesene Werte werden gegen die gedruckten Summen (Revenue-Totals, JIB-Abschnitts-
und Rechnungssummen) und die AR-Rechnungen gegen die JIB abgeglichen. Abweichungen
erscheinen als Hinweise in der App.

### Legacy-Format entfernen

1. `src/core/formats/legacy/` löschen
2. Import und Eintrag in `src/core/formats/registry.ts` entfernen
3. `tests/unit/legacy-format.test.ts`, `tests/integration/legacy.test.ts` und `tests/fixtures/legacy/` löschen

Ein Architekturtest stellt sicher, dass Formate nur über die Registry eingebunden werden.

## Test-Fixtures

Echte Abrechnungen enthalten personenbezogene Daten und werden **nicht** eingecheckt
(`.gitignore`). Für die Integrations- und E2E-Tests lokal ablegen:

```
tests/fixtures/legacy/input/YYYY-MM {REV,JIB,AR}.pdf
tests/fixtures/legacy/expected.xlsx      # Referenz-Excel
npm run fixtures:expected                # erzeugt expected.json (nur Codes + Zahlen)
```

Fehlen die Dateien, werden diese Tests übersprungen. Hilfsskripte:
`npx tsx scripts/dump-pdf.ts <pdf>` (rekonstruierter Text),
`npx tsx scripts/report-debug.ts` (Abweichungen gegen die Referenz).
