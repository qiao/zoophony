"""Tests of the cache keys (studio/cache.py): a key holds no folder of a worktree. Run in
lowpoly-studio/:

    python3 -m unittest tests.test_cache

The key tests need no numpy. The setup test runs Blender (BLENDER or `blender` on the path) on a
copy of the studio in another folder, about 10 s, and it is skipped when Blender is missing.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, STUDIO)

from studio import cache, config  # noqa: E402

ANIMALS = ('bear', 'polar-bear')
ROLES = ('conductor', 'pianist', 'model')
BLENDER = os.environ.get('BLENDER', 'blender')


def moved(value, old, new):
    """Returns a copy of a config with each string that starts with the folder old moved to the
    folder new (the same config in another worktree)."""
    if isinstance(value, dict):
        return config.Section({k: moved(v, old, new) for k, v in dict.items(value)})
    if isinstance(value, (list, tuple)):
        return type(value)(moved(v, old, new) for v in value)
    if isinstance(value, str) and value.startswith(old):
        return new + value[len(old):]
    return value


def manifest_of(cfg, read):
    """Records the reads of read(tracked cfg) and returns their manifest."""
    rec = cache.Recorder('test')
    with cache.recording(rec):
        read(cache.track(cfg, 'cfg'))
    return rec.manifest({'cfg': cfg})['reads']


def absolute_strings(value, path=()):
    """Lists (path, string) for each absolute path in a config."""
    if isinstance(value, dict):
        return [x for k, v in dict.items(value) for x in absolute_strings(v, path + (k,))]
    if isinstance(value, (list, tuple)):
        return [x for i, v in enumerate(value) for x in absolute_strings(v, path + (i,))]
    if isinstance(value, str) and os.path.isabs(value):
        return [(path, value)]
    return []


class TestKeys(unittest.TestCase):
    """The reads of a step give the same digests in each worktree."""

    def setUp(self):
        """Loads the bear config, and the same config in another worktree folder."""
        self.cfg = config.load('bear')
        self.other = moved(self.cfg, STUDIO, os.path.join(tempfile.gettempdir(), 'wt', 'studio'))

    def test_truth_test_records_only_a_fact(self):
        """A truth test of a table records whether it has a key, not the whole table."""
        reads = manifest_of(self.cfg, lambda cfg: bool(cfg.role))
        self.assertEqual([r[:2] for r in reads], [['cfg', ['role', cache.TRUTH]]])
        changed = config.Section(self.cfg, role=config.Section(self.cfg.role, clips={}))
        self.assertEqual(reads, manifest_of(changed, lambda cfg: bool(cfg.role)))

    def test_whole_table_read_holds_no_folder(self):
        """A read of the whole cfg or of cfg.role gives the same digest in two worktrees."""
        for name, read in (('cfg.role', lambda cfg: cfg.role.copy()),
                           ('cfg', lambda cfg: cfg.copy()),
                           ('cfg.role keys', lambda cfg: list(cfg.role))):
            with self.subTest(read=name):
                self.assertEqual(manifest_of(self.cfg, read), manifest_of(self.other, read))

    def test_whole_table_read_sees_a_change(self):
        """A whole-table read still records each value that is not an output path."""
        changed = config.Section(self.cfg, role=config.Section(
            self.cfg.role, rig=config.Section(self.cfg.role.rig, fingers=4)))
        read = lambda cfg: cfg.role.copy()  # noqa: E731
        self.assertNotEqual(manifest_of(self.cfg, read), manifest_of(changed, read))

    def test_manifest_refuses_a_studio_path(self):
        """A read whose value holds a path in the studio folder stops the manifest."""
        items = [{'name': 'eye', 'file': os.path.join(STUDIO, 'animals', 'bear', 'x.png')}]
        rec = cache.Recorder('test')
        with cache.recording(rec):
            tracked = cache.track(items, 'items')
            tracked[0].copy()
        with self.assertRaisesRegex(ValueError, 'holds the path'):
            rec.manifest({'items': items})

    def test_configs_hold_folders_only_in_untracked_tables(self):
        """Each absolute path of a loaded config sits in an untracked table (cfg.paths,
        cfg.role.paths), so no read records it."""
        for animal in ANIMALS:
            for role in (None,) + ROLES:
                with self.subTest(animal=animal, role=role):
                    cfg = config.load(animal, None, role)
                    for path, value in absolute_strings(cfg):
                        self.assertTrue(any(path[:len(u)] == u for u in cache.UNTRACKED),
                                        f'{path} = {value!r} is no untracked path')
                    self.assertIsNone(cache.studio_path(
                        cache.recorded_value({'cfg': cfg}, 'cfg', ())))


def setup_keys(studio, animal, role):
    """Runs tests/setup_keys.py of a studio folder in Blender. Returns the fingerprints."""
    out = subprocess.run([BLENDER, '-b', '--factory-startup', '--python-exit-code', '1',
                          '--python', os.path.join(studio, 'tests', 'setup_keys.py'), '--',
                          animal, role], capture_output=True, text=True, check=True).stdout
    line = next(x for x in out.splitlines() if x.startswith('SETUP-KEYS '))
    return json.loads(line[len('SETUP-KEYS '):])


@unittest.skipIf(shutil.which(BLENDER) is None, 'no Blender')
class TestSetupKeys(unittest.TestCase):
    """The setup values of a build give the same keys in two worktree folders, and a role build
    shares the keys of the model stages with its model build."""

    @classmethod
    def setUpClass(cls):
        """Copies the code, the role packs, and the configs and measures of the animals into a
        temporary folder (the studio of another worktree)."""
        cls.tmp = tempfile.mkdtemp(prefix='studio-keys-')
        cls.copy = os.path.join(cls.tmp, 'lowpoly-studio')
        skip = shutil.ignore_patterns('__pycache__')
        for top in ('studio', 'templates', 'roles', 'props', 'tests'):
            shutil.copytree(os.path.join(STUDIO, top), os.path.join(cls.copy, top), ignore=skip)
        for animal in ANIMALS:
            dst = os.path.join(cls.copy, 'animals', animal)
            os.makedirs(os.path.join(dst, 'out'))
            shutil.copy(os.path.join(STUDIO, 'animals', animal, 'animal.toml'), dst)
            measure = os.path.join(STUDIO, 'animals', animal, 'out', 'measure.json')
            if not os.path.exists(measure):
                # Git does not keep measure.json: the intake makes it.
                from studio import cli  # noqa: PLC0415
                cli.step_intake(config.load(animal))
            shutil.copy(measure, os.path.join(dst, 'out'))

    @classmethod
    def tearDownClass(cls):
        """Deletes the copy."""
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_same_keys_in_another_folder(self):
        """The setup keys of a build do not depend on the folder of the worktree."""
        for animal, role in (('bear', 'conductor'), ('polar-bear', 'pianist')):
            with self.subTest(animal=animal):
                self.assertEqual(setup_keys(STUDIO, animal, role),
                                 setup_keys(self.copy, animal, role))

    def test_model_build_shares_the_model_stages(self):
        """The conductor and the model role have one bind pose, so the body and its parts (the
        inputs of field, remesh, and organic) have the same keys."""
        role = setup_keys(STUDIO, 'bear', 'conductor')
        model = setup_keys(STUDIO, 'bear', 'model')
        for name in ('body', 'parts', 'surface_parts'):
            self.assertEqual(role[name], model[name], name)


if __name__ == '__main__':
    unittest.main()
