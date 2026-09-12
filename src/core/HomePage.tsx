import React from 'react';
import type { Module } from './types';

interface HomePageProps {
  modules: Module[];
  onSelectModule: (id: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ modules, onSelectModule }) => {
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'sans-serif', color: '#111' }}>
      {/* Header Section */}
      <header style={{ textAlign: 'center', marginBottom: '3.5rem', borderBottom: '1px solid #eaeaea', paddingBottom: '2.5rem' }}>
        <picture>
          <source srcSet="/silicon_carbide_logo_dark.png" media="(prefers-color-scheme: dark)" />
          <img 
            src="/silicon_carbide_logo_light.png" 
            alt="Silicon Carbide Logo" 
            style={{ 
              width: '100px', 
              height: '100px', 
              objectFit: 'contain', 
              marginBottom: '1rem',
              backgroundColor: 'transparent'
            }} 
          />
        </picture>

        <h1 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', letterSpacing: '-0.02em' }}>
          Silicon Carbide Sandbox
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#555', maxWidth: '680px', margin: '0 auto 1.75rem auto', lineHeight: '1.5' }}>
          Interactive calculators for testing fundamental engineering and physics constraints.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <a 
            href="https://thesiliconcarbide.substack.com" 
            target="_blank" 
            rel="noreferrer" 
            style={{ 
              background: '#0066cc', 
              color: '#ffffff', 
              textDecoration: 'none', 
              padding: '0.65rem 1.3rem', 
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '0.95rem'
            }}
          >
            Read Analysis
          </a>
          <a 
            href="https://github.com/patrickxcapaldo/silicon-carbide-sandbox" 
            target="_blank" 
            rel="noreferrer" 
            style={{ 
              background: '#ffffff', 
              border: '1px solid #111111', 
              color: '#111111', 
              textDecoration: 'none', 
              padding: '0.65rem 1.3rem', 
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.95rem'
            }}
          >
            GitHub Repository
          </a>
        </div>
      </header>

      {/* About Section */}
      <section style={{ marginBottom: '3.5rem', background: '#f9f9fb', padding: '1.75rem 2rem', borderRadius: '8px', border: '1px solid #eee' }}>
        <h2 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '0.75rem', color: '#111' }}>
          About
        </h2>
        <p style={{ margin: '0 0 0.8rem 0', color: '#444', lineHeight: '1.6', fontSize: '0.95rem' }}>
          Silicon Carbide Sandbox provides visual models to back up the technical articles published on Silicon Carbide. It helps demonstrate the baseline math and physics behind complex engineering systems.
        </p>
        <p style={{ margin: 0, color: '#444', lineHeight: '1.6', fontSize: '0.95rem' }}>
          The site runs entirely in the browser so it is accessible from any device with a modern web browser.
        </p>
      </section>

      {/* Modules Section */}
      <section>
        <h2 style={{ fontSize: '1.4rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
          Modules
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {modules.map((mod) => (
            <div 
              key={mod.manifest.id}
              style={{
                border: '1px solid #e2e2e2',
                borderRadius: '8px',
                padding: '1.5rem',
                backgroundColor: '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.2rem' }}>
                    {mod.manifest.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {mod.manifest.tags.map((tag) => (
                      <span 
                        key={tag} 
                        style={{ 
                          fontSize: '0.75rem', 
                          background: '#f1f5f9', 
                          color: '#475569', 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '4px',
                          fontWeight: '500'
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onSelectModule(mod.manifest.id)}
                  style={{
                    backgroundColor: '#111',
                    color: '#fff',
                    border: 'none',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                  }}
                >
                  Launch →
                </button>
              </div>

              <p style={{ fontSize: '0.95rem', color: '#555', margin: 0, lineHeight: '1.5' }}>
                {mod.manifest.summary}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};