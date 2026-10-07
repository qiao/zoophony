import { Vector3 } from 'three';

import type { PlayerModel } from '../models/player.ts';
import { boneIndex } from '../models/rig.ts';
import type { Vec3 } from '../models/tuples.ts';

/**
 * The arms of option B (`docs/research/2026-10-06-cute-furry-spec.md`, 2.4), which the user chose
 * on 2026-10-07. Values in H. The plump torso, the shoulders, and the mittens of option B are in
 * the models (design 4.5). The forearms are not yet.
 */
export const PLUMP_TARGETS = {
  /** The radii of the arm at the shoulder, the elbow, and the wrist. */
  arm: [0.2, 0.17, 0.15],
} as const;

/** The radii of the arm of `main` at the shoulder, the elbow, and the wrist, in H. */
const MAIN_ARM = [0.2, 0.16, 0.12] as const;

/**
 * Moves the corners of an arm part away from the axis of its bone: the radius changes from one
 * factor at the start joint to another at the end joint. Above the start joint, the dome of the
 * shoulder grows by the first factor.
 *
 * @param p The corner. The function moves it in place.
 * @param from The start joint.
 * @param to The end joint, below the start joint in the bind pose.
 * @param factors The factors of the radius at the two joints.
 */
function thicken(p: Vector3, from: Vec3, to: Vec3, factors: readonly [number, number]): void {
  const t = Math.min(1, Math.max(0, (from[1] - p.y) / (from[1] - to[1])));
  const k = factors[0] + (factors[1] - factors[0]) * t;
  p.x = from[0] + (p.x - from[0]) * k;
  p.z = from[2] + (p.z - from[2]) * k;
  if (p.y > from[1]) {
    p.y = from[1] + (p.y - from[1]) * factors[0];
  }
}

/**
 * Gives the arms of a player the radii of option B: the forearms grow from 0.16 and 0.12 H to
 * 0.17 and 0.15 H at the elbow and the wrist. The torso of the model is already plump, so the
 * function changes only the arms. Only tests use this function, so the rest poses leave room for
 * the arms of option B before they come.
 *
 * @param model The player model of `main`.
 * @returns The model with the thicker arms.
 */
export function plumpModel(model: PlayerModel): PlayerModel {
  const at = (bone: Parameters<typeof boneIndex>[0]): Vec3 =>
    model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0];
  const arm = PLUMP_TARGETS.arm.map((r, i) => r / (MAIN_ARM[i] ?? r));
  const thick = new Map<number, (p: Vector3) => void>();
  for (const side of ['L', 'R'] as const) {
    const [shoulder, elbow, wrist] = [
      at(`upperArm${side}`),
      at(`forearm${side}`),
      at(`hand${side}`),
    ];
    thick.set(boneIndex(`upperArm${side}`), (p) =>
      thicken(p, shoulder, elbow, [arm[0] ?? 1, arm[1] ?? 1]),
    );
    thick.set(boneIndex(`forearm${side}`), (p) =>
      thicken(p, elbow, wrist, [arm[1] ?? 1, arm[2] ?? 1]),
    );
  }

  const { positions, bones } = model.mesh;
  const out = new Float32Array(positions);
  const p = new Vector3();
  for (let v = 0; v < bones.length; v++) {
    const grow = thick.get(bones[v] ?? 0);
    if (grow) {
      p.fromArray(out, v * 3);
      grow(p);
      p.toArray(out, v * 3);
    }
  }

  return { ...model, mesh: { ...model.mesh, positions: out } };
}
