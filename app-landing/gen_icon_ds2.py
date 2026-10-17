# -*- coding: utf-8 -*-
"""Simple App 图标 — DeepSeek 结构精确复刻版
官方结构(实测反推): 深蓝黑→亮蓝对角渐变 + 居中白色"∩形拱(双腿内收)+底部横向波浪带"
去掉多余装饰(高光/螺旋尾/投影),只保留: 渐变底 + 白色粗曲线
"""
from PIL import Image, ImageDraw, ImageFilter
import math, os

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

def main_shape():
    """官方结构: ∩形拱 + 双腿向内收拢"""
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    w = 100
    pts = []
    # 顶部拱 (左→右,上凸): 左腿起点 (330,700) → 左侧上升 (200,380) → 拱顶左 (270,130) → 拱顶 (512,70) → 拱顶右 (754,130) → 右侧下降 (824,380) → 右腿终点 (694,700)
    pts += bezier3((330, 700), (180, 470), (250, 150), (512, 88))    # 左腿+左拱(到顶)
    pts += bezier3((512, 88), (774, 150), (844, 470), (694, 700))    # 右拱+右腿(对称)
    stroke(pts, w, layer)
    return layer

def bottom_wave():
    """底部横向波浪带"""
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    w = 88
    pts = bezier3((250, 905), (420, 885), (604, 888), (774, 905))
    stroke(pts, w, layer)
    return layer

def build(out):
    img = gradient_bg()
    img = Image.alpha_composite(img, main_shape())
    img = Image.alpha_composite(img, bottom_wave())
    m = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, SIZE-1, SIZE-1], radius=R, fill=255)
    img.putalpha(Image.composite(img.split()[3], Image.new("L", (SIZE, SIZE), 0), m))
    img.save(out)
    print("saved", out)

if __name__ == "__main__":
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icon")
    os.makedirs(d, exist_ok=True)
    build(os.path.join(d, "vC_arch.png"))
    build(os.path.join(d, "vC_arch512.png") if False else os.path.join(d, "vC_arch2.png"))