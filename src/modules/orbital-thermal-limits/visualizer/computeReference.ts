export type ComputeReference = {
  id: string;
  label: string;
  watts: number;
  note: string;
};

// Approximate, order-of-magnitude TDP figures for common AI compute modules,
// for scale reference only. Real deployed power draw depends on utilization,
// power capping, and system overhead (NVSwitch, networking, cooling pumps),
// and vendors revise specs between releases -- treat these as a starting
// point rather than a spec sheet.
export const COMPUTE_REFERENCES: ComputeReference[] = [
  {
    id: 'edge',
    label: 'Edge AI module (Jetson-class)',
    watts: 25,
    note: 'A small onboard inference module in the 15 to 60 W class. This is realistic for current small-satellite AI payloads.',
  },
  {
    id: 'h100',
    label: 'Single datacenter GPU (H100 SXM-class)',
    watts: 700,
    note: 'The rated TDP of an NVIDIA H100 SXM5 accelerator is 700 W. That is well beyond what a small radiator can shed, so it is useful as an upper-bound sanity check.',
  },
  {
    id: 'gb300',
    label: 'Next-gen AI GPU (GB300-class, per chip)',
    watts: 1400,
    note: 'Recent Blackwell Ultra (GB300) GPUs are specified at around 1,400 W per chip, and a full NVL72 rack draws over 100 kW in total.',
  },
];
