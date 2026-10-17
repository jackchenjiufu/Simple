# -*- coding: utf-8 -*-
"""Simple App 图标 — DeepSeek 结构精确复刻 v2
官方实测(512 坐标): 上部拱形(∩) y50-360 宽 x108-403 = 58%, 下部横带 y420-486 宽 54%
1024 等比: 拱 y100-720, 横带 y840-972, 线宽 ~90
"""
from PIL import Image, ImageDraw
import os

SIZE = 1024
R = 235

def gradient_bg():
    g = Image.linear_gradient("L").resize((SIZE, SIZE))
    img = Image.new("RGBA", (SIZE, SIZE))
    px = img.load(); gpx = g.load()
    c0 = (9, 22, 36); c1 = (12, 84, 130); c2 = (35, 178, 226)
    for y in range(SIZE):
        for x in range(SIZE):
            t = gpx[x, y] / 255.0
            if t < 0.6:
                k = t / 0.6
                c = (c0[0]+(c1[0]-c0[0])*k, c0[1]+(c1[1]-c0[1])*k, c0[2]+(c1[2]-c0[2])*k)
            else:
                k = (t - 0.6) / 0.4
                c = (c1[0]+(c2[0]-c1[0])*k, c1[1]+(c2[1]-c1[1])*k, c1[2]+(c2[2]-c1[2])*k)
            px[x, y] = (int(c[0]), int(c[1]), int(c[2]), 255)
    return img

def bezier3(p0, p1, p2, p3, n=60):
    pts = []
    for i in range(n + 1):
        t = i / n; a, b = 1 - t, t
        x = a**3*p0[0] + 3*a*a*b*p1[0] + 3*a*b*b*p2[0] + b**3*p3[0]
        y = a**3*p0[1] + 3*a*a*b*p1[1] + 3*a*b*b*p2[1] + b**3*p3[1]
        pts.append((x, y))
    return pts

def stroke(pts, width, layer):
    d = ImageDraw.Draw(layer)
    for (x, y) in pts:
        d.ellipse([x - width/2, y - width/2, x + width/2, y + width/2], fill=(255, 255, 255, 255))
    if len(pts) > 1:
        d.line(pts, fill=(255, 255, 255, 255), width=int(width), joint="curve")

def build(out):
    img = gradient_bg()
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    W = 92
    # ∩形拱: 左腿→顶弧→右腿 (连续)
    pts = []
    pts += bezier3((330, 700), (250, 600), (228, 420), (296, 236))     # 左腿(下→上,内弯)
    pts += bezier3((296, 236), (392, 132), (632, 132), (728, 236))     # 顶部拱 顶点(512,120)
    pts += bezier3((728, 236), (796, 420), (774, 600), (694, 700))     # 右腿
    stroke(pts, W, layer)
    # 底部横带 (微弧形)
    pts2 = bezier3((250, 906), (430, 880), (600, 884), (774, 906))
    stroke(pts2, int(W*0.85), layer)
    img = Image.alpha_composite(img, layer)
    m = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, SIZE-1, SIZE-1], radius=R, fill=255)
    img.putalpha(Image.composite(img.split()[3], Image.new("L", (SIZE, SIZE), 0), m))
    img.save(out)
    print("saved", out)

if __name__ == "__main__":
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icon")
    os.makedirs(d, exist_ok=True)
    build(os.path.join(d, "vC2_arch.png"))