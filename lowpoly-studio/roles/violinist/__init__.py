"""The violinist role pack: see role.toml for the data and clips.py for the clips."""

from roles.violinist.clips import Violinist


def make(ctx):
    """Makes the pack object of the role (the interface of studio/roles.py)."""
    return Violinist(ctx)
