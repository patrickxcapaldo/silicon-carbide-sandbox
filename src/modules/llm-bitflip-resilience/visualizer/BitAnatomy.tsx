import { useState } from 'react';
import { bit14Case, bitClass, fp16Decode, fp16Encode, fp16Fields, flipBit, flipEffect, P_BIT_CLASS } from '../sandbox/kernel';
import { bitString, fmtFactor, fmtNumber, fmtPct, hex16 } from './format';

const CLASS_LABEL = { sign: 'Sign', exponent: 'Exponent', mantissa: 'Mantissa' } as const;

/** View 1: a 16-cell FP16 word. Click a bit to flip it. All numbers come from the kernel. */
export function BitAnatomy({ weightMagnitude, injectedFlips, pBit14, pExponent }: { weightMagnitude: number; injectedFlips: number; pBit14: number; pExponent: number }) {
  const base = fp16Encode(weightMagnitude);
  const [bits, setBits] = useState(base);
  const [last, setLast] = useState<number | null>(null);
  const before = fp16Decode(base);
  const now = fp16Decode(bits);
  const f = fp16Fields(bits);
  const single = last !== null ? flipEffect(base, last) : null;
  const cells = Array.from({ length: 16 }, (_, i) => 15 - i);

  return (
    <div className="bfr-anatomy">
      <p className="bfr-lede">Click any bit of an FP16 weight to flip it. One exponent bit can move a weight by up to a factor of 2<sup>16</sup>; a mantissa bit moves it by at most a factor of 2.</p>
      <div className="bfr-bits" role="group" aria-label="FP16 bits, most significant first">
        {cells.map((k) => {
          const on = ((bits >> k) & 1) === 1;
          const changed = ((bits ^ base) >> k) & 1;
          return (
            <button key={k} type="button" className={`bfr-bit bfr-${bitClass(k)}${on ? ' on' : ''}${changed ? ' changed' : ''}`} aria-pressed={on} aria-label={`Bit ${k}, ${bitClass(k)}, value ${on ? 1 : 0}`}
              onClick={() => { setBits(flipBit(bits, k)); setLast(k); }}>
              <span className="bfr-bit-val">{on ? 1 : 0}</span>
              <span className="bfr-bit-idx">{k}</span>
            </button>
          );
        })}
      </div>
      <div className="bfr-bit-legend"><span className="bfr-sw bfr-sign" /> sign (bit 15) <span className="bfr-sw bfr-exponent" /> exponent (bits 10–14, bias 15) <span className="bfr-sw bfr-mantissa" /> mantissa (bits 0–9)</div>
      <div className="bfr-readouts">
        <div><span>Pattern</span><strong>{hex16(bits)}</strong><em>{bitString(bits)}</em></div>
        <div><span>Original weight</span><strong>{fmtNumber(before, 4)}</strong><em>chosen magnitude, nearest FP16</em></div>
        <div><span>Decoded weight now</span><strong>{Number.isFinite(now) ? fmtNumber(now, 4) : Number.isNaN(now) ? 'NaN bit pattern' : (now > 0 ? '+Inf bit pattern' : '−Inf bit pattern')}</strong><em>sign {f.sign}, exponent {f.exponent}, mantissa {f.mantissa}</em></div>
        <div><span>Change against original</span><strong>{bits === base ? '× 1' : fmtFactor(now / before)}</strong><em>{last !== null && single ? `last click: bit ${last}, ${CLASS_LABEL[single.bitClass]}${single.log2Swing !== undefined ? `, 2^${single.log2Swing > 0 ? '+' : ''}${single.log2Swing}` : ''}` : 'click a bit'}</em></div>
      </div>
      <div className="bfr-quick">
        <button type="button" onClick={() => { setBits(flipBit(base, 14)); setLast(14); }}>Flip bit 14</button>
        <button type="button" onClick={() => { setBits(flipBit(base, 9)); setLast(9); }}>Flip bit 9</button>
        <button type="button" onClick={() => { setBits(flipBit(base, 15)); setLast(15); }}>Flip sign</button>
        <button type="button" onClick={() => { setBits(base); setLast(null); }}>Reset</button>
      </div>
      <div className="bfr-readouts">
        {([['times-2^16', '|w| < 1', '× 2^16 (up)'], ['inf-nan-pattern', '1 ≤ |w| < 2', 'Inf / NaN bit pattern'], ['divides-by-2^16', '|w| ≥ 2', '÷ 2^16 (down; subnormal if |w| < 4)']] as const).map(([id, range, effect]) => (
          <div key={id} style={bit14Case(weightMagnitude) === id ? { outline: '2px solid #B97FED' } : undefined}><span>Bit 14, {range}</span><strong>{effect}</strong><em>{bit14Case(weightMagnitude) === id ? 'this weight' : 'normal FP16 weights'}</em></div>
        ))}
      </div>
      <p className="bfr-note">A flip does not by itself produce NaN or Inf in a typical weight. A weight pushed to around 10³ to 10⁴ times a typical activation can overflow later, past the FP16 maximum of 65 504. The weight magnitude is an illustrative setting, not profiled for the measured checkpoints.</p>
      <div className="bfr-readouts">
        <div><span>One uniform flip lands on</span><strong>{fmtPct(P_BIT_CLASS.sign)} sign</strong><em>{fmtPct(P_BIT_CLASS.exponent, 2)} exponent · {fmtPct(P_BIT_CLASS.mantissa)} mantissa</em></div>
        <div><span>P(at least one bit-14 flip in {injectedFlips} flips)</span><strong>{fmtPct(pBit14, 2)}</strong><em>1 − (15/16)^N</em></div>
        <div><span>P(at least one exponent flip in {injectedFlips} flips)</span><strong>{fmtPct(pExponent, 2)}</strong><em>1 − (11/16)^N</em></div>
      </div>
    </div>
  );
}
