# Silicon Carbide Sandbox (`SiC Sandbox`)

![Silicon Carbide Sandbox](/public/silicon_carbide_sandbox_image.png)

> **A first-principles physics and engineering workbench built alongside the [Silicon Carbide](https://thesiliconcarbide.substack.com) publication.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stack: Vite + React + TS](https://img.shields.io/badge/Stack-Vite_%7C_React_%7C_TS-blue)](https://vitejs.dev/)

---

## Overview

**SiC Sandbox** is an open-source library of deterministic, first-principles physics and engineering calculators.

Modern technology analysis often gets bogged down in corporate press releases, short-term quarterly guidance and volatile industry cycles. SiC Sandbox takes a different approach by modelling invariant physical and economic constraints.

Whether the subject is orbital compute thermal limits, radar range equations or semiconductor wafer yields, physics and thermodynamics do not go stale. This repository serves as the empirical spine for technical teardowns published on the [Silicon Carbide Substack](https://thesiliconcarbide.substack.com).

---

## Core Principles

1. **Deterministic rather than probabilistic.** Models compute hard physical bounds from fundamental laws and explicit assumptions, not from machine-learning forecasts or opinions.
2. **Show the working.** Every module renders its underlying LaTeX equations in the interface alongside the TypeScript implementation, so anyone can inspect, verify or challenge the maths.
3. **Zero runtime infrastructure.** A fully static application with no backend. All calculations run in the browser.
4. **Every module is a pure function.** The computation takes typed inputs and returns typed outputs, with no I/O, no globals and no hidden state. This is what allows the same code to serve a 60 fps interactive view, a batch parameter sweep and a composed pipeline.
5. **The visual layer is one consumer, not the implementation.** Each module has a programmatic layer that is the real model, and a visualisation built on top of it. There is never a second copy of the physics inside a React component.
6. **Modules are designed to connect.** Inputs and outputs declare units and physical dimensions so that one module's output can be wired to another's input and checked mechanically.

---

## Module Index

| Module ID | Title | Domains | Status |
| :--- | :--- | :--- | :--- |
| `orbital-thermal-limits` | **Orbital Compute Thermal Rejection Limits** | Thermodynamics, radiative heat transfer, orbital mechanics, photovoltaics | 🟢 Live |
| `solar-power-budget` | **Solar Array Electrical Power Budget** | Photovoltaics, orbital mechanics, power systems, space environment | 🟢 Live |

---

## Quickstart and Local Development

### Prerequisites

- Node.js (v22.12 or later)
- `npm`

### Installation

```bash
# Clone the repository
git clone https://github.com/patrickxcapaldo/silicon-carbide-sandbox.git

# Navigate to the project directory
cd silicon-carbide-sandbox

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:5173` in your browser to interact with the local sandbox.

---

## Project Architecture

```
src/
├── core/                    # Engine interfaces, registry and generic UI shell
│   ├── contract.ts          # Ecosystem module contract: dimensioned ports,
│   │                        #   input resolver, diagnostics, connection checks
│   ├── types.ts             # Host-facing module and parameter types
│   ├── registry.ts          # Dynamic module auto-loader (Vite glob)
│   ├── ModuleShell.tsx      # Generic parameter controls and output panel
│   └── EquationPanel.tsx    # KaTeX LaTeX formula renderer
└── modules/
    ├── orbital-thermal-limits/
    │   ├── sandbox/
    │   │   ├── kernel.ts            # The entire physics model. Pure, and with
    │   │   │                        #   no dependencies of any kind.
    │   │   ├── module.ts            # Descriptor plus the composable run() entry point
    │   │   └── headless.example.ts  # Runnable programmatic usage examples
    │   ├── manifest.ts      # Parameter declarations for the host shell
    │   ├── model.ts         # Presentation adapter over the kernel for the host
    │   ├── model.test.ts    # Physics and contract assertions
    │   ├── equations.ts     # Formal LaTeX formula definitions
    │   └── visualizer/      # React Three Fiber interactive view (optional)
    └── _template/           # Boilerplate for new module authoring
```

### The three layers

Each module separates computation from presentation:

**Kernel.** All of the physics, in one file that imports nothing. It runs unchanged in a browser, under Node, in a worker or inside another module. Values are full precision in canonical units. Any derived classification, such as a status band, belongs here rather than in the interface, so that headless callers receive it too.

**Module.** Declares the module's inputs, outputs and assumptions, and exposes `run()`. This is the composable public entry point. Inputs are resolved through the shared resolver in `core/contract.ts`, which applies declared defaults, clamps out-of-range values and reports every intervention as a diagnostic, including for input keys the module does not declare.

**Adapters.** Thin layers that format kernel results for a particular consumer. `model.ts` shapes results for the host shell and is the only place in a module permitted to round a physical quantity. A visualisation calls `run()` directly and works at full precision.

Rounding is confined to adapters because rounding errors compound when modules are chained, and because a rounded intermediate produces plausible but subtly wrong results that are hard to notice.

### Using a module programmatically

```ts
import { orbitalThermalLimits } from './modules/orbital-thermal-limits/sandbox/module';

const result = orbitalThermalLimits.run({
  computeWattsRequested: 700,
  radiatorArea: 4,
  solarPanelAreaM2: 8,
});

result.values.maxComputeHeatW;  // full precision, canonical units
result.status;                  // same classification the interface shows
result.diagnostics;             // clamping, unknown keys, physical warnings
result.resolvedInputs;          // exactly what was used, for reproducibility
```

## Versioning and Reproducibility

The Sandbox version in the root `package.json` identifies the whole application release. Each module has its own `releaseVersion`, which identifies its calculation, assumptions, defaults, public inputs and outputs. The module descriptor also has a separate `contractVersion` for input/output compatibility; do not cite that as the module release. The current version assignments (`0.1.0`) are a baseline, not an immutable release until a matching Git tag is published.

Use this module SemVer policy:

- **PATCH:** documentation or presentation changes that do not alter calculated results.
- **MINOR:** additive or backward-compatible model changes and scientific corrections, including corrections that change results for some inputs.
- **MAJOR:** breaking changes to public inputs, outputs, or their meanings.

Any released version is immutable. A correction creates a new version and release; never move or replace a tag that an article has cited. Sandbox releases use annotated Git tags named `v<package version>` and a GitHub Release based on that tag. Releases must be cut from a clean commit. Build metadata includes the source commit and whether the working tree was dirty.

The orbital module's **Export run JSON** control downloads the exact model inputs, resolved inputs, full-precision outputs, status, diagnostics, declared assumptions, module and Sandbox versions, source commit, and a schema version. UI-only orbit animation state is excluded because it does not affect the calculation. Special non-finite outputs are represented by the strings `"Infinity"`, `"-Infinity"`, or `"NaN"` so JSON does not silently turn them into `null`. The `assumptionRegistryRevisions` array is empty by default because registry entries are not yet linked to module assumptions automatically; add relevant `{ "id", "revision" }` entries when a published analysis relies on registry values.

For an article, commit its exported record under `data/runs/` and cite the GitHub permalinks for the Sandbox release/tag and run-record file. A record exported from a dirty working tree is marked `sourceDirty: true`; do not present that as a replayable release. The live site is not version-hosted: GitHub preserves the code and data, and readers can check out the tag locally to replay the calculation.

```bash
git checkout --detach <recorded-source-commit>
npm ci
npm run replay -- /path/to/downloaded-article-run-record.json
```

Download the JSON from its GitHub permalink before checking out the recorded source commit; the run record may have been committed after that source commit. The replay command rejects dirty records and mismatched Sandbox versions, commits, module releases, or contracts, then verifies resolved inputs, outputs, status, and diagnostics. The module-specific citation and replay steps are in [`src/modules/orbital-thermal-limits/README.md`](src/modules/orbital-thermal-limits/README.md).

Historical ledger entries that say `orbital-thermal-limits@1.0.0` predate immutable module releases and refer to the descriptor's former contract version. Their original claims are preserved; see [erratum E-0002](data/ledger/errata.yaml). Do not treat those labels as proof that a tagged historical build exists.

Because inputs and outputs carry dimensions, connections between modules can be checked:

```ts
import { canConnect } from './core/contract';

canConnect(upstream.descriptor.outputs.find(o => o.key === 'acceleratorPowerW')!,
           orbitalThermalLimits.descriptor.inputs.find(i => i.key === 'computeWattsRequested')!);
// { ok: true }
```

Dimensional agreement is necessary but not sufficient. Torque and energy share a dimension, as do absolute temperature and a temperature difference, so the check removes a category of mechanical error rather than removing the need to think about whether a connection is meaningful.

### Declared assumptions

Every module states, as structured data rather than prose, what it deliberately does not model. When modules are chained, the honest caveat list for the result is the union of its constituents' assumptions, and that union should be assemblable automatically rather than lost.

---

## Contributing New Modules

Contributions of new deterministic physics modules are welcome.

1. Copy `src/modules/_template` to `src/modules/your-module-id`.
2. Write the physics in `sandbox/kernel.ts`. It must import nothing, hold no state, and return full-precision values in canonical units.
3. Declare the module in `sandbox/module.ts`: give every input and output a stable key, a unit, a physical dimension and a description, give inputs a default and a supported range, and list the assumptions the model makes.
4. Write `model.ts` as a formatting adapter only. No physics belongs here.
5. Add assertions in `model.test.ts` covering both the physics, against textbook or reference values, and the contract: that declared outputs are produced, that defaults sit inside their own declared ranges, and that out-of-range inputs are clamped and reported.
6. Add `equations.ts` with the LaTeX for the equations you implemented.
7. A visualisation is optional. If you add one, it must call `run()` rather than reimplementing any part of the model.

### Conventions

- TypeScript in strict mode. The core of a module has no runtime dependencies.
- British English in all user-facing text, documentation and comments.
- Prefer stating a limitation plainly over omitting it. A module that is honest about being first-order is more useful than one that implies precision it does not have.

---

## Repository status notes

The module contract is located at `src/core/contract.ts`, and core orbital mechanics algorithms are located at `src/core/orbitalMechanics.ts`. All modules import from these shared cores, maintaining consistent typing, dimension checks, and Kepler propagation across the sandbox ecosystem.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
