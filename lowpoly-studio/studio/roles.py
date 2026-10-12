"""The interface between the studio and a role pack (roles/<name>/).

A role pack is a folder with role.toml (data, checked by the ROLE schema of studio/schema.py) and
__init__.py, which defines make(ctx) -> a pack object with these attributes:

    fps          frames per second of the baked clips (role.toml [clips] fps)
    clips        {name: (function t -> pose spec, duration in s)} in the order of the GLB. The
                 first clip is 'reference' (ctx.reference_clip()), the pose of the sheet.
    performance  [(clip, start time in the clip, duration)] of a clip "performance", or []
    blend        blend time at the joins of the performance, in s

The studio code calls nothing else of a pack, so a new role is a new folder. The pose specs are
the specs of the template solver (templates/<template>/solver.py). numpy only.
"""

import importlib

import numpy as np

from studio import props


class Context:
    """What a role pack gets from the studio: the config, the body, the rest skeleton, the props,
    and the retarget of IK targets."""

    def __init__(self, cfg, body, template):
        """Stores the config (cfg.role is the role.toml), the body, and the template package."""
        self.cfg = cfg
        self.role = cfg.role
        self.body = body
        self.template = template
        self._rest = None
        t = cfg.role.targets
        joints, _ = body.arm_pose('reference')
        S, E, W = joints['shoulder'], joints['elbow'], joints['wrist']
        self.shoulder = S
        self.scale = (np.linalg.norm(E - S) + np.linalg.norm(W - E)) / t.reach
        self.ref_shoulder = np.array(t.shoulder)
        # The body of the animal is the body that the targets were made on: no retarget.
        self.identity = (np.abs(self.shoulder - self.ref_shoulder).max() < 1e-6
                         and abs(self.scale - 1.0) < 1e-3)

    def rest_skeleton(self):
        """Returns the rest skeleton of the template layout (no Blender), built once."""
        if self._rest is None:
            self._rest = self.template.rest_skeleton(self.cfg, self.body, self.role)
        return self._rest

    def prop_points(self, name, pose='bind'):
        """Returns the grip and the tip of a hand prop in a pose."""
        pr = next(p for p in props.hand_props(self.role) if p.name == name)
        _, grip, tip = props.make(self.body, pr, pose)
        return grip, tip

    def reference_clip(self):
        """Returns the clip of the sheet pose: (function t -> spec, duration of one frame)."""
        spec = self.body.reference_spec([p.name for p in props.hand_props(self.role)])
        return (lambda t: spec), 1.0 / self.role.clips.fps

    def place(self, side, p):
        """Moves an IK target from the body of the pack (role.toml [targets]) onto this body:
        relative to the shoulder of its side, scaled by the arm reach."""
        if self.identity:
            return p
        m = np.array([1.0 if side == 'L' else -1.0, 1.0, 1.0])
        return self.shoulder * m + self.scale * (np.asarray(p, float) - self.ref_shoulder * m)

    def unplace(self, side, p):
        """Moves a point of this body into the frame of the pack (the inverse of place)."""
        if self.identity:
            return p
        m = np.array([1.0 if side == 'L' else -1.0, 1.0, 1.0])
        return self.ref_shoulder * m + (np.asarray(p, float) - self.shoulder * m) / self.scale


def make_pack(cfg, body, template):
    """Imports the role pack of the config and makes its pack object."""
    module = importlib.import_module(f'roles.{cfg.animal.role}')
    return module.make(Context(cfg, body, template))
