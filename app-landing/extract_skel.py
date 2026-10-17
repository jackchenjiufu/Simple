# -*- coding: utf-8 -*-
"""从 DeepSeek 官方图标提取白色图形骨架中心线 → 输出点集
用 scipy 距离变换找白色区域的脊线(中心线)"""
import numpy as np
from PIL import Image
from scipy import ndimage
import json, os

def extract():
    img = np.array(Image.open(r'C:\Users\chenj\AppData\Local\Temp\ds\deepseek_appicon.png').convert('RGB')).astype(int)
    lum = 0.3*img[:,:,0] + 0.6*img[:,:,1] + 0.1*img[:,:,2]
    mask = lum > 165  # 512x512
    # 取最大连通区域(排除小噪点)
    lab, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, lab, range(1, n+1))
    big = (lab == (np.argmax(sizes) + 1))
    # 距离变换
    dist = ndimage.distance_transform_edt(big)
    # 脊线: 3x3 邻域内是局部最大
    from scipy.ndimage import maximum_filter
    mx = maximum_filter(dist, size=5)
    ridge = (dist == mx) & (dist > 1.0)
    ys, xs = np.nonzero(ridge)
    pts = sorted(zip(xs.tolist(), ys.tolist()))
    # 按邻接排序成一条或多条路径 (简单贪心)
    return np.array(pts, dtype=float), big

def order_paths(pts, gap=3.0):
    """贪心排序: 从最近的点开始串成路径列表"""
    import math
    pts = pts.tolist()
    paths = []
    while pts:
        start = pts.pop(0)
        path = [start]
        cur = start
        remaining = pts
        while True:
            # 找离 cur 最近的点
            best = None; bd = gap + 1
            for p in remaining:
                d = math.hypot(p[0]-cur[0], p[1]-cur[1])
                if d < bd:
                    bd = d; best = p
            if best is None or bd > gap:
                break
            path.append(best); remaining.remove(best); cur = best
        paths.append(path)
        pts = remaining
    return paths

if __name__ == '__main__':
    pts, big = extract()
    print('ridge points:', len(pts))
    paths = order_paths(pts, gap=4.0)
    print('paths:', len(paths), 'lengths:', [len(p) for p in paths])
    # 保存路径点(512 坐标系)
    out = r'E:\poo\doo\app-landing\icon\ds_skel.json'
    with open(out, 'w') as f:
        json.dump(paths, f)
    print('saved', out)
    # 画个预览
    from PIL import Image, ImageDraw
    prev = Image.new('RGB', (512, 512), 'black')
    d = ImageDraw.Draw(prev)
    for path in paths[:3]:
        d.line([tuple(p) for p in path], fill='white', width=8, joint='curve')
    prev.save(r'E:\poo\doo\app-landing\icon\ds_skel_preview.png')
    print('preview saved')