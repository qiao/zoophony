# Measures the frames of `pnpm look-lab` against orchestra-latest.png (docs/research/2026-10-18-light-color.md):
# the stage tone, the white fur, a rabbit torso, the lit floor, a chair, the floor shadows, the back of
# the conductor, and the hall above the stage. Usage: python3 metrics.py <look-lab dir>...
import sys, re, colorsys
from PIL import Image
def q(v,p): v=sorted(v); return v[min(len(v)-1,int(p*len(v)))]
def stats(im, box, mask=None):
    L=[];H=[];S=[]
    for y in range(box[1],box[3]):
        for x in range(box[0],box[2]):
            r,g,b=im.getpixel((x,y)); h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
            l=0.2126*r+0.7152*g+0.0722*b
            if mask and not mask(l,h*360,s): continue
            L.append(l);H.append(h*360);S.append(s)
    return L,H,S
def row(d):
    md=open(f'{d}/look.md').read()
    def tree(name):
        m=re.search(r'\| '+re.escape(name)+r' \| tree, orchestra \| \((\d+), (\d+), (\d+)\) \| (\d+) \| (\d+) \| ([\d.]+) \|', md)
        return f'{m.group(4)}/{m.group(5)}°/{m.group(6)}' if m else '?'
    m=re.search(r'\| floor with the shadows of the players \| tree, orchestra \| ([\d.]+) \| ([\d.]+) \| ([\d.]+)', md)
    sh=f'{float(m.group(1)):.0f}/{float(m.group(3)):.1f}' if m else '?'
    m=re.search(r'\| tree, orchestra \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| ([\d.]+) \|', md)
    st=f'{m.group(1)}/{m.group(3)}/{m.group(5)}' if m else '?'
    im=Image.open(f'{d}/play-orchestra.png').convert('RGB')
    L,H,S=stats(im,(360,550,405,630))
    rab=f'{q(L,.1):.0f}/{q(L,.5):.0f}/{q(L,.9):.0f} {q(H,.5):.0f}°/{q(S,.5):.2f}'
    L,H,S=stats(im,(325,560,372,660),lambda l,h,s: 28<h<50 and s>0.3 and l>90)
    ch=f'{q(L,.5):.0f}/{q(H,.5):.0f}°/{q(S,.5):.2f}' if L else '-'
    w,h=im.size; L,H,S=stats(im,(int(w*.62),int(h*.02),int(w*.95),int(h*.14)))
    hall=f'{q(L,.5):.0f}/{q(L,.9):.0f}'
    return f'| {d.split("/")[-1]} | {st} | {tree("white fur, front left rabbit")} | {rab} | {tree("lit floor, left of the podium")} | {tree("lit floor, right of the podium")} | {ch} | {sh} | {tree("back of the conductor")} | {hall} |'
print('| variant | stage p5/p50/p95 | fur L/hue/sat | rabbit torso p10/p50/p90 hue/sat | floor L | floor R | chair L/hue/sat | shadow p5/ratio | conductor | hall p50/p90 |')
print('| ref | 26/107/212 | 163/19°/0.30 | 112/168/232 21°/0.23 | 191/28°/0.54 | 158/26°/0.60 | 174/33°/0.65 | 63/2.6 | 52/18°/0.73 | 12/49 |')
for d in sys.argv[1:]:
    print(row(d))
