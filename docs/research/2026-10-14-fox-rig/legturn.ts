import { Quaternion, Vector3 } from 'three';
const src = new Vector3(0.078 - 0.085, 0.125 - 0.23, 0.03 - 0.04).normalize();
for (const [down, out] of [[5, 8], [10, 8], [15, 8], [20, 8]] as const) {
  const r = (d: number) => (d * Math.PI) / 180;
  const d = new Vector3(Math.sin(r(out)) * Math.cos(r(down)), -Math.sin(r(down)), Math.cos(r(out)) * Math.cos(r(down)));
  const q = new Quaternion().setFromUnitVectors(d, src);
  console.log(down, out, [q.x, q.y, q.z, q.w].map((v) => +v.toFixed(6)), 'angle', ((2 * Math.acos(q.w) * 180) / Math.PI).toFixed(1));
}
