import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { Equation } from './types';

interface EquationPanelProps {
  equations: Equation[];
}

export const EquationPanel: React.FC<EquationPanelProps> = ({ equations }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!equations || equations.length === 0) return null;

  return (
    <section
      style={{
        marginTop: '2rem',
        borderRadius: '12px',
        border: '1px solid var(--eq-border)',
        background: 'var(--eq-bg)',
        overflow: 'hidden',
      }}
    >
      {/* Collapsible header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.875rem 1.25rem',
          background: 'none',
          border: 'none',
          borderBottom: isOpen ? '1px solid var(--eq-border)' : 'none',
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
        }}
      >
        <h2
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-h)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          Underlying Physics
        </h2>
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--mono)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          {equations.length} equation{equations.length !== 1 ? 's' : ''}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s ease',
            }}
          >
            <path d="M3 4.5L6 7.5L9 4.5" />
          </svg>
        </span>
      </button>

      {/* Equations list */}
      {isOpen && (
        <div style={{ padding: '1rem 1.25rem' }}>
          {equations.map((eq, idx) => (
            <EquationItem
              key={eq.id}
              equation={eq}
              isLast={idx === equations.length - 1}
            />
          ))}
        </div>
      )}
    </section>
  );
};

/* ─── Individual equation card ─── */
const EquationItem: React.FC<{ equation: Equation; isLast: boolean }> = ({
  equation,
  isLast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      katex.render(equation.latex, containerRef.current, {
        throwOnError: false,
        displayMode: true,
      });
    }
  }, [equation.latex]);

  return (
    <div
      style={{
        marginBottom: isLast ? 0 : '1rem',
        paddingBottom: isLast ? 0 : '1rem',
        borderBottom: isLast ? 'none' : '1px solid var(--eq-border)',
      }}
    >
      <div
        style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          color: 'var(--eq-label)',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent)',
            flexShrink: 0,
          }}
        />
        {equation.label}
      </div>

      {/* KaTeX render target */}
      <div
        ref={containerRef}
        style={{
          padding: '0.75rem 1rem',
          background: 'var(--bg)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          textAlign: 'center',
          marginBottom: '0.4rem',
          overflowX: 'auto',
        }}
      />

      <p
        style={{
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          lineHeight: 1.45,
          margin: 0,
          paddingLeft: '0.65rem',
        }}
      >
        {equation.description}
      </p>
    </div>
  );
};