"""Applies a light probe patch of src/scene/player.ts for the elephant studio body (3136 faces),
or with --revert checks the file out. Modes: color (the face colors, no light, front faces),
both (the face colors, no light, both sides), normal (MeshNormalMaterial)."""
import subprocess
import sys

path = 'src/scene/player.ts'
if '--revert' in sys.argv:
    subprocess.run(['git', 'checkout', path], check=True)
    sys.exit(0)
mode = sys.argv[1]
s = open(path).read()
s = s.replace("import { Bone, BufferAttribute, Matrix4, Mesh, Skeleton, SkinnedMesh, Vector3 } from 'three';",
              "import { Bone, BufferAttribute, DoubleSide, FrontSide, Matrix4, Mesh, MeshBasicMaterial, MeshNormalMaterial, Skeleton, SkinnedMesh, Vector3 } from 'three';", 1)
old = """  const mesh = new SkinnedMesh(geometry, [...materials]);
  const bones = Array.from({ length: STUDIO_POSE_BONES }, () => {"""
probe = {
    'color': "new MeshBasicMaterial({ vertexColors: true, side: FrontSide, toneMapped: false })",
    'both': "new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, toneMapped: false })",
    'normal': "new MeshNormalMaterial({ side: FrontSide })",
}[mode]
new = f"""  const probe = rig.mesh.corners.length === 3136 * 3;
  const mesh = new SkinnedMesh(geometry, probe ? [{probe}] : [...materials]);
  void DoubleSide; void FrontSide; void MeshBasicMaterial; void MeshNormalMaterial;
  const bones = Array.from({{ length: STUDIO_POSE_BONES }}, () => {{"""
assert old in s
s = s.replace(old, new, 1)
open(path, 'w').write(s)
print('patched', mode)
