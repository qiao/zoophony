# Crops the white fur of the front row and of the back row of two frames, and prints the luma.
import sys, colorsys
from PIL import Image, ImageDraw
def q(v,p): v=sorted(v); return v[min(len(v)-1,int(p*len(v)))] if v else -1
def white(im, box):
    L=[]
    for y in range(box[1],box[3]):
        for x in range(box[0],box[2]):
            r,g,b=im.getpixel((x,y)); h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
            if s<0.4: L.append(0.2126*r+0.7152*g+0.0722*b)
    return L
shot=Image.open(sys.argv[1]).convert('RGB'); ref=Image.open(sys.argv[2]).convert('RGB')
boxes={
 'shot':[('front rabbit L',(400,560,470,700)),('front rabbit C',(660,560,740,720)),('polar bear',(310,400,430,560)),
         ('back panda 1',(1150,180,1230,320)),('back panda 2',(1320,180,1400,320)),('back panda 3',(1490,200,1570,330)),
         ('back pig L',(300,330,380,420)),('back hippo L',(760,110,880,300))],
 'ref':[('front rabbit L',(150,650,230,790)),('front rabbit C',(470,740,550,860)),('polar bear',(130,860,280,1050)),
        ('panda 1',(300,390,370,520)),('panda 2',(455,380,525,510)),('panda 3',(570,370,640,500)),
        ('penguin belly C',(960,190,1020,330)),('hippo C',(910,360,1030,520))],
}
for name,im in (('shot',shot),('ref',ref)):
    d=ImageDraw.Draw(im)
    for label,box in boxes[name]:
        L=white(im,box)
        print(f'{name:5} {label:16} white px {len(L):5}  p50 {q(L,.5):5.0f}  p90 {q(L,.9):5.0f}')
        d.rectangle(box,outline=(0,255,0),width=3); d.text((box[0],box[1]-12),label,fill=(0,255,0))
    im.save(f'{name}-boxes.png')
