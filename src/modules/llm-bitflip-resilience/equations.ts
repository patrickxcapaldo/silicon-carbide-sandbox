export const equations = [
  {
    id: 'fpb-dose',
    label: 'Dose per parameter',
    latex: '\\mathrm{FPB} = \\frac{N_{\\text{flips}}}{N_{\\text{params}}} \\times 10^{9}',
    description: 'Flips per billion parameters normalises an absolute flip count by model size, so two models can be compared on one axis.',
  },
  {
    id: 'fp16-exponent-swing',
    label: 'Exponent-bit swing',
    latex: 'w\' = w \\cdot 2^{\\pm 2^{\\,k-10}}, \\quad k \\in \\{10,\\dots,14\\}',
    description: 'Flipping exponent bit k of a normal FP16 weight multiplies it by 2 to the power of plus or minus 2^(k-10): a factor of 2, 4, 16, 256 or 65 536. Up if the bit was 0, down if it was 1.',
  },
  {
    id: 'bit-hit-probability',
    label: 'Chance of an exponent hit',
    latex: 'P(\\ge 1\\ \\text{bit-14 flip}) = 1-\\left(\\tfrac{15}{16}\\right)^{N}, \\qquad P(\\ge 1\\ \\text{exponent flip}) = 1-\\left(\\tfrac{11}{16}\\right)^{N}',
    description: 'For N independent uniform flips, each lands on bit 14 with probability 1/16 and on any exponent bit with probability 5/16.',
  },
  {
    id: 'tolerance-scaling',
    label: 'Tolerance scaling (assumed)',
    latex: 'N_{50}(N) = N_{50,\\mathrm{ref}} \\left(\\frac{N}{N_{\\mathrm{ref}}}\\right)^{\\alpha}',
    description: 'Absolute flips tolerated at 50 % survival, anchored on the larger measured model. alpha = 1 is scale-invariant per-parameter tolerance; alpha is derived from two models and is not a scaling law.',
  },
  {
    id: 'curve-collapse',
    label: 'Curve collapse (assumed)',
    latex: 'S(n \\mid N) = S_{\\mathrm{ref}}\\!\\left(\\frac{n}{(N/N_{\\mathrm{ref}})^{\\alpha}}\\right)',
    description: 'The survival curve of an N-parameter model is the reference curve stretched along the flips axis by the same factor as its tolerance.',
  },
  {
    id: 'exposure-time',
    label: 'Survival time',
    latex: 't_{50} = \\frac{N_{50}}{r \\cdot G}, \\qquad \\frac{t_{50}(N_L)}{t_{50}(N_S)} = \\left(\\frac{N_L}{N_S}\\right)^{\\alpha - 1}',
    description: 'Time for accumulated flips to reach the tolerance, with upset rate r in flips per GB per month and store size G in GB. Size sets both the numerator and the denominator.',
  },
  {
    id: 'poisson-accumulation',
    label: 'Accumulation over a scrub interval',
    latex: '\\lambda = r\\, G\\, T, \\qquad \\mathbb{E}[S] = \\sum_{n} \\frac{\\lambda^{n} e^{-\\lambda}}{n!}\\, S(n)',
    description: 'Flips arrive as a Poisson process; T is the scrub or reload interval. The expected survival averages the survival curve over the number of flips that accumulate.',
  },
  {
    id: 'secded-double-hit',
    label: 'SECDED double hits (analytic extension)',
    latex: 'U = m\\,\\lambda + \\frac{\\lambda^{2}}{2W}, \\qquad n_{\\mathrm{eff}} = 2U',
    description: 'W is the number of 64-bit words and m the fraction of upset events that put two or more flips in one word. Not measured by RadiAI.',
  },
  {
    id: 'canary-bayes',
    label: 'What a passing canary tells you',
    latex: 'P(\\text{collapsed}\\mid\\text{pass}) = \\frac{s\\,p_c}{s\\,p_c + (1-s)\\,p_i}',
    description: 's is the Semantic Collapse share of collapsed plus intact trials; p_c and p_i are the probe pass rates for collapsed and intact trials.',
  },
];
