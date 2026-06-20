<template>
	<view class="content">
		<NavBar title="文章详情" />

		<scroll-view class="article-content" scroll-y="true">
			<view class="article-header">
				<text class="article-title">{{ article.title }}</text>
				<view class="article-meta">
					<view class="author-info">
						<image class="author-avatar" :src="article.author_avatar || '/static/img/qa.png'" mode="aspectFill"></image>
						<text class="author-name">{{ article.author || '未知作者' }}</text>
						<text class="article-date">{{ article.date }}</text>
					</view>
					<view class="article-tags">
						<text class="article-tag" v-for="(tag, index) in article.tags" :key="index">{{ tag }}</text>
					</view>
				</view>
			</view>

			<view class="article-body">
				<view class="article-section">
					<view class="section-text" v-html="sanitizedContent"></view>
				</view>
			</view>

			<view class="article-footer">
				<text class="footer-text">文章结束</text>
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
				content: ''
			}
		};
	},
	computed: {
		sanitizedContent() {
			return this.sanitizeHtml(this.article.content);
		}
	},
	onLoad() {
		const eventChannel = this.getOpenerEventChannel();
		if (eventChannel) {
			eventChannel.on('setArticle', (data) => {
				this.article = data;
			});
		}
	},
	methods: {
		sanitizeHtml(html) {
			if (!html) return '';
			return html
				.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
				.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
				.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
				.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
				.replace(/javascript\s*:/gi, '')
				.replace(/\n/g, '<br/>');
		},
	}
};
</script>

<style>
.content { width: 100%; height: 100vh; background-color: #ffffff; display: flex; flex-direction: column; }
.article-content { flex: 1; padding: 24upx; }
.article-header { margin-bottom: 32upx; }
.article-title { font-size: 36upx; font-weight: 600; color: #1f2937; line-height: 1.3; margin-bottom: 16upx; display: block; }
.author-info { display: flex; align-items: center; margin-bottom: 12upx; gap: 12upx; }
.author-avatar { width: 32px; height: 32px; border-radius: 50%; }
.author-name { font-size: 26upx; color: #6b7280; }
.article-date { font-size: 22upx; color: #9ca3af; }
.article-tags { display: flex; flex-wrap: wrap; gap: 8upx; }
.article-tag { font-size: 22upx; color: #1b44a6; background-color: rgba(27,68,166,0.08); padding: 4upx 12upx; border-radius: 999upx; }
.article-body { margin-bottom: 32upx; }
.section-text { font-size: 28upx; color: #4b5563; line-height: 1.8; white-space: pre-wrap; word-break: break-word; }
.section-text a { color: #3071f6; text-decoration: underline; }
.article-footer { display: flex; justify-content: center; padding: 24upx 0; border-top: 1px solid #f3f4f6; }
.footer-text { font-size: 22upx; color: #9ca3af; }
</style>
