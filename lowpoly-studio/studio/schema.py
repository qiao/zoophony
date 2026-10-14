"""The schema of an animal config (animals/<id>/animal.toml): every field, its kind, its default,
and what it means.

Pure Python (no numpy), so the CLI (system python3) and Blender's Python both use it.
`python3 studio schema` prints this table as Markdown for the README.

Kinds of a field:
    str, bool, int, num   one value (an int is accepted where a num is expected)
    vec2, vec3            a list of 2 or 3 numbers
    ivec2                 a list of 2 ints (pixel columns or rows)
    rgb                   a list of 3 ints from 0 to 255
    nums, ints, strs      a list of any length
    pairs                 a list of [num, num]
    box                   two vec3 (a low and a high corner, or a head and a tail)
    seg                   two vec2: the ends of a line in a view
    range3                [from, to, step]
    rect                  [x0, y0, x1, y1] in model units of a view

A field with no default is required. A field with todo=True is one that `studio new` leaves
as "TODO", because each animal must measure it on its own sheet.
"""

REQUIRED = object()


class F:
    """One field: a kind, a doc line, and a default (REQUIRED when the field must be given)."""

    def __init__(self, kind, doc, default=REQUIRED, todo=False):
        """Stores the kind, the doc, the default, and the todo flag."""
        self.kind = kind
        self.doc = doc
        self.default = default
        self.todo = todo


class T:
    """A table with fixed keys."""

    def __init__(self, doc, fields, optional=False):
        """Stores the doc and the fields of the table."""
        self.doc = doc
        self.fields = fields
        self.optional = optional


class M:
    """A map from any key to one item schema (a field or a table)."""

    def __init__(self, doc, item, default=REQUIRED, keys=None):
        """Stores the doc, the item schema, a default map, and the allowed keys (None: any)."""
        self.doc = doc
        self.item = item
        self.default = default
        self.keys = keys


class A:
    """An array of tables, each with the same fields."""

    def __init__(self, doc, item, default=REQUIRED):
        """Stores the doc, the table schema of each item, and a default list."""
        self.doc = doc
        self.item = item
        self.default = default


def blob(doc, extra=None, center=False, radii=3):
    """Makes the table of one round part of the field: radii, blend, box pad, and more."""
    fields = {}
    if center:
        fields['center'] = F('vec3', 'Center (in the frame of the part, see the doc of the part).')
    fields['radii'] = F('vec2' if radii == 2 else 'vec3',
                        'Radii: start and end of a round cone' if radii == 2 else 'Radii x, y, z.')
    fields.update(extra or {})
    fields['blend'] = F('num', 'Width of the smooth union with the parts before it.')
    fields['box_pad'] = F('num', 'Padding of the box where the part is sampled.')
    return T(doc, fields)


VIEW = T('One view of the sheet.', {
    'columns': F('ivec2', 'Pixel columns of the view on the sheet: [x from, x to).', todo=True),
    'azimuth': F('num', 'Camera azimuth in degrees: 0 in front, 90 at the right of the animal.',
                 todo=True),
    'label': F('str', 'Button label of the view in the viewer.'),
    'axis': F('str', 'How the axis column of the view is found: "hips" (the middle of the hip '
                     'rows) or "shin" (the middle of the shin at side_axis_height, the z origin '
                     'of a side view).', default='hips'),
    'flip': F('bool', 'The view shows the back, so its x runs the other way.', default=False),
})

SHEET = T('The reference sheet: four views of one pose on one plain background.', {
    'image': F('str', 'Path of the sheet, from the animal folder.'),
    'background': F('rgb', 'Color of the plain background.', todo=True),
    'foreground': T('The rule that tells an animal pixel from the background.', {
        'min_saturation': F('int', 'A pixel with max(rgb) - min(rgb) of at least this is on the '
                                   'animal.', default=14),
        'max_dark_sum': F('int', 'A pixel with r + g + b under this is on the animal (dark eyes, '
                                 'nose, claws).', default=390),
    }),
    'axis_rows': F('vec2', 'Heights (0..1) of the rows whose single run gives the axis column.',
                   default=(0.2, 0.3)),
    'side_axis_height': F('num', 'Height of the shin rows that give the axis of a "shin" view.',
                          default=0.1),
    'side_axis_halfband': F('num', 'Half height of that band of rows.', default=0.004),
    'views': M('The views, in this order. The names front, side, back, and three_quarter are the '
               'ones that the compare and the checks know.', VIEW),
    'camera': T('The far, level cameras of the sheet views (weak perspective).', {
        'distance': F('num', 'Distance from the animal, in animal heights.', default=10.0),
        'height': F('num', 'Height of the camera and of its target.', default=0.5),
        'fov': F('num', 'Vertical field of view in degrees.', default=7.4),
    }),
})

INTAKE = T('The masks of the sheet views (studio/intake.py).', {
    'foreground': F('str', 'The rule that tells an animal pixel from the background: "colored" (a '
                           'colored or dark pixel, sheet.foreground) or "difference" (a pixel that '
                           'differs from the measured background color at its place). "difference" '
                           'also works for a neutral white or gray fur.', default='colored'),
    'difference': F('num', 'difference: the summed channel difference of a lighter pixel (or the '
                           'spread of the channel differences of a colored pixel) at the edge of '
                           'the figure.', default=30.0),
    'dark_difference': F('num', 'difference: the summed channel difference of a darker pixel at '
                                'the edge of the figure. It is larger, so a soft ground shadow '
                                'stays out.', default=120.0),
    'soft': F('num', 'difference: the half width of the soft edge, as a share of the threshold.',
              default=0.3),
})

TRUNK = T('The trunk: a vertical loft of egg-shaped sections. The width comes from the front and '
          'back masks, the depth from the side mask.', {
    'heights': F('range3', 'Heights of the loft sections: [from, to, step]. "from" is also the '
                           'bottom of the trunk and "to" its top.', todo=True),
    'width_measured_to': F('num', 'Up to this height the half width is measured on the masks. '
                                  'Above it the arms hide the sides, so width_points give it.',
                           todo=True),
    'width_measure_floor': F('num', 'Below this height the width of this height is used.',
                             todo=True),
    'width_points': F('pairs', 'Half width [height, half width] above width_measured_to.',
                      todo=True),
    'side_measure_floor': F('num', 'The side mask is read no lower than this height.', todo=True),
    'front_measured_to': F('num', 'Up to this height the front (z) comes from the side mask.',
                           todo=True),
    'front_points': F('pairs', 'Front z [height, z] above front_measured_to (the neck).',
                      todo=True),
    'smooth': F('num', 'Gaussian width that removes the pixel steps of the masks.', default=0.012),
    'bottom_cap': F('vec2', 'Heights over which the width and the depth close at the bottom '
                            '(a keel between the thighs).', todo=True),
    'top_cap': F('num', 'Height over which the trunk closes at its top (inside the head).',
                 todo=True),
    'top_cap_min': F('num', 'Smallest scale of the top cap.', default=0.05),
    'widest': F('pairs', '[height, share]: where the section is widest, as a share of the depth '
                         'from the back.', todo=True),
    'front_power': F('pairs', '[height, power] of the superellipse of the front half. Below 2 '
                              'the front gets a ridge.', todo=True),
    'back_power': F('num', 'Superellipse power of the back half.', todo=True),
    'box': F('box', 'Box of the trunk part.', todo=True),
})

