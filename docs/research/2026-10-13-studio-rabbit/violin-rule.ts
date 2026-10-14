import { Quaternion, Vector3 } from 'three';
import { buildPlayer } from '../../../src/models/player.ts';
import { SPECIES } from '../../../src/models/species.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { placePoint } from '../../../src/models/instruments/hold.ts';
import { VIOLIN, STRING_SCALES } from '../../../src/models/instruments/strings.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';
import { createBowPlaces, instrumentAt } from '../../../src/pose/bowed.ts';
import { poseShoulder } from '../../../src/pose/ik.ts';

/** Gives the distance from the left shoulder joint to the scroll tip in the playing pose, and the arm length to the palm middle. */
export function measure(species: SpeciesId, support: 'chair' | 'stand', scale: number) {
  (SPECIES[species] as { violinScale?: number }).violinScale = scale;
  const m = buildPlayer(species, 'violin', 4, support);
  const rig = bowedRig(m, 'violin', holdOf(species, 'violin'));
  const lean = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -rig.hold.lean);
  const spine = new Vector3(...rig.spineBind);
  const frames = {
    root: { rotation: new Quaternion(), position: new Vector3() },
    chest: { rotation: lean, position: new Vector3(...rig.chestBind).sub(spine).applyQuaternion(lean).add(spine) },
  };
  const { place } = createBowPlaces();
  instrumentAt(rig, frames, 1, place);
  const s = STRING_SCALES.violin * scale;
  const tipBind = new Vector3(...placePoint(m.pieces, { bone: 'instrument', at: [VIOLIN.length * s, VIOLIN.stringHeight * s, 0] }));
  const tip = tipBind.sub(new Vector3(...rig.pivot)).applyQuaternion(place.rotation).add(place.pivot);
  const shoulder = poseShoulder(rig.armL, frames.chest, rig.chestBind, new Quaternion()).position;
  const p = (b: string) => new Vector3(...m.skeleton.positions[boneIndex(b as never)]!);
  const arm = p('upperArmL').distanceTo(p('forearmL')) + p('forearmL').distanceTo(p('handL')) + p('handL').distanceTo(new Vector3(...m.body.palmL));
  return { scroll: tip.distanceTo(shoulder), arm, length: VIOLIN.length * s, stop: rig.stopRange, bow: rig.bowRange, hair: rig.hairLength };
}

if (import.meta.main) {
const species = (process.argv[2] ?? 'rabbit') as SpeciesId;
for (const scale of (process.argv[3] ?? "1").split(",").map(Number)) {
  for (const support of ['chair', 'stand'] as const) {
    const r = measure(species, support, scale);
    console.log(species, support, 'scale', scale, 'violin', r.length.toFixed(3), 'shoulder->scroll', r.scroll.toFixed(3), 'arm to palm', r.arm.toFixed(3), 'stop', r.stop.map((v) => v.toFixed(2)).join('..'), 'bow', r.bow.map((v) => v.toFixed(3)).join('..'), 'hair', r.hair.toFixed(3));
  }
}
}
