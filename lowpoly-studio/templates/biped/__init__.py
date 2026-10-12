"""The biped template: a standing animal with two arms, two legs, ears, a snout, and a tail.

The template is the interface between the studio and a body plan:

    Body(cfg, views, bind)       the parts of the field, the arm and leg poses, named regions
    bone_order(role), layout(cfg, body, role, pose), rigid_only(role), skeleton_extras(role, ...)
    rest_skeleton(cfg, body, role)   the skeleton without Blender
    Skeleton                     the pose solver (two-bone IK, twist split, clavicle follow)
    weights(cfg, body, ...)      the weight rules after bone heat
    correctives(kinds, ...)      the corrective shapes that a role names
    contact_spec(role, details)  the test groups of the contact check
    region_name(bone, point, normal)   the body region of a place (the located failures)
"""

from templates.biped.body import Body
from templates.biped.corrective import make as correctives
from templates.biped.layout import bone_order, layout, rest_skeleton, rigid_only, skeleton_extras
from templates.biped.rig import weights
from templates.biped.solver import Skeleton

__all__ = ['Body', 'Skeleton', 'bone_order', 'contact_spec', 'correctives', 'layout',
           'region_name', 'rest_skeleton', 'rigid_only', 'skeleton_extras', 'weights']

# The body region of each bone (without its side): the name on the side of the body, on the
# front, and on the back.
REGIONS = {
    'root': ('hips', 'lower belly', 'rump'),
    'hips': ('hips', 'lower belly', 'rump'),
    'spine': ('flank', 'belly', 'lower back'),
    'spine1': ('flank', 'belly', 'back'),
    'chest': ('ribs', 'chest', 'upper back'),
    'neck': ('neck', 'throat', 'nape'),
    'head': ('head', 'face', 'back of the head'),
    'ear': ('ear', 'ear', 'ear'),
    'clavicle': ('shoulder', 'shoulder', 'shoulder'),
    'upper_arm': ('upper arm', 'upper arm', 'upper arm'),
    'forearm': ('forearm', 'forearm', 'forearm'),
    'forearm_twist': ('forearm', 'forearm', 'forearm'),
    'hand': ('paw', 'paw', 'paw'),
    'fingers': ('paw', 'paw', 'paw'),
    'thigh': ('thigh', 'thigh', 'thigh'),
    'shin': ('shin', 'shin', 'shin'),
    'foot': ('foot', 'foot', 'foot'),
    'toes': ('toes', 'toes', 'toes'),
    'tail': ('tail', 'tail', 'tail'),
}


def contact_spec(role):
    """Lists the contact test groups of each arm: the arm bones (their skin is not an obstacle),
    and the tests that the role names (role.toml [checks] contact_tests)."""
    tests = role.checks.contact_tests
    spec = {}
    for side in ('L', 'R'):
        groups = []
        if 'paw' in tests:
            groups.append(('paw', 'skin', [f'hand_{side}', f'fingers_{side}']))
        if 'forearm' in tests:
            groups.append(('forearm', 'skin', [f'forearm_{side}', f'forearm_twist_{side}']))
        if 'claws' in tests:
            groups.append(('claw', 'detail', f'claw_hand_{side}'))
        if 'props' in tests:
            for pr in role.props:
                if pr.attach.bone == 'hand' and pr.attach.side == side and pr.contact != 'none':
                    groups.append((pr.name, 'prop', f'{pr.name}_{pr.contact}'))
        spec[side] = {'arm': [f'upper_arm_{side}', f'forearm_{side}', f'forearm_twist_{side}',
                              f'hand_{side}', f'fingers_{side}'], 'tests': groups}
    return spec


def region_name(bone, point, normal):
    """Names the body region of a place in the bind pose: the region of its dominant bone, the
    way the surface faces, and the side of the animal (x > 0 is its left).

    For example "belly, front, left". A bone with no region (a prop) gives its own name.
    """
    base, side = bone, None
    if bone.endswith(('_L', '_R')):
        base, side = bone[:-2], 'left' if bone.endswith('_L') else 'right'
    names = REGIONS.get(base)
    if names is None:
        return bone
    nx, ny, nz = (float(v) for v in normal)
    if nz > 0.5:
        name, facing = names[1], 'front'
    elif nz < -0.5:
        name, facing = names[2], 'back'
    elif abs(ny) > abs(nx):
        name, facing = names[0], 'top' if ny > 0 else 'under'
    else:
        name, facing = names[0], 'side'
    if side is None:
        side = 'left' if point[0] > 0.01 else 'right' if point[0] < -0.01 else 'middle'
    return f'{name}, {facing}, {side}'
