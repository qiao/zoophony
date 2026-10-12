"""The entry point of the CLI: python3 studio <command> (from lowpoly-studio/). See studio/cli.py."""

import os
import sys

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Python puts this folder first on the path; the package imports need its parent.
sys.path[0] = STUDIO

from studio.cli import main  # noqa: E402

main()
