# PATCHES: edits to apply by hand to existing files

Nothing below overwrites a file in the zip. The registry auto-globs `src/modules/**/manifest.ts`, `model.ts` and `View.tsx` (`src/core/registry.ts`), so **no registry edit is needed**; verified by running the build and loading the module list.

## 1. `scripts/run-all-tests.ts`

Add one line to the `suites` array, after the solar entries:

```ts
  'src/modules/llm-bitflip-resilience/model.test.ts',
```

(Phase 2 will add `.../challenge/challenge.test.ts`; Phase 3 `.../play/play.test.ts`.)

## 2. `scripts/generate-meta.js`

Add a comma after the solar entry in the `modules` array and append:

```js
  { id: 'llm-bitflip-resilience', title: 'LLM Bit-Flip Resilience', summary: 'Interactive sketch of how long a language-model weight store survives accumulating bit flips: tolerance divided by exposure, with scale changing both.' }
```

`npm run build` runs this script and rewrites `index.html`; commit that change.

## 3. `README.md` module index

Add a row:

```
| `llm-bitflip-resilience` | **LLM Bit-Flip Resilience** | Radiation effects, reliability, machine learning, memory systems | 🟢 Live (Sketch; Explore only) |
```

## 4. `data/registry.yaml` and `data/ledger/`

Existing modules other than the thermal module have no registry or ledger entries, so none are required. Optional, if you want the two cited non-paper inputs pinned (append-only, revision 1):

```yaml
- id: hw.memory_power_rule_of_thumb
  kind: engineering-parameter
  value: { min: 0.0, nominal: 0.375, max: 5 }
  unit: "W GB^-1"
  source: "Crucial/Micron support article 'How Much Power Does Memory Use?': about 3 W per 8 GB for DDR3/DDR4. A vendor rule of thumb; placeholder for the memory in your design."
  archive_url: "https://content.crucial.com/content/crucial/es-la/home/support/articles-faq-memory/how-much-power-does-memory-use.html"
  retrieved: 2026-10-29
  confidence: low
  load_bearing_for: [llm-bitflip-resilience]
  revision: 1
```

## 5. `scripts/replay-run.ts` (optional, later)

It imports only the thermal module's `verifyRunRecord`. This module's records are verified by `verifyRunRecord` in `src/modules/llm-bitflip-resilience/runRecord.ts` (covered by `model.test.ts`). Dispatching on `record.software.moduleId` would let `npm run replay` handle both.
