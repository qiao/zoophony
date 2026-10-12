"""The model role pack: one clip, the pose of the sheet (see role.toml)."""


class Model:
    """The pack object of the model role: the clip 'reference' only."""

    def __init__(self, ctx):
        """Makes the one clip from the context."""
        self.fps = ctx.role.clips.fps
        self.clips = {'reference': ctx.reference_clip()}
        self.performance = []
        self.blend = 0.0


def make(ctx):
    """Makes the pack object of the role (the interface of studio/roles.py)."""
    return Model(ctx)