HEAD = T('The head ball: a loft of its own, so the head reads as a ball above the shoulders.', {
    'bottom': F('num', 'Height of the chin, where the head closes below.', todo=True),
    'cheek': F('vec2', '[height, half width] of the widest point (the cheeks).', todo=True),
    'temple': F('num', 'Height up to which the width follows the masks.', todo=True),
    'width_points': F('pairs', 'Half width [height, half width] from the cheeks to the temples, in place '
                               'of the mean of the front and back masks (not given: the masks).',
                      default=()),
    'cap': F('num', 'Height above which the width and the depth shrink together (a round dome).',
             todo=True),
    'top': F('num', 'Height of the top of the dome.', todo=True),
    'blend': F('num', 'Blend width with the trunk: a soft groove under the head.', todo=True),
    'step': F('num', 'Height step of the head sections.', default=0.0025),
    'face_points': F('pairs', 'Front z [height, z] of the face beside the snout.', todo=True),
    'face_join': F('num', 'Height where the face joins the side mask.', todo=True),
    'forehead_top': F('num', 'Height up to which the front follows the side mask.', todo=True),
    'dome_front': F('num', 'Front z of the middle of the dome.', todo=True),
    'back_points': F('pairs', 'Back z [height, z] of the skull in front of the hump line.',
                     todo=True),
    'back_join': F('num', 'Height where the back joins the side mask.', todo=True),
    'back_top': F('num', 'Height up to which the back follows the side mask.', todo=True),
    'dome_back': F('num', 'Back z of the middle of the dome.', todo=True),
    'smooth': F('num', 'Gaussian width of the head sections.', default=0.004),
    'front_power': F('num', 'Superellipse power of the front half.', default=2.0),
    'back_power': F('num', 'Superellipse power of the back half.', default=2.1),
    'widest': F('num', 'Where the head is widest, as a share of its depth from the back.',
                default=0.5),
    'box_x': F('num', 'Half width of the box of the head part.', todo=True),
    'box_z': F('vec2', 'Back and front z of the box of the head part.', todo=True),
    'box_pad': F('num', 'Padding of the box above and below.', default=0.01),
})

FIELD = T('The body field: measured parts that blend into one signed distance field '
          '(template "biped").', {
    'step': F('num', 'Grid step of the field for the dense mesh (surface nets).', default=0.004),
    'trunk': TRUNK,
    'head': HEAD,
    'brow': blob('The brow ridge: an ellipsoid on the head.', center=True),
    'snout': T('The snout: a round cone from its base to the center of its front.', {
        'base': F('vec3', 'Center of the base.', todo=True),
        'tip': F('vec3', 'Center of the round front.', todo=True),
        'radii': F('vec2', 'Radius at the base and at the front.', todo=True),
        'squash': F('num', 'Scale of the section along y (below 1: flatter).', default=0.95),
        'blend': F('num', 'Blend width.', todo=True),
        'region': T('The snout region that moves only with the head (rig) and sets the box.', {
            'center': F('vec3', 'Center.', todo=True),
            'radii': F('vec3', 'Radii.', todo=True),
        }),
        'box_pad': F('num', 'Padding of the box around the region.', default=0.06),
    }),
    'ears': T('The left ear: a flat ellipsoid with a hollow on its front face. The surface leaves '
              'the ears out, details make them as separate pieces.', {
        'center': F('vec3', 'Center.', todo=True),
        'radii': F('vec3', 'Radii in the frame of the ear (z is the normal of its front face).',
                   todo=True),
        'yaw': F('num', 'Turn of the front face out to the side.', todo=True),
        'roll': F('num', 'Lean of the top out to the side.', todo=True),
        'lean': F('num', 'Lean of the top back, a turn of the whole ear about the x axis through its '
                         'center (0: no turn).', default=0.0),
        'lift': F('num', 'Up component of the ear normal before it is made unit.', default=0.15),
        'hollow_offset': F('vec3', 'Center of the hollow in the ear frame (z is a share of the '
                                   'z radius).', default=(0.0, -0.002, 0.9)),
        'hollow_scale': F('vec3', 'Radii of the hollow as shares of the ear radii.',
                          default=(0.65, 0.65, 0.55)),
        'hollow_blend': F('num', 'Blend of the hollow cut.', default=0.006),
        'blend': F('num', 'Blend width.', default=0.012),
        'box_pad': F('num', 'Half size of the box where the field samples the ear (not given: '
                            'the largest radius plus the blend plus 0.01, so the box holds the '
                            'whole turned ear).', default=None),
    }),
    'tail': T('The tail: an ellipsoid that points a little down.', {
        'center': F('vec3', 'Center.', todo=True),
        'radii': F('vec3', 'Radii.', todo=True),
        'tilt': F('num', 'Turn about x (negative points the end down).', default=-15.0),
        'blend': F('num', 'Blend width.', default=0.008),
        'box_pad': F('num', 'Padding of the box.', default=0.06),
    }),
    'arm': T('The left arm in the pose of the sheet ("reference"). The bind pose turns it.', {
        'joints': T('Joint centers in the sheet pose.', {
            name: F('vec3', doc, todo=True) for name, doc in (
                ('clavicle', 'Inner end of the clavicle.'), ('shoulder', 'Shoulder joint.'),
                ('elbow', 'Elbow joint.'), ('wrist', 'Wrist joint.'),
                ('knuckle', 'Knuckles: the end of the paw bone.'))}),
        'palm': F('vec3', 'Direction that the palm faces in the sheet pose.', todo=True),
        'upper': blob('The upper arm: a round cone from the shoulder to the elbow.',
                      {'squash': F('num', 'Stretch of the section toward the front.')}, radii=2),
        'deltoid': blob('The deltoid bulge, in the upper-arm frame from the shoulder.',
                        center=True),
        'forearm': blob('The forearm: a round cone from the elbow to the wrist.', radii=2),
        'forearm_bulge': blob('The forearm bulge, in the forearm frame from the elbow.',
                              center=True),
        'paw': blob('The paw: an ellipsoid between the wrist and the knuckles, in the hand '
                    'frame.'),
    }),
    'leg': T('The left leg (the same in all poses).', {
        'joints': T('Joint centers.', {
            name: F('vec3', doc, todo=True) for name, doc in (
                ('hip', 'Hip joint.'), ('knee', 'Knee joint.'), ('ankle', 'Ankle joint.'),
                ('ball', 'Ball of the foot.'), ('toe', 'Tip of the toes.'))}),
        'thigh': blob('The thigh: a round cone from the hip to the knee.',
                      {'squash': F('num', 'Stretch of the section toward the front.')}, radii=2),
        'shin': blob('The shin: a round cone from the knee to the ankle.',
                     {'squash': F('num', 'Stretch of the section toward the front.')}, radii=2),
        'foot': blob('The foot: an ellipsoid cut flat at the ground.',
                     {'sole_blend': F('num', 'Blend of the flat sole cut.')}, center=True),
        'toes': T('The toes: small ellipsoids in a row at the front of the foot.', {
            'x': F('num', 'x of the middle of the row.'),
            'offsets': F('nums', 'x offset of each toe from the middle.'),
            'spread': F('num', 'Scale of the offsets.'),
            'y': F('num', 'Height of the toe centers.'),
            'z': F('num', 'z of the middle toes.'),
            'z_drop': F('num', 'How much the outer toes sit further back (times the offset).'),
            'radii': F('vec3', 'Radii of each toe.'),
            'sole_blend': F('num', 'Blend of the flat sole cut.'),
            'blend': F('num', 'Blend width.'),
            'box_pad': F('num', 'Padding of the box.'),
        }),
    }),
})

