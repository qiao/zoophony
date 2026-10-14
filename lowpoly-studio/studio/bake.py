"""Bakes the clips of a role into Blender actions (one action per clip, one NLA track each).

The glTF exporter writes each action as one animation of the GLB. The clips are functions of time
that return pose specs (see templates/<name>/solver.py); the skeleton solves each frame.
"""

import bpy
import numpy as np

from studio.ik import slerp
from studio.mesh import from_blender

# The change of the last scale key of a hidden scene prop (write_node_actions). The glTF exporter
# drops a node channel that changes by less than 1e-4 in a clip.
HIDDEN_STEP = 1e-3

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


def solve(skel, spec, scene=None, asked=None):
    """Solves one pose spec: {bone: (quat, loc, scale)}, and the scene nodes of scene(spec) (the
    props of studio/props.py ScenePose), which are no bones. asked: a list that gets the reach
    that each IK arm of the pose asks for, [(side, share of the reach)] (None: no record)."""
    if asked is not None:
        skel.asked = []
    pose = skel.solve(spec)[0]
    if asked is not None:
        asked.append(skel.asked)
        skel.asked = None
    if scene is not None:
        pose.update(scene(spec))
    return pose


def sample_clip(skel, fn, duration, fps, start=0.0, scene=None, asked=None):
    """Solves a clip at each frame. Returns a list of {bone or node: (quat, loc, scale)}.
    asked: a list that gets the IK reach of each frame (see solve)."""
    frames = max(1, int(round(duration * fps))) + 1
    return [solve(skel, fn(start + i / fps), scene, asked) for i in range(frames)]


