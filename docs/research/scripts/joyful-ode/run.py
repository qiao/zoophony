"""Run a script with python3 -I, with tools/musescore/ and the folder of the script on sys.path.

Usage: python3 -I run.py script.py [args ...]
The option -I keeps the current folder off sys.path, so a file in a download folder cannot
replace a module. This runner adds only the two known folders.
"""
import os, runpy, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
script = os.path.abspath(sys.argv[1])
sys.path.insert(0, os.path.join(ROOT, 'tools', 'musescore'))
sys.path.insert(0, os.path.dirname(script))
sys.argv = sys.argv[1:]
runpy.run_path(script, run_name='__main__')
