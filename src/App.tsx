import { useState, useEffect } from 'react';
import { getAllModules, getModuleById } from './core/registry';
import { ModuleShell } from './core/ModuleShell';
import { HomePage } from './core/HomePage';

export function App() {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(() => {
    // Check URL parameters for direct deep-linking e.g., http://localhost:5173/?module=orbital-thermal-limits
    const params = new URLSearchParams(window.location.search);
    return params.get('module');
  });

  const modules = getAllModules();
  const currentModule = selectedModuleId ? getModuleById(selectedModuleId) : null;

  // Sync module state to URL parameter for shareable deep links
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedModuleId) {
      url.searchParams.set('module', selectedModuleId);
    } else {
      url.searchParams.delete('module');
    }
    window.history.replaceState({}, '', url.toString());
  }, [selectedModuleId]);

  if (currentModule) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <nav
          style={{
            padding: '0.6rem 1.5rem',
            borderBottom: '1px solid var(--nav-border)',
            background: 'var(--nav-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          <button
            onClick={() => setSelectedModuleId(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              fontFamily: 'var(--sans)',
              padding: '0.3rem 0.5rem',
              borderRadius: '6px',
              marginLeft: '-0.5rem',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 12L6 8L10 4" />
            </svg>
            Home
          </button>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--mono)',
              letterSpacing: '0.02em',
            }}
          >
            SiC Sandbox v1.0
          </span>
        </nav>
        <div style={{ flex: 1 }}>
          <ModuleShell module={currentModule} />
        </div>
      </div>
    );
  }

  return <HomePage modules={modules} onSelectModule={(id) => setSelectedModuleId(id)} />;
}

export default App;