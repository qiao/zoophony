import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, z, step, out = sys.argv[1], *map(int, sys.argv[2:8]), sys.argv[8]
im = Image.open(src).convert('RGB')
c = im.crop((x0, y0, x1, y1)).resize(((x1-x0)*z, (y1-y0)*z), Image.LANCZOS)
d = ImageDraw.Draw(c)
for x in range((x0//step+1)*step, x1, step):
    X=(x-x0)*z; d.line([(X,0),(X,c.height)], fill=(0,200,200)); d.text((X+2,2), str(x), fill=(255,255,0))
for y in range((y0//step+1)*step, y1, step):
    Y=(y-y0)*z; d.line([(0,Y),(c.width,Y)], fill=(0,200,200)); d.text((2,Y+2), str(y), fill=(255,255,0))
c.save(out)
