/**
 * Measures the side posture of the seated rabbit in the app, in the bind, the rest, and the play
 * (model axes: the player faces -z, the chair back is at +z, the floor at y 0):
 *
 * - hip: the angle of the trunk axis (the middle of the hip joints to the neck joint) and the
 *   right thigh axis (hip joint to knee joint), and the lean of the trunk axis from vertical;
 * - back: the gap of the back of the body (the corners of the hips, the spine, and the chest
 *   within the chair width, between the seat top and the rail top) to the front face of the
 *   chair back (the rail and the posts share one plane);
 * - lap: the side silhouette of the right side, on a grid of 4 mm. For each column along z, the
 *   top of the right thigh, and a hit when a trunk cell lies within 2 cm above it. The visible lap
 *   is the run of columns from the knee back with no hit, horizontal and along the thigh;
 * - soles: the lowest corner of the heel half and of the toe half of the right foot;
 * - seat: the seat height and depth.
 *
 * Usage, from the root of the worktree: node docs/research/2026-10-17-rabbit-pose/side-probe.ts <label>. The files mock-side.txt, side-main.txt, and side-branch.txt hold its output.
 */
import { Vector3 } from 'three';

import { galleryPlan } from '../../../src/gallery/plan.ts';
import type { GalleryAnimal } from '../../../src/gallery/plan.ts';
import { galleryTransport } from '../../../src/gallery/items.ts';
import { CONDUCTOR } from '../../../src/models/cast.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import type { PlayerModel } from '../../../src/models/player.ts';
import { CHAIR, chairBack } from '../../../src/models/props.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED } from '../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';

const label = process.argv[2] ?? 'probe';
const ids = (names: readonly BoneName[]): Set<number> => new Set(names.map(boneIndex));
const trunk = ids(['hips', 'spine', 'chest']);
const thighR = ids(['thighR']);
const footR = ids(['footR']);
const deg = (r: number): string => ((r * 180) / Math.PI).toFixed(1);
const cm = (v: number): string => (v * 100).toFixed(1);
const CELL = 0.004;

/** The corners and the joints of one pose. */
interface Shape {
  readonly corner: (c: number) => Vector3;
  readonly joint: (bone: BoneName) => Vector3;
}

/**
 * Measures one pose.
 *
 * @param model The player model.
 * @param shape The corners and the joints.
 * @returns The text of the measures.
 */
