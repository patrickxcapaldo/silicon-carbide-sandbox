import type { Result } from '../../core/types';
import { ModulePageFrame } from '../../core/ModulePageFrame';
import { manifest } from './manifest';

interface ViewProps {
	inputs: Record<string, number>;
	onChange: (id: string, value: number) => void;
	results: Result;
}

export default function View(props: ViewProps) {
	return (
		<ModulePageFrame manifest={manifest}>
			<section>
				<h2>Module-specific content</h2>
				<p>Replace this section with the specialized module interface.</p>
				<p>
					This view receives {Object.keys(props.inputs).length} inputs and{' '}
					{Object.keys(props.results.outputs).length} outputs.
				</p>
			</section>
		</ModulePageFrame>
	);
}
