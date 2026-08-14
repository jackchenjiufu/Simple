# -*- coding: utf-8 -*-
"""生成默认背景图：复刻登录页头部样式，alpha 预合成到深蓝底（所见即所得）"""
from PIL import Image, ImageDraw

w, h = 750, 450
base = Image.new('RGBA', (w, h), (27, 68, 166, 255))  # #1b44a6 深蓝底

overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
d = ImageDraw.Draw(overlay)

# 参考 login.vue .header-section（1upx = 1px）：
# char-circle-1: 140upx 圆 rgba(255,255,255,0.08) top 10 right -10
d.ellipse([630, 10, 770, 150], fill=(255, 255, 255, 20))
# char-body: 100x120upx 胶囊 rgba(255,255,255,0.15) bottom 20 right 40
d.rounded_rectangle([610, 310, 710, 430], radius=50, fill=(255, 255, 255, 38))
# char-head: 80upx 圆 rgba(255,215,200,0.35) top 50 right 50
d.ellipse([620, 50, 700, 130], fill=(255, 215, 200, 89))
# char-circle-2: 80upx 圆 rgba(255,255,255,0.12) bottom 20 right 20
d.ellipse([650, 350, 730, 430], fill=(255, 255, 255, 31))

# 预合成：半透明元素直接混入深蓝底
composited = Image.alpha_composite(base, overlay).convert('RGB')
composited.save(r'E:/poo/doo/static/default_background.png')
print('saved (alpha pre-composited) login-header-style background')

import os
print(os.path.getsize(r'E:/poo/doo/static/default_background.png'), 'bytes')
