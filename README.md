# Silicon Carbide Sandbox (`SiC Sandbox`)

![Silicon Carbide Sandbox](/public/silicon_carbide_sandbox_image.png)

> **A first-principles physics & engineering workbench built alongside the [Silicon Carbide](https://thesiliconcarbide.substack.com) publication.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stack: Vite + React + TS](https://img.shields.io/badge/Stack-Vite_%7C_React_%7C_TS-blue)](https://vitejs.dev/)

---

## Overview

**SiC Sandbox** is an open-source library of deterministic, first-principles physics and engineering calculators. 

Modern technology analysis often gets bogged down in corporate press releases, short-term quarterly guidance, and volatile industry cycles. SiC Sandbox takes a different approach: **modeling invariant physical and economic constraints**.

Whether analyzing orbital compute thermal limits, radar range equations, or semiconductor wafer yields, physics and thermodynamics do not go stale. This repository serves as the empirical spine for technical teardowns published on the [Silicon Carbide Substack](https://thesiliconcarbide.substack.com).

---

## Core Principles

1. **Deterministic over Probabilistic:** Models compute hard physical bounds and limits from fundamental physical laws and explicit assumptions—not machine-learning forecasts or opinions.
2. **Transparent Work (Show the Math):** Every module renders its underlying LaTeX equations directly in the UI alongside TypeScript code implementations. Anyone can inspect, verify, or challenge the math.
3. **Zero Runtime Infra:** Fully static, zero-backend, zero-maintenance web application. All calculations run entirely inside your browser.

---

## Module Index

| Module ID | Title | Domain | Status |
| :--- | :--- | :--- | :--- |
| `orbital-thermal-limits` | **Orbital Compute Thermal Rejection Limits** | Space / Thermal Physics | 🟢 Live |

---

## Quickstart & Local Development

### Prerequisites
- Node.js (v18+)
- `npm`

### Installation

```bash
# Clone the repository
git clone https://github.com/patrickxcapaldo/silicon-carbide-sandbox.git

# Navigate to project directory
cd silicon-carbide-sandbox

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser to interact with the local sandbox.

---

## Project Architecture

```
src/
├── core/                  # Core engine interfaces, dynamic registry, and generic UI shell
│   ├── types.ts           # Standard module & parameter contracts
│   ├── registry.ts        # Dynamic module auto-loader (Vite glob)
│   ├── ModuleShell.tsx    # Generic parameter controls & output panel UI
│   └── EquationPanel.tsx  # KaTeX LaTeX formula renderer
└── modules/               # Self-contained physics modules
    ├── orbital-thermal-limits/
    │   ├── manifest.ts    # Module metadata & parameter declarations
    │   ├── model.ts       # Pure, framework-agnostic physics functions
    │   ├── model.test.ts  # Verification unit tests
    │   └── equations.ts    # Formal LaTeX formula definitions
    └── _template/         # Boilerplate template for new module authoring
```

---

## Contributing New Modules

Contributions of new deterministic physics modules are welcome!

1. Copy the `src/modules/_template` directory into a new folder: `src/modules/your-module-id`.
2. Update `manifest.ts`, `model.ts`, and `equations.ts` with your physical equations and default values.
3. Add unit tests in `model.test.ts` to verify outputs against textbook reference values.
4. Submit a Pull Request.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