WARP = T('One radial warp before the remesh: r -> r * (1 + (factor - 1) * exp(-(r / radius)^2)). '
         'A factor above 1 gives smaller facets there. Factors from 0 to 3.2 keep it one to one.', {
    'center': F('vec3', 'Center of the warp (give this or "at").', default=None),
    'at': F('str', 'A named point of the template in place of a center: "paw" (the middle of '
                   'the paw in the bind pose).', default=None),
    'radius': F('num', 'Radius of the warp.'),
    'factor': F('num', 'Scale at the center.'),
    'mirror': F('bool', 'Also add the mirrored warp (x -> -x) right after this one.',
                default=False),
})

FACETS = T('The low-poly facets: QuadriFlow remesh with mirror, then the organic pass.', {
    'quads': F('int', 'The wanted quad count of the remesh: the middle of the band of the remesh '
                      'gate, and the QuadriFlow target when quadriflow_target is 0.', default=900),
    'quadriflow_target': F('int', 'The target that QuadriFlow gets (0: quads). QuadriFlow gives '
                                  'about 1.0 to 1.3 times its target, so `python3 studio '
                                  'calibrate <animal> --quads` measures the ratio on the field '
                                  'and sets this target.', default=0),
    'seeds': F('ints', 'Remesh seeds in the order that the build tries them. The build keeps the '
                       'first seed whose clips pass the gate checks.', default=(3, 1, 5, 6, 2, 4, 7, 8)),
    'offset': F('num', 'The vertices sit this far outside the field, so the flat facets cut the '
                       'smooth surface and keep the silhouette.', default=0.004),
    'squeeze': T('The trunk warp: x and z shrink near the trunk, so the belly quads come out '
                 'wider than tall.', {
        'factor': F('num', 'Scale of x and z at the center.'),
        'center': F('vec3', 'Center.'),
        'radii': F('vec3', 'Gaussian radii in x, y, z.'),
    }),
    'warps': A('The radial warps, applied in this order after the squeeze.', WARP),
    'collapse_share': F('num', 'Share of the half vertices that collapse in the organic pass.',
                        default=0.3),
    'flip_share': F('num', 'Share of the half edges that try a flip.', default=0.8),
    'relax': F('num', 'Share of the way to the middle of the neighbors in each relax round.',
               default=0.12),
    'relax_rounds': F('int', 'Relax rounds.', default=2),
    'jitter': F('num', 'Sigma of the mirrored move along the surface.', default=0.005),
    'jitter_seed': F('int', 'Seed of the jitter.', default=11),
    'dense_faces': F('int', 'The dense mesh is decimated to this face count before QuadriFlow.',
                     default=60000),
    'gate': T('The remesh gate (studio/remesh.py): a seed that fails it stops at once, and the '
              'seed search tries the next seed.', {
        'quads': F('num', 'Largest share by which the QuadriFlow quad count may differ from '
                          'facets.quads.', default=0.15),
        'inward_faces': F('int', 'Most faces of the body mesh that point into the body.',
                          default=0),
        'slivers': F('num', 'Largest share of slivers (smallest angle under 15 degrees) in the '
                            'body mesh.', default=0.01),
        'slit_gap': F('num', 'A face whose outward ray meets the body within this share of the '
                             'median edge, across a gap whose middle is inside the field, is in '
                             'a slit.', default=1.0),
        'slit_tight': F('num', 'A face whose outward ray meets the body within this share of '
                               'the median edge is in a slit, also when the gap is outside the '
                               'field (a crease that the facets cannot show).', default=0.1),
        'slit_faces': F('int', 'Most faces in a slit.', default=0),
    }),
    'protect': T('The skin that the organic pass leaves alone (it bends far, or it must stay '
                 'round).', {
        'joints': M('Radius of the protected ball around each named joint of the bind pose '
                    '(shoulder, elbow, wrist).', F('num', 'Radius.')),
        'box': T('A box on the center line (the crotch).', {
            'half_x': F('num', 'Half width.'),
            'y': F('vec2', 'Low and high height.'),
        }),
        'near': T('The skin near a named part of the field.', {
            'part': F('str', 'Name of the part (for example "snout").'),
            'within': F('num', 'Distance from the part surface.'),
        }),
    }),
})

PAINT = T('The face colors of the body, and the palette of all pieces.', {
    'palette': M('Named sRGB colors. The body uses fur, belly, and muzzle. The details use ear, '
                 'ear_inner, eye, eye_outline, sclera, catchlight, nose, mouth, brow, and claw.',
                 F('rgb', 'Color.', todo=True)),
    'belly': T('A lighter belly: a soft ellipse on the front of the trunk.', {
        'center_y': F('num', 'Height of the center.', todo=True),
        'radii': F('vec2', 'Radii in x and in y.', todo=True),
        'edge': F('vec2', 'Smoothstep of the ellipse distance: full inside, none outside.',
                  default=(0.2, 1.2)),
        'facing': F('vec2', 'Smoothstep of the normal z: only faces that face forward.',
                    default=(-0.1, 0.6)),
        'min_z': F('num', 'Only faces in front of this z.', default=-0.05),
    }),
    'under': T('A darker underside.', {
        'dark': F('num', 'How much darker at the lowest height (0.08 = 8%).', default=0.08),
        'heights': F('vec2', 'Smoothstep from no darkening to full darkening.', todo=True),
        'floor': F('num', 'No darkening below this height.', todo=True),
    }),
    'muzzle': T('The muzzle color on the faces near a part (the snout).', {
        'part': F('str', 'Name of the part.', default='snout'),
        'near': F('num', 'All corners of the face are this near the part surface.'),
        'min_z': F('num', 'All corners are in front of this z.'),
        'min_y': F('num', 'All corners are above this height (the chin).'),
        'lift': F('num', 'Faces that point down get up to this much lighter.', default=0.22),
        'occlusion': F('num', 'Share of the baked occlusion that the muzzle keeps.', default=0.2),
    }),
    'occlusion': T('Ambient occlusion baked from the field.', {
        'strength': F('num', 'Darkening at full occlusion.', default=0.6),
        'ramp': F('vec2', 'Smoothstep of the occlusion value.', default=(0.05, 0.6)),
        'moving': F('num', 'Share of the occlusion that the faces of a moving part group (the '
                           'arms) keep from their own part.', default=0.3),
        'rays': F('int', 'Rays per face.', default=24),
        'reach': F('num', 'Length of each ray.', default=0.16),
        'steps': F('int', 'Samples along each ray.', default=7),
        'seed': F('int', 'Seed of the ray directions.', default=3),
    }),
})

