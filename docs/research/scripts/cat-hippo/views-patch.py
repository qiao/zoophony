"""Puts the cat and the hippo on the views page, for a capture only (not for a commit).

Usage: views-patch.py <views.ts>
"""
import sys

path = sys.argv[1]
text = open(path).read()
old_rabbit = """        species: 'rabbit',
        instrument: 'violin',
        stand: false,
        podium: false,
        centers: [103, 273, 421],
      },
      {
        species: 'rabbit',
        instrument: 'clarinet',
        stand: false,
        podium: false,
        centers: [593, 742, 924],"""
new_rabbit = """        species: 'cat',
        instrument: 'viola',
        stand: false,
        podium: false,
        centers: [103, 273, 421],
      },
      {
        species: 'cat',
        instrument: 'viola',
        stand: true,
        podium: false,
        centers: [593, 742, 924],"""
old_fox = """        species: 'fox-red',
        instrument: 'violin',
        stand: false,
        podium: false,
        centers: [103, 273, 421],
      },
      {
        species: 'fox-red',
        instrument: 'clarinet',
        stand: true,
        podium: false,
        centers: [593, 742, 920],"""
new_fox = """        species: 'hippo',
        instrument: 'contrabass',
        stand: false,
        podium: false,
        centers: [103, 300, 497],
      },
      {
        species: 'hippo',
        instrument: 'contrabass',
        stand: true,
        podium: false,
        centers: [593, 770, 944],"""
assert old_rabbit in text and old_fox in text
text = text.replace(old_rabbit, new_rabbit).replace(old_fox, new_fox)
open(path, 'w').write(text)
