/**
 * Style conformance: fails if a module drifts from the Module Style & UX
 * Reference Standard. Run like every other test:  npx tsx src/core/ui/conformance.test.ts
 *
 * It checks what a machine can check (palette, ownership of shared class
 * names, required manifest fields, page structure, label casing). Whether a
 * module *looks* right is still a human call; this stops the drift that is
 * easy to miss in review.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REALISM_LABELS } from '../types';
import { assert } from '../play/testKit';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODULES = join(SRC, 'modules');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
const rel = (p: string) => relative(SRC, p).split('\\').join('/');
const read = (p: string) => readFileSync(p, 'utf8');
const sourceFiles = walk(SRC).filter((p) => /\.(ts|tsx|css)$/.test(p) && !/\.test\.ts$/.test(p));

// 1. Retired palette. These were the pre-standard colours; none may come back.
const RETIRED = /#(4fb3ff|0b1726|07111e|050c16|eaf6ff|9fb7c9|cbd9e8|7f9bb0|7ecfff|f43f5e|ec4899|0969da|8250df|2da44e|a855f7)\b/i;
for (const file of sourceFiles) {
  const hit = read(file).match(RETIRED);
  assert(!hit, `${rel(file)}: retired colour ${hit?.[0]}. Use the --viz-*, --series-*, --status-* or brand tokens in src/index.css.`);
}

// 2. Module stylesheets use tokens, not hex, and never define shared class names.
for (const file of walk(MODULES).filter((p) => p.endsWith('.css'))) {
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  assert(!/#[0-9a-f]{3,8}\b/i.test(css), `${rel(file)}: use colour tokens, not hex.`);
  const shared = css.match(/\.(challenge|play|sci)-[a-z0-9-]+/);
  assert(!shared, `${rel(file)}: defines ${shared?.[0]}. That namespace belongs to src/core (a global class defined twice makes one module restyle another).`);
}

// 3. Colour on an Orchid fill is always the --on-accent token.
for (const file of sourceFiles.filter((p) => p.endsWith('.css'))) {
  for (const block of read(file).split('}')) {
    if (/background(-color)?:\s*var\(--(accent|viz-accent|orchid)\)/.test(block) && /(^|[\s;{])color:/.test(block)) {
      assert(/color:\s*var\(--on-accent\)/.test(block), `${rel(file)}: text on an Orchid fill must use var(--on-accent) (white on Orchid is 2.9:1).`);
    }
  }
}

// 4. No emoji in UI source (the North Star allows them only in share strings). ▶ ▼ ⏸ are drawn with a text-presentation selector.
const EMOJI = /\p{Extended_Pictographic}/u;
const SHARE_FILES = /scoring\.ts$|ChallengeShell|PlayShell|share/i;
for (const file of sourceFiles.filter((p) => /\.(tsx?)$/.test(p) && !SHARE_FILES.test(p))) {
  const code = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/[\u25B6\u25BC\u23F8]/g, '');
  const hit = code.match(EMOJI);
  assert(!hit, `${rel(file)}: emoji ${hit?.[0]} in UI source. Emoji are for share strings only.`);
}

// 4b. Kit components and module Challenge/Play code must be importable by a plain Node test, so they must not import CSS.
//     Stylesheets are loaded once by ModulePageFrame (core/ui/styles.ts).
for (const file of sourceFiles.filter((p) => /core\/ui\/(?!styles\.ts)[^/]+\.tsx?$/.test(rel(p)) || /\/(challenge|play)\/[^/]+\.tsx?$/.test(rel(p)))) {
  if (/ChallengeShell|PlayShell|ModeToggle|ChallengeGame|PlayGame/.test(file)) continue; // the shells and game screens are UI only; tests never import them
  assert(!/import\s+['"][^'"]+\.css['"]/.test(read(file)), `${rel(file)}: must not import CSS (Node tests import this graph). Load styles via core/ui/styles.ts.`);
}

// 5. Every module: realism + scope, standard page structure.
const moduleDirs = readdirSync(MODULES).filter((d) => statSync(join(MODULES, d)).isDirectory());
assert(moduleDirs.includes('_template'), 'the _template module must exist');
const checked: string[] = [];
for (const dir of moduleDirs) {
  const manifestPath = join(MODULES, dir, 'manifest.ts');
  const { manifest } = (await import(manifestPath)) as { manifest: { realism?: string; scope?: string; summary: string; title: string; parameters: { name: string }[] } };
  assert(manifest.realism !== undefined && (REALISM_LABELS as readonly string[]).includes(manifest.realism), `${dir}: manifest.realism must be one of ${REALISM_LABELS.join(', ')}`);
  assert(typeof manifest.scope === 'string' && manifest.scope.trim().length > 20 && manifest.scope.trim().endsWith('.'), `${dir}: manifest.scope must be one full sentence`);

  const view = read(join(MODULES, dir, 'View.tsx'));
  assert(/ModulePageFrame/.test(view), `${dir}/View.tsx must use ModulePageFrame`);
  assert(/ModuleModes/.test(view), `${dir}/View.tsx must use ModuleModes for the Explore | Challenge | Play switcher`);

  // 6. Title Case labels in the manifest and in the Controls panel metadata.
  const small = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'per', 'the', 'to', 'vs', 'with', 'not']);
  const titleCase = (label: string) => label.split(/[\s/]+/).filter((w) => /^[A-Za-z]/.test(w)).every((w, i) => (i > 0 && small.has(w.toLowerCase())) || /^[A-Z]/.test(w));
  for (const p of manifest.parameters) assert(titleCase(p.name), `${dir}: parameter name "${p.name}" must be Title Case`);
  const metaPath = join(MODULES, dir, 'visualizer', 'paramMeta.ts');
  try {
    const { PARAM_META } = (await import(metaPath)) as { PARAM_META: Record<string, { label: string }> };
    for (const [key, meta] of Object.entries(PARAM_META)) {
      assert(titleCase(meta.label), `${dir}: PARAM_META.${key}.label "${meta.label}" must be Title Case`);
      assert(!(/^[A-Z0-9 ]+$/.test(meta.label) && (meta.label.includes(' ') || meta.label.length > 6)), `${dir}: PARAM_META.${key}.label must not be ALL-CAPS (acronyms like RAAN are fine)`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  checked.push(dir);
}

console.log(`style conformance ok: ${sourceFiles.length} files, modules ${checked.join(', ')}`);