DETAILS = T('Small low-poly pieces on the body (template "biped").', {
    'eyes': T('Each eye in four flattened layers along the look direction: a dark outline, a '
              'white sclera, the iris, and a highlight.', {
        'center': F('vec2', '[x, height] of the left eye.', todo=True),
        'radius': F('num', 'Radius of the sclera.', todo=True),
        'look': F('vec3', 'Look direction of the left eye (x is mirrored).', default=(0.18, 0.02, 1.0)),
        'ray_z': F('num', 'z where the ray onto the face starts (in front of the face).',
                   default=0.4),
        'outline': T('The outline layer.', {
            'sink': F('num', 'Depth into the facet.', default=0.0005),
            'scale': F('num', 'Radius as a share of the eye radius.', default=1.14),
            'depth': F('num', 'Thickness as a share of the eye radius.', default=0.45),
        }),
        'sclera': T('The white layer.', {
            'lift': F('num', 'Lift from the outline.', default=0.001),
            'depth': F('num', 'Thickness as a share of the eye radius.', default=0.62),
        }),
        'iris': T('The iris layer.', {
            'lift': F('num', 'Lift from the outline.', default=0.0035),
            'scale': F('num', 'Radius as a share of the eye radius.', default=0.86),
            'depth': F('num', 'Thickness as a share of the eye radius.', default=0.5),
            'inward': F('num', 'Shift toward the nose as a share of the eye radius.', default=0.12),
        }),
        'catchlight': T('The highlight.', {
            'offset': F('vec3', 'Offset from the iris in eye radii (x is mirrored).',
                        default=(0.24, 0.28, 0.42)),
            'scale': F('num', 'Radius as a share of the eye radius.', default=0.2),
            'depth': F('num', 'Thickness as a share of the eye radius.', default=0.12),
        }),
    }),
    'brows': T('A thin dark arc above each eye.', {
        'x_offset': F('num', 'Shift of the middle out from the eye.', default=0.002),
        'half_width': F('num', 'Half width of the arc.', todo=True),
        'lift': F('num', 'Height of the ends above the eye center.', todo=True),
        'arch': F('num', 'Extra height of the middle.', default=0.0045),
        'out': F('num', 'Lift off the facets.', default=0.0012),
        'radius': F('num', 'Tube radius at the ends.', default=0.0011),
        'radius_arch': F('num', 'Extra tube radius in the middle.', default=0.0004),
    }),
    'nose': T('The nose: a rounded triangle, wide at the top.', {
        'at': F('vec2', '[x, height] of the nose on the face.', todo=True),
        'ray_z': F('num', 'z where the ray onto the snout starts.', default=0.45),
        'size': F('vec3', 'Half sizes x, y, z.', todo=True),
        'taper': F('num', 'Widening toward the top.', default=0.5),
        'taper_clip': F('vec2', 'Limits of the widening.', default=(0.55, 1.3)),
        'tilt': F('num', 'Forward lean of the top.', default=0.006),
        'sink': F('num', 'Depth into the snout.', default=0.01),
    }),
    'mouth': T('A short philtrum and a closed smile, pressed onto the muzzle.', {
        'out': F('num', 'Lift off the facets.', default=0.0012),
        'philtrum': F('vec2', 'Top and bottom of the philtrum below the nose.', todo=True),
        'philtrum_radius': F('num', 'Tube radius of the philtrum.', default=0.0022),
        'smile_half_width': F('num', 'Half width of the smile.', todo=True),
        'smile_sag': F('num', 'Sag of each half of the smile.', default=0.0045),
        'smile_sag_span': F('num', 'Share of a half wave in each half.', default=0.8),
        'smile_lift': F('num', 'Lift of the corners.', default=0.004),
        'smile_radii': F('vec2', 'Tube radius at the middle and at the corner.',
                         default=(0.0021, 0.0012)),
    }),
    'ears': T('The ear shells (their size and place come from field.ears).', {
        'hollow_depth': F('num', 'Depth of the hollow in z radii.', default=1.8),
        'hollow_radius': F('num', 'Radius of the hollow as a share of the ear (also the dark '
                                  'inner color).', default=0.88),
        'subdivisions': F('int', 'Subdivisions of the icosphere of each ear shell (1: 80 faces, '
                                 '2: 320 faces, so the inner color can follow a smaller hollow).',
                          default=1),
        'blade': F('triples', 'Rings [t, half width, center] of a blade loft in place of the '
                              'icosphere shell, from the base (t = -1) up: t in y radii, the half '
                              'width and the center in x radii (+x is the outer edge). A point at '
                              't = 1 closes the tip. Empty: the icosphere shell.', default=()),
        'tip_x': F('num', 'x of the tip point of the blade in x radii.', default=0.0),
        'blade_columns': F('nums', 'Front columns of each blade ring as shares of the half width, '
                                   'from the inner edge (-1) to the outer edge (1).',
                           default=(-1.0, -0.5, 0.0, 0.5, 1.0)),
        'blade_front': F('nums', 'Front z of each blade column in z radii (0 at the edges).',
                         default=(0.0, 1.0, 1.0, 1.0, 0.0)),
        'slot_columns': F('ivec2', 'The inner ear of the blade: the front faces from this column '
                                   'to that column.', default=(1, 3)),
        'slot_rows': F('vec2', 'Heights t (in y radii) of the first and the last ring of the inner '
                               'ear of the blade.', default=(-0.6, 0.8)),
        'slot_depth': F('num', 'Sink of the columns inside the inner ear in z radii.', default=1.0),
        'slot_scale': F('nums', 'Spread of the slot columns of each blade ring from the outer '
                                'column of the slot (one value for each ring; empty: 1).',
                        default=()),
        'jitter': F('num', 'Seeded jitter of the inner points of the blade in z radii (soft '
                           'facets).', default=0.0),
    }),
    'hand_claws': T('Four claws on each paw, in the hand frame.', {
        'offsets': F('nums', 'x offset of each claw.', todo=True),
        'base_y': F('num', 'Base along the paw from the paw center.', todo=True),
        'base_drop': F('num', 'How much the outer claws sit back (times the offset).',
                       default=0.25),
        'base_z': F('num', 'Base toward the back of the paw.', default=0.012),
        'direction': F('vec3', 'Direction (x is a factor of the offset).', default=(0.6, 1.0, 0.25)),
        'length': F('num', 'Length.', todo=True),
        'radius': F('num', 'Base radius.', todo=True),
    }),
    'foot_claws': T('Four claws on each foot, at the toes of field.leg.toes.', {
        'base': F('vec3', 'Base from the toe center (x is a factor of the offset).',
                  default=(0.1, -0.006, 0.018)),
        'direction': F('vec3', 'Direction (x is a factor of the offset).', default=(1.2, -0.3, 1.0)),
        'curl': F('vec3', 'Direction of the curl.', default=(0.0, -1.0, 0.2)),
        'length': F('num', 'Length.', todo=True),
        'radius': F('num', 'Base radius.', todo=True),
        'min_y': F('num', 'The tips stay this high above the ground.', default=0.002),
    }),
})

SPAN = 'A pair [from, width] of a linear ramp.'

