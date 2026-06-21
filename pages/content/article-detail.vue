<template>
	<view class="page">
		<NavBar title="文章详情" />

		<scroll-view
			class="scroll-area"
			scroll-y="true"
			show-scrollbar="false"
		>
			<!-- 封面大图 -->
			<view class="hero-section" v-if="article.image_url || article.cover">
				<image
					class="hero-image"
					:src="article.image_url || article.cover"
					mode="aspectFill"
				></image>
				<view class="hero-overlay">
					<view class="hero-category" v-if="article.category">
						<text>{{ article.category }}</text>
					</view>
				</view>
			</view>

			<!-- 文章头部 -->
			<view class="article-header">
				<view class="header-accent" v-if="!article.image_url && !article.cover">
					<view class="accent-line"></view>
				</view>
				<text class="article-title">{{ article.title || '无标题' }}</text>
				<view class="author-card">
					<image class="author-avatar" :src="avatarUrl" mode="aspectFill"></image>
					<view class="author-meta">
						<text class="author-name">{{ article.author || '未知作者' }}</text>
						<view class="meta-row">
							<text class="meta-item">{{ formatDate }}</text>
							<text class="meta-dot">·</text>
							<text class="meta-item">{{ readingTime }} 分钟阅读</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 正文 -->
			<view class="article-body" id="article-body">
				<view class="section-text" v-html="sanitizedContent"></view>
			</view>

			<!-- 标签 -->
			<view class="tag-section" v-if="article.tags && article.tags.length">
				<view class="section-divider">
					<text class="divider-text">话题标签</text>
				</view>
				<view class="tag-list">
					<view
						class="tag-item"
						v-for="(tag, index) in article.tags"
						:key="index"
						@click="onTagClick(tag)"
					>
						<text class="tag-icon">#</text>
						<text>{{ tag }}</text>
					</view>
				</view>
			</view>

			<!-- 作者卡片 -->
			<view class="author-section">
				<view class="section-divider">
					<text class="divider-text">关于作者</text>
				</view>
				<view class="author-card-large">
					<image class="author-avatar-lg" :src="avatarUrl" mode="aspectFill"></image>
					<view class="author-info-lg">
						<text class="author-name-lg">{{ article.author || '未知作者' }}</text>
						<text class="author-bio">文章作者 · 分享知识与见解</text>
					</view>
				</view>
			</view>

			<!-- 底部 -->
			<view class="article-footer">
				<view class="footer-divider"></view>
				<text class="footer-text">— End —</text>
				<text class="footer-sub">感谢阅读</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import NavBar from '../../components/nav-bar.vue';
import apiConfig from '../../utils/api.js';

