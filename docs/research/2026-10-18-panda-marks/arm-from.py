# The trial weight rule `weights.armFrom` of the round, which the round did not keep, because it
# folded faces in each sample (arm-from.txt). To try it again, put these lines into
# apply_rules() of tools/blender/rig_mesh.py, before the rule `clavicleFrom`, and rig a variant
# with "weights.armFrom=[0.45,0.55]".

    # The side of the trunk below the armpit: inside the plane of the split, the upper arm weight
    # fades out downward, and the trunk bone with the most weight takes the rest.
    if 'armFrom' in rules:
        keep = smoothstep(y, *rules['armFrom'])
        for side, sign in (('L', 1.0), ('R', -1.0)):
            inside = (verts[:, 0] * sign > 0) & (verts[:, 0] * sign <= split)
            for v in np.nonzero(inside & (keep < 1.0) & (w[:, col[f'upper_arm_{side}']] > 0))[0]:
                target = trunk[int(np.argmax(w[v, trunk]))] if w[v, trunk].any() else col['spine1']
                taken = w[v, col[f'upper_arm_{side}']] * (1.0 - keep[v])
                w[v, col[f'upper_arm_{side}']] -= taken
                w[v, target] += taken
