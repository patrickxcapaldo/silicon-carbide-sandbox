import * as THREE from 'three';
import { DEFAULT_SUN_DIRECTION } from '../sandbox/orbitalMechanics';

// The same fixed, illustrative sun direction the eclipse calculation in the
// kernel uses, converted to a THREE.Vector3 here so that the lighting, the
// solar array tracking and the computed eclipse duty cycle all agree with
// each other. Not tied to a real epoch, season or beta angle: this is a
// back-of-the-envelope visualisation rather than an astrodynamics tool.
export const SUN_DIRECTION = new THREE.Vector3(...DEFAULT_SUN_DIRECTION);
