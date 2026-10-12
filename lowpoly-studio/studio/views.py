"""The sheet views: cameras, silhouette alignment, IoU, and a small PNG writer.

numpy only. The cameras match the cameras of the viewer (viewer/scene.js): far and level, at the
azimuths of config sheet.views and the distance and height of config sheet.camera.
"""

import json
import math
import os
import struct
import zlib

import numpy as np


def camera_basis(azimuth_deg, camera):
    """Calculates the camera position and its right, up, and forward unit vectors."""
    az = math.radians(azimuth_deg)
    pos = np.array([-camera.distance * math.sin(az), camera.height,
                    camera.distance * math.cos(az)])
    fwd = np.array([-pos[0], 0.0, -pos[2]])
    fwd /= np.linalg.norm(fwd)
    up = np.array([0.0, 1.0, 0.0])
    right = np.cross(fwd, up)
    return pos, right, up, fwd


def project(points, azimuth_deg, camera):
    """Projects points to the image plane: (u right, v up) in model units at the target."""
    pos, right, up, fwd = camera_basis(azimuth_deg, camera)
    rel = points - pos
    depth = rel @ fwd
    u = (rel @ right) / depth * camera.distance
    v = (rel @ up) / depth * camera.distance
    return u, v


def load_reference(cfg):
    """Reads the measures and the raw masks of the sheet views (studio/intake.py)."""
    with open(cfg.paths.measure) as f:
        meta = json.load(f)
    w, h = meta['sheet']
    masks = {}
    for name in meta['views']:
        raw = open(os.path.join(cfg.paths.masks, f'{name}.raw'), 'rb').read()
        masks[name] = np.frombuffer(raw, np.uint8).reshape(h, w) > 127
    return meta, masks


def splat(u, v, scale, x0, y_bottom, shape, radius):
    """Draws projected points as squares into a mask of the sheet size."""
    h, w = shape
    px = np.round(x0 + u * scale).astype(int)
    py = np.round(y_bottom - v * scale).astype(int)
    m = np.zeros(shape, bool)
    for dx in range(-radius, radius + 1):
        for dy in range(-radius, radius + 1):
            xx = np.clip(px + dx, 0, w - 1)
            yy = np.clip(py + dy, 0, h - 1)
            m[yy, xx] = True
    return m


def align_and_score(u, v, ref_mask, view_meta, voxel, search=40):
    """Scales a projected point cloud to the height of a reference view and finds the best x.

    The model is scaled so that its height in pixels equals the height of the reference mask,
    and its lowest point sits on the ground row of the reference. Then the x offset with the
    best IoU is searched. Returns (iou, model mask, x offset).
    """
    left, top, right, bottom = view_meta['box']
    height_px = view_meta['height_px']
    model_h = v.max() - v.min() + voxel
    scale = height_px / model_h
    y_bottom = view_meta['ground_px'] + (v.min() - voxel / 2) * scale
    radius = max(1, int(round(voxel * scale / 2)))
    x_center = (left + right) / 2
    u_mid = (u.max() + u.min()) / 2
    best = (-1.0, None, 0)
    col0, col1 = view_meta['column']
    ref = ref_mask[:, col0:col1]
    for dx in range(-search, search + 1, 2):
        x0 = x_center - u_mid * scale + dx
        m = splat(u, v, scale, x0, y_bottom, ref_mask.shape, radius)[:, col0:col1]
        iou = np.logical_and(m, ref).sum() / max(np.logical_or(m, ref).sum(), 1)
        if iou > best[0]:
            best = (iou, m, dx)
    # Refine to one pixel.
    iou0, _, dx0 = best
    for dx in (dx0 - 1, dx0 + 1):
        x0 = x_center - u_mid * scale + dx
        m = splat(u, v, scale, x0, y_bottom, ref_mask.shape, radius)[:, col0:col1]
        iou = np.logical_and(m, ref).sum() / max(np.logical_or(m, ref).sum(), 1)
        if iou > best[0]:
            best = (iou, m, dx)
    return best


def write_png(path, rgb):
    """Writes an RGB uint8 array (h, w, 3) as a PNG file."""
    h, w, _ = rgb.shape
    raw = b''.join(b'\x00' + rgb[y].tobytes() for y in range(h))

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


def overlay(model, ref):
    """Colors a compare image: gray where both, red where only the reference, blue where only
    the model."""
    out = np.full(model.shape + (3,), 255, np.uint8)
    both = model & ref
    out[both] = (150, 150, 150)
    out[ref & ~model] = (220, 40, 40)
    out[model & ~ref] = (40, 90, 230)
    return out