RIG = T('The skeleton and the skin weights of the template.', {
    'spine': T('[height, z] of the spine joints on the center line.', {
        name: F('vec2', f'The {name} joint.', todo=True)
        for name in ('hips', 'spine', 'spine1', 'chest', 'neck', 'head', 'head_end')}),
    'tail_bone': F('box', 'Head and tail of the tail bone.', todo=True),
    'ear_bone': F('box', 'Head and tail of the ear bone, from the ear center (x is mirrored).',
                  todo=True),
    'fingers_length': F('num', 'Length of the finger bone past the knuckles.', todo=True),
    'leg_pole': F('vec3', 'Knee direction of the planted-leg IK (x is mirrored).',
                  default=(0.15, 0.0, 1.0)),
    'weights': T('The weight rules after bone heat. Each [from, width] is a linear ramp.', {
        'throat': T('Clavicle weight of the front of the neck moves to the neck bone.', {
            'x': F('vec2', SPAN + ' Out from the center line.', todo=True),
            'y': F('vec2', SPAN + ' Up from this height.', todo=True),
        }),
        'shoulder_tops': T('Head weight of the shoulder tops moves to the neck bone.', {
            'y': F('vec2', SPAN + ' Down from this height.', todo=True),
            'x': F('vec2', SPAN + ' Out from the center line.', todo=True),
        }),
        'armpit': T('More smoothing under each shoulder.', {
            'x_scale': F('num', 'x of the center as a share of the shoulder x.', default=1.08),
            'drop': F('num', 'Center below the shoulder.', todo=True),
            'radii': F('vec3', 'Radii.', todo=True),
        }),
        'joints': M('More smoothing within this radius of each named joint of the bind pose.',
                    F('num', 'Radius.', todo=True)),
        'crotch': T('The crotch moves only with the hips.', {
            'half_x': F('vec2', SPAN + ' Inward from this half width.', todo=True),
            'top': F('vec2', SPAN + ' Down from this height.', todo=True),
            'low': F('vec2', SPAN + ' Up from this height (at the sides).', todo=True),
            'keel_x': F('vec2', SPAN + ' Inward: the keel on the center line.', todo=True),
            'keel_y': F('vec2', SPAN + ' Up from this height (the keel).', todo=True),
        }),
        'head': T('The face and the muzzle move only with the head.', {
            'muzzle_scale': F('num', 'Scale of the snout region.', default=1.25),
            'skull': T('The skull region.', {
                'center': F('vec3', 'Center.', todo=True),
                'radii': F('vec3', 'Radii.', todo=True),
            }),
            'skull_from_y': F('vec2', SPAN + ' The skull rule starts at this height.', todo=True),
        }),
        'trunk': T('The trunk takes bands along the spine, except the limbs, the tail, and the '
                   'head.', {
            'head_from_y': F('vec2', SPAN + ' The head keeps bone heat above this height.',
                             todo=True),
            'legs': T('The legs keep bone heat inside the thigh and the shin.', {
                'thigh_top': F('num', 'Top of the thigh region.', todo=True),
                'shin_top': F('num', 'Top of the shin region.', todo=True),
                'radius': F('num', 'Radius around the leg bones.', todo=True),
                'ramp': F('num', 'Ramp of the radius.', default=0.04),
                'top_ramp': F('num', 'Ramp below the tops.', default=0.05),
            }),
            'below': F('vec2', SPAN + ' Everything below this height keeps bone heat.',
                       todo=True),
            'crotch': T('The crotch takes the trunk bands.', {
                'half_x': F('vec2', SPAN, todo=True),
                'top': F('vec2', SPAN, todo=True),
            }),
        }),
    }),
    'clavicle': T('The clavicle follows a raised arm.', {
        'share': F('num', 'Share of the arm swing that the clavicle takes.', default=0.25),
        'max': F('num', 'Largest clavicle turn.', default=15.0),
        'lift': F('vec2', SPAN + ' Wrist height where the follow starts.', todo=True),
    }),
})

LIGHT = T('The soft studio light of the renders and of the viewer.', {
    'hemi': F('num', 'Hemisphere light level.', default=1.4),
    'key': F('num', 'Key light level.', default=3.8),
    'fill': F('num', 'Fill light level.', default=0.9),
    'rim': F('num', 'Rim light level.', default=0.35),
    'key_dir': F('vec3', 'Key direction in camera space (right, up, back).',
                 default=(-1.2, 3.5, 3.5)),
    'fill_dir': F('vec3', 'Fill direction in camera space.', default=(3.0, 0.5, 4.0)),
    'rim_dir': F('vec3', 'Rim direction in camera space.', default=(4.0, 2.5, -6.0)),
    'sky': F('rgb', 'Sky color of the hemisphere light.', default=(251, 250, 248)),
    'ground': F('rgb', 'Ground color of the hemisphere light.', default=(138, 125, 116)),
    'key_color': F('rgb', 'Key color.', default=(255, 251, 244)),
    'fill_color': F('rgb', 'Fill color.', default=(246, 246, 248)),
    'rim_color': F('rgb', 'Rim color.', default=(232, 238, 255)),
    'center_y': F('num', 'Height that the lights aim at.', default=0.55),
    'shadow': F('num', 'Strength of the soft key shadow.', default=0.3),
})

LOOK = T('The look of the GLB materials and of the renders.', {
    'materials': M('Materials by name: fur (body, ears, mouth) and gloss (eyes, nose, claws). '
                   'Each role prop has a material of its own.', T('One material.', {
                       'roughness': F('num', 'Roughness.'),
                       'specular': F('num', 'Specular IOR level.'),
                   })),
    'light': LIGHT,
})

COMPARE = T('The compare of the renders with the sheet (viewer/compare.js).', {
    'rows': F('ivec2', 'Sheet rows of the compare tiles: [from, to).', todo=True),
    'fur_band': F('vec2', 'Heights of the fur color measure (no head, no feet).',
                  default=(0.25, 0.70)),
    'fur_min_saturation': F('num', 'Smallest saturation of a fur pixel in the fur color measure: '
                            'it leaves out the gray background, white props, and gray shadows. '
                            'Lower it for a light, low-saturation fur (cream).', default=0.2),
    'head_share': F('num', 'Height of the head crop as a share of the view height.', default=0.3),
    'facet_crops': M('Crops of the front view [x0, y0, x1, y1] in model units, the sheet beside '
                     'the render.', F('rect', 'Crop.'), default={}),
    'head_turn': M('The head turn of a view in the compare render only: the range [from, to] '
                   'in degrees (positive turns the snout to the right of the animal, toward a '
                   'camera at a positive azimuth). The compare keeps the turn with the best IoU '
                   'and reports it (check head_turn.<view>). Use it for a view where the sheet '
                   'turns the head more than in the other views. Not given: no turn.',
                   F('vec2', 'Range in degrees.'), default={}),
})

COLOR_CLASS = T('A pixel color class. A pixel is in the class when every given condition holds. '
                'Give a threshold relative to the background, or a palette color.', {
    'max_under': F('int', 'max(rgb) is under this (a dark pixel).', default=None),
    'max_over': F('int', 'max(rgb) is over this.', default=None),
    'over_background': F('int', 'max(rgb) is more than this over the max of sheet.background '
                                '(a pixel lighter than the background).', default=None),
    'spread_under': F('int', 'max(rgb) - min(rgb) is under this (near gray).', default=None),
    'palette': F('str', 'A color of paint.palette: the hue and the saturation of the pixel are '
                        'near it (hue_tol, saturation_tol).', default=None),
    'hue_tol': F('num', 'Largest hue difference from the palette color, in degrees (not given: '
                        'any hue).', default=None),
    'saturation_tol': F('num', 'Largest saturation difference from the palette color (0..1).',
                        default=None),
    'median_over': F('num', 'The luminance is over this share of the median luminance of the '
                            'silhouette in the region (a lighter part).', default=None),
    'median_under': F('num', 'The luminance is under this share of the median luminance of the '
                             'silhouette in the region (a darker part).', default=None),
})

FEATURE_CHECK = T('One check of a feature: the measure on the render against the sheet.', {
    'measure': F('str', 'The measure (default: the name of the check): x, y, width, height, area, '
                        'count, rim, dark, inner, lean, center_x.', default=None),
    'op': F('str', '"rel<=": |render - sheet| / |sheet| at most the limit. "abs<=": |render - '
                   'sheet| at most the limit.'),
    'limit': F('num', 'The limit.'),
})

