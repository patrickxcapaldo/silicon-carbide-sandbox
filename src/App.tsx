import { useState, useEffect } from 'react';
import { getAllModules, getModuleById } from './core/registry';
import { ModuleShell } from './core/ModuleShell';
import { HomePage } from './core/HomePage';
import { BUILD_INFO } from './core/buildInfo';

export function App() {
  const readRoute = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      moduleId: params.get('module'),
      view: params.get('view') === 'sandbox' ? 'sandbox' as const : 'home' as const,
    };
  };
  const [route, setRoute] = useState(readRoute);

  const modules = getAllModules();
  const currentModule = route.moduleId ? getModuleById(route.moduleId) : null;

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    document.title = currentModule
      ? currentModule.manifest.title
      : route.view === 'sandbox'
        ? 'Sandbox · Silicon Carbide'
        : 'Silicon Carbide';
  }, [currentModule, route.view]);

  const navigate = (nextRoute: { moduleId?: string; view?: 'home' | 'sandbox' }) => {
    const url = new URL(window.location.href);
    url.search = '';
    if (nextRoute.moduleId) url.searchParams.set('module', nextRoute.moduleId);
    if (nextRoute.view === 'sandbox') url.searchParams.set('view', 'sandbox');
    window.history.pushState({}, '', url.toString());
    setRoute({ moduleId: nextRoute.moduleId ?? null, view: nextRoute.view ?? 'home' });
  };

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
            onClick={() => navigate({ view: 'sandbox' })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
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
            ← Sandbox
          </button>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--mono)',
              letterSpacing: '0.02em',
            }}
          >
            SiC Sandbox v{BUILD_INFO.sandboxVersion}
          </span>
        </nav>
        <div style={{ flex: 1 }}>
          <ModuleShell module={currentModule} />
        </div>
      </div>
    );
  }

  return (
    <HomePage
      modules={modules}
      view={route.view}
      onSelectModule={(id) => navigate({ moduleId: id })}
      onShowSandbox={() => navigate({ view: 'sandbox' })}
      onGoHome={() => navigate({ view: 'home' })}
    />
  );
}

export default App;