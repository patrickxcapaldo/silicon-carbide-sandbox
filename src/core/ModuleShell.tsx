import React, { useState } from 'react';
import type { Module } from './types';
import { EquationPanel } from './EquationPanel';

interface ModuleShellProps {
  module: Module;
}

export const ModuleShell: React.FC<ModuleShellProps> = ({ module }) => {
  const { manifest, compute } = module;

  const [inputs, setInputs] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    manifest.parameters.forEach((p) => {
      initial[p.id] = p.defaultValue;
    });
    return initial;
  });

  const handleInputChange = (id: string, value: number) => {
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const results = compute(inputs);

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <a href={manifest.articleUrl} target="_blank" rel="noreferrer" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: 'bold' }}>
          ← Read Analysis on Silicon Carbide Substack
        </a>
        <h1 style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>{manifest.title}</h1>
        <p style={{ color: '#555', margin: 0 }}>{manifest.summary}</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Controls Section */}
        <div>
          <h2>Parameters</h2>
          {manifest.parameters.map((param) => (
            <div key={param.id} style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.2rem' }}>
                {param.name}: {inputs[param.id]} {param.unit}
              </label>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={inputs[param.id]}
                onChange={(e) => handleInputChange(param.id, parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#777' }}>{param.description}</span>
            </div>
          ))}
        </div>

        {/* Results Section */}
        <div>
          <h2>Outputs</h2>
          {Object.entries(results.outputs).map(([key, out]) => (
            <div key={key} style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #e2e2e2' }}>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>{out.label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#111' }}>
                {out.value} {out.unit}
              </div>
            </div>
          ))}

          {results.warnings && results.warnings.length > 0 && (
            <div style={{ padding: '1rem', background: '#fff3cd', color: '#856404', borderRadius: '6px', border: '1px solid #ffeeba' }}>
              {results.warnings.map((w, idx) => (
                <p key={idx} style={{ margin: 0, fontSize: '0.875rem' }}>⚠️ {w}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <EquationPanel equations={manifest.equations} />
    </div>
  );
};