FEATURE = T('One feature of the face or the body (studio/measure_features.py). The tool finds its '
            'pixels in the same way on the sheet and on the render: the pixels of its color '
            'classes in its region of each view.', {
    'method': F('str', '"blobs": connected blobs of the class pixels (eyes, a nose, claws). '
                       '"area": all class pixels of the region (a muzzle, a belly). "bump": the '
                       'part of the silhouette that stands up at the top of the region (an ear).'),
    'classes': F('strs', 'Color classes of the feature pixels (names of measure.classes). "bump" '
                         'uses the silhouette.', default=()),
    'regions': M('The region of each view, [x0, y0, x1, y1] in animal heights: x from the axis of '
                 'the view to the right of the image, y the height above the ground. The feature '
                 'is measured in these views only.', F('rect', 'Region.', todo=True)),
    'split': F('strs', 'Views whose region splits at the axis into two regions, "left_in_image" '
                       'and "right_in_image" (a pair of ears or of paws).', default=()),
    'count': F('int', 'blobs: the number of blobs that each region keeps.', default=1),
    'rank': F('str', 'blobs: keep the blobs with the most pixels of this class (not given: the '
                     'largest blobs).', default=None),
    'min_rank': F('int', 'blobs: a blob needs at least this many pixels of the rank class.',
                  default=1),
    'min_area': F('int', 'blobs: a blob needs at least this many pixels.', default=1),
    'max_area': F('int', 'blobs: a larger blob (pixels) is not the feature (0: no limit).',
                  default=0),
    'rim': F('str', 'blobs: the class of the measure "rim": its area over the circumference of the '
                    'blob, which is the width of an even ring (the white rim of an eye).',
             default=None),
    'dark': F('str', 'bump: the class of the measure "dark": its share of the silhouette above the '
                     'notch (the inner ear).', default=None),
    'dark_views': F('strs', 'bump: the views of the measure "dark".', default=()),
    'inner': F('str', 'bump: the class of the measure "inner": its share of the silhouette above '
                      'the notch (the pink inner ear: a palette class of the inner ear color).',
               default=None),
    'inner_views': F('strs', 'bump: the views of the measure "inner".', default=()),
    'lean_views': F('strs', 'bump: the views of the measure "lean": the angle in degrees of the '
                            'outer edge from the vertical, plus when the top leans out (back in a '
                            'side view).', default=()),
    'search': F('num', 'bump: rows below the top that the search reads (share of the height).',
                default=0.15),
    'notch_span': F('num', 'bump: rows below the top where the notch can be.', default=0.2),
    'notch_top': F('num', 'bump: rows below the top where the outer edge is furthest out.',
                   default=0.08),
    'name': F('str', 'Singular name in the check names (default: the key without a final "s").',
              default=None),
    'checks': M('The checks of the feature. A check is named "<name>_<check>.<view>.<item>".',
                FEATURE_CHECK, default={}),
})

MEASURE = T('The image measures of the features (eyes, ears, nose, ...) and of the facet shading.', {
    'mesh_belly': F('rect', 'Belly box [x0, y0, x1, y1] of the edge-direction measure of the GLB '
                            'facets (studio/measure_mesh.py).', todo=True),
    'background_diff': F('int', 'A render pixel is on the animal when the sum of its differences '
                                'from the background is over this.', default=24),
    'classes': M('Pixel color classes by name (the features use them).', COLOR_CLASS, default={}),
    'features': M('The features by name, in the order of the checks.', FEATURE, default={}),
    'shading': T('Facet shading of the front view: the belly contrast and the chords between '
                 'shading edges.', {
        'belly_box': F('rect', 'Belly crop of the contrast measure.', todo=True),
        'belly_rows': F('nums', 'Heights of the horizontal chord lines.', todo=True),
        'belly_half_width': F('vec3', 'Half width of a chord line below the split, above it, '
                                      'and the split height.', todo=True),
        'belly_columns': F('nums', 'x of the vertical chord lines.', todo=True),
        'belly_column_span': F('vec2', 'Low and high height of the vertical lines.', todo=True),
        'arm_line': F('seg', '[[x, y], [x, y]]: the ends of the arm chord line.', todo=True),
        'arm_offsets': F('nums', 'x offsets of the parallel arm lines.', todo=True),
        'direction_boxes': M('Boxes of the edge-direction histograms.', F('rect', 'Box.')),
        'jump': F('num', 'Smallest luminance step of a shading edge.', default=3.0),
    }),
})

CHECKS = T('The limits of the checks (studio/checks.py). The fold check is a gate: it fails '
           'the build. The role adds its own gate checks (role.toml [checks]). The others are '
           'reported.', {
    'iou': M('Smallest silhouette IoU of each view.', F('num', 'Limit.')),
    'folded_faces': F('int', 'Most faces folded past 120 degrees in one frame (gate).', default=0),
    'rest_inward_faces': F('int', 'Most faces that point into the body in the rest mesh.',
                           default=0),
    'unpaired_vertices': F('int', 'Most body vertices with no mirror partner.', default=0),
    'body_triangles': F('vec2', 'Smallest and largest body triangle count.', default=(600, 2000)),
    'slivers': F('num', 'Largest share of body faces with an angle under 15 degrees.',
                 default=0.01),
    'fur_color': F('vec3', 'Largest difference of the fur median from the sheet: hue (degrees), '
                           'saturation, value.', default=(1.0, 0.02, 0.03)),
    'facet_contrast': F('num', 'Largest relative difference of the belly fine spread.',
                        default=0.15),
    'feature_pixels': F('num', 'The pixel floor of a feature check: the allowed difference of a '
                               'length (x, y, width, height, center_x, top) is at least this many '
                               'pixels of the sheet view, so a 10 px eye does not fail by one '
                               'pixel. 0: no floor.', default=0.0),
})

SCHEMA = T('An animal config.', {
    'animal': T('Who the animal is.', {
        'id': F('str', 'Short id: the folder name under animals/.', todo=True),
        'name': F('str', 'Display name. The GLB mesh node gets this name, the armature this '
                         'name plus "Rig".', todo=True),
        'template': F('str', 'The body plan, the rig, and the weight rules: a package under '
                             'templates/.', default='biped'),
        'role': F('str', 'The role pack under roles/: the stance, the bind pose, the props, the '
                         'clips, and the role checks. The model (field, facets, paint, details) '
                         'takes only the bind pose from it.', todo=True),
    }),
    'sheet': SHEET,
    'intake': INTAKE,
    'field': FIELD,
    'facets': FACETS,
    'paint': PAINT,
    'details': DETAILS,
    'rig': RIG,
    'look': LOOK,
    'compare': COMPARE,
    'measure': MEASURE,
    'checks': CHECKS,
    'seeds': T('The seed rule of the seed pool (studio/cli.py run_seeds). After a change of the '
               'role or of its clips, the pool runs the role clips on every seed that passes the '
               'remesh gate, and reports the failures of each seed and clip.', {
        'require': F('str', '"kept": the kept seed (the first seed in the order of facets.seeds '
                            'that passes every gate) must pass, and the other seeds are a '
                            'robustness report. "all": every seed that passes the remesh gate '
                            'must also pass the clip gates.', default='kept'),
    }),
})


