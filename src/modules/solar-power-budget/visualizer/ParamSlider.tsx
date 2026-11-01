import { ParamSlider as CoreParamSlider } from '../../../core/ui';
import type { ParamMeta } from './paramMeta';
import { formatQuantity } from './format';

type Props = {
  meta: ParamMeta;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  disabledHint?: string;
};

/** The shared slider, bound to this module's number formatting. */
export function ParamSlider(props: Props) {
  return <CoreParamSlider {...props} format={formatQuantity} />;
}
