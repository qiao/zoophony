"""The pianist role pack: see role.toml for the data and clips.py for the clips."""

from roles.pianist.clips import Pianist


def make(ctx):
    """Makes the pack object of the role (the interface of studio/roles.py)."""
    return Pianist(ctx)
