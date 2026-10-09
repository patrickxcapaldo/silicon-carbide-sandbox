import type { ReactNode } from 'react';
import { ModuleBadgeRow } from './ModuleBadgeRow';
import type { Manifest } from './types';

interface ModulePageFrameProps {
  manifest: Manifest;
  children: ReactNode;
}

export function ModulePageFrame({ manifest, children }: ModulePageFrameProps) {
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1.75rem 1.5rem 3rem',
          fontFamily: 'var(--sans)',
          color: 'var(--text)',
        }}
      >
        <header
          style={{
            marginBottom: '2rem',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--text-h)',
              letterSpacing: '-0.025em',
              margin: '0 0 0.4rem',
              lineHeight: 1.2,
            }}
          >
            {manifest.title}
          </h1>
          <p
            style={{
              maxWidth: 780,
              fontSize: '0.95rem',
              color: 'var(--text)',
              lineHeight: 1.55,
              margin: '0 0 0.85rem',
            }}
          >
            {manifest.summary}
          </p>
          <ModuleBadgeRow manifest={manifest} />
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}