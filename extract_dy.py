# -*- coding: utf-8 -*-
"""输出抖音图文第 9 张的原始 webp URL"""
import re

raw = open('dy_router_raw.txt', encoding='utf-8').read()
clean = raw.replace('\\u002F', '/').replace('\\u0026', '&').replace('\\u0027', chr(39)).replace('\\"', '"')
urls = re.findall(r'https?://[^"\\\s]+douyinpic[^"\\\s]*', clean)
work = [u for u in urls if '/tos-cn-' in u and '~tplv' in u]

seen, order = {}, []
for u in work:
    m = re.search(r'/tos-cn-[^/]+/([^~]+)~', u)
    if not m:
        continue
    k = m.group(1)
    if k not in seen:
        seen[k] = u
        order.append(k)

print('total images:', len(order))
url = seen[order[8]]  # 第 9 张（索引 8）
print('URL:', url)
open('dy_img9_url.txt', 'w').write(url)
