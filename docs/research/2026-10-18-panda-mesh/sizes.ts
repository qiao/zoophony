/**
 * Gives the scale of each size option of the panda mesh, the `app.shoulders` of its variant of
 * `pnpm rig-mesh panda --check --set`, and the arm factors of the arm options.
 * Usage: node docs/research/2026-10-18-panda-mesh/sizes.ts
 *
 * A variant of `--set` keeps the meters for each unit of the base: its `app.shoulders` X gives the
 * scale X / (the shoulder height of the base), whatever its leg factor (`variantText()` of
 * `tools/rig-mesh.ts`). The head top is the top of the skull, 0.986 u in the source, with no ear:
 * the head top of the parametric panda and of the red fox also leaves the ears out.
 */
import { readFileSync } from 'node:fs';

import { armReach, parseConfig, setConfig, shoulderHeight } from '../../../tools/rig-mesh.ts';

const text = readFileSync('tools/mesh-rigs/panda.json', 'utf8');
const base = parseConfig(text);
const SKULL = 0.986;
const EARS = 1.0;
const H_UNITS = 0.410 / 1.318457;
const sBase = shoulderHeight(base);
/** The full reach of the parametric panda (shoulder to the middle of the palm), and the IK reach
 * that the slide travel needs in the geometry of the parametric panda (slide-probe.txt). */
const PARAM_FULL = 0.6521;
const IK_NEED = { first: 0.483, param: 0.6327, half: 0.7295, whole: 0.9911 };
const ARM_REACH = 0.97;
const hips = base.joints.hips?.head ?? [0, 0, 0];
const shoulder = base.joints.upper_arm_L?.head ?? [0, 0, 0];
const trunkUnits = Math.hypot(shoulder[1] - hips[1], shoulder[2] - hips[2]);

const sizes = [
  ['A parametric panda', 1.3],
  ['B bear conductor', 1.483],
  ['C red fox', 1.57],
] as const;
console.log(`shoulder height of the base ${sBase} u, trunk (hips joint to the middle of the shoulder joints) ${trunkUnits.toFixed(4)} u`);
for (const leg of [1, 1.5]) {
  const config = parseConfig(setConfig(text, `legFactor=${leg}`));
  const sh = shoulderHeight(config);
  const rise = sh - sBase;
  for (const [name, top] of sizes) {
    const k = top / (SKULL + rise);
    const x = k * sBase;
    const full1 = armReach({ ...config, app: { ...config.app, shoulders: k * sh } }, 'L', 1);
    const paw = armReach({ ...config, app: { ...config.app, shoulders: k * sh } }, 'L', 0);
    const bones = full1 - paw;
    const fullFactor = (target: number): number => (target - paw) / bones;
    const ikFactor = (target: number): number => (target - paw) / (ARM_REACH * bones);
    const ratio = (f: number): number => (paw + f * bones) / (trunkUnits * k);
    console.log(
      `leg ${leg} ${name}: head top ${top} m, ears ${(k * (EARS + rise)).toFixed(3)} m, scale ${k.toFixed(6)} m/u, app.shoulders=${x.toFixed(6)} for --set, ` +
        `shoulder joints ${(k * sh).toFixed(4)} m, H ${(k * H_UNITS).toFixed(3)} m, reach with factor 1 ${full1.toFixed(4)} m ` +
        `(arm/trunk ${ratio(1).toFixed(2)}); factor for the reach of the parametric panda ${fullFactor(PARAM_FULL).toFixed(3)} (arm/trunk ${ratio(fullFactor(PARAM_FULL)).toFixed(2)}), ` +
        `for the slide of main (0.17 m) ${ikFactor(IK_NEED.param).toFixed(3)}, for half the travel ${ikFactor(IK_NEED.half).toFixed(3)} (arm/trunk ${ratio(ikFactor(IK_NEED.half)).toFixed(2)}), ` +
        `for the whole travel ${ikFactor(IK_NEED.whole).toFixed(3)} (arm/trunk ${ratio(ikFactor(IK_NEED.whole)).toFixed(2)}), for the arm/trunk of the red fox (0.91) ${((0.91 * trunkUnits * k - paw) / bones).toFixed(3)}`,
    );
  }
}
