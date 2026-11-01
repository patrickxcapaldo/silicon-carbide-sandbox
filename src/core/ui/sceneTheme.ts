/**
 * Shared 3D scene constants for orbital modules (React Three Fiber). Keeping
 * them here means every orbital scene has the same space, Earth, lighting and
 * orbit track. Domain objects (radiators, solar arrays) stay in the module.
 */
export const SCENE = {
  background: '#000000',
  stars: { radius: 100, depth: 50, count: 2200, factor: 3.5, saturation: 0.2, speed: 0.3 },
  lights: {
    ambientIntensity: 0.5,
    hemisphere: { sky: '#c9e5ff', ground: '#0a1424', intensity: 0.9 },
    sunColour: '#fff1cf',
  },
  earth: { colour: '#1a4f80', emissiveIntensity: 0.25, atmosphere: '#61bcff', atmosphereOpacity: 0.07 },
  /**
   * Orbit track: bright where sunlit, dim Slate inside Earth's shadow. Neutral
   * on purpose; status red and Orchid are not scene colours.
   */
  orbit: { sunlit: '#e2e8f0', eclipse: '#64748b', lineWidth: 1.4, opacity: 0.65 },
  controls: { dampingFactor: 0.07 },
} as const;
