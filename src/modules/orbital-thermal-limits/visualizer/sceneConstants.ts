import * as THREE from 'three';

// A fixed, illustrative sun direction used across the scene so the
// environment lighting/vector arrows and the solar array tracking agree
// with each other. Not tied to a real epoch/ephemeris -- this is a
// back-of-the-envelope visualization, not an astrodynamics tool.
export const SUN_DIRECTION = new THREE.Vector3(-0.82, 0.32, 0.47).normalize();
