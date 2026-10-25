#!/bin/zsh
# Builds and measures the flatten moves of the table of section 3 with variant.sh.
# Run it from the root of the tree: zsh <this file> > variants.txt
for v in 0 0.008 0.009 0.01; do
  zsh "${0:A:h}/variant.sh" m$v flatten.move=$v
done
