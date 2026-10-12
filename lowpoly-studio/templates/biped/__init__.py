"""The biped template: a standing animal with two arms, two legs, ears, a snout, and a tail.

The template is the interface between the studio and a body plan:

    Body(cfg, views, bind)       the parts of the field, the arm and leg poses, named regions
    bone_order(role), layout(cfg, body, role, pose), rigid_only(role), skeleton_extras(role, ...)
    rest_skeleton(cfg, body, role)   the skeleton without Blender
    Skeleton                     the pose solver (two-bone IK, twist split, clavicle follow)
    weights(cfg, body, ...)      the weight rules after bone heat
    correctives(kinds, ...)      the corrective shapes that a role names
    contact_spec(role, details)  the test groups of the contact check
"""

from templates.biped.body import Body
from templates.biped.corrective import make as correctives
from templates.biped.layout import bone_order, layout, rest_skeleton, rigid_only, skeleton_extras
from templates.biped.rig import weights
from templates.biped.solver import Skeleton

__all__ = ['Body', 'Skeleton', 'bone_order', 'contact_spec', 'correctives', 'layout',
           'rest_skeleton', 'rigid_only', 'skeleton_extras', 'weights']


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