function measure(model: PlayerModel, shape: Shape): string {
  const { bones } = model.mesh;
  const hip = shape.joint('thighL').add(shape.joint('thighR')).multiplyScalar(0.5);
  const hipR = shape.joint('thighR');
  const knee = shape.joint('shinR');
  const neck = shape.joint('neck');
  const tf = -(neck.z - hip.z);
  const ty = neck.y - hip.y;
  const hf = -(knee.z - hipR.z);
  const hy = knee.y - hipR.y;
  const angle = Math.acos((tf * hf + ty * hy) / Math.hypot(tf, ty) / Math.hypot(hf, hy));
  const lean = Math.atan2(tf, ty);
  const slope = Math.atan2(-hy, hf);

  const seat = model.seat;
  let back = 'no seat';
  if (seat) {
    const rail = chairBack(seat.seatHeight)[2];
    if (rail) {
      let most = -Infinity;
      let at = 0;
      for (let c = 0; c < bones.length; c++) {
        if (!trunk.has(bones[c] ?? -1)) {
          continue;
        }
        const p = shape.corner(c);
        if (Math.abs(p.x) < CHAIR.seatWidth / 2 && p.y > seat.seatHeight && p.y < rail.max[1]) {
          if (p.z > most) {
            most = p.z;
            at = p.y;
          }
        }
      }
      back = `${cm(rail.min[2] - most)} cm at ${cm(at - seat.seatHeight)} cm above the seat`;
    }
  }

  // The side silhouette of the right side: thigh cells and trunk cells on a grid of z and y.
  const thighTop = new Map<number, number>();
  const trunkCells = new Map<number, Set<number>>();
  for (let t = 0; t + 2 < bones.length; t += 3) {
    const tb = [bones[t] ?? 0, bones[t + 1] ?? 0, bones[t + 2] ?? 0];
    const count = (s: Set<number>): number => tb.filter((b) => s.has(b)).length;
    const isThigh = count(thighR) >= 2;
    const isTrunk = count(trunk) >= 2;
    if (!isThigh && !isTrunk) {
      continue;
    }
    const a = shape.corner(t);
    const b = shape.corner(t + 1);
    const c = shape.corner(t + 2);
    if (isTrunk && Math.max(a.x, b.x, c.x) < -0.02) {
      continue;
    }
    const len = Math.max(a.distanceTo(b), a.distanceTo(c), b.distanceTo(c));
    const n = Math.max(1, Math.ceil(len / (CELL / 2)));
    for (let i = 0; i <= n; i++) {
      for (let j = 0; i + j <= n; j++) {
        const u = i / n;
        const v = j / n;
        const w = 1 - u - v;
        const z = w * a.z + u * b.z + v * c.z;
        const y = w * a.y + u * b.y + v * c.y;
        const col = Math.round(z / CELL);
        if (isThigh) {
          thighTop.set(col, Math.max(thighTop.get(col) ?? -Infinity, y));
        } else {
          const set = trunkCells.get(col) ?? new Set<number>();
          set.add(Math.round(y / CELL));
          trunkCells.set(col, set);
        }
      }
    }
  }
  const cols = [...thighTop.keys()].toSorted((p, q) => p - q);
  let run = 0;
  for (const col of cols) {
    const top = Math.round((thighTop.get(col) ?? 0) / CELL);
    const cells = trunkCells.get(col);
    let hit = false;
    for (let k = 1; k <= 5 && !hit; k++) {
      hit = cells?.has(top + k) ?? false;
    }
    if (hit) {
      break;
    }
    run++;
  }
  const lap = run * CELL;

  let heel = Infinity;
  let toe = Infinity;
  const ankle = shape.joint('footR');
  for (let c = 0; c < bones.length; c++) {
    if (!footR.has(bones[c] ?? -1)) {
      continue;
    }
    const p = shape.corner(c);
    if (p.z > ankle.z - 0.03) {
      heel = Math.min(heel, p.y);
    } else {
      toe = Math.min(toe, p.y);
    }
  }
  return (
    `hip ${deg(angle)}°, trunk lean ${deg(lean)}° fwd, thigh ${deg(slope)}° down; back to the ` +
    `chair back ${back}; visible lap ${cm(lap)} cm (${cm(lap / Math.cos(slope))} cm along the ` +
    `thigh); soles heel ${cm(heel)} toes ${cm(toe)} cm`
  );
}

const model = buildPlayer('rabbit', 'violin', 4, 'chair');
const seat = model.seat;
const p = model.mesh.positions;
const bind: Shape = {
  corner: (c) => new Vector3(p[c * 3], p[c * 3 + 1], p[c * 3 + 2]),
  joint: (bone) => new Vector3(...(model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0])),
};
console.log(
  `${label} seat ${cm(seat?.seatHeight ?? 0)} cm high, ${cm(seat?.seatDepth ?? CHAIR.seatDepth)} cm deep`,
);
console.log(`${label} bind: ${measure(model, bind)}`);
const animal: GalleryAnimal = {
  model,
  place: {
    position: [0, 0, 0],
    facing: Math.PI,
    cast: {
      species: 'rabbit',
      instrument: 'violin',
      support: 'chair',
      seatIndex: 0,
      player: 0,
      kettles: 4,
    },
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
for (const [name, transport, song] of [
  ['rest', NOT_STARTED, 0],
  ['play', galleryTransport(new URLSearchParams()), 5],
] as const) {
  const scene = poseAt(plan, song, 20, transport, [], buffer);
  const pose = scene.players[0];
  if (!pose) {
    throw new Error('no pose');
  }
  const posed = poseSkeleton(model, pose);
  const shape: Shape = {
    corner: (c) => new Vector3(...posedCorner(posed, c)),
    joint: (bone) => posed.frames[boneIndex(bone)]?.position.clone() ?? new Vector3(),
  };
  console.log(`${label} ${name}: ${measure(model, shape)}`);
}
