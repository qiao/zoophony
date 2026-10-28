import { STUDIO_BODIES } from '../src/models/studio-body.ts';
for (const [name, body] of Object.entries(STUDIO_BODIES)) {
  const h = body.heads as unknown as Record<string, [number, number, number]>;
  const d = (a: string, b: string): number => Math.hypot(...h[a]!.map((v, i) => v - h[b]![i]!));
  const upper = d('upper_arm_L', 'forearm_L');
  const fore = d('forearm_L', 'hand_L');
  const trunk = d('hips', 'neck');
  const H = body.headHeight;
  console.log(`${name.padEnd(12)} H ${H.toFixed(3)} arm ${(upper + fore).toFixed(3)} m = ${((upper + fore) / H).toFixed(2)} H, hips-neck ${(trunk / H).toFixed(2)} H, arm/trunk ${((upper + fore) / trunk).toFixed(2)}`);
}
