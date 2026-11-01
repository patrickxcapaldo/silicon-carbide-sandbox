import { ModulePageFrame } from '../../core/ModulePageFrame';
import { ModuleModes } from '../../core/ModuleModes';
import { downloadRunRecord } from '../../core/ui';
import { manifest } from './manifest';
import { createRunRecord } from './runRecord';
import { Explainer } from './visualizer/Explainer';
import { ExploreView } from './visualizer/ExploreView';

interface ViewProps {
  inputs: Record<string, number>;
  onChange: (id: string, value: number) => void;
  results: unknown;
}

/**
 * Every module page has the same three parts, in this order:
 *   <ModulePageFrame>   header: title, summary, realism and scope, badges
 *     <Explainer/>      the chapter (question, concepts, equations, worked example)
 *     <ModuleModes/>    Explore | Challenge | Play, with the standard "not built yet" notice
 *   </ModulePageFrame>
 *
 * To add Challenge and Play, build them with the shared shells (see the
 * authoring guide) and pass them as `challenge={<ChallengeGame />}` and
 * `play={<PlayGame />}`. They stay mounted while hidden, so a run in progress
 * survives switching modes.
 */
export default function View({ inputs, onChange }: ViewProps) {
  return (
    <ModulePageFrame manifest={manifest}>
      <Explainer />
      <ModuleModes explore={<ExploreView inputs={inputs} onChange={onChange} onExport={() => downloadRunRecord(createRunRecord(inputs))} />} />
    </ModulePageFrame>
  );
}
