<template>
	<view class="content">
		<!-- 状态栏占位 -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px', position: 'fixed', top: '0', left: '0', right: '0', zIndex: '11', backgroundColor: '#ffffff' }"></view>
		
		<!-- 导航栏 -->
		<view class="nav-bar" :style="{ position: 'fixed', top: statusBarHeight + 'px', left: '0', right: '0', zIndex: '10', backgroundColor: '#ffffff' }">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">文章详情</text>
			<view class="nav-right"></view>
		</view>
		
		<!-- 文章内容 -->
		<scroll-view 
			class="article-content" 
			scroll-y="true"
			:refresher-enabled="false"
			:style="{ marginTop: (statusBarHeight + 44) + 'px' }"
		>
			<view class="article-header">
				<text class="article-title">{{ article.title }}</text>
				<view class="article-meta">
					<view class="author-info">
						<image class="author-avatar" :src="article.author_avatar || '/static/img/qa.png'" mode="aspectFill"></image>
						<text class="author-name">{{ article.author || '未知作者' }}</text>
						<text class="article-date">{{ article.date }}</text>
					</view>
					<view class="article-tags">
						<text 
							class="article-tag" 
							v-for="(tag, index) in article.tags" 
							:key="index"
						>{{ tag }}</text>
					</view>
				</view>
			</view>
			
			<view class="article-body">
				<view class="article-section">
					<view class="section-text" v-html="article.content"></view>
				</view>
			</view>
			
			<view class="article-footer">
				<text class="footer-text">文章结束</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { userBehaviorTracker } from '../../utils/user-behavior.js';

export default {
	data() {
		return {
			statusBarHeight: 0,
			article: {
				title: '',
				date: '',
				tags: [],
				content: ''
			}
		};
	},
	onLoad(options) {
		// 获取状态栏高度
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		
		// 设置CSS变量，用于样式中引用
		uni.setStorageSync('statusBarHeight', this.statusBarHeight);
		
		// 监听事件通道，接收文章数据
		const eventChannel = this.getOpenerEventChannel();
		if (eventChannel) {
			eventChannel.on('setArticle', (data) => {
				this.article = data;
			});
		} else {
			// 如果没有接收到文章数据，使用默认数据
			this.loadArticleData();
		}
		
		// 记录页面浏览行为
		userBehaviorTracker.trackPageView('article_detail');
	},
	onHide() {
		// 记录页面停留时间
		userBehaviorTracker.trackPageStay('article_detail');
		// 保存用户行为数据
		userBehaviorTracker.saveToStorage();
	},
	methods: {
		// 加载文章数据
		loadArticleData() {
			// 模拟文章数据
			this.article = {
				title: '前端开发的未来趋势',
				date: '2026-02-20',
				tags: ['前端', '趋势', '技术'],
				author: '技术专家',
				author_avatar: '/static/img/qa.png',
				content: '随着技术的不断发展，前端开发领域也在持续演进。以下是我对前端开发未来趋势的一些看法：\n\n1. AI辅助开发\nAI技术的融入将大幅提升前端开发效率。通过AI工具，开发者可以快速生成代码、优化性能、识别潜在问题，甚至自动修复bug。\n\n2. WebAssembly的广泛应用\nWebAssembly将使前端能够处理更复杂的计算任务，为Web应用带来接近原生应用的性能体验。\n\n3. 响应式设计的新发展\n响应式设计将更加智能化，能够根据设备特性、网络状况和用户偏好自动调整布局和内容。\n\n4. 前端架构的演进\n微前端、Server Components等新架构模式将改变前端开发的方式，使大型应用的维护和扩展变得更加容易。\n\n5. 可访问性成为标配\nWeb可访问性将不再是可选功能，而是前端开发的基本要求，确保所有人都能平等地访问Web内容。\n\n6. 实时协作工具的普及\n实时协作开发工具将使团队协作更加高效，多人可以同时编辑代码，实时查看变更。\n\n7. 边缘计算的应用\n边缘计算将使前端应用能够在更接近用户的位置处理数据，减少延迟，提升用户体验。\n\n8. 跨平台开发的统一\n跨平台开发框架将进一步成熟，使开发者能够用一套代码构建在多个平台运行的应用。\n\n9. 前端安全的重视\n前端安全将成为开发过程中的重要考量，包括防止XSS、CSRF等攻击，保护用户数据。\n\n10. 性能优化的自动化\n性能优化将更加自动化，通过工具和框架自动识别性能瓶颈并提供优化建议。\n\n更多资源：<a href="https://developer.mozilla.org" target="_blank">MDN Web Docs</a> 和 <a href="https://vuejs.org" target="_blank">Vue.js 官方文档</a>\n\n总之，前端开发的未来充满机遇和挑战，开发者需要不断学习新技术，适应变化，才能在这个快速发展的领域保持竞争力。'
			};
		},
		// 返回上一页
		goBack() {
			uni.navigateBack();
		}
	}
};
</script>

<style lang="scss" scoped>
/* 页面容器样式 */
.content {
	width: 100%;
	height: 100vh;
	background-color: var(--bg-color);
	display: flex;
	flex-direction: column;
}

/* 状态栏占位样式 */
.status-bar {
	background-color: var(--bg-color);
	width: 100%;
}

/* 导航栏样式 */
.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 44px;
	background-color: var(--bg-color);
	padding: 0 var(--spacing-lg);
	border-bottom: 1px solid var(--border-color);
	z-index: 10;
}

.nav-back {
	width: 72upx;
	height: 72upx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.back-icon {
	width: 48upx;
	height: 48upx;
}

.nav-title {
	font-size: var(--font-lg);
	font-weight: 600;
	color: var(--text-primary);
}

.nav-right {
	width: 40px;
}

/* 文章内容样式 */
.article-content {
	flex: 1;
	padding: var(--spacing-lg);
}

/* 文章头部样式 */
.article-header {
	margin-bottom: var(--spacing-xl);
}

.article-title {
	font-size: var(--font-2xl);
	font-weight: 600;
	color: var(--text-primary);
	line-height: 1.3;
	margin-bottom: var(--spacing-md);
}

.author-info {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing-sm);
	gap: var(--spacing-sm);
}

.author-avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
}

.author-name {
	font-size: var(--font-base);
	color: var(--text-secondary);
	font-weight: 500;
}

.article-date {
	font-size: var(--font-sm);
	color: var(--text-tertiary);
}

.article-meta {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
}

.article-tags {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-xs);
}

.article-tag {
	font-size: var(--font-xs);
	color: var(--primary-color);
	background-color: rgba(64, 158, 255, 0.1);
	padding: 2px 8px;
	border-radius: var(--radius-full);
}

/* 文章主体样式 */
.article-body {
	margin-bottom: var(--spacing-xl);
}

.article-section {
	margin-bottom: var(--spacing-lg);
}

.section-text {
			font-size: var(--font-base);
			color: var(--text-secondary);
			line-height: 1.6;
			white-space: pre-wrap;
		}

		.section-text a {
			color: var(--primary-color);
			text-decoration: underline;
			word-break: break-all;
		}

/* 文章底部样式 */
.article-footer {
	display: flex;
	justify-content: center;
	padding: var(--spacing-lg) 0;
	border-top: 1px solid var(--border-light);
}

.footer-text {
	font-size: var(--font-sm);
	color: var(--text-tertiary);
}
</style>