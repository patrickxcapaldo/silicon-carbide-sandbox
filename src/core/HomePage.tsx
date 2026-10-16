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

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { label: 'LinkedIn', href: 'https://www.linkedin.com/company/thesiliconcarbide' },
            { label: 'Substack', href: 'https://thesiliconcarbide.substack.com/' },
            { label: 'GitHub Organisation', href: 'https://github.com/thesiliconcarbide' },
            { label: 'GitHub Sandbox', href: 'https://github.com/thesiliconcarbide/silicon-carbide-sandbox' },
            { label: 'Personal Website', href: 'https://patrickxcapaldo.github.io/' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-h)',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              {label}
            </a>
          ))}
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
          First-principles engineering, economics, and geopolitics where machines meet humanity. Everything runs in the browser; nothing is collected.
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