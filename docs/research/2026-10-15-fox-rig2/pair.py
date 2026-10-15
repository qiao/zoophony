"""Puts images in rows with a label above each row.

    uv run --no-project --with pillow python -I pair.py <out.png> @<label> <image>... @<label> <image>...
"""
import sys
from PIL import Image, ImageDraw
# pair.py out.png label1 img1 [img2 ...] -- label2 img... : rows
args=sys.argv[2:]; rows=[]; cur=None
for a in args:
    if a.startswith('@'):
        cur=[a[1:],[]]; rows.append(cur)
    else:
        cur[1].append(a)
ims=[[Image.open(p).convert('RGB') for p in r[1]] for r in rows]
w=max(sum(i.width for i in r) for r in ims); h=sum(max(i.height for i in r)+22 for r in ims)
out=Image.new('RGB',(w,h),'white'); d=ImageDraw.Draw(out); y=0
for (label,_),r in zip(rows,ims):
    d.text((4,y+4),label,fill='black'); x=0; y+=22
    for i in r: out.paste(i,(x,y)); x+=i.width
    y+=max(i.height for i in r)
out.save(sys.argv[1]); print(out.size)
