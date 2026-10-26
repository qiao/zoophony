"""usage: probecrop.py <dir> <moment> <view> <x0,y0,x1,y1> <scale>: colors beside normals."""
import os
import sys

from PIL import Image

d, moment, view, box, scale = sys.argv[1:6]
box = [float(v) for v in box.split(',')]
scale = float(scale)
ims = []
for kind in ('colors', 'normals'):
    im = Image.open(os.path.join(d, f'bassist-{kind}-{moment}-{view}.png')).convert('RGB')
    w, h = im.size
    im = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
    ims.append(im.resize((int(im.width * scale), int(im.height * scale))))
out = Image.new('RGB', (ims[0].width * 2, ims[0].height))
out.paste(ims[0], (0, 0))
out.paste(ims[1], (ims[0].width, 0))
path = os.path.join(d, f'crop-{moment}-{view}.png')
out.save(path)
print(path)
