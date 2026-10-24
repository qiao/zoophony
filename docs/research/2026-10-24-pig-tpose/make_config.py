"""Writes the rig config of the T-pose pig mesh, tools/mesh-rigs/pig.json, from the old config of
the pig mesh and the measures of this folder.

    python3 -I make_config.py <old.json> <out.json>

It keeps the seat rules of the old config (the chair, the seated legs, the sit rule) and the size
of the old pig, and takes the joints, the weights, and the face boxes of the new mesh. It drops the
copy with round arms, the old corrective shapes, and the rules that name faces of the old mesh.
"""
import json
import sys

old = json.load(open(sys.argv[1]))

# The old pig has 1.2 m for each unit (the shoulder joints at 0.56 u and 0.671951 m). The new pig
# keeps that scale, so that its head top at 1.0 u stays at 1.2 m. The shoulder joints of the new
# mesh are at 0.595 u.
SCALE = 1.2
SHOULDER_Y = 0.595

c = {
    "source": "assets/models/pig/pig-tpose.glb",
    "sourceNote": "The T-pose pig mesh of the user, of 2026-10-24, with no edit (assets/models/pig/README.md). The user said: \"replace the pig model with [...] pig_tpose [...]\". The arms of the T-pose are free of the trunk, so the rig keeps each face of the mesh: no cut, no copy, no ring, and no split.",
    "output": "assets/models/pig/pig-tpose.rig.glb",
    "name": "Pig",
    "weld": 1e-05,
    "app": {
        "shoulders": round(SHOULDER_Y * SCALE, 6),
        "reach": 0.3845,
        "note": f"The pig keeps the size of the pig mesh before it: {SCALE} m for each unit, the head top at 1.2 m. The reach is the reach of the arm factor below.",
    },
    "armFactor": 1.3692,
    "armFactorNote": "The factor that gives the reach of the pig mesh before it (0.3845 m), so that the paws reach the horn as before. The factor 1.5 of that mesh gives 0.42 m on this mesh.",
    "legFactor": 1,
    "upperTwist": old["upperTwist"],
    "joints": {
        "root": {"head": [0, 0, 0], "tail": [0, 0, 0.1], "roll": [0, 1, 0]},
        "hips": {"head": [0, 0.22, -0.005], "tail": "spine"},
        "spine": {"head": [0, 0.33, 0.0], "tail": "spine1"},
        "spine1": {"head": [0, 0.44, 0.01], "tail": "chest"},
        "chest": {"head": [0, 0.54, 0.005], "tail": "neck"},
        "neck": {"head": [0, 0.63, -0.01], "tail": "head"},
        "head": {"head": [0, 0.68, 0.01], "tail": [0, 0.99, 0.03]},
        "ear_L": {"head": [0.15, 0.88, 0.04], "tail": [0.125, 0.99, 0.065]},
        "clavicle_L": {"head": [0.03, 0.6, -0.01], "tail": "upper_arm_L"},
        "upper_arm_L": {"head": [0.165, SHOULDER_Y, -0.005], "tail": "forearm_L", "roll": "palm"},
        "forearm_L": {"head": [0.27, 0.592, -0.051], "tail": "forearm_twist_L", "roll": "palm"},
        "forearm_twist_L": {"head": [0.32, 0.592, -0.077], "tail": "hand_L", "roll": "palm"},
        "hand_L": {"head": [0.37, 0.589, -0.1], "tail": "fingers_L", "roll": "palm"},
        "fingers_L": {"head": [0.39, 0.586, -0.108], "tail": [0.41, 0.585, -0.115], "roll": "palm"},
        "thigh_L": {"head": [0.105, 0.21, 0.005], "tail": "shin_L"},
        "shin_L": {"head": [0.104, 0.12, 0.0], "tail": "foot_L"},
        "foot_L": {"head": [0.104, 0.065, -0.005], "tail": "toes_L", "roll": [0, 1, 0]},
        "toes_L": {"head": [0.11, 0.02, 0.05], "tail": [0.11, 0.003, 0.09], "roll": [0, 1, 0]},
        "tail": {"head": [0, 0.32, -0.15], "tail": [0.005, 0.32, -0.2], "roll": [0, 1, 0]},
    },
    "palm": [0, -0.7, 0.7],
    "jointsNote": "The places are in the units and the axes of the studio in the pose of the source: 1 unit from the soles to the head top, the soles at y = 0, +z forward, +x the left side. The right side mirrors the left side. The probes are in docs/research/2026-10-24-pig-tpose/. The legs part below y 0.16, and the thigh joint lies inside the haunch. The neck is narrowest at y 0.67, and the big head starts there. The floppy ears stand out to the sides from y 0.88. The arms are in a T-pose: each round arm goes out level at y 0.59 and a little back, free of the trunk beyond x 0.17, to the hoof at x 0.41 (sections-x.txt, arm-axis.txt). The elbow lies halfway to the wrist, the wrist where the hoof starts, and the forearm twist between them. The curly tail sits behind the rump at y 0.29 to 0.35. In the T-pose, the sole of the hoof faces down and a little forward. Of four palms near down (gate-variants.txt), this one gives the least twist in the arm gate.",
    # leg_turns.py of docs/research/2026-10-16-hip-open/ with the joints above, 25 15 0: the seat of
    # design 5.2, as the pig before it.
    "studio": {**old["studio"], "legTurns": {"thigh": [0.542024, 0.001993, -0.144273, 0.827884], "shin": [0.045314, 0.0, 0.0, 0.998973], "foot": [0.0, 0.0, 0.0, 1.0], "toes": [0.0, 0.0, 0.0, 1.0]}},
    "weights": {
        "armSplit": 0.17,
        "armFree": {"turn": 0, "radius": 0.075, "floor": 0.5, "note": "The arm of the T-pose is free of the trunk beyond x 0.17, from y 0.54 to 0.65 (sections-x.txt). A vertex of the free arm lies beyond the plane |x| = armSplit, within radius of the chain of the arm joints, and above the floor."},
        "stretchRamp": 0,
        "headFrom": 0.68,
        "earBase": old["weights"]["earBase"],
        "tailBall": {"center": [0.005, 0.32, -0.185], "radius": 0.04, "behind": -0.15},
        "sliver": {"angle": 10, "longest": 0.03},
        "line": {"angle": 170, "head": True, "note": "The angle of the other meshes of 2026-10-23 and 2026-10-24: a lower angle mixes the weights of long arm faces."},
        "clavicleFrom": [0.55, 0.59],
        "armTop": [0.66, 0.7],
        "shoulderHead": [0.1, 0.15],
        "fingers": 0.5,
        "haunch": {"height": [0.13, 0.21]},
        "note": "Beyond the plane of armSplit (armFree), only the free arm follows the arm bones. Above headFrom, each vertex follows the head only, the ears too (earBase above the head). The curly tail is a ball on one bone (tailBall). armTop starts above the top of the level arms (y 0.65). The rig has no cut, no ring, and no split (user, 2026-10-23).",
    },
    "refine": {"rings": [], "flip": old["refine"]["flip"]},
    "check": old["check"],
    "colors": {
        "samples": 6,
        "palette": 48,
        "dark": 0.0121,
        "eyeShare": 0.34,
        "eyeBox": [[0.05, 0.81, 0.11], [0.09, 0.86, 0.145]],
        "note": "The values of samples, palette, and eyeShare are the values of the other meshes. The pink snout has no dark nose, so the pig has no nose box, as the pig mesh before it.",
    },
    "eyeShell": old["eyeShell"],
    "chair": old["chair"],
    "crease": old["crease"],
    "sit": old["sit"],
}
with open(sys.argv[2], "w") as f:
    json.dump(c, f, indent=2, ensure_ascii=False)
    f.write("\n")
