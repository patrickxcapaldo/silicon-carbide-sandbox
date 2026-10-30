/** Slide-ready export of a chart SVG as SVG or PNG, in dark or light palette. */

export type ExportTheme = 'dark' | 'light';

const PALETTES: Record<ExportTheme, Record<string, string>> = {
  dark: { bg: '#0f1117', text: '#eaf6ff', mute: '#94A3B8', grid: 'rgba(148,163,184,0.28)', a: '#7ecfff', dead: '#334155', b: '#cbd5e1', accent: '#B97FED', shade: 'rgba(148,163,184,0.16)', ref: '#94A3B8' },
  light: { bg: '#ffffff', text: '#121316', mute: '#475569', grid: 'rgba(71,85,105,0.25)', a: '#1d6fb8', dead: '#0f172a', b: '#475569', accent: '#B97FED', shade: 'rgba(71,85,105,0.10)', ref: '#475569' },
};

export function screenPaletteStyle(): Record<string, string> {
  const p = PALETTES.dark;
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [`--c-${k}`, k === 'bg' ? '#0b1726' : v]));
}

function serialise(svg: SVGSVGElement, theme: ExportTheme): { text: string; width: number; height: number } {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const vb = svg.viewBox.baseVal;
  clone.setAttribute('width', String(vb.width * 2));
  clone.setAttribute('height', String(vb.height * 2));
  let text = new XMLSerializer().serializeToString(clone);
  for (const [k, v] of Object.entries(PALETTES[theme])) text = text.split(`var(--c-${k})`).join(v);
  text = text.split('var(--sans, Inter, system-ui, sans-serif)').join('Inter, system-ui, sans-serif');
  text = text.split('var(--mono, ui-monospace, monospace)').join('ui-monospace, monospace');
  return { text, width: vb.width * 2, height: vb.height * 2 };
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function exportSvg(svg: SVGSVGElement, theme: ExportTheme, name: string): void {
  download(new Blob([serialise(svg, theme).text], { type: 'image/svg+xml' }), `${name}-${theme}.svg`);
}

export function exportPng(svg: SVGSVGElement, theme: ExportTheme, name: string): void {
  const { text, width, height } = serialise(svg, theme);
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);
    canvas.toBlob((b) => { if (b) download(b, `${name}-${theme}.png`); }, 'image/png');
  };
  img.src = url;
}
