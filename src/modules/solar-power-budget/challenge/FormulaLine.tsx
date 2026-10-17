import { useEffect, useRef } from 'react';
import katex from 'katex';

export function FormulaLine({ latex }: { latex: string }) {
  const elementRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (elementRef.current) katex.render(latex, elementRef.current, { throwOnError: false, displayMode: true });
  }, [latex]);
  return <div className="challenge-math-line" ref={elementRef} />;
}
