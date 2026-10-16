import React, { useState, useRef, useEffect } from 'react';
import type { Module, Parameter } from './types';
import { EquationPanel } from './EquationPanel';
import { ModulePageFrame } from './ModulePageFrame';

interface ModuleShellProps {
  module: Module;
}

/* ─── Animated number display ─── */
const AnimatedValue: React.FC<{ value: number; unit: string }> = ({ value, unit }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const rafRef = useRef<number>(0);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const duration = 180;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayValue(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  const formatted = Number.isInteger(value)
    ? Math.round(displayValue).toLocaleString()
    : displayValue.toFixed(2);

  return (
    <span
      style={{
        fontFamily: 'var(--mono)',
        fontSize: '1.6rem',
        fontWeight: 700,
        color: 'var(--output-value)',
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
      }}
    >
      {formatted}
      <span
        style={{
          fontSize: '0.85rem',
          fontWeight: 500,
          color: 'var(--text-muted)',
          marginLeft: '0.35rem',
          letterSpacing: '0',
        }}
      >
        {unit}
      </span>
    </span>
  );
};

/* ─── Parameter control row ─── */
const ParameterControl: React.FC<{
  param: Parameter;
  value: number;
  onChange: (id: string, value: number) => void;
}> = ({ param, value, onChange }) => {
  const pct = ((value - param.min) / (param.max - param.min)) * 100;

  return (
    <div
      style={{
        padding: '0.875rem 1rem',
        background: 'var(--bg-surface)',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        marginBottom: '0.75rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '0.5rem',
          gap: '0.5rem',
        }}
      >
        <label
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-h)',
            lineHeight: 1.3,
          }}
        >
          {param.name}
        </label>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--accent)',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 400,
              color: 'var(--text-muted)',
              marginLeft: '0.25rem',
            }}
          >
            {param.unit}
          </span>
        </span>
      </div>

      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={(e) => onChange(param.id, parseFloat(e.target.value))}
        style={{
          width: '100%',
          marginBottom: '0.35rem',
          background: `linear-gradient(to right, var(--slider-fill) 0%, var(--slider-fill) ${pct}%, var(--slider-track) ${pct}%, var(--slider-track) 100%)`,
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--mono)',
          }}
        >
          {param.min}
        </span>
        <span
          style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            flex: 1,
            padding: '0 0.5rem',
            lineHeight: 1.35,
          }}
        >
          {param.description}
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--mono)',
          }}
        >
          {param.max}
        </span>
      </div>
    </div>
  );
};

/* ─── Main Module Shell ─── */
export const ModuleShell: React.FC<ModuleShellProps> = ({ module }) => {
  const { manifest, compute, View } = module;

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

  const handleReset = () => {
    const defaults: Record<string, number> = {};
    manifest.parameters.forEach((p) => {
      defaults[p.id] = p.defaultValue;
    });
    setInputs(defaults);
  };

  if (View) {
    return <View inputs={inputs} onChange={handleInputChange} results={results} />;
  }

  return (
    <ModulePageFrame manifest={manifest}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.75rem',
            alignItems: 'start',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.875rem',
              }}
            >
              <h2
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-h)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Parameters
              </h2>
              <button
                onClick={handleReset}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                }}
              >
                Reset
              </button>
            </div>

            {manifest.parameters.map((param) => (
              <ParameterControl
                key={param.id}
                param={param}
                value={inputs[param.id]}
                onChange={handleInputChange}
              />
            ))}
          </div>

          <div>
            <h2
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-h)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.875rem',
              }}
            >
              Results
            </h2>

            {Object.entries(results.outputs).map(([key, out]) => (
              <div
                key={key}
                style={{
                  padding: '1rem 1.15rem',
                  background: 'var(--output-bg)',
                  borderRadius: '10px',
                  marginBottom: '0.75rem',
                  border: '1px solid var(--output-border)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    color: 'var(--text)',
                    marginBottom: '0.3rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  {out.label}
                </div>
                <AnimatedValue value={out.value} unit={out.unit} />
                {out.description && (
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginTop: '0.35rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {out.description}
                  </p>
                )}
              </div>
            ))}

            {results.warnings && results.warnings.length > 0 && (
              <div
                style={{
                  padding: '0.875rem 1rem',
                  background: 'var(--warning-bg)',
                  color: 'var(--warning)',
                  borderRadius: '10px',
                  border: '1px solid var(--warning-border)',
                  marginTop: '0.25rem',
                }}
              >
                {results.warnings.map((w, idx) => (
                  <p
                    key={idx}
                    style={{
                      margin: idx > 0 ? '0.4rem 0 0' : 0,
                      fontSize: '0.82rem',
                      lineHeight: 1.45,
                      display: 'flex',
                      gap: '0.4rem',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>⚠</span>
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {manifest.relatedArticles && manifest.relatedArticles.length > 0 && (
          <section style={{ marginTop: '2rem' }}>
            <h2
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-h)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem',
              }}
            >
              Related Analysis
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {manifest.relatedArticles.map((article) => (
                <a
                  key={article.url}
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    color: 'var(--text-h)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  <span>{article.title}</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--mono)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {article.publishedAt}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        <EquationPanel equations={manifest.equations} />
    </ModulePageFrame>
  );
};
