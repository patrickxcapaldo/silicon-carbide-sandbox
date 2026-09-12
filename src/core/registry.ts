import type { Module, Manifest } from './types';

// Glob all manifest and model files dynamically
const manifestFiles = import.meta.glob('../modules/**/manifest.ts', { eager: true });
const modelFiles = import.meta.glob('../modules/**/model.ts', { eager: true });
const viewFiles = import.meta.glob('../modules/**/View.tsx', { eager: true });

export function getAllModules(): Module[] {
  const modules: Module[] = [];

  for (const path in manifestFiles) {
    // Ignore template folder
    if (path.includes('_template')) continue;

    const dir = path.replace('/manifest.ts', '');
    const manifestModule = manifestFiles[path] as { manifest: Manifest };
    const modelModule = modelFiles[`${dir}/model.ts`] as { compute: Module['compute'] };
    const viewModule = viewFiles[`${dir}/View.tsx`] as { default?: Module['View'] } | undefined;

    if (manifestModule?.manifest && modelModule?.compute) {
      modules.push({
        manifest: manifestModule.manifest,
        compute: modelModule.compute,
        View: viewModule?.default,
      });
    }
  }

  return modules;
}

export function getModuleById(id: string): Module | undefined {
  return getAllModules().find((m) => m.manifest.id === id);
}