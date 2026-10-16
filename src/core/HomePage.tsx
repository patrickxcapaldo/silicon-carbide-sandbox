import React, { useState } from 'react';
import type { Module } from './types';

interface HomePageProps {
  modules: Module[];
  view: 'home' | 'sandbox';
  onSelectModule: (id: string) => void;
  onShowSandbox: () => void;
  onShowAbout: () => void;
  onGoHome: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ modules, view, onSelectModule, onShowSandbox, onShowAbout, onGoHome }) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const isSandbox = view === 'sandbox';

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
      {isSandbox ? (
        <header style={{ marginBottom: '2rem' }}>
          <button
            onClick={onGoHome}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              font: '600 0.9rem var(--sans)',
              padding: '0 0 1rem',
            }}
          >
            ← Home
          </button>
          <h1 style={{ marginBottom: '0.5rem' }}>Sandbox</h1>
          <p style={{ color: 'var(--text)', lineHeight: 1.6 }}>
            Interactive calculators for testing fundamental engineering and physics constraints.
          </p>
        </header>
      ) : (
        <header
          style={{
            textAlign: 'center',
          }}
          className="home-front-door"
        >
          <picture>
            <source srcSet="/silicon_carbide_logo_dark.png" media="(prefers-color-scheme: dark)" />
            <img
              src="/silicon_carbide_logo_light.png"
              alt="Silicon Carbide Logo"
              className="home-front-door__logo"
              style={{ width: '80px', height: '80px', objectFit: 'contain' }}
            />
          </picture>
          <h1 className="home-front-door__title" style={{ fontSize: '2.5rem', lineHeight: 1.1 }}>
            Silicon Carbide
          </h1>
          <p className="home-front-door__tagline" style={{ fontSize: '1.1rem', color: 'var(--text)', maxWidth: '560px', lineHeight: 1.6 }}>
            First-principles engineering, economics, and geopolitics where machines meet humanity.
          </p>
          <div className="home-front-door__about">
            <button className="home-cta home-cta--outlined" onClick={onShowAbout}>
              About
            </button>
          </div>
          <hr className="home-front-door__divider" />
          <div className="home-front-door__actions">
            <a
              href="https://thesiliconcarbide.substack.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="home-cta home-cta--outlined"
            >
              Read the Stories
            </a>
            <button
              onClick={onShowSandbox}
              className="home-cta home-cta--outlined"
            >
              Open the Sandbox
            </button>
          </div>
          <nav aria-label="External links" className="home-front-door__links">
            {[
              { label: 'LinkedIn', href: 'https://www.linkedin.com/company/thesiliconcarbide' },
              { label: 'GitHub Organisation', href: 'https://github.com/thesiliconcarbide' },
              { label: 'GitHub Sandbox', href: 'https://github.com/thesiliconcarbide/silicon-carbide-sandbox' },
              { label: 'Personal Website', href: 'https://patrickxcapaldo.github.io/' },
            ].map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                {label}
              </a>
            ))}
          </nav>
        </header>
      )}

      {/* ─── Modules ─── */}
      <section style={{ display: isSandbox ? undefined : 'none' }}>
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

    </div>
  );
};