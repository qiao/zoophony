# The trial cut `refine.web` of the variants w05, w03, and w07, which the round did not keep: the
# folds moved to the new faces (folds.txt). To try it again, put this function into
# tools/blender/rig_mesh.py, and in refine() add `cuts.update(web_cuts(tris, weights, rule['web']))`
# before split_faces() when the rule has `web`.

def web_cuts(tris, weights, rule):
    """Finds the edges of the web between a trunk and a forearm (`web` of `refine`): one corner
    has at least the share `trunk` of the trunk bones, and the other corner at least the share
    `forearm` of the forearm bones of one side. Gives the place `at` of the cut along each edge,
    from its first corner, by the sorted pair of its corners."""
    trunk = weights[:, [BONES.index(name) for name in TRUNK]].sum(axis=1)
    cuts = {}
    for side in 'LR':
        fore = weights[:, [BONES.index(f'{bone}_{side}') for bone in ARM[1:3]]].sum(axis=1)
        for a, b in edge_faces(tris):
            if trunk[a] >= rule['trunk'] and fore[b] >= rule['forearm']:
                cuts[(a, b)] = rule['at']
            elif trunk[b] >= rule['trunk'] and fore[a] >= rule['forearm']:
                cuts[(a, b)] = 1.0 - rule['at']
    return cuts
