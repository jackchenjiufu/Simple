# -*- coding: utf-8 -*-
"""Simple App 图标生成器（苹果 iOS 风格：渐变底板 + 流线 S + 镜面高光）"""
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import math, os

SIZE = 1024  # 超采样画布
R = 235      # 圆角半径（iOS 22.9%）

def gradient_bg():
    """左→右 / 上→下的对角渐变：亮蓝 → 深蓝 → 深蓝紫"""
    g = Image.linear_gradient("L").resize((SIZE, SIZE))
    img = Image.new("RGBA", (SIZE, SIZE))
    px = img.load()
    gpx = g.load()
    for y in range(SIZE):
        for x in range(SIZE):
            t = gpx[x, y] / 255.0  # 0 左上 → 1 右下
            # 颜色插值: (77,168,255) -> (0,92,196) -> (24,60,160)
            if t < 0.55:
                k = t / 0.55
                c = (77 + (0 - 77) * k, 168 + (92 - 168) * k, 255 + (196 - 255) * k)
            else:
                k = (t - 0.55) / 0.45
                c = (0 + (24 - 0) * k, 92 + (60 - 92) * k, 196 + (160 - 196) * k)
            px[x, y] = (int(c[0]), int(c[1]), int(c[2]), 255)
    return img

def bg_parts():
    """叠加: 径向亮斑(左上) + 底部微暗(立体感)"""
    img = gradient_bg()

    # 左上径向亮斑（光源）
    rad = Image.radial_gradient("L").resize((SIZE * 2, SIZE * 2))
    rad = rad.crop((SIZE // 2, SIZE // 2, SIZE * 3 // 2, SIZE * 3 // 2))  # 中心亮版
    rad = rad.point(lambda v: int(v * 0.55))  # 别太强
    overlay = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    overlay.paste(rad, (0, 0), rad)
    img = Image.alpha_composite(img, overlay)

    # 底部内阴影（立体感）
    sh = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(sh)
    d.ellipse([-SIZE * 0.55, SIZE * 0.55, SIZE * 1.55, SIZE * 1.8], fill=(0, 0, 40, 150))
    sh = sh.filter(ImageFilter.GaussianBlur(90))
    img = Image.alpha_composite(img, sh)
    return img

def bezier3(p0, p1, p2, p3, n=40):
    """三次贝塞尔采样"""
    pts = []
    for i in range(n + 1):
        t = i / n
        a, b = 1 - t, t
        x = a**3*p0[0] + 3*a*a*b*p1[0] + 3*a*b*b*p2[0] + b**3*p3[0]
        y = a**3*p0[1] + 3*a*a*b*p1[1] + 3*a*b*b*p2[1] + b**3*p3[1]
        pts.append((x, y))
    return pts

def spiral_pts(start, center, k=0.16, turns=1.15, n=48):
    """对数螺旋：从 start 平滑卷向 center（DeepSeek 式漩涡卷尾）"""
    import math
    cx, cy = center
    dx, dy = start[0] - cx, start[1] - cy
    r0 = math.hypot(dx, dy)
    th0 = math.atan2(dy, dx)
    pts = []
    for i in range(n + 1):
        th = th0 + turns * 2 * math.pi * i / n
        r = r0 * math.exp(-k * turns * 2 * math.pi * i / n)
        pts.append((cx + r * math.cos(th), cy + r * math.sin(th)))
    return pts

def s_points():
    """流动 S：顶弧 + 中收缩 + 大尾弧 + 螺旋卷尾（DeepSeek 灵感）"""
    pts = []
    pts += bezier3((318, 250), (376, 118), (724, 178), (696, 396))       # 顶弧
    pts += bezier3((696, 396), (672, 566), (330, 462), (348, 624))       # 中收缩
    pts += bezier3((348, 624), (362, 792), (700, 700), (668, 856))       # 尾弧
    pts += spiral_pts((668, 856), (520, 768), k=0.15, turns=1.15)        # 螺旋卷尾
    return pts

def draw_s(img, width=96, color=(255, 255, 255, 255), blur=0):
    """粗笔画 S：中心线每点画圆 → 圆头圆润笔触"""
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts = s_points()
    for (x, y) in pts:
        d.ellipse([x - width/2, y - width/2, x + width/2, y + width/2], fill=color)
    if blur:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(layer)
    return img

def draw_bottom_shadow_of_s(img, width=96):
    """S 底部柔和投影（立体感）"""
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts = s_points()
    for (x, y) in pts:
        d.ellipse([x - width/2, y - width/2 + 6, x + width/2, y + width/2 + 6], fill=(0, 20, 80, 110))
    layer = layer.filter(ImageFilter.GaussianBlur(10))
    img.alpha_composite(layer)
    return img

def draw_gloss(img):
    """左上 45° 镜面高光（iOS 图标标志性光照）"""
    gloss = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    # 白色径向渐变椭圆，置于左上
    rad = Image.radial_gradient("L").resize((SIZE, SIZE))
    rad = rad.point(lambda v: int(v * 0.40))
    gloss.paste(rad, (0, 0), rad)
    gloss = gloss.rotate(-22, resample=Image.BICUBIC, expand=False)
    mask = gloss.split()[3].point(lambda v: int(v * 0.5))
    img = Image.alpha_composite(img, Image.composite(gloss, Image.new("RGBA", (SIZE, SIZE), (0,0,0,0)), mask))
    return img

def draw_ring_edge(img):
    """边缘细微亮线（提升精致度）"""
    d = ImageDraw.Draw(img)
    # 圆角矩形描边
    d.rounded_rectangle([6, 6, SIZE - 7, SIZE - 7], radius=R - 6,
                        outline=(255, 255, 255, 26), width=6)
    return img

def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m

def main():
    base = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    base = Image.alpha_composite(base, bg_parts())       # 渐变底
    base = draw_bottom_shadow_of_s(base)                 # S 投影
    base = draw_s(base)                                  # 白色流线 S
    base = draw_gloss(base)                              # 镜面高光
    base = draw_ring_edge(base)                          # 边缘亮线
    # 圆角裁剪
    base.putalpha(Image.composite(base.split()[3], Image.new("L", (SIZE, SIZE), 0), rounded_mask(SIZE, R)))

    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icon")
    os.makedirs(out_dir, exist_ok=True)
    base.save(os.path.join(out_dir, "app-icon-1024.png"))
    base.resize((512, 512), Image.LANCZOS).save(os.path.join(out_dir, "app-icon-512.png"))
    for s in (192, 144, 96, 72, 48, 36):
        base.resize((s, s), Image.LANCZOS).save(os.path.join(out_dir, f"app-icon-{s}.png"))
    print("生成完成:", [f for f in sorted(os.listdir(out_dir))])

if __name__ == "__main__":
    main()