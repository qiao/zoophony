// Prints the bend of each bind paw of each studio body off its forearm, split into the plane of
// the palm and the palm normal.
import { Vector3 } from 'three';

import { STUDIO_BODIES } from '../../../../src/models/studio-body.ts';

for (const [name, body] of Object.entries(STUDIO_BODIES)) {
  const h = body.heads as Record<string, readonly number[]>;
  const parts: string[] = [];
  for (const side of ['L', 'R'] as const) {
    const v = (n: string): Vector3 => new Vector3().fromArray(h[`${n}_${side}`] as number[]);
    const fore = v('hand').sub(v('forearm')).normalize();
    const paw = v('fingers').sub(v('hand')).normalize();
    const palm = new Vector3().fromArray(body.palms[side] as unknown as number[]);
    const p = palm.clone().addScaledVector(fore, -palm.dot(fore)).normalize();
    const s = new Vector3().crossVectors(fore, p);
    const deg = (x: number): string => ((x * 180) / Math.PI).toFixed(1);
    parts.push(`${side} ${deg(Math.acos(Math.min(1, paw.dot(fore))))} (plane ${deg(Math.atan2(paw.dot(s), paw.dot(fore)))}, palm ${deg(Math.asin(paw.dot(p)))})`);
  }
  console.log(`${name}: ${parts.join(', ')}`);
}
