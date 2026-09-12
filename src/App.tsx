import { getAllModules } from './core/registry';
import { ModuleShell } from './core/ModuleShell';

export function App() {
  const modules = getAllModules();
  const currentModule = modules[0];

  if (!currentModule) {
    return <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>No modules loaded in registry.</div>;
  }

  return <ModuleShell module={currentModule} />;
}

export default App;