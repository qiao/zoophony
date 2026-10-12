"""The prop library: low-poly, flat-shaded props in the style of the animals, built by code.

numpy only, three.js axes (x is the left of the animal, y up, z forward), in animal heights. Each
kind is a module with one build function. The studio module studio/props.py reads the role
config, sizes each prop from the body (the seat from the legs, the keyboard from the forearms),
and calls the kinds:

    piano.py    a grand piano: case with a bentside, open lid on its stick, inside (soundboard,
                plate, strings), white and black keys (the keys that the clips press are nodes
                of their own), key bed, cheeks, fallboard, music desk with a sheet, three legs,
                lyre, three pedals
    bench.py    a piano bench: a padded top, an apron, four tapered legs
    chair.py    an orchestra chair: a seat, four legs, two back posts, a wide top rail
    stand.py    a music stand: a tripod, a post, a tilted desk with a lip, a sheet
    strings.py  a violin, a cello (with its end pin), and a bow

A kind returns nodes (studio/props.py PropNode): one mesh for each node, one color for each
triangle. shapes.py has the parts: boxes, prisms, tubes, lofted plates.
"""
