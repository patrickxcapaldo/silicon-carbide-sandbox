import fs from 'fs';
import path from 'path';

// 1. Define your static views
const staticViews = [
  { view: 'sandbox', title: 'Sandbox | Silicon Carbide Imperative', desc: 'Interactive calculators for testing fundamental engineering and physics constraints.' },
  { view: 'about', title: 'About | Silicon Carbide Imperative', desc: 'Learn about Silicon Carbide Imperative, an independent publication exploring high-friction technical interfaces from first principles.' }
];

// 2. Import or mock your modules array (or read it from your modules config file)
// If your modules are exported from a TypeScript/JavaScript file, you can import them here:
// import { modules } from '../src/data/modules.ts'; (or similar path)
const modules = [
  { id: 'orbital-thermal-limits', title: 'Orbital Thermal Limits', summary: 'Interactive model testing satellite thermal constraints, radiators, coolants, and power limits.' },
  { id: 'solar-power-budget', title: 'Solar Power Budget', summary: 'Interactive model evaluating orbit-averaged power output, solar flux, and eclipse constraints.' }
  // Future modules added here automatically flow into your HTML!
];

// 3. Generate the JavaScript snippet dynamically
let scriptContent = `
      (function() {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        const module = params.get('module');

        let title = "Silicon Carbide Imperative";
        let desc = "First-principles engineering, economics, and geopolitics where machines meet humanity.";
`;

// Add static views logic
staticViews.forEach(v => {
  scriptContent += `
        if (view === '${v.view}') {
          title = "${v.title}";
          desc = "${v.desc}";
        } else`;
});

// Add dynamic modules logic
modules.forEach(m => {
  scriptContent += ` if (module === '${m.id}') {
          title = "${m.title} | Silicon Carbide Imperative Sandbox";
          desc = "${m.summary}";
        } else`;
});

scriptContent += ` {
          // Fallback to default
        }

        document.addEventListener("DOMContentLoaded", () => {
          document.getElementById("meta-title").innerText = title;
          document.getElementById("meta-desc").setAttribute("content", desc);
          document.getElementById("og-title").setAttribute("content", title);
          document.getElementById("og-desc").setAttribute("content", desc);
        });
      })();
`;

// 4. Inject this script into your index.html template
const indexPath = path.resolve('index.html');
let html = fs.readFileSync(indexPath, 'utf-8');

// Replace everything between marker comments in index.html
const markerStart = '<!-- AUTO-GENERATED-META-START -->';
const markerEnd = '<!-- AUTO-GENERATED-META-END -->';
const replacement = `${markerStart}\n    <script>${scriptContent}</script>\n    ${markerEnd}`;

const regex = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`);
if (regex.test(html)) {
  html = html.replace(regex, replacement);
} else {
  // If markers don't exist yet, append them before closing </head>
  html = html.replace('</head>', `    ${replacement}\n  </head>`);
}

fs.writeFileSync(indexPath, html);
console.log('✅ Meta tags successfully auto-generated from module list!');