BIND = T('The bind pose of the role: joint turns from the pose of the sheet. The mesh is built and '
         'bound in this pose, and skinning bends well only near it, so it sits in the middle of '
         'the motion range of the role.', {
    'shoulder_flex': F('num', 'Forward raise of the upper arms.'),
    'shoulder_abduct': F('num', 'Outward raise of the upper arms.'),
    'elbow_flex': F('num', 'Extra bend of the elbows.'),
    'hip_flex': F('num', 'Forward raise of the thighs (about 90 for a seated player).',
                  default=0.0),
    'knee_flex': F('num', 'Bend of the knees (about 90 for a seated player).', default=0.0),
    'hip_abduct': F('num', 'Outward turn of the legs about the vertical axis at the hips (the '
                           'knees apart, for a seated player).', default=0.0),
    'correctives': F('strs', 'Corrective shapes of the template between the bind pose and the '
                             'sheet pose. The biped template has "arm_down" (arms raised in the '
                             'bind pose) and "legs_straight" (legs bent in the bind pose).',
                     default=('arm_down',)),
})

ROLE_PROP = T('One prop of the role.', {
    'name': F('str', 'Name of the prop, of its bone, and of its material.'),
    'kind': F('str', 'Kind of the prop (the prop library props/, studio/props.py). In a hand: '
                     '"stick" (a handle and a tapered shaft: a baton), "bow" (the bow of a violin '
                     'or a cello), "violin" (held at the neck, the violinist). In the scene, a '
                     'node of its own: "piano" (a grand piano), "bench" (a piano bench), "chair" '
                     '(an orchestra chair), "music_stand", "violin", "cello".', default='stick'),
    'attach': T('Where the prop attaches.', {
        'bone': F('str', '"hand": a bone of its own, a child of the hand of "side", and the '
                         'mesh joined into the mesh of the animal, rigid on that bone. "scene": a '
                         'mesh node of its own in the GLB with no bone (a piano, a bench); it '
                         'stays in place, and the keys of a piano are nodes under it.'),
        'side': F('str', '"L" or "R" (for a hand prop).', default='R'),
        'seat_height': F('str', 'For a seat in the scene: "legs" puts the seat under the seated '
                                'body, where the feet of the bent legs stand on the floor '
                                '(templates/biped Body.seat, Body.seated_drop).', default=None),
    }),
    'tip_marker': F('str', 'Name of the empty node at the tip (the viewer draws its path).',
                    default=None),
    'grip': F('vec3', 'Grip point in the hand frame, from the middle of the paw (a stick, a '
                      'bow, or the neck of a violin in a hand).', default=None),
    'direction': F('vec3', 'Direction of the shaft in the hand frame (a stick or a bow), or of '
                           'the violin axis from the neck to the scroll (a violin in a hand).',
                   default=None),
    'length': F('num', 'Length from the grip to the tip (a stick).', default=None),
    'handle': T('The handle of a stick: a tube from behind the grip to just past it.', {
        'back': F('num', 'Length behind the grip.'),
        'steps': F('vec2', 'Second point after the back, third point after the grip.'),
        'radii': F('vec3', 'Radius at the three points.'),
        'sides': F('int', 'Sides of the tube.'),
        'color': F('rgb', 'Color.'),
    }, optional=True),
    'shaft': T('The shaft of a stick: a tapered tube from the grip to the tip.', {
        'start': F('num', 'Start after the grip.'),
        'middle': F('num', 'Middle point after the grip.'),
        'radii': F('vec3', 'Radius at the start, the middle, and the tip.'),
        'sides': F('int', 'Sides of the tube.'),
        'color': F('rgb', 'Color.'),
    }, optional=True),
    'piano': T('A grand piano (kind "piano"), sized to the seated animal: the keyboard runs '
               'across the front of the belly, at the height of the forearms. The keys that the '
               'clips press (pack.pressed_keys) are nodes of their own and go down with the '
               'fingers. The case, the lid, the desk, the legs, and the pedals scale with the '
               'keyboard width (a real keyboard is 1.24 m).', {
        'keys_below_elbow': F('num', 'Height of the elbows of the seated bind pose above the '
                                     'top of the white keys.', default=0.06),
        'keys_front': F('num', 'z of the front edge of the keyboard.'),
        'keys_depth': F('num', 'Visible length of a white key (default: a real key at the '
                               'scale of the key width).', default=None),
        'white_keys': F('int', 'Number of white keys (from C, centered on x = 0).', default=29),
        'lowest_octave': F('int', 'Octave of the lowest C (the key names: C2, Cs2, D2, ...).',
                           default=2),
        'key_width': F('num', 'Width of a white key (default: the spacing of the claw tips of a '
                              'paw, so each digit sits on its own key).', default=None),
        'key_dip': F('num', 'How far the front of a key goes down when it is pressed (default: '
                            '0.42 of the key width, as on a real piano).', default=None),
        'case_width': F('num', 'Width of the case (default: 1.4 m at the case scale).',
                        default=None),
        'case_length': F('num', 'Length of the case behind the keys (default: 1.85 m at the case '
                                'scale).', default=None),
        'lid_open': F('num', 'Angle of the open lid in degrees.', default=30.0),
        'colors': T('The colors.', {
            'case': F('rgb', 'The case, the lid, the legs, the desk.', default=(24, 22, 26)),
            'white': F('rgb', 'The white keys.', default=(240, 236, 226)),
            'black': F('rgb', 'The black keys.', default=(20, 18, 20)),
            'metal': F('rgb', 'The iron plate and the pedals.', default=(200, 170, 90)),
            'inside': F('rgb', 'The soundboard.', default=(122, 84, 52)),
            'strings': F('rgb', 'The strings.', default=(168, 144, 100)),
            'sheet': F('rgb', 'The sheet of music on the desk.', default=(236, 230, 214)),
        }),
    }, optional=True),
    'bench': T('A piano bench (kind "bench"): a padded top on an apron and four legs. With a seated '
               'bind pose, the top reaches from behind the rump to the backs of the shins.', {
        'width': F('num', 'Width (x). Default: the thighs on the seat and the margin.',
                   default=None),
        'depth': F('num', 'Depth (z). Default: from the seat of the body.', default=None),
        'center_z': F('num', 'z of the middle of the top. Default: from the seat of the body.',
                      default=None),
        'margin': F('num', 'Margin of the top behind the rump and beside the thighs.',
                    default=0.03),
        'fit': F('bool', 'The top of the pad follows the lowest points of the seated body over '
                         'it (templates/biped Body.seat): the rump sinks into the middle of the '
                         'pad, and the thighs rest on its sides. False: a flat pad at the trunk '
                         'bottom.', default=True),
        'top_thickness': F('num', 'Thickness of the padded top under its lowest point.',
                           default=0.025),
        'colors': T('The colors.', {
            'top': F('rgb', 'The padded top.', default=(52, 40, 36)),
            'legs': F('rgb', 'The legs and the apron.', default=(30, 24, 22)),
        }),
    }, optional=True),
    'chair': T('An orchestra chair (kind "chair"): a seat, four legs, the back posts, and a top '
               'rail. The seat is sized as a bench.', {
        'width': F('num', 'Width (x). Default: from the seat of the body.', default=None),
        'depth': F('num', 'Depth (z). Default: from the seat of the body.', default=None),
        'center_z': F('num', 'z of the middle of the seat.', default=None),
        'margin': F('num', 'Margin of the seat behind the rump and beside the thighs.',
                    default=0.03),
        'fit': F('bool', 'The top of the seat follows the seated body (as a bench).',
                 default=True),
        'back_height': F('num', 'Height of the back above the seat. Default: 0.55 of the '
                                'shoulders above the seat.', default=None),
        'colors': T('The colors.', {
            'wood': F('rgb', 'The wood.', default=(205, 178, 122)),
        }),
    }, optional=True),
    'stand': T('A music stand (kind "music_stand"): a tripod, a post, and a tilted desk with a '
               'sheet that faces the player.', {
        'at': F('vec2', 'x and z of the post on the floor.', default=(0.0, 0.55)),
        'desk_center': F('num', 'Height of the middle of the desk. Default: below the eyes of the '
                                'seated animal.', default=None),
        'below_eyes': F('num', 'Distance of the middle of the desk below the eyes.',
                        default=0.2),
        'desk_width': F('num', 'Width of the desk.', default=None),
        'desk_height': F('num', 'Height of the desk plate.', default=None),
        'tilt': F('num', 'Lean of the desk away from the player, in degrees.', default=30.0),
        'colors': T('The colors.', {
            'stand': F('rgb', 'The tripod and the post.', default=(30, 26, 22)),
            'desk': F('rgb', 'The face of the desk.', default=(84, 72, 64)),
            'edge': F('rgb', 'The edges and the lip of the desk.', default=(160, 139, 122)),
            'sheet': F('rgb', 'The sheet of music.', default=(236, 230, 214)),
        }),
    }, optional=True),
    'strings': T('A violin, a cello, or a bow (kinds "violin", "cello", "bow"): the models of '
                 'the app, sized from the body.', {
        'length': F('num', 'Length (the tail end to the scroll, or the bow). Default: a violin of '
                           '1.1 arm reaches, a cello to the eyes of the seated animal, a bow of '
                           '1.25 violins or 0.62 cellos.', default=None),
        'at': F('vec2', 'x and z of the end pin (or the tail end) on the floor (a scene prop).',
                default=(0.0, 0.25)),
        'lean': F('num', 'Lean of an upright instrument back toward the player, in degrees.',
                  default=25.0),
        'side_lean': F('num', 'Lean of an upright instrument to the left of the player, in '
                              'degrees.', default=0.0),
        'hair': F('vec3', 'Direction of the hair of a bow in the hand frame (a bow).',
                  default=(0.0, 0.0, 1.0)),
        'top': F('vec3', 'Direction of the top plate of a violin in the hand frame (a violin in a '
                         'hand).', default=(0.0, 1.0, 0.0)),
        'neck': F('num', 'Place of the grip on a violin in a hand: a share of the length from the '
                         'tail end (the left paw in the first position).', default=0.75),
        'bow_for': F('str', 'The instrument of a bow: "violin" or "cello".', default='violin'),
        'colors': T('The colors.', {
            'wood': F('rgb', 'The ribs, the back edge, the neck.', default=(122, 58, 32)),
            'top': F('rgb', 'The arched top plate and the scroll.', default=(176, 86, 44)),
            'dark': F('rgb', 'The fingerboard, the pegs, the tailpiece, the f-holes.',
                      default=(27, 23, 20)),
            'bridge': F('rgb', 'The bridge.', default=(227, 201, 154)),
            'strings': F('rgb', 'The strings.', default=(154, 144, 128)),
            'stick': F('rgb', 'The stick of a bow.', default=(59, 42, 32)),
            'hair': F('rgb', 'The hair of a bow.', default=(232, 226, 212)),
            'frog': F('rgb', 'The frog of a bow.', default=(27, 23, 20)),
        }),
    }, optional=True),
    'material': T('The material of the prop.', {
        'roughness': F('num', 'Roughness.'),
        'specular': F('num', 'Specular IOR level.'),
    }),
    'cast_shadow': F('bool', 'False for a thin prop: its shadow reads as a line on the body.',
                     default=True),
    'contact': F('str', 'The piece of the prop that the contact check tests against the body '
                        '("shaft"), or "none".', default='none'),
    'hidden_in_reference': F('bool', 'The sheet pose hides the prop (scale 0).', default=True),
})