export default {
	components: { NavBar },
	data() {
		return {
			article: {
				title: '',
				date: '',
				tags: [],
				content: '',
				category: '',
				author_avatar: '',
				author: '',
				created_at: '',
			},
		};
	},
	computed: {
		sanitizedContent() {
			return this.enhanceContent(this.sanitizeHtml(this.article.content));
		},
		avatarUrl() {
			return apiConfig.getImageUrl(this.article.author_avatar);
		},
		formatDate() {
			const d = this.article.date || this.article.created_at || '';
			if (!d) return '';
			return d.substring(0, 10);
		},
		readingTime() {
			const text = this.article.content || '';
			const plain = text.replace(/<[^>]+>/g, '');
			const cn = (plain.match(/[一-鿿]/g) || []).length;
			const en = plain.replace(/[一-鿿]/g, '').split(/\s+/).filter(Boolean).length;
			const total = Math.ceil((cn + en) / 300);
			return Math.max(1, total);
		},
	},
	onLoad() {
		try {
			const ec = this.getOpenerEventChannel();
			if (ec) {
				ec.on('setArticle', (data) => {
					this.article = {
						...this.article,
						...data,
						tags: typeof data.tags === 'string'
							? data.tags.split(',').map(t => t.trim()).filter(Boolean)
							: (Array.isArray(data.tags) ? data.tags : []),
					};
					this.$nextTick(this.bindLinks);
				});
			}
		} catch (e) { /* silent */ }
	},
	methods: {
		bindLinks() {
			// 在 DOM 中找到所有 <a> 链接，绑定原生 click 事件
			// uni-app 的 v-html 渲染的元素不经过 Vue 事件系统，需要用原生方式
			const container = document.querySelector('#article-body');
			if (!container) return;
			const links = container.querySelectorAll('a');
			links.forEach((el) => {
				if (el._linkBound) return;
				el._linkBound = true;
				el.addEventListener('click', (e) => {
					e.preventDefault();
					e.stopPropagation();
					const href = el.getAttribute('href') || '';
					if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
					if (href.startsWith('/')) {
						uni.navigateTo({ url: href });
					} else {
						uni.setClipboardData({
							data: href,
							success: () => uni.showToast({ title: '链接已复制' }),
						});
					}
				});
			});
		},
		sanitizeHtml(html) {
			if (!html) return '';
			return html
				.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
				.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
				.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
				.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
				.replace(/javascript\s*:/gi, '');
		},
		enhanceContent(html) {
			if (!html) return '';
			let enhanced = html
				.replace(/<img /gi, '<img class="content-image" ')
				.replace(/<blockquote>/gi, '<blockquote class="content-blockquote">')
				.replace(/<code>/gi, '<code class="content-code">')
				.replace(/<pre>/gi, '<pre class="content-pre">')
				.replace(/<h1>/gi, '<h1 class="content-h1">')
				.replace(/<h2>/gi, '<h2 class="content-h2">')
				.replace(/<h3>/gi, '<h3 class="content-h3">')
				.replace(/<p>/gi, '<p class="content-p">')
				.replace(/<ul>/gi, '<ul class="content-ul">')
				.replace(/<ol>/gi, '<ol class="content-ol">');
			if (!/<[a-z][\s\S]*>/i.test(enhanced)) {
				enhanced = enhanced
					.split(/\n{2,}/)
					.filter(Boolean)
					.map(p => `<p class="content-p">${p.replace(/\n/g, '<br/>')}</p>`)
					.join('');
			}
			return enhanced;
		},
		onTagClick(tag) {
			uni.showToast({ title: `#${tag}`, icon: 'none' });
		},
	},
};
</script>

