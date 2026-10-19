/**
 * Scans variants of the contrabass hold of the hippo: for each variant (a bass scale and a list
 * of hold changes), it prints the reached part of the fingerboard (stopRange) and of the hair
 * (bowRange), the points of the bass, and the gap from the contact point to the front of the
 * belly at its height. Usage: node docs/research/2026-10-18-hippo-mesh/bass-scan.ts '<scale>|<changes>' ...
 */
import { Quaternion, Vector3 } from 'three';

import { setHolds } from '../../../tools/hold-sets.ts';

import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { SPECIES } from '../../../src/models/species.ts';
import { bowedRig, holdOf, playingFrames } from '../../../src/pose/bowed-rig.ts';
import { poseShoulder } from '../../../src/pose/ik.ts';
import { createBowPlaces, instrumentAt, shoulderTurn } from '../../../src/pose/bowed.ts';

const BODY: readonly BoneName[] = ['hips', 'spine', 'chest', 'neck', 'head', 'thighL', 'thighR'];

for (const arg of process.argv.slice(2)) {
  const [scaleText, changes] = arg.split('|');
  // SAFETY: a probe changes the parameters of the species in memory for one variant.
  (SPECIES.hippo as { bassScale?: number }).bassScale = Number(scaleText);
  const set = changes ? setHolds(changes) : null;
  try {
    const model = buildPlayer('hippo', 'contrabass', 4, 'stand');
    const rig = bowedRig(model, 'contrabass', holdOf('hippo', 'contrabass'));
    const frames = playingFrames(rig);
    const { place } = createBowPlaces();
    instrumentAt(rig, frames, 1, place);
    const posed = (p: readonly number[]): Vector3 =>
      new Vector3(p[0], p[1], p[2]).sub(new Vector3(...rig.pivot)).applyQuaternion(place.rotation).add(place.pivot);
    const shoulderL = poseShoulder(rig.armL, frames.chest, rig.chestBind, new Quaternion()).position;
    const shoulderR = poseShoulder(rig.armR, frames.chest, rig.chestBind, shoulderTurn(rig, 1, new Quaternion())).position;
    const nut = posed(rig.nut);
    const contact = posed(rig.contact);
    // The front of the bind body at the height of the contact point, within 0.2 m of the middle.
    const body = new Set(BODY.map((b) => boneIndex(b)));
    let front = Infinity;
    for (let v = 0; v < model.mesh.bones.length; v++) {
      const y = model.mesh.positions[v * 3 + 1] ?? 0;
      if (body.has(model.mesh.bones[v] ?? -1) && Math.abs(y - contact.y) < 0.05 && Math.abs(model.mesh.positions[v * 3] ?? 0) < 0.2) {
        front = Math.min(front, model.mesh.positions[v * 3 + 2] ?? 0);
      }
    }
    const f = (v: Vector3): string => v.toArray().map((x) => x.toFixed(2)).join(',');
    const dy = shoulderR.y - contact.y;
    console.log(
      `${arg}: below R ${dy.toFixed(2)} stop ${rig.stopRange.map((x) => x.toFixed(2)).join('..')} bow ${rig.bowRange.map((x) => x.toFixed(3)).join('..')} of ${rig.hairLength.toFixed(3)} | nut ${f(nut)} contact ${f(contact)} | shoulders L ${f(shoulderL)} R ${f(shoulderR)} | L to nut ${shoulderL.distanceTo(nut).toFixed(3)} R to contact ${shoulderR.distanceTo(contact).toFixed(3)} reach ${rig.armL.reach.toFixed(3)} | contact before belly ${(front - contact.z).toFixed(3)} m`,
    );
  } finally {
    set?.undo();
  }
}
