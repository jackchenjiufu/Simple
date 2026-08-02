<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">热搜抓取</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<view class="panel">
				<view class="tool-item">
					<view class="tool-info">
						<text class="tool-name">微博热搜</text>
						<text class="tool-desc">抓取当天微博热搜数据并发布为文章</text>
					</view>
					<button class="tool-btn" :class="{ 'btn-disabled': runningWeibo }" @click="runCrawl('weibo')">
						{{ runningWeibo ? '抓取中...' : '手动执行' }}
					</button>
				</view>

				<view class="tool-item">
					<view class="tool-info">
						<text class="tool-name">抖音热榜</text>
						<text class="tool-desc">抓取当天抖音热榜数据并发布为文章</text>
					</view>
					<button class="tool-btn" :class="{ 'btn-disabled': runningDouyin }" @click="runCrawl('douyin')">
						{{ runningDouyin ? '抓取中...' : '手动执行' }}
					</button>
				</view>

				<view class="tool-item">
					<view class="tool-info">
						<text class="tool-name">头条热榜</text>
						<text class="tool-desc">抓取当天头条热榜数据并发布为文章</text>
					</view>
					<button class="tool-btn" :class="{ 'btn-disabled': runningToutiao }" @click="runCrawl('toutiao')">
						{{ runningToutiao ? '抓取中...' : '手动执行' }}
					</button>
				</view>

				<view class="tool-item">
					<view class="tool-info">
						<text class="tool-name">知乎热榜</text>
						<text class="tool-desc">抓取当天知乎热榜数据并发布为文章</text>
					</view>
					<button class="tool-btn" :class="{ 'btn-disabled': runningZhihu }" @click="runCrawl('zhihu')">
						{{ runningZhihu ? '抓取中...' : '手动执行' }}
					</button>
				</view>

				<view class="tool-item">
					<view class="tool-info">
						<text class="tool-name">小红书热榜</text>
						<text class="tool-desc">抓取当天小红书热榜数据并发布为文章</text>
					</view>
					<button class="tool-btn" :class="{ 'btn-disabled': runningRednote }" @click="runCrawl('rednote')">
						{{ runningRednote ? '抓取中...' : '手动执行' }}
					</button>
				</view>

				<view class="tool-item">
					<view class="tool-info">
						<text class="tool-name">HackerNews</text>
						<text class="tool-desc">抓取全球技术热榜（英文）并发布为文章</text>
					</view>
					<button class="tool-btn" :class="{ 'btn-disabled': runningHN }" @click="runCrawl('hn')">
						{{ runningHN ? '抓取中...' : '手动执行' }}
					</button>
				</view>
			</view>

			<!-- 执行结果 -->
			<view class="panel" v-if="resultText">
				<view class="section-title">执行结果</view>
				<text class="result-text">{{ resultText }}</text>
			</view>

			<view class="tip">⚠️ 抓取需要几分钟，执行期间请勿重复点击</view>
		</scroll-view>
	</view>
</template>

<script>
import adminApi from '../../utils/admin-api.js';

export default {
	data() {
		return {
			statusBarHeight: 0,
			runningWeibo: false,
			runningDouyin: false,
			runningToutiao: false,
			runningZhihu: false,
			runningRednote: false,
			runningHN: false,
			resultText: '',
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
	},
	methods: {
		goBack() { uni.navigateBack(); },
		runCrawl(type) {
			if (this.runningWeibo || this.runningDouyin || this.runningToutiao || this.runningZhihu || this.runningRednote || this.runningHN) return;
			// 设置对应运行状态
			const flagMap = { weibo: 'runningWeibo', douyin: 'runningDouyin', toutiao: 'runningToutiao', zhihu: 'runningZhihu', rednote: 'runningRednote', hn: 'runningHN' };
			this[flagMap[type]] = true;
			const nameMap = { weibo: '微博热搜', douyin: '抖音热榜', toutiao: '头条热榜', zhihu: '知乎热榜', rednote: '小红书热榜', hn: 'HackerNews' };
			const apiMap = { weibo: 'crawlWeiboHot', douyin: 'crawlDouyinHot', toutiao: 'crawlToutiaoHot', zhihu: 'crawlZhihuHot', rednote: 'crawlRednoteHot', hn: 'crawlHNHot' };
			const name = nameMap[type];
			this.resultText = '';
			uni.showLoading({ title: '正在抓取...', mask: true });
			const req = adminApi[apiMap[type]]();
			req.then((r) => {
				if (r && r.code === 200) {
					this.resultText = `${name}抓取完成：${r.message || '成功'}`;
					uni.showToast({ title: '抓取完成', icon: 'success' });
				} else {
					this.resultText = `抓取失败：${(r && r.message) || '未知错误'}`;
					uni.showToast({ title: (r && r.message) || '失败', icon: 'none' });
				}
			}).catch((e) => {
				this.resultText = `请求失败：${(e && e.message) || '请检查网络'}`;
				uni.showToast({ title: '请求失败', icon: 'none' });
			}).finally(() => {
				uni.hideLoading();
				this.runningWeibo = false;
				this.runningDouyin = false;
				this.runningToutiao = false;
				this.runningZhihu = false;
				this.runningRednote = false;
				this.runningHN = false;
			});
		},
	},
};
</script>

<style>
.content { height: 100vh; background: #f5f6fa; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #fff; }
.nav-bar {
	height: 44px; background: #fff; display: flex; align-items: center;
	justify-content: space-between; padding: 0 12px; border-bottom: 1px solid #f0f0f0;
}
.nav-back { width: 36px; height: 36px; display: flex; align-items: center; }
.back-icon { width: 20px; height: 20px; }
.nav-title { font-size: 17px; font-weight: 600; color: #1a1a2e; }
.nav-placeholder { width: 36px; }
.body { flex: 1; min-height: 0; overflow: hidden; padding: 16px; box-sizing: border-box; }
.panel {
	background: #fff; border-radius: 12px; padding: 4px 16px; margin-bottom: 12px;
	box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.tool-item {
	display: flex; align-items: center; justify-content: space-between;
	padding: 16px 0; border-bottom: 1px solid #f5f5f5;
}
.tool-item:last-child { border-bottom: none; }
.tool-info { flex: 1; min-width: 0; padding-right: 12px; }
.tool-name { font-size: 15px; font-weight: 600; color: #1a1a2e; display: block; }
.tool-desc { font-size: 12px; color: #999; margin-top: 4px; display: block; }
.tool-btn {
	flex-shrink: 0; background: linear-gradient(135deg, #1b44a6, #3071f6); color: #fff;
	border-radius: 10px; font-size: 13px; height: 36px; line-height: 36px; padding: 0 16px; border: none;
}
.btn-disabled { opacity: 0.6; }
.section-title { font-size: 13px; font-weight: 600; color: #666; padding: 12px 0 4px; }
.result-text { font-size: 13px; color: #333; line-height: 1.6; display: block; padding: 8px 0 12px; }
.tip { text-align: center; color: #bbb; font-size: 12px; padding: 8px 0 20px; }
</style>
