import sys, glob, os
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
for f in sorted(glob.glob(os.path.join(src, '*-e*.png'))):
    im = Image.open(f)
    w = 648 * 3
    crop = im.crop((0, 0, w, im.height))
    crop = crop.resize((w // 2 * 1, im.height // 2 * 1)) if False else crop
    crop.save(os.path.join(out, os.path.basename(f).replace('.png', '-back.png')))
    print(os.path.basename(f), im.size)
