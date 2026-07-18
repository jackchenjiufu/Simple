# Run this once to fix tabbar-1.vue completely

# Read original
with open('pages/tabbar/tabbar-1/tabbar-1.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace "推荐" swiper-item with "记账" ledger content
old_swiper_start = '\t\t\t\t<!-- 推荐 -->'
old_swiper_end = '\t\t\t\t<!-- 文章 -->'

start = content.find(old_swiper_start)
end = content.find(old_swiper_end)

if start < 0 or end < 0:
    print(f"Error: markers not found: start={start}, end={end}")
    exit(1)

ledger_html = '''\t\t\t\t<!-- 记账 -->
\t\t\t\t<swiper-item class="swiper-item">
\t\t\t\t\t<scroll-view class="content-area" scroll-y="true" show-scrollbar="false">
\t\t\t\t\t\t<view class="tab-content">
\t\t\t\t\t\t\t<view class="ledger-page">
\t\t\t\t\t\t\t\t<view class="lm-summary">
\t\t\t\t\t\t\t\t\t<view class="lm-nav">
\t\t\t\t\t\t\t\t\t\t<text class="lm-nav-btn" @click="lmChgMonth(-1)">‹</text>
\t\t\t\t\t\t\t\t\t\t<text class="lm-nav-label">{{ lmYear }}.{{ lmMonth }}</text>
\t\t\t\t\t\t\t\t\t\t<text class="lm-nav-btn" @click="lmChgMonth(1)">›</text>
\t\t\t\t\t\t\t\t\t</view>
\t\t\t\t\t\t\t\t\t<view class="lm-row">
\t\t\t\t\t\t\t\t\t\t<view class="lm-item"><text class="lm-lbl">收入</text><text class="lm-val inc">¥{{ lmSummary.income.toFixed(2) }}</text></view>
\t\t\t\t\t\t\t\t\t\t<view class="lm-item"><text class="lm-lbl">支出</text><text class="lm-val exp">¥{{ lmSummary.expense.toFixed(2) }}</text></view>
\t\t\t\t\t\t\t\t\t\t<view class="lm-item"><text class="lm-lbl">结余</text><text class="lm-val" :class="lmSummary.balance>=0?'inc':'exp'">¥{{ lmSummary.balance.toFixed(2) }}</text></view>
\t\t\t\t\t\t\t\t\t</view>
\t\t\t\t\t\t\t\t</view>
\t\t\t\t\t\t\t\t<scroll-view class="lm-cat-scroll" scroll-x="true" show-scrollbar="false" v-if="lmCats.length">
\t\t\t\t\t\t\t\t\t<view class="lm-cat-bar">
\t\t\t\t\t\t\t\t\t\t<view class="lm-cat" :class="{act:lmCat==='all'}" @click="lmCat='all';loadLedger()">全部</view>
\t\t\t\t\t\t\t\t\t\t<view class="lm-cat" v-for="c in lmCats" :key="c" :class="{act:lmCat===c}" @click="lmCat=c;loadLedger()">{{ c }}</view>
\t\t\t\t\t\t\t\t\t</view>
\t\t\t\t\t\t\t\t</scroll-view>
\t\t\t\t\t\t\t\t<view class="lm-list">
\t\t\t\t\t\t\t\t\t<view class="lm-empty" v-if="!lmItems.length"><text class="lm-empty-txt">暂无记录</text></view>
\t\t\t\t\t\t\t\t\t<view class="lm-row-item" v-for="item in lmItems" :key="item.id">
\t\t\t\t\t\t\t\t\t\t<view class="lm-left"><text class="lm-cat-tag" :class="item.type">{{ item.category }}</text><text class="lm-note">{{ item.note || item.category }}</text></view>
\t\t\t\t\t\t\t\t\t\t<view class="lm-right"><text class="lm-amt" :class="item.type">{{ item.type==='income'?'+':'-' }}¥{{ parseFloat(item.amount).toFixed(2) }}</text><text class="lm-dt">{{ item.record_date.slice(5) }}</text></view>
\t\t\t\t\t\t\t\t\t</view>
\t\t\t\t\t\t\t\t</view>
\t\t\t\t\t\t\t\t<view class="lm-add" @click="lmShowAdd=true">+</view>
\t\t\t\t\t\t\t</view>
\t\t\t\t\t\t\t<!-- 记账添加弹窗 -->
\t\t\t\t\t\t\t<view class="modal-overlay" v-if="lmShowAdd" @click.self="lmShowAdd=false">
\t\t\t\t\t\t\t\t<view class="modal-content" @click.stop>
\t\t\t\t\t\t\t\t\t<view class="modal-handle"></view>
\t\t\t\t\t\t\t\t\t<text class="modal-title">记一笔</text>
\t\t\t\t\t\t\t\t\t<view class="type-switch">
\t\t\t\t\t\t\t\t\t\t<view class="type-btn" :class="{act:lmForm.type==='expense'}" @click="lmForm.type='expense'">支出</view>
\t\t\t\t\t\t\t\t\t\t<view class="type-btn" :class="{act:lmForm.type==='income'}" @click="lmForm.type='income'">收入</view>
\t\t\t\t\t\t\t\t\t</view>
\t\t\t\t\t\t\t\t\t<view class="fg"><text class="fl">金额</text><input class="fi amt-i" v-model="lmForm.amount" type="digit" placeholder="0.00" /></view>
\t\t\t\t\t\t\t\t\t<view class="fg">
\t\t\t\t\t\t\t\t\t\t<text class="fl">分类</text>
\t\t\t\t\t\t\t\t\t\t<scroll-view class="cp" scroll-x="true" show-scrollbar="false">
\t\t\t\t\t\t\t\t\t\t\t<view class="co" v-for="c in catOpts" :key="c" :class="{act:lmForm.category===c}" @click="lmForm.category=c">{{ c }}</view>
\t\t\t\t\t\t\t\t\t\t</scroll-view>
\t\t\t\t\t\t\t\t\t</view>
\t\t\t\t\t\t\t\t\t<view class="fg"><text class="fl">备注</text><input class="fi" v-model="lmForm.note" type="text" placeholder="选填" /></view>
\t\t\t\t\t\t\t\t\t<button class="lm-save-btn" @click="handleLmAdd" :disabled="lmAdding">{{ lmAdding ? '保存中...' : '保存' }}</button>
\t\t\t\t\t\t\t\t</view>
\t\t\t\t\t\t\t</view>
\t\t\t\t\t\t</view>
\t\t\t\t\t</scroll-view>
\t\t\t\t</swiper-item>'''

content = content[:start] + ledger_html + content[end:]

# 2. Update nav-bar to use 记账 instead of 推荐
content = content.replace("activeTab: 'recommend',", "activeTab: 'ledger',")
content = content.replace("const map = { recommend: 0, articles: 1, agent: 2 };", "const map = { ledger: 0, articles: 1, agent: 2 };")
content = content.replace("const tabs = ['recommend', 'articles', 'agent'];", "const tabs = ['ledger', 'articles', 'agent'];")
content = content.replace("this.activeTab = tabs[index] || 'recommend';", "this.activeTab = tabs[index] || 'ledger';")

# 3. Expand data section - add ledger properties after agentScrl
old_data = "\t\t\t\tagentScrl: '',"
new_data = """\t\t\t\tagentScrl: '',
\t\t\t\tlmYear: new Date().getFullYear(),
\t\t\t\tlmMonth: String(new Date().getMonth()+1).padStart(2,'0'),
\t\t\t\tlmItems: [],
\t\t\t\tlmSummary: { income:0, expense:0, balance:0 },
\t\t\t\tlmCats: [],
\t\t\t\tlmCat: 'all',
\t\t\t\tlmShowAdd: false,
\t\t\t\tlmAdding: false,
\t\t\t\tlmForm: { type:'expense', amount:'', category:'', note:'' },
\t\t\t\tcatOpts: ['餐饮','购物','交通','娱乐','住房','日用','服饰','医疗','教育','通讯','人情','收入','其他'],"""
content = content.replace(old_data, new_data)

# 4. Add ledger methods after the last existing method (viewArticle)
# Find viewArticle method end
old_methods_end = "\t\tviewArticle(article) {\n\t\t\t\tuni.navigateTo({\n\t\t\t\t\turl: '/pages/content/article-detail',\n\t\t\t\t\tsuccess: (res) => res.eventChannel.emit('setArticle', article)\n\t\t\t\t});\n\t\t\t}"
new_methods_end = """\t\tloadLedger() {
\t\t\tconst ui = uni.getStorageSync('userInfo');
\t\t\tif (!ui) return;
\t\t\tconst p = { user_id: ui.id, year: this.lmYear, month: this.lmMonth };
\t\t\tif (this.lmCat !== 'all') p.category = this.lmCat;
\t\t\tuni.request({ url: apiConfig.baseUrl + 'ledger.php', method:'GET', data: p, success: (res) => {
\t\t\t\tconst r = res.data;
\t\t\t\tif (r.code===200 && r.data) {
\t\t\t\t\tthis.lmItems = r.data.items||[];
\t\t\t\t\tthis.lmSummary = r.data.summary||{income:0,expense:0,balance:0};
\t\t\t\t\tthis.lmCats = r.data.categories||[];
\t\t\t\t}
\t\t\t}});
\t\t},
\t\tlmChgMonth(d) {
\t\t\tlet m = parseInt(this.lmMonth)+d, y = this.lmYear;
\t\t\tif (m<1){m=12;y--;} if(m>12){m=1;y++;}
\t\t\tthis.lmYear=y; this.lmMonth=String(m).padStart(2,'0'); this.loadLedger();
\t\t},
\t\thandleLmAdd() {
\t\t\tconst ui = uni.getStorageSync('userInfo');
\t\t\tif (!ui) return;
\t\t\tconst amt = parseFloat(this.lmForm.amount);
\t\t\tif (!amt||amt<=0){uni.showToast({title:'请输入金额',icon:'none'});return;}
\t\t\tif (!this.lmForm.category){uni.showToast({title:'请选择分类',icon:'none'});return;}
\t\t\tthis.lmAdding = true;
\t\t\tuni.request({
\t\t\t\turl: apiConfig.baseUrl + 'ledger.php', method:'POST',
\t\t\t\tdata: {user_id:ui.id, type:this.lmForm.type, amount:amt, category:this.lmForm.category, note:this.lmForm.note, date:new Date().toISOString().slice(0,10)},
\t\t\t\tsuccess:(res)=>{if(res.data.code===200){uni.showToast({title:'已保存',icon:'success'});this.lmShowAdd=false;this.loadLedger();}else{uni.showToast({title:res.data.message||'失败',icon:'none'});}},
\t\t\t\tcomplete:()=>{this.lmAdding=false;}
\t\t\t});
\t\t},
\t\tviewArticle(article) {
\t\t\t\tuni.navigateTo({
\t\t\t\t\turl: '/pages/content/article-detail',
\t\t\t\t\tsuccess: (res) => res.eventChannel.emit('setArticle', article)
\t\t\t\t});
\t\t\t}"""

content = content.replace(old_methods_end, new_methods_end)

# 5. Add loadLedger() to onLoad
content = content.replace("\t\t\tthis.loadCarouselData();", "\t\t\tthis.loadLedger();")

# 6. Replace recommend nav text in nav-bar reference
content = content.replace("activeTab === 'recommend'", "activeTab === 'ledger'")
content = content.replace("switchTab('recommend')", "switchTab('ledger')")

# 7. Add ledger CSS before the article-section CSS
old_css = '.articles-section {\n\tpadding: 24upx;\n}'
new_css = '''/* 记账 */
.ledger-page { flex:1; display:flex; flex-direction:column; }
.lm-summary { background:linear-gradient(135deg,#1b44a6,#3071f6); border-radius:14upx; padding:16upx; margin:12upx 16upx 8upx; }
.lm-nav { display:flex; align-items:center; justify-content:center; gap:28upx; margin-bottom:10upx; }
.lm-nav-btn { font-size:32upx; color:#fff; font-weight:700; padding:4upx 12upx; }
.lm-nav-label { font-size:28upx; font-weight:600; color:#fff; }
.lm-row { display:flex; gap:6upx; }
.lm-item { flex:1; text-align:center; }
.lm-lbl { display:block; font-size:18upx; color:rgba(255,255,255,0.7); margin-bottom:2upx; }
.lm-val { display:block; font-size:28upx; font-weight:700; }
.inc { color:#22c55e; }
.exp { color:#ef4444; }
.lm-cat-scroll { padding:0 16upx 6upx; }
.lm-cat-bar { display:flex; gap:8upx; white-space:nowrap; }
.lm-cat { display:inline-block; font-size:20upx; color:#6b7280; background:#f3f4f6; padding:4upx 14upx; border-radius:9999upx; }
.lm-cat.act { color:#fff; background:#1b44a6; }
.lm-list { flex:1; padding:0 16upx 120upx; }
.lm-empty { text-align:center; padding:40upx 0; }
.lm-empty-txt { font-size:24upx; color:#9ca3af; }
.lm-row-item { background:#fff; border-radius:10upx; padding:12upx 16upx; margin-bottom:6upx; display:flex; justify-content:space-between; align-items:center; }
.lm-left { display:flex; flex-direction:column; gap:2upx; flex:1; }
.lm-cat-tag { font-size:16upx; padding:2upx 8upx; border-radius:9999upx; align-self:flex-start; }
.lm-cat-tag.income { color:#22c55e; background:#f0fdf4; }
.lm-cat-tag.expense { color:#ef4444; background:#fef2f2; }
.lm-note { font-size:20upx; color:#6b7280; }
.lm-right { text-align:right; }
.lm-amt { font-size:24upx; font-weight:600; display:block; }
.lm-amt.income { color:#22c55e; }
.lm-amt.expense { color:#ef4444; }
.lm-dt { font-size:16upx; color:#d1d5db; }
.lm-add { position:fixed; right:32upx; bottom:40upx; width:90upx; height:90upx; background:#3071f6; color:#fff; font-size:44upx; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6upx 20upx rgba(48,113,246,0.3); }
.lm-save-btn { width:100%; height:72upx; line-height:72upx; background:#3071f6; color:#fff; font-size:26upx; font-weight:600; border-radius:14upx; border:none; margin-top:12upx; }
.fg { margin-bottom:14upx; }
.fl { font-size:22upx; color:#6b7280; display:block; margin-bottom:4upx; }
.fi { height:64upx; padding:0 14upx; background:#f8f9fb; border-radius:10upx; font-size:24upx; color:#303132; width:100%; box-sizing:border-box; }
.amt-i { font-size:34upx; font-weight:700; text-align:center; height:80upx; }
.cp { white-space:nowrap; }
.co { display:inline-block; font-size:20upx; color:#6b7280; background:#f3f4f6; padding:6upx 18upx; border-radius:9999upx; margin-right:8upx; }
.co.act { color:#fff; background:#1b44a6; }

.articles-section {
\tpadding: 24upx;
}'''
content = content.replace(old_css, new_css)

with open('pages/tabbar/tabbar-1/tabbar-1.vue', 'w', encoding='utf-8') as f:
    f.write(content)

print("All changes applied successfully")

# Final verification
import re
tpl = re.search(r'<template>([\s\S]*)</template>', content)
if tpl:
    t = tpl.group(1)
    for tag in ['view', 'swiper-item', 'scroll-view', 'text', 'button']:
        o = len(re.findall(rf'<{tag}\b', t))
        cl = len(re.findall(rf'</{tag}>', t))
        if o != cl:
            print(f"ISSUE {tag}: {o}/{cl}")

script = re.search(r'<script>([\s\S]*)</script>', content)
if script:
    s = script.group(1)
    ob = s.count('{')
    cb = s.count('}')
    if ob != cb:
        print(f"BRACE MISMATCH: {ob}/{cb}")
    else:
        print(f"Braces: {ob}/{cb} OK")
    for kw in ['try {', 'loadCarouselData', 'kbHeight', 'recommend']:
        if kw in s:
            print(f"STALE: {kw}")

print("Done")
