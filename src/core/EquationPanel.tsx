import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { Equation } from './types';

interface EquationPanelProps {
  equations: Equation[];
}

export const EquationPanel: React.FC<EquationPanelProps> = ({ equations }) => {
  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', marginTop: '1rem' }}>
      <h3 style={{ marginTop: 0 }}>Underlying Physics</h3>
      {equations.map((eq) => (
        <EquationItem key={eq.id} equation={eq} />
      ))}
    </div>
  );
};

const EquationItem: React.FC<{ equation: Equation }> = ({ equation }) => {
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
    <div style={{ marginBottom: '1rem' }}>
      <strong>{equation.label}</strong>
      <div ref={containerRef} style={{ margin: '0.5rem 0' }} />
      <p style={{ fontSize: '0.875rem', color: '#666', margin: 0 }}>{equation.description}</p>
    </div>
  );
};