# -*- coding: utf-8 -*-
"""vC2 全套尺寸输出 + 对比图"""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 复用 gen_icon_ds3 的生成逻辑,但输出 1024 原图
from gen_icon_ds3 import gradient_bg, bezier3, stroke, SIZE, R
from PIL import ImageDraw

def make_icon():
    img = gradient_bg()
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    W = 92
    pts = []
    pts += bezier3((330, 700), (250, 600), (228, 420), (296, 236))
    pts += bezier3((296, 236), (392, 132), (632, 132), (728, 236))
    pts += bezier3((728, 236), (796, 420), (774, 600), (694, 700))
    stroke(pts, W, layer)
    pts2 = bezier3((250, 906), (430, 880), (600, 884), (774, 906))
    stroke(pts2, int(W*0.85), layer)
    img = Image.alpha_composite(img, layer)
    m = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, SIZE-1, SIZE-1], radius=R, fill=255)
    img.putalpha(Image.composite(img.split()[3], Image.new("L", (SIZE, SIZE), 0), m))
    return img

if __name__ == "__main__":
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icon")
    base = make_icon()
    base.save(os.path.join(d, "app-icon-1024.png"))
    base.resize((512, 512), Image.LANCZOS).save(os.path.join(d, "app-icon-512.png"))
    for s in (192, 144, 96, 72, 48, 36):
        base.resize((s, s), Image.LANCZOS).save(os.path.join(d, f"app-icon-{s}.png"))
    # 对比图: 官方 vs 旧版线上 vs vC2
    ref = Image.open(os.path.join(d, "deepseek_ref.png")).convert("RGB").resize((300, 300), Image.LANCZOS)
    old = Image.open(os.path.join(d, "app-icon-512.png")).convert("RGB").resize((300, 300), Image.LANCZOS) if os.path.exists(os.path.join(d, "app-icon-512.png")) else None
    # old 现已被覆盖,用备份
    old = Image.open(r"E:\poo\doo\app-landing\icon\vA_whirl.png").convert("RGB").resize((300, 300), Image.LANCZOS)
    new = base.convert("RGB").resize((300, 300), Image.LANCZOS)
    canvas = Image.new("RGB", (920, 300), "white")
    canvas.paste(ref, (0, 0)); canvas.paste(old, (310, 0)); canvas.paste(new, (620, 0))
    canvas.save(os.path.join(d, "compare_final.png"))
    print("done, files:", sorted(os.listdir(d)))