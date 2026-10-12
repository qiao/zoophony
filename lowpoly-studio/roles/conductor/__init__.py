"""The conductor role pack: see role.toml for the data and clips.py for the clips."""

from roles.conductor.clips import Conductor


def make(ctx):
    """Makes the pack object of the role (the interface of studio/roles.py)."""
    return Conductor(ctx)
