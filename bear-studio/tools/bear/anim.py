"""Bakes the clips of motion.py into Blender actions (one action per clip, one NLA track each).

The glTF exporter writes each action as one animation of the GLB.
"""

import bpy
import numpy as np

import motion
from mesh import from_blender
from pose import Skeleton, slerp

# Blender world axes to three.js axes, for directions.
TO_THREE = np.array([[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]])


def skeleton_of(arm, layout_bones):
    """Reads the rest pose of the armature into a Skeleton (three.js axes)."""
    names, parents, heads, rests = [], {}, {}, {}
    for bone in arm.data.bones:
        names.append(bone.name)
        parents[bone.name] = bone.parent.name if bone.parent else None
        heads[bone.name] = from_blender(np.array(bone.head_local))
        m = np.array(bone.matrix_local.to_3x3())
        rests[bone.name] = TO_THREE @ m
    extras = {}
    for side in ('L', 'R'):
        r = rests[f'hand_{side}']
        extras[f'fingers_{side}'] = r[:, 1]
        extras[f'palm_{side}'] = r[:, 2]
    grip, tip = layout_bones['baton'][0], layout_bones['baton'][1]
    d = tip - grip
    extras['baton_R'] = d / np.linalg.norm(d)
    return Skeleton(names, parents, heads, rests, extras)


def sample_clip(skel, fn, duration, start=0.0):
    """Solves a clip at each frame. Returns a list of {bone: (quat, loc, scale)}."""
    frames = max(1, int(round(duration * motion.FPS))) + 1
    return [skel.solve(fn(start + i / motion.FPS))[0] for i in range(frames)]


def sample_performance(skel):
    """Solves the performance: the clips in order, with short blends at the joins."""
    out = []
    t_total = sum(seg[2] for seg in motion.PERFORMANCE)
    starts = np.cumsum([0.0] + [seg[2] for seg in motion.PERFORMANCE])
    n = int(round(t_total * motion.FPS)) + 1
    for i in range(n):
        t = i / motion.FPS
        k = min(int(np.searchsorted(starts, t, side='right')) - 1, len(motion.PERFORMANCE) - 1)
        name, t0, _ = motion.PERFORMANCE[k]
        fn = motion.CLIPS[name][0]
        pose = skel.solve(fn(t0 + t - starts[k]))[0]
        # Blend from the end of the segment before.
        since = t - starts[k]
        if k > 0 and since < motion.BLEND:
            pname, pt0, pdur = motion.PERFORMANCE[k - 1]
            prev = skel.solve(motion.CLIPS[pname][0](pt0 + pdur + since))[0]
            w = since / motion.BLEND
            w = w * w * (3 - 2 * w)
            pose = {b: (slerp(prev[b][0], pose[b][0], w), prev[b][1] * (1 - w) + pose[b][1] * w,
                        prev[b][2] * (1 - w) + pose[b][2] * w) for b in pose}
        out.append(pose)
    return out


def write_action(arm, name, poses):
    """Writes sampled poses into a new action of the armature, with linear keys."""
    action = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = action
    frames = np.arange(len(poses), dtype=np.float32)
    for bone in poses[0]:
        q = np.array([p[bone][0] for p in poses])
        for i in range(1, len(q)):
            if np.dot(q[i], q[i - 1]) < 0:
                q[i] = -q[i]
        channels = [('rotation_quaternion', q)]
        if bone == 'hips':
            channels.append(('location', np.array([p[bone][1] for p in poses])))
        if bone == 'baton':
            s = np.array([p[bone][2] for p in poses])
            channels.append(('scale', np.stack([s, s, s], axis=1)))
        pb = arm.pose.bones[bone]
        pb.rotation_mode = 'QUATERNION'
        for prop, values in channels:
            path = f'pose.bones["{bone}"].{prop}'
            for idx in range(values.shape[1]):
                fc = action.fcurve_ensure_for_datablock(arm, path, index=idx)
                fc.keyframe_points.add(len(poses))
                co = np.stack([frames, values[:, idx].astype(np.float32)], axis=1)
                fc.keyframe_points.foreach_set('co', co.ravel())
                fc.keyframe_points.foreach_set('interpolation', [1] * len(poses))
                fc.update()
    action.use_fake_user = True
    arm.animation_data.action = None
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 0, action)
    strip.name = name
    track.mute = True
    return action


def bake_all(arm, layout_bones, only=None):
    """Bakes every clip and the performance into actions."""
    skel = skeleton_of(arm, layout_bones)
    names = []
    for name, (fn, duration) in motion.CLIPS.items():
        if only and name not in only:
            continue
        write_action(arm, name, sample_clip(skel, fn, duration))
        names.append(name)
    if not only or 'performance' in only:
        write_action(arm, 'performance', sample_performance(skel))
        names.append('performance')
    bpy.context.scene.render.fps = motion.FPS
    return names, skel
