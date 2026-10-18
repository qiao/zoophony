#!/bin/zsh
# Rigs the panda config with a copy of tools/blender/rig_mesh.py that also writes its arrays
# (the faces, the texture samples, the weights, the colors, and the module index of each face)
# into scratch/marks/<name>.npz: docs/research/2026-10-18-panda-marks/dump.sh <name> [<config>]
set -e
name=$1
config=${2:-tools/mesh-rigs/panda.json}
mkdir -p scratch/marks
cp tools/blender/rig_mesh.py scratch/marks/rig_dump.py
perl -0pi -e 's/(    order = locality_order\(tris_all\)\n)/    pre_colors_all, pre_materials = colors_all.copy(), materials.copy()\n$1/; s/(    write_glb\(out_path, config, bind_all)/    np.savez_compressed(os.environ["DUMP"], verts=verts, long_verts=long_verts, tris=tris, uvs=uvs,\n                        texture=texture, colors=colors, dark=dark, weights=weights, bind=bind,\n                        src_all=src_all, bind_all=bind_all, tris_all_pre=tris_all[np.argsort(order)],\n                        colors_all_pre=pre_colors_all, materials_pre=pre_materials, order=order,\n                        module=module_faces(order, materials), weights_all=weights_all,\n                        source_tris=source_tris)\n$1/' scratch/marks/rig_dump.py
DUMP=scratch/marks/$name.npz blender -b --factory-startup --python-exit-code 1 \
  --python scratch/marks/rig_dump.py -- $config scratch/marks/$name.rig.glb > scratch/marks/$name-rig.log 2>&1
echo "scratch/marks/$name.npz"
