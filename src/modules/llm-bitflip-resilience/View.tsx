import React from 'react';
import { BitflipVisualizer } from './visualizer/BitflipVisualizer';
import { Explainer } from './visualizer/Explainer';
import { createRunRecord } from './runRecord';
import { manifest } from './manifest';
import { ModulePageFrame } from '../../core/ModulePageFrame';
import { ModuleModes } from '../../core/ModuleModes';
import { downloadRunRecord } from '../../core/ui';

interface ViewProps {
  inputs: Record<string, number>;
  onChange: (id: string, value: number) => void;
  results: unknown;
}

const View: React.FC<ViewProps> = ({ inputs, onChange }) => {
  const handleExport = () => downloadRunRecord(createRunRecord(inputs));

  return (
    <ModulePageFrame manifest={manifest}>
      <Explainer />
      <ModuleModes explore={<BitflipVisualizer inputs={inputs} onChange={onChange} onExport={handleExport} />} />
    </ModulePageFrame>
  );
};

export default View;
