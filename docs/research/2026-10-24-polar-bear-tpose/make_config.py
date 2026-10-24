"""Writes the rig config of the T-pose polar bear mesh, tools/mesh-rigs/polar-bear.json, from the
old config of the polar bear mesh of 2026-10-22 and the measures of this folder.

    python3 -I make_config.py <old.json> <out.json>

It keeps the seat rules of the old config (the bench, the seated legs, the sit rule, the color
shift), and takes the joints, the weights, and the face boxes of the new mesh. It drops the cut,
the old corrective shapes, and the rules that name faces of the old mesh.
"""
import json
import sys

old = json.load(open(sys.argv[1]))

# The skull top of the mesh is at 1.0 u, and the old studio polar bear has its skull top at
# 1.923 m (the app note of the old config), so the scale is 1.923 m for each unit. The leg factor
# raises the shoulder joints from 0.645 u by 0.6 of the leg below the crotch at 0.19 u.
SCALE = 1.923
LEG_FACTOR = 1.6
SHOULDER_Y = 0.725
# pnpm rig-mesh prints the standing shoulder joints after the leg factor: 0.854 u.
SHOULDERS = round(0.854 * SCALE, 6)

c = {
    "source": "assets/models/polar-bear/polar-bear-tpose.glb",
    "sourceNote": "The T-pose polar bear mesh of the user, of 2026-10-24, with no edit (assets/models/polar-bear/README.md). The user said: \"mesh for polar bear: [...] use the same eye size as the bear\". The arms of the T-pose are free of the trunk, so the rig keeps each face of the mesh: no cut, no copy, no ring, and no split.",
    "output": "assets/models/polar-bear/polar-bear-tpose.rig.glb",
    "name": "Polar Bear",
    "weld": 1e-05,
    "app": {
        "shoulders": SHOULDERS,
        "reach": 0.6194,
        "note": f"The size of the studio polar bear before the meshes: the skull top at 1.923 m. The skull top of the mesh is at 1.0 u, so the scale is {SCALE} m for each unit. The leg factor raises the standing shoulder joints from {SHOULDER_Y} u, and the landmark rises with them, so that the trunk, the head, and the arms keep their meters. The reach is the reach of the arm factor below.",
    },
    "armFactor": 1,
    "armFactorNote": "The arms keep the length of the mesh (user rule: keep the limbs of a mesh of the user, and fit the props).",
    "legFactor": LEG_FACTOR,
    "legFactorNote": "The user chose longer legs with the size kept for the polar bear mesh on 2026-10-22 (\"Longer legs, keep size\"), because with short legs the round belly hid the lap on the bench, and the seated bear read almost as standing (docs/research/2026-10-22-polar-legs.md). The T-pose mesh has short legs too, so it keeps the factor 1.6.",
    "joints": {
        "root": {"head": [0, 0, 0], "tail": [0, 0, 0.1], "roll": [0, 1, 0]},
        "hips": {"head": [0, 0.29, -0.01], "tail": "spine"},
        "spine": {"head": [0, 0.38, -0.015], "tail": "spine1"},
        "spine1": {"head": [0, 0.48, -0.01], "tail": "chest"},
        "chest": {"head": [0, 0.58, -0.015], "tail": "neck"},
        "neck": {"head": [0, 0.68, -0.03], "tail": "head"},
        "head": {"head": [0, 0.79, -0.02], "tail": [0, 1.0, 0.04]},
        "ear_L": {"head": [0.078, 0.96, 0.02], "tail": [0.08, 1.0, 0.02]},
        "clavicle_L": {"head": [0.03, 0.7, -0.035], "tail": "upper_arm_L"},
        "upper_arm_L": {"head": [0.13, SHOULDER_Y, -0.035], "tail": "forearm_L", "roll": "palm"},
        "forearm_L": {"head": [0.29, 0.734, -0.04], "tail": "forearm_twist_L", "roll": "palm"},
        "forearm_twist_L": {"head": [0.362, 0.734, -0.03], "tail": "hand_L", "roll": "palm"},
        "hand_L": {"head": [0.435, 0.733, -0.022], "tail": "fingers_L", "roll": "palm"},
        "fingers_L": {"head": [0.466, 0.729, -0.02], "tail": [0.49, 0.72, -0.02], "roll": "palm"},
        "thigh_L": {"head": [0.11, 0.28, -0.01], "tail": "shin_L"},
        "shin_L": {"head": [0.115, 0.15, -0.015], "tail": "foot_L"},
        "foot_L": {"head": [0.113, 0.065, -0.035], "tail": "toes_L", "roll": [0, 1, 0]},
        "toes_L": {"head": [0.12, 0.02, 0.05], "tail": [0.12, 0.003, 0.11], "roll": [0, 1, 0]},
        "tail": {"head": [0, 0.29, -0.14], "tail": [0, 0.285, -0.185], "roll": [0, 1, 0]},
    },
    "palm": [0, -1, 0],
    "jointsNote": "The places are in the units and the axes of the studio in the pose of the source: 1 unit from the soles to the skull top, the soles at y = 0, +z forward, +x the left side. The right side mirrors the left side. The probes are in docs/research/2026-10-24-polar-bear-tpose/. The legs part below the crotch at y 0.20. The thigh joint lies inside the haunch at y 0.28, as on the polar bear mesh of 2026-10-22, the knee at y 0.15, and the ankle at the narrowest leg cut. With the thigh joint at the crotch, the thigh was too short to sit level, and the seat rule pulled the rump down 44 cm. The neck is narrowest at y 0.63, and the head starts at y 0.79. The arms are in a T-pose: each round arm goes out level at y 0.73, free of the trunk beyond x 0.145 (sections-x.txt). The cuts across the arm axis give its middle line (arm-axis.txt): the shoulder joint lies inside the root of the arm, the elbow at x 0.29, the wrist where the paw starts (x 0.435), and the forearm twist halfway between them. The finger joint lies at the root of the claws. The ears start at y 0.96, and a ball tail sits at y 0.26 to 0.33 behind the rump. In the T-pose, the palm faces down.",
    # leg_turns.py of docs/research/2026-10-16-hip-open/ with the joints above, 5 15 0: the thighs
    # 5 degrees down and 15 degrees out, and the shins vertical, as the old polar bear mesh sat.
    "studio": {**old["studio"], "legTurns": {"thigh": [0.662208, 0.032182, -0.174523, 0.728002], "shin": [0.115266, 0.0, -0.011527, 0.993268], "foot": [0.0, 0.0, 0.0, 1.0], "toes": [0.0, 0.0, 0.0, 1.0]}},
    "weights": {
        "armSplit": 0.145,
        "armFree": {"turn": 0, "radius": 0.09, "floor": 0.6, "note": "The arm of the T-pose is free of the trunk beyond x 0.145, from y 0.65 to 0.79, and the trunk there ends below y 0.53 (sections-x.txt). A vertex of the free arm lies beyond the plane |x| = armSplit, within radius of the chain of the arm joints, and above the floor."},
        "stretchRamp": 0,
        "headFrom": 0.81,
        "earBase": [0.955, 0.975],
        "tailBall": {"center": [0, 0.29, -0.165], "radius": 0.04, "behind": -0.15},
        "sliver": {"angle": 10, "longest": 0.03},
        "line": {"angle": 170, "head": True, "note": "The angle of the other meshes of 2026-10-23: a lower angle mixes the weights of long arm faces."},
        "clavicleFrom": [0.6, 0.65],
        "armTop": [0.8, 0.86],
        "shoulderHead": [0.1, 0.16],
        "fingers": 0.5,
        "haunch": {"height": [0.17, 0.28]},
        "note": "Beyond the plane of armSplit (armFree), only the free arm follows the arm bones. Above headFrom, each vertex follows the head only. armTop starts above the top of the level arms of the T-pose (y 0.79): from y 0.68, it gave the top of each arm to the neck, and those faces folded in each sample. Each ear follows its ear bone above earBase. The short tail is a ball on one bone (tailBall). The rig has no cut, no ring, and no split (user, 2026-10-23).",
    },
    "refine": {"rings": [], "flip": old["refine"]["flip"]},
    "check": old["check"],
    "colors": {
        "samples": 6,
        "palette": 48,
        "dark": 0.0074,
        "eyeShare": 0.34,
        "eyeBox": [[0.028, 0.922, 0.088], [0.062, 0.958, 0.118]],
        "noseBox": [[-0.035, 0.88, 0.145], [0.035, 0.935, 0.19]],
        "nose": old["colors"]["nose"],
        "shift": old["colors"]["shift"],
        "note": "The color shift of the polar bear mesh of 2026-10-22 moves the cream fur toward the white of the reference. With the dark limit 0.0037 of that mesh, 12.1% of the faces outside the eye and nose boxes were dark, and with 0.0015 none.",
    },
    "eyeShell": old["eyeShell"],
    "chair": {**old["chair"], "front": -0.017},
    "crease": old["crease"],
    "sit": old["sit"],
    "upperTwist": old["upperTwist"],
}
with open(sys.argv[2], "w") as f:
    json.dump(c, f, indent=2, ensure_ascii=False)
    f.write("\n")
