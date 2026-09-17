import React, { useState } from 'react';
import type { Module } from './types';

interface HomePageProps {
  modules: Module[];
  onSelectModule: (id: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ modules, onSelectModule }) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '3.5rem 1.5rem 4rem',
        fontFamily: 'var(--sans)',
        color: 'var(--text)',
      }}
    >
      {/* ─── Hero ─── */}
      <header
        style={{
          textAlign: 'center',
          marginBottom: '3rem',
          paddingBottom: '2.5rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <picture>
          <source srcSet="/silicon_carbide_logo_dark.png" media="(prefers-color-scheme: dark)" />
          <img
            src="/silicon_carbide_logo_light.png"
            alt="Silicon Carbide Logo"
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'contain',
              marginBottom: '1.25rem',
              backgroundColor: 'transparent',
            }}
          />
        </picture>

        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            margin: '0 0 0.75rem',
            letterSpacing: '-0.03em',
            color: 'var(--text-h)',
            lineHeight: 1.1,
          }}
        >
          Silicon Carbide Sandbox
        </h1>

        <p
          style={{
            fontSize: '1.1rem',
            color: 'var(--text)',
            maxWidth: '560px',
            margin: '0 auto 2rem',
            lineHeight: 1.6,
          }}
        >
          Interactive calculators for testing fundamental engineering
          and physics constraints.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            href="https://thesiliconcarbide.substack.com"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--accent)',
              color: '#fff',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              letterSpacing: '-0.01em',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            Read Analysis
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>→</span>
          </a>
          <a
            href="https://github.com/patrickxcapaldo/silicon-carbide-sandbox"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-h)',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            {/* GitHub icon inline SVG */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Source
          </a>
        </div>
      </header>

      {/* ─── About ─── */}
      <section
        style={{
          marginBottom: '3rem',
          background: 'var(--bg-surface)',
          padding: '1.5rem 1.75rem',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: '0.6rem',
            color: 'var(--text-h)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          About
        </h2>
        <p style={{ color: 'var(--text)', lineHeight: 1.65, fontSize: '0.95rem' }}>
          Silicon Carbide Sandbox provides visual models to back up the technical articles published on Silicon Carbide. It helps demonstrate the baseline math and physics behind complex engineering systems. The site runs entirely in the browser, accessible from any device with a modern web browser.
        </p>
      </section>

      {/* ─── Modules ─── */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-h)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Modules
          </h2>
          <span
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--mono)',
            }}
          >
            {modules.length} available
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {modules.map((mod) => {
            const isHovered = hoveredCard === mod.manifest.id;
            return (
              <div
                key={mod.manifest.id}
                onMouseEnter={() => setHoveredCard(mod.manifest.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  border: `1px solid ${isHovered ? 'var(--card-hover-border)' : 'var(--card-border)'}`,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  backgroundColor: 'var(--card-bg)',
                  boxShadow: isHovered ? 'var(--card-hover-shadow)' : 'var(--shadow-sm)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                  transform: isHovered ? 'translateY(-1px)' : 'none',
                }}
                onClick={() => onSelectModule(mod.manifest.id)}
              >
                {/* Card Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        margin: '0 0 0.5rem',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        color: 'var(--text-h)',
                        lineHeight: 1.3,
                      }}
                    >
                      {mod.manifest.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {mod.manifest.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            fontFamily: 'var(--mono)',
                            background: 'var(--tag-bg)',
                            color: 'var(--tag-text)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectModule(mod.manifest.id);
                    }}
                    style={{
                      background: isHovered ? 'var(--accent)' : 'var(--text-h)',
                      color: isHovered ? '#fff' : 'var(--bg-surface)',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.825rem',
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                      transition: 'background-color 0.2s ease, color 0.2s ease, transform 0.15s ease',
                      transform: isHovered ? 'scale(1.03)' : 'none',
                    }}
                  >
                    Launch →
                  </button>
                </div>

                <p
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--text)',
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  {mod.manifest.summary}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          marginTop: '4rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Silicon Carbide Sandbox
        </p>
      </footer>
    </div>
  );
};