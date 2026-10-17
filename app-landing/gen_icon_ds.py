# -*- coding: utf-8 -*-
"""Simple App 图标 — DeepSeek 风格复刻版
设计语言(实测反推 DeepSeek 官方图标):
- 背景: 左上深蓝黑 #0B1C26 → 右下亮蓝 #22B8E8 对角渐变(上深下亮较强对比)
- 图形: 居中白色流体曲线,粗细均匀,无杂饰; 版本A=大漩涡+底部横浪, 版本B=单条流体S
"""
from PIL import Image, ImageDraw, ImageFilter
import math, os

SIZE = 1024
R = 235

def gradient_bg():
    """对角渐变: 深蓝黑(左上) → 蓝(中) → 亮蓝(右下),DeepSeek 式强对比"""
    g = Image.linear_gradient("L").resize((SIZE, SIZE))
    img = Image.new("RGBA", (SIZE, SIZE))
    px = img.load(); gpx = g.load()
    c0 = (10, 26, 38)     # 左上 深蓝黑
    c1 = (13, 92, 138)    # 中
    c2 = (34, 184, 232)   # 右下 亮蓝
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

def stroke(pts, width, layer, color=(255, 255, 255, 255)):
    d = ImageDraw.Draw(layer)
    for (x, y) in pts:
        d.ellipse([x - width/2, y - width/2, x + width/2, y + width/2], fill=color)
    # 连线缝隙用直线填充
    if len(pts) > 1:
        d.line(pts, fill=color, width=int(width), joint="curve")

def version_a():
    """居中大漩涡(上方月牙涡) + 底部横浪 —— 最贴近 DeepSeek 上涡下浪结构"""
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    w = 108
    # 上方大漩涡: 从左侧起弧,顶部大弧,右下,内卷收尾
    pts = []
    pts += bezier3((300, 470), (250, 240), (420, 140), (610, 180))    # 左→顶弧
    pts += bezier3((610, 180), (810, 230), (820, 470), (680, 540))    # 顶→右下
    pts += bezier3((680, 540), (560, 600), (470, 610), (430, 545))    # 右下→内卷
    pts += bezier3((430, 545), (400, 490), (452, 455), (505, 472))    # 内卷收尾(漩涡眼)
    stroke(pts, w, layer)
    # 底部横浪: 一条微弧形横带(呼应官方下部图形)
    pts2 = bezier3((270, 850), (440, 830), (600, 834), (770, 850))
    stroke(pts2, w * 0.85, layer)
    return layer

def version_b():
    """单条流体S: 粗细均匀的居中连续曲线,无螺旋尾,干净利落"""
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    w = 112
    pts = []
    pts += bezier3((330, 250), (470, 130), (700, 160), (740, 330))    # 上弧
    pts += bezier3((740, 330), (780, 520), (580, 560), (470, 620))    # 中段右下行
    pts += bezier3((470, 620), (340, 690), (320, 830), (430, 860))    # 下弧向左
    pts += bezier3((430, 860), (560, 890), (680, 870), (760, 820))    # 尾弧向右上
    stroke(pts, w, layer)
    return layer

def build(shapes, out):
    img = gradient_bg()
    # 底部内阴影(立体检)
    sh = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(sh)
    d.ellipse([-SIZE*0.5, SIZE*0.5, SIZE*1.5, SIZE*1.9], fill=(0, 10, 40, 140))
    sh = sh.filter(ImageFilter.GaussianBlur(90))
    img = Image.alpha_composite(img, sh)
    for s in shapes:
        img = Image.alpha_composite(img, s)
    # 圆角裁剪
    m = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, SIZE-1, SIZE-1], radius=R, fill=255)
    img.putalpha(Image.composite(img.split()[3], Image.new("L", (SIZE, SIZE), 0), m))
    img.save(out)
    print("saved", out)

if __name__ == "__main__":
    os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), "icon"), exist_ok=True)
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icon")
    build([version_a()], os.path.join(d, "vA_whirl.png"))
    build([version_b()], os.path.join(d, "vB_flowS.png"))