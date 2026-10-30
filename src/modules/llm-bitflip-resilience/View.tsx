import React, { useState } from 'react';
import { BitflipVisualizer } from './visualizer/BitflipVisualizer';
import { Explainer } from './visualizer/Explainer';
import { createRunRecord } from './runRecord';
import { manifest } from './manifest';
import { ModulePageFrame } from '../../core/ModulePageFrame';
import { ModeToggle, type ModuleMode } from '../../core/challenge/ModeToggle';

interface ViewProps {
  inputs: Record<string, number>;
  onChange: (id: string, value: number) => void;
  results: unknown;
}

const View: React.FC<ViewProps> = ({ inputs, onChange }) => {
  const [mode, setMode] = useState<ModuleMode>('explore');

  const handleExport = () => {
    const record = createRunRecord(inputs);
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${record.software.moduleId}-v${record.software.moduleReleaseVersion}-${record.createdAt.slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <ModulePageFrame manifest={manifest}>
      <Explainer />
      <ModeToggle mode={mode} onChange={setMode} />
      <div id="module-tool">
        {mode === 'explore' && <BitflipVisualizer inputs={inputs} onChange={onChange} onExport={handleExport} />}
        {mode !== 'explore' && (
          <p className="bfr-note" style={{ maxWidth: 780, margin: '1rem auto' }}>
            {mode === 'challenge' ? 'Challenge' : 'Play'} for this module is not built in this release (Phase 1: Explore only). Switch back to Explore.
          </p>
        )}
      </div>
    </ModulePageFrame>
  );
};

export default View;
