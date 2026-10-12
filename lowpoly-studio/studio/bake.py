"""Bakes the clips of a role into Blender actions (one action per clip, one NLA track each).

The glTF exporter writes each action as one animation of the GLB. The clips are functions of time
that return pose specs (see templates/<name>/solver.py); the skeleton solves each frame.
"""

import bpy
import numpy as np

from studio.ik import slerp
from studio.mesh import from_blender

# Blender world axes to three.js axes, for directions.
TO_THREE = np.array([[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]])


def armature_rest(arm):
    """Reads the rest pose of an armature (three.js axes): (names, parents, heads, rests)."""
    names, parents, heads, rests = [], {}, {}, {}
    for bone in arm.data.bones:
        names.append(bone.name)
        parents[bone.name] = bone.parent.name if bone.parent else None
        heads[bone.name] = from_blender(np.array(bone.head_local))
        m = np.array(bone.matrix_local.to_3x3())
        rests[bone.name] = TO_THREE @ m
    return names, parents, heads, rests


def sample_clip(skel, fn, duration, fps, start=0.0):
    """Solves a clip at each frame. Returns a list of {bone: (quat, loc, scale)}."""
    frames = max(1, int(round(duration * fps))) + 1
    return [skel.solve(fn(start + i / fps))[0] for i in range(frames)]


def sample_performance(skel, clips, performance, blend, fps):
    """Solves a performance: segments of clips in order, with short blends at the joins.

    performance: [(clip, start time in the clip, duration)].
    """
    out = []
    t_total = sum(seg[2] for seg in performance)
    starts = np.cumsum([0.0] + [seg[2] for seg in performance])
    n = int(round(t_total * fps)) + 1
    for i in range(n):
        t = i / fps
        k = min(int(np.searchsorted(starts, t, side='right')) - 1, len(performance) - 1)
        name, t0, _ = performance[k]
        fn = clips[name][0]
        pose = skel.solve(fn(t0 + t - starts[k]))[0]
        # Blend from the end of the segment before.
        since = t - starts[k]
        if k > 0 and since < blend:
            pname, pt0, pdur = performance[k - 1]
            prev = skel.solve(clips[pname][0](pt0 + pdur + since))[0]
            w = since / blend
            w = w * w * (3 - 2 * w)
            pose = {b: (slerp(prev[b][0], pose[b][0], w), prev[b][1] * (1 - w) + pose[b][1] * w,
                        prev[b][2] * (1 - w) + pose[b][2] * w) for b in pose}
        out.append(pose)
    return out


def write_action(arm, name, poses, loc_bones, scale_bones):
    """Writes sampled poses into a new action of the armature, with linear keys.

    loc_bones get location keys (the hips), scale_bones get scale keys (the props).
    """
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
        if bone in loc_bones:
            channels.append(('location', np.array([p[bone][1] for p in poses])))
        if bone in scale_bones:
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


def write_shape_action(obj, name, values):
    """Writes the weights of the shape keys of obj for one clip, on an NLA track of the same
    name as the clip of the armature, so the glTF exporter merges them into one animation.

    values: {shape key name: array of one weight per frame}.
    """
    key = obj.data.shape_keys
    key.animation_data_create()
    action = bpy.data.actions.new(f'{name}_shapes')
    key.animation_data.action = action
    for shape, w in values.items():
        fc = action.fcurve_ensure_for_datablock(key, f'key_blocks["{shape}"].value', index=0)
        fc.keyframe_points.add(len(w))
        co = np.stack([np.arange(len(w), dtype=np.float32), np.asarray(w, np.float32)], axis=1)
        fc.keyframe_points.foreach_set('co', co.ravel())
        fc.keyframe_points.foreach_set('interpolation', [1] * len(w))
        fc.update()
    action.use_fake_user = True
    key.animation_data.action = None
    track = key.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 0, action)
    strip.name = name
    track.mute = True


def sample_all(skel, pack, only=None, drivers=None):
    """Solves every clip of a role pack (the sheet pose 'reference' first) and its performance.
    No Blender state: the stage cache keeps the result.

    pack: the role pack (pack.clips {name: (fn, duration)}, pack.performance, pack.blend,
    pack.fps). drivers: optional {shape key name: function pose -> weight}; the weights of these
    shape keys are solved for each frame of each clip.
    Returns ({clip: list of sampled poses}, {clip: {shape key name: weights}} or None with no
    drivers).
    """
    samples = {}
    for name, (fn, duration) in pack.clips.items():
        if only and name not in only:
            continue
        samples[name] = sample_clip(skel, fn, duration, pack.fps)
    if pack.performance and (not only or 'performance' in only):
        samples['performance'] = sample_performance(skel, pack.clips, pack.performance,
                                                    pack.blend, pack.fps)
    shape_weights = None
    if drivers is not None:
        shape_weights = {name: {k: [f(p) for p in poses] for k, f in drivers.items()}
                         for name, poses in samples.items()}
    return samples, shape_weights


def write_all(arm, skel_props, fps, samples, shape_obj=None, shape_weights=None):
    """Writes the solved clips into actions: one action of the armature for each clip, and one
    action of the shape keys of shape_obj (with the weights of shape_weights) when it is given."""
    for name, poses in samples.items():
        write_action(arm, name, poses, ('hips',), skel_props)
        if shape_obj is not None:
            write_shape_action(shape_obj, name, shape_weights[name])
    bpy.context.scene.render.fps = fps


def bake_all(arm, skel, pack, only=None, shapes=None):
    """Bakes every clip of a role pack (the sheet pose 'reference' first) and its performance.

    shapes: optional (mesh object, {shape key name: function pose -> weight}); the weights of
    these shape keys are baked for each frame of each clip.
    Returns {clip: list of sampled poses}. The samples are the keys of the actions.
    """
    obj, drivers = shapes if shapes else (None, None)
    samples, shape_weights = sample_all(skel, pack, only, drivers)
    write_all(arm, skel.props, pack.fps, samples, obj, shape_weights)
    return samples


def sample_arrays(samples, names):
    """Packs the samples into arrays {clip: (frames, bones, 8)}: quaternion, location, scale."""
    out = {}
    for clip, poses in samples.items():
        out[clip] = np.array([[np.concatenate([p[b][0], p[b][1], [p[b][2]]]) for b in names]
                              for p in poses])
    return out
