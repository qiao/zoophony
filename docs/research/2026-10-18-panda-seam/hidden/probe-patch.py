"""Applies (or with --revert, checks out) the visibility probe patch of src/scene/player.ts: the
studio body of the panda (3146 faces) draws each turned face in a pure color and each other face
black, with no light, on both sides. The instrument keeps its vertex colors, with no light."""
import subprocess
import sys

path = 'src/scene/player.ts'
if '--revert' in sys.argv:
    subprocess.run(['git', 'checkout', path], check=True)
    sys.exit(0)
s = open(path).read()
s = s.replace("import { Bone, BufferAttribute, Matrix4, Mesh, Skeleton, SkinnedMesh, Vector3 } from 'three';",
              "import { Bone, BufferAttribute, DoubleSide, Matrix4, Mesh, MeshBasicMaterial, Skeleton, SkinnedMesh, Vector3 } from 'three';", 1)
old = """function createStudioGeometry(model: PlayerModel, rig: StudioRig): BufferGeometry {
  const render = studioRenderMesh(rig, model.mesh);
  const geometry = createGeometry(render.data);"""
new = """const PROBE_FACES: Record<number, [number, number, number]> = __FACES__;
function createStudioGeometry(model: PlayerModel, rig: StudioRig): BufferGeometry {
  const render = studioRenderMesh(rig, model.mesh);
  const geometry = createGeometry(render.data);
  if (rig.mesh.corners.length === 3146 * 3) {
    const color = geometry.getAttribute('color');
    for (let c = 0; c < rig.mesh.corners.length; c++) {
      const rgb = PROBE_FACES[Math.floor(c / 3)] ?? [0, 0, 0];
      color.setXYZ(c, rgb[0], rgb[1], rgb[2]);
    }
    color.needsUpdate = true;
  }"""
assert old in s
faces = sys.argv[1]
s = s.replace(old, new.replace("__FACES__", faces), 1)
old = """  const mesh = new SkinnedMesh(geometry, [...materials]);
  const bones = Array.from({ length: STUDIO_POSE_BONES }, () => {"""
new = """  const probe = rig.mesh.corners.length === 3146 * 3;
  const mesh = new SkinnedMesh(
    geometry,
    probe
      ? [new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, toneMapped: false })]
      : [...materials],
  );
  const bones = Array.from({ length: STUDIO_POSE_BONES }, () => {"""
assert old in s
s = s.replace(old, new, 1)
open(path, 'w').write(s)
