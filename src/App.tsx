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
      <div>
        <nav style={{ padding: '0.8rem 2rem', borderBottom: '1px solid #eee', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={() => setSelectedModuleId(null)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#0066cc', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              fontSize: '0.9rem' 
            }}
          >
            ← Home
          </button>
          <span style={{ fontSize: '0.85rem', color: '#777' }}>
            SiC Sandbox v1.0
          </span>
        </nav>
        <ModuleShell module={currentModule} />
      </div>
    );
  }

  return <HomePage modules={modules} onSelectModule={(id) => setSelectedModuleId(id)} />;
}

export default App;