ROLE = T('A role pack (roles/<name>/role.toml).', {
    'role': T('The role.', {
        'name': F('str', 'Name: the folder name under roles/.'),
        'template': F('str', 'The rig template that the clips need.', default='biped'),
        'stance': F('str', '"standing" or "seated".'),
        'doc': F('str', 'One line on what the role does.'),
    }),
    'bind': BIND,
    'rig': T('The rig options of the role.', {
        'fingers': F('int', 'Finger bones of each paw: 1 (one finger bone past the knuckles), or '
                            'one digit bone for each hand claw (details.hand_claws.offsets, 4 on '
                            'the bears): the digits of a pianist strike single keys.', default=1),
    }),
    'props': A('The props of the role, in the order of the joined mesh.', ROLE_PROP, default=()),
    'clips': T('The clips.', {
        'fps': F('int', 'Frames per second of the baked clips.', default=30),
        'notes': M('A short note on each clip (the viewer shows it).', F('str', 'Note.'),
                   default={}),
    }),
    'targets': T('The body that the IK targets of the clips were made on. On another body the '
                 'wrist targets move with its shoulders and scale with its arm reach.', {
        'shoulder': F('vec3', 'Left shoulder joint of that body (sheet pose).'),
        'reach': F('num', 'Arm reach of that body: shoulder to elbow plus elbow to wrist.'),
    }),
    'checks': T('The checks of the role: the gates of each clip (a clip fails above a limit), and '
                'the report checks of a held instrument.', {
        'contact_depth': F('num', 'Deepest contact of a test part in any frame, in animal '
                                  'heights.', default=0.01),
        'contact_tests': F('strs', 'Parts of each arm that are tested against the rest of the '
                                   'body: paw, forearm, claws, props.',
                           default=('paw', 'forearm', 'claws', 'props')),
        'scene_depth': F('num', 'Deepest point of the body skin inside a scene prop (a piano, a '
                                'bench) in any frame, in animal heights.',
                         default=0.01),
        'seat_gap': F('num', 'Largest gap between the seat top and the lowest skin over it, of '
                             'the rump and of the thighs apart, in any seated frame: the rump '
                             'and the thighs rest on the seat.', default=0.015),
        'hand_targets': F('num', 'Largest distance of the knuckles (one finger bone) or of the '
                                 'claw tips of the pressing digits from the targets that the '
                                 'clips give (pack.hand_targets), in animal heights.',
                          default=0.01),
        'instrument_reach': F('vec2', 'Report check of a role with a held instrument (a violin): '
                                      'the range of the instrument length over the arm reach to '
                                      'the middle of the palm. A person: a violin of 0.6 m and a '
                                      'reach of about 0.6 m (the rule of the prop library). A '
                                      'value outside the range blocks the app round.',
                              default=(0.9, 1.1)),
        'ik_reach': F('num', 'Report check of a role with a held instrument: the largest share '
                             'of the arm reach (the upper arm and the forearm) that the IK wrist '
                             'targets of a clip ask for. Above 1, the IK stops at the reach, and '
                             'the paw misses its target.', default=1.0),
    }),
    'review': T('Review outputs of the role.', {
        'shots': F('str', 'JSON file of the review frames (studio/shoot.mjs frames).',
                   default=None),
        'blender': F('strs', 'Blender scripts of the role that the shots stage runs (for example '
                             'a plot of a baton path).', default=()),
    }),
})
