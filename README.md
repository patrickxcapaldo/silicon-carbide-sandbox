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

---

## Quickstart and Local Development

### Prerequisites

- Node.js (v18 or later)
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

The module contract is described above as living at `src/core/contract.ts`, which is where it belongs, since every module needs the same one. In the current tree it was authored inside `modules/orbital-thermal-limits/sandbox/contract.ts`, as that module was the first to need it. Moving it to `src/core/` and updating the import in `sandbox/module.ts` is a pending task, and should happen before a second module is written so that the two do not end up with divergent copies.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