def sample_performance(skel, clips, performance, blend, fps, scene=None, asked=None):
    """Solves a performance: segments of clips in order, with short blends at the joins.

    performance: [(clip, start time in the clip, duration)]. asked: a list that gets the IK
    reach of each frame (see solve), from the segment of the frame.
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
        pose = solve(skel, fn(t0 + t - starts[k]), scene, asked)
        # Blend from the end of the segment before.
        since = t - starts[k]
        if k > 0 and since < blend:
            pname, pt0, pdur = performance[k - 1]
            prev = solve(skel, clips[pname][0](pt0 + pdur + since), scene)
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
        if bone not in arm.pose.bones:
            # A scene node (write_node_actions writes it).
            continue
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


def write_node_actions(objs, name, poses):
    """Writes the transforms of the scene nodes in the sampled poses (the entries that are no
    bones) into one action of each node, on an NLA track of the same name as the clip of the
    armature, so the glTF exporter merges them into one animation.

    Only the channels that leave the rest value get keys: the scale of a hidden prop, and the
    turn of a pressed key. A node with no keys in a clip keeps its rest transform (three.js
    restores it when no action of the clip moves it).
    """
    frames = np.arange(len(poses), dtype=np.float32)
    for node, obj in objs.items():
        if node not in poses[0]:
            continue
        q = np.array([p[node][0] for p in poses])
        for i in range(1, len(q)):
            if np.dot(q[i], q[i - 1]) < 0:
                q[i] = -q[i]
        sc = np.array([p[node][2] for p in poses])
        channels = []
        if np.abs(q - np.array([1.0, 0.0, 0.0, 0.0])).max() > 1e-7:
            channels.append(('rotation_quaternion', q))
        if np.abs(sc - 1.0).max() > 1e-7:
            # The exporter drops a channel that does not change in a clip, and the node then
            # keeps its rest scale of 1. A hidden prop (scale 0 in the whole clip) gets a last key
            # that differs by HIDDEN_STEP, so its channel stays.
            if np.ptp(sc) < HIDDEN_STEP:
                sc = sc.copy()
                sc[-1] += HIDDEN_STEP
            channels.append(('scale', np.stack([sc, sc, sc], axis=1)))
        if not channels:
            continue
        action = bpy.data.actions.new(f'{name}_{node}')
        obj.animation_data_create()
        obj.animation_data.action = action
        obj.rotation_mode = 'QUATERNION'
        for prop, values in channels:
            for idx in range(values.shape[1]):
                fc = action.fcurve_ensure_for_datablock(obj, prop, index=idx)
                fc.keyframe_points.add(len(poses))
                co = np.stack([frames, values[:, idx].astype(np.float32)], axis=1)
                fc.keyframe_points.foreach_set('co', co.ravel())
                fc.keyframe_points.foreach_set('interpolation', [1] * len(poses))
                fc.update()
        action.use_fake_user = True
        obj.animation_data.action = None
        track = obj.animation_data.nla_tracks.new()
        track.name = name
        strip = track.strips.new(name, 0, action)
        strip.name = name
        track.mute = True


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


def sample_all(skel, pack, only=None, drivers=None, scene=None, asked=None):
    """Solves every clip of a role pack (the sheet pose 'reference' first) and its performance.
    No Blender state: the stage cache keeps the result.

    pack: the role pack (pack.clips {name: (fn, duration)}, pack.performance, pack.blend,
    pack.fps). drivers: optional {shape key name: function pose -> weight}; the weights of these
    shape keys are solved for each frame of each clip. scene: optional function spec -> {scene
    node: (quat, loc, scale)} (studio/props.py ScenePose); its nodes join each sampled pose.
    asked: a dict that gets the IK reach of each frame of each clip, {clip: [[(side, share of
    the reach)]]} (see solve).
    Returns ({clip: list of sampled poses}, {clip: {shape key name: weights}} or None with no
    drivers).
    """
    samples = {}
    for name, (fn, duration) in pack.clips.items():
        if only and name not in only:
            continue
        log = asked.setdefault(name, []) if asked is not None else None
        samples[name] = sample_clip(skel, fn, duration, pack.fps, scene=scene, asked=log)
    if pack.performance and (not only or 'performance' in only):
        log = asked.setdefault('performance', []) if asked is not None else None
        samples['performance'] = sample_performance(skel, pack.clips, pack.performance,
                                                    pack.blend, pack.fps, scene, log)
    shape_weights = None
    if drivers is not None:
        shape_weights = {name: {k: [f(p) for p in poses] for k, f in drivers.items()}
                         for name, poses in samples.items()}
    return samples, shape_weights


def reach_report(skel, asked, side='L'):
    """Sums up the IK reach of the clips: the reach of the arm of one side in the bind skeleton,
    and the largest share of the reach that the IK targets of each clip ask for.

    Returns {"ik": the upper arm plus the forearm, "palm": ik plus half the paw (the hand head to
    the mean head of its finger bones: "fingers" or the digits, not the prop bones), "clips":
    {clip: {side: [largest share, frame]}}}. A share above 1 asks for more than the reach: the IK
    stops at the reach.
    """
    h = skel.heads
    s, e, w = h[f'upper_arm_{side}'], h[f'forearm_{side}'], h[f'hand_{side}']
    ik = float(np.linalg.norm(e - s) + np.linalg.norm(w - e))
    kids = [h[n] for n in skel.names
            if skel.parents[n] == f'hand_{side}' and n.startswith('finger')]
    paw = float(np.linalg.norm(np.mean(kids, axis=0) - w)) if kids else 0.0
    clips = {}
    for name, frames in asked.items():
        worst = {}
        for i, arms in enumerate(frames):
            for arm_side, share in arms:
                if arm_side not in worst or share > worst[arm_side][0]:
                    worst[arm_side] = [round(share, 4), i]
        clips[name] = worst
    return {'ik': round(ik, 4), 'palm': round(ik + 0.5 * paw, 4), 'clips': clips}


def write_all(arm, skel_props, fps, samples, shape_obj=None, shape_weights=None, nodes=None):
    """Writes the solved clips into actions: one action of the armature for each clip, one
    action of the shape keys of shape_obj (with the weights of shape_weights) when it is given,
    and the actions of the scene nodes {name: object} (write_node_actions)."""
    for name, poses in samples.items():
        write_action(arm, name, poses, ('hips',), skel_props)
        if shape_obj is not None:
            write_shape_action(shape_obj, name, shape_weights[name])
        if nodes:
            write_node_actions(nodes, name, poses)
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
