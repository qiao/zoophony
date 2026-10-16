/**
 * Measures the rest pose of the violin of the seated rabbit and red fox (design 5.2), in the model
 * axes (the player faces -z), at four wall times of the rest before the first play:
 *
 * - the lower end of the violin: its lowest corner, and the distance from the corners of the
 *   violin within 2 cm of it to the nearest triangle of the skin of the thighs and the hips (0
 *   when a corner is inside the skin: the sweep gives the depth);
 * - the bow: the height of the tip above the frog, and how far the tip reaches past the front of
 *   the knees toward the music stand (negative is behind the knees);
 * - the elbows: the distance of each elbow joint from the side of the trunk at its height.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-16-seat-rest/rest-probe.ts [--set <changes>]
 *
 * `--set` changes the holds in memory with the syntax of `pnpm pose-depth --set`.
 */
import { Triangle, Vector3 } from 'three';

import { galleryPlan } from '../../../src/gallery/plan.ts';
import type { GalleryAnimal } from '../../../src/gallery/plan.ts';
import { CONDUCTOR } from '../../../src/models/cast.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED } from '../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const sets = process.argv.slice(2).flatMap((arg, i, all) => (all[i - 1] === '--set' ? [arg] : []));
const restore = sets.length > 0 ? setHolds(sets.join(';')).undo : null;

const ids = (names: readonly BoneName[]): Set<number> => new Set(names.map(boneIndex));
const lap = ids(['thighL', 'thighR', 'hips']);
const legs = ids(['thighL', 'thighR']);
const trunk = ids(['hips', 'spine', 'chest']);
const cm = (v: number): string => (v * 100).toFixed(1);

for (const species of ['rabbit', 'fox-red'] as SpeciesId[]) {
  const model = buildPlayer(species, 'violin', 4, 'chair');
  const animal: GalleryAnimal = {
    model,
    place: {
      position: [0, 0, 0],
      facing: Math.PI,
      cast: { species, instrument: 'violin', support: 'chair', seatIndex: 0, player: 0, kettles: 4 },
    },
  };
  const conductor: GalleryAnimal = {
    model: buildPlayer(CONDUCTOR.species, CONDUCTOR.instrument),
    place: {
      position: [3, 0, 0],
      facing: Math.PI,
      cast: { ...CONDUCTOR, support: 'stand', seatIndex: 1, player: 0, kettles: 4 },
    },
  };
  const plan = galleryPlan([animal], conductor, []);
  const buffer = createScenePose(plan);
  const { bones } = model.mesh;
  const rows: string[] = [];
  for (const wall of [10, 13.7, 21.1, 29.3]) {
    const pose = poseAt(plan, 0, wall, NOT_STARTED, [], buffer).players[0];
    if (!pose) {
      throw new Error('no pose');
    }
    const posed = poseSkeleton(model, pose);
    const corner = (c: number): Vector3 => new Vector3(...posedCorner(posed, c));
    const violin: Vector3[] = [];
    const bow: Vector3[] = [];
    const skin: Triangle[] = [];
    let kneeFront = Infinity;
    for (let c = 0; c + 2 < bones.length; c += 3) {
      const bone = bones[c] ?? -1;
      if (bone === boneIndex('instrument')) {
        violin.push(corner(c), corner(c + 1), corner(c + 2));
      } else if (bone === boneIndex('bow')) {
        bow.push(corner(c), corner(c + 1), corner(c + 2));
      } else if (lap.has(bone)) {
        skin.push(new Triangle(corner(c), corner(c + 1), corner(c + 2)));
        if (legs.has(bone)) {
          kneeFront = Math.min(kneeFront, corner(c).z, corner(c + 1).z, corner(c + 2).z);
        }
      }
    }
    const low = Math.min(...violin.map((p) => p.y));
    const end = violin.filter((p) => p.y < low + 0.02);
    const near = new Vector3();
    let gap = Infinity;
    for (const p of end) {
      for (const t of skin) {
        t.closestPointToPoint(p, near);
        gap = Math.min(gap, near.distanceTo(p));
      }
    }
    // The ends of the bow: the two corners farthest apart. The frog is the end nearer the right
    // paw.
    let frog = bow[0] ?? new Vector3();
    let tip = frog;
    let far = 0;
    for (const a of bow) {
      for (const b of bow) {
        const d = a.distanceToSquared(b);
        if (d > far) {
          far = d;
          frog = a;
          tip = b;
        }
      }
    }
    const paw = posed.frames[boneIndex('handR')]?.position ?? new Vector3();
    if (tip.distanceTo(paw) < frog.distanceTo(paw)) {
      [frog, tip] = [tip, frog];
    }
    const elbows = (['L', 'R'] as const).map((side) => {
      const elbow = posed.frames[boneIndex(`forearm${side}`)]?.position ?? new Vector3();
      let edge = 0;
      for (let c = 0; c < bones.length; c++) {
        if (!trunk.has(bones[c] ?? -1)) {
          continue;
        }
        const p = corner(c);
        if (Math.abs(p.y - elbow.y) < 0.03) {
          edge = side === 'L' ? Math.min(edge, p.x) : Math.max(edge, p.x);
        }
      }
      return `${side} ${cm(Math.abs(elbow.x) - Math.abs(edge))}`;
    });
    rows.push(
      `wall ${wall}: violin low ${cm(low)} cm at x ${cm(end[0]?.x ?? 0)}, lower end ${cm(gap)} cm from the skin of the thighs; bow tip ${cm(tip.y - frog.y)} cm above the frog, ${cm(kneeFront - tip.z)} cm past the knees; elbows out of the trunk side (cm) ${elbows.join(', ')}`,
    );
  }
  console.log(`${species}:\n  ${rows.join('\n  ')}`);
}
restore?.();
