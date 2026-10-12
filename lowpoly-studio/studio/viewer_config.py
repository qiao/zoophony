"""Writes <out>/viewer.json: what the viewer, the compare page, and the shot tool need to know.

Pure Python (the CLI writes it before the shots and before `studio view`). The pages read it
with ?config=<url> or ?animal=<id> (then /animals/<id>/out/viewer.json). URLs are relative to
the folder lowpoly-studio/, the root of the Vite server.
"""

import json
import os

from studio.config import STUDIO, to_plain


def url_of(path):
    """Returns the URL of a file under lowpoly-studio/ (the root of the Vite server)."""
    rel = os.path.relpath(os.path.abspath(path), STUDIO)
    if rel.startswith('..'):
        raise ValueError(f'{path} is not under {STUDIO}: the viewer cannot serve it')
    return '/' + rel.replace(os.sep, '/')


def hex_color(rgb):
    """Turns [r, g, b] into an int 0xRRGGBB."""
    return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]


def settings(cfg):
    """Builds the viewer settings of an animal from its config and its role pack."""
    role = cfg.role
    shots = {}
    if role.review.shots:
        with open(os.path.join(role.paths.root, role.review.shots)) as f:
            shots = json.load(f)
    light = dict(to_plain(cfg.look.light))
    for key in ('sky', 'ground', 'key_color', 'fill_color', 'rim_color'):
        light[key] = hex_color(light[key])
    hand_props = [p for p in role.props if p.attach.bone == 'hand']
    out = cfg.paths.out
    return {
        'animal': cfg.animal.id,
        'title': f'{cfg.animal.name} {role.role.name}',
        'role': role.role.name,
        'glb': url_of(cfg.paths.glb),
        'sheet': url_of(cfg.paths.sheet),
        'measure': url_of(cfg.paths.measure),
        'masks': url_of(cfg.paths.masks),
        'views': {name: {'azimuth': v.azimuth, 'label': v.label}
                  for name, v in cfg.sheet.views.items()},
        'camera': to_plain(cfg.sheet.camera),
        'background': hex_color(cfg.sheet.background),
        'light': light,
        'noShadow': [p.name for p in role.props if not p.cast_shadow],
        'sceneProps': [p.name for p in role.props if p.attach.bone == 'scene'],
        'tipMarkers': [p.tip_marker for p in hand_props if p.tip_marker],
        'compare': {'rows': list(cfg.compare.rows), 'furBand': list(cfg.compare.fur_band),
                    'headShare': cfg.compare.head_share,
                    'furMinSaturation': cfg.compare.fur_min_saturation,
                    'facetCrops': to_plain(cfg.compare.facet_crops),
                    'headTurn': to_plain(cfg.compare.head_turn)},
        'clipNotes': to_plain(role.clips.notes),
        'shots': shots,
        'outDir': os.path.relpath(out, STUDIO),
    }


def write(cfg):
    """Writes <out>/viewer.json and returns its URL."""
    os.makedirs(cfg.paths.out, exist_ok=True)
    path = os.path.join(cfg.paths.out, 'viewer.json')
    with open(path, 'w') as f:
        json.dump(settings(cfg), f, indent=2)
        f.write('\n')
    return url_of(path)