<style>
.page {
	width: 100%;
	height: 100vh;
	background: #f5f6fa;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}
.scroll-area {
	flex: 1;
	min-height: 0;
}
.hero-section {
	position: relative;
	width: 100%;
	height: 420upx;
	overflow: hidden;
}
.hero-image {
	width: 100%;
	height: 100%;
}
.hero-overlay {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 40%;
	background: linear-gradient(transparent, rgba(0,0,0,0.5));
	display: flex;
	align-items: flex-end;
	padding: 24upx 32upx;
}
.hero-category {
	background: rgba(255,255,255,0.2);
	backdrop-filter: blur(8px);
	padding: 6upx 20upx;
	border-radius: 999upx;
	border: 1px solid rgba(255,255,255,0.3);
}
.hero-category text {
	font-size: 22upx;
	color: #ffffff;
	font-weight: 500;
}
.article-header {
	padding: 36upx 32upx 24upx;
	background: #ffffff;
	margin: 0 0 16upx;
}
.header-accent {
	margin-bottom: 20upx;
}
.accent-line {
	width: 60upx;
	height: 6upx;
	background: linear-gradient(90deg, #1b44a6, #3071f6);
	border-radius: 3upx;
}
.article-title {
	font-size: 40upx;
	font-weight: 700;
	color: #1a1a2e;
	line-height: 1.35;
	display: block;
	margin-bottom: 24upx;
	letter-spacing: 0.5upx;
}
.author-card {
	display: flex;
	align-items: center;
	gap: 16upx;
}
.author-avatar {
	width: 72upx;
	height: 72upx;
	border-radius: 50%;
	border: 2upx solid #eef1f5;
	flex-shrink: 0;
}
.author-meta {
	flex: 1;
	min-width: 0;
}
.author-name {
	font-size: 26upx;
	font-weight: 600;
	color: #2d3748;
	display: block;
	margin-bottom: 4upx;
}
.meta-row {
	display: flex;
	align-items: center;
	gap: 8upx;
	flex-wrap: wrap;
}
.meta-item {
	font-size: 22upx;
	color: #909398;
}
.meta-dot {
	font-size: 22upx;
	color: #d1d5db;
}
.article-body {
	background: #ffffff;
	padding: 32upx 32upx;
	margin: 0 0 16upx;
}
.section-text {
	font-size: 30upx;
	color: #374151;
	line-height: 1.9;
	word-break: break-word;
}
.section-text >>> .content-p {
	margin-bottom: 28upx;
	font-size: 30upx;
	line-height: 1.9;
}
.section-text >>> .content-h1 {
	font-size: 40upx;
	font-weight: 700;
	color: #1a1a2e;
	margin: 48upx 0 20upx;
	padding-bottom: 16upx;
	border-bottom: 2upx solid #eef1f5;
}
.section-text >>> .content-h2 {
	font-size: 34upx;
	font-weight: 700;
	color: #1a1a2e;
	margin: 40upx 0 16upx;
	padding-left: 16upx;
	border-left: 4upx solid #1b44a6;
}
.section-text >>> .content-h3 {
	font-size: 30upx;
	font-weight: 600;
	color: #2d3748;
	margin: 32upx 0 12upx;
}
.section-text >>> .content-image {
	width: 100%;
	border-radius: 12upx;
	margin: 24upx 0;
	box-shadow: 0 4upx 20upx rgba(0,0,0,0.08);
}
.section-text >>> .content-blockquote {
	margin: 28upx 0;
	padding: 24upx 28upx;
	background: #f8f9fb;
	border-left: 4upx solid #1b44a6;
	border-radius: 4upx 12upx 12upx 4upx;
	color: #4a5568;
	font-style: italic;
	font-size: 28upx;
}
.section-text >>> .content-code {
	background: #f1f5f9;
	padding: 4upx 12upx;
	border-radius: 6upx;
	font-size: 26upx;
	color: #e11d48;
	font-family: 'Courier New', monospace;
}
.section-text >>> .content-pre {
	background: #1e293b;
	padding: 28upx;
	border-radius: 12upx;
	overflow-x: auto;
	margin: 24upx 0;
}
.section-text >>> .content-pre .content-code {
	background: transparent;
	color: #e2e8f0;
	padding: 0;
	font-size: 24upx;
}
.section-text >>> a {
	color: #3071f6;
	text-decoration: underline;
	text-underline-offset: 4upx;
}
.section-text >>> .content-ul,
.section-text >>> .content-ol {
	padding-left: 40upx;
	margin: 20upx 0;
	font-size: 28upx;
	color: #374151;
	line-height: 1.8;
}
.tag-section {
	background: #ffffff;
	padding: 24upx 32upx 32upx;
	margin: 0 0 16upx;
}
.section-divider {
	display: flex;
	align-items: center;
	margin-bottom: 20upx;
}
.divider-text {
	font-size: 24upx;
	color: #909398;
	font-weight: 500;
	position: relative;
	padding-left: 20upx;
}
.divider-text::before {
	content: '';
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	width: 4upx;
	height: 20upx;
	background: #1b44a6;
	border-radius: 2upx;
}
.tag-list {
	display: flex;
	flex-wrap: wrap;
	gap: 12upx;
}
.tag-item {
	display: flex;
	align-items: center;
	background: #f0f4ff;
	padding: 8upx 20upx;
	border-radius: 999upx;
	gap: 4upx;
}
.tag-item text {
	font-size: 24upx;
	color: #1b44a6;
}
.tag-icon {
	font-weight: 700;
	opacity: 0.6;
}
.author-section {
	background: #ffffff;
	padding: 24upx 32upx 32upx;
	margin: 0 0 16upx;
}
.author-card-large {
	display: flex;
	align-items: center;
	gap: 24upx;
	padding: 24upx;
	background: #f8f9fb;
	border-radius: 16upx;
}
.author-avatar-lg {
	width: 100upx;
	height: 100upx;
	border-radius: 50%;
	border: 3upx solid #ffffff;
	box-shadow: 0 4upx 12upx rgba(0,0,0,0.08);
	flex-shrink: 0;
}
.author-info-lg {
	flex: 1;
}
.author-name-lg {
	font-size: 30upx;
	font-weight: 700;
	color: #1a1a2e;
	display: block;
	margin-bottom: 6upx;
}
.author-bio {
	font-size: 24upx;
	color: #909398;
}
.article-footer {
	padding: 48upx 32upx 60upx;
	background: #ffffff;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8upx;
}
.footer-divider {
	width: 60upx;
	height: 3upx;
	background: linear-gradient(90deg, #1b44a6, #3071f6);
	border-radius: 2upx;
	margin-bottom: 16upx;
}
.footer-text {
	font-size: 26upx;
	color: #d1d5db;
	letter-spacing: 8upx;
}
.footer-sub {
	font-size: 22upx;
	color: #e5e7eb;
}
</style>
