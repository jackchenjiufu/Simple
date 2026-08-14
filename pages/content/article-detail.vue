<template>
	<view class="page">
		<NavBar mode="back" title="文章详情" />

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
					<image class="author-avatar" :src="avatarUrl" mode="aspectFill" @click="chatWith(article.user_id, article.author)"></image>
					<view class="author-meta">
						<view class="author-name-row">
							<text class="author-name">{{ article.author || '未知作者' }}</text>
							<text v-if="isBadgeRole(article.author_role)" class="role-badge" :style="badgeStyle(article.author_role)">{{ badgeLabel(article.author_role) }}</text>
							<text class="role-badge level" v-if="article.author_level > 0">Lv.{{ article.author_level }}</text>
						</view>
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
					<image class="author-avatar-lg" :src="avatarUrl" mode="aspectFill" @click="chatWith(article.user_id, article.author)"></image>
					<view class="author-info-lg">
						<view class="author-name-row">
							<text class="author-name-lg">{{ article.author || '未知作者' }}</text>
							<text v-if="isBadgeRole(article.author_role)" class="role-badge" :style="badgeStyle(article.author_role)">{{ badgeLabel(article.author_role) }}</text>
							<text class="role-badge level" v-if="article.author_level > 0">Lv.{{ article.author_level }}</text>
						</view>
						<text class="author-bio">文章作者 · 分享知识与见解</text>
					</view>
				</view>
			</view>

			<!-- 评论区 -->
			<view class="comment-section">
				<view class="section-divider">
					<text class="divider-text">全部评论 ({{ commentTotal }})</text>
					<text class="comment-refresh" @click="loadComments(true)">刷新</text>
				</view>

				<!-- 评论列表 -->
				<view class="comment-list" v-if="commentList.length">
					<view
						class="comment-item"
						v-for="c in commentList"
						:key="c.id"
						:class="{ 'comment-reply': c.parent_id > 0 }"
						@click="startReply(c)"
					>
						<image class="comment-avatar" :src="getCommentAvatar(c.avatar)" mode="aspectFill" @click.stop="chatWith(c.user_id, c.nickname)"></image>
						<view class="comment-main">
							<view class="comment-head">
									<view class="comment-user">
										<text class="comment-nick">{{ c.nickname }}</text>
										<text class="comment-pin" v-if="c.is_top == 1">置顶</text>
										<text class="role-badge super" v-if="c.role === 'super_admin'">超级管理员</text>
										<text class="role-badge admin" v-if="c.role === 'admin'">管理员</text>
										<text class="role-badge editor" v-if="c.role === 'editor'">编辑</text>
										<text class="role-badge level" v-if="c.level > 0">Lv.{{ c.level }}</text>
									</view>
									<view class="comment-ops">
										<text class="comment-time">{{ c.time }}</text>
										<text class="comment-pin-btn" v-if="isAdminUser" @click.stop="togglePin(c)">{{ c.is_top == 1 ? '取消置顶' : '置顶' }}</text>
										<text class="comment-report" v-if="!isMine(c.user_id)" @click.stop="reportComment(c)">举报</text>
										<text class="comment-del" v-if="isMine(c.user_id)" @click.stop="openDeleteSheet(c)">删除</text>
									</view>
								</view>
							<view class="comment-content">
								<text v-if="c.reply_to" class="comment-at">回复 @{{ c.reply_to }}：</text>
								<text>{{ c.content }}</text>
							</view>
						</view>
					</view>

					<!-- 加载更多 -->
					<view class="comment-more" v-if="hasMoreComments" @click="loadComments(false)">
						<text>加载更多评论</text>
					</view>
					<view class="comment-more" v-else-if="commentList.length > 3">
						<text class="comment-more-end">— 共 {{ commentTotal }} 条评论 —</text>
					</view>
				</view>

				<!-- 空状态 -->
				<view class="comment-empty" v-else-if="!commentLoading">
					<text>还没有评论，快来抢沙发～</text>
				</view>
				<view class="comment-empty" v-else>
					<text>评论加载中...</text>
				</view>
			</view>

			<!-- 底部 -->
			<view class="article-footer">
				<view class="footer-divider"></view>
				<text class="footer-text">— End —</text>
				<text class="footer-sub">感谢阅读</text>
				<text class="footer-report" @click="reportArticleFn">举报文章</text>
			</view>
		</scroll-view>

		<!-- 底部评论输入栏 -->
		<view class="comment-bar">
			<view class="comment-bar-inner">
				<view class="comment-input-wrap">
					<input
						class="comment-input"
						v-model="commentText"
						:placeholder="replyTarget ? '回复 @' + replyTarget.nickname + '：' : '说点什么...'"
						placeholder-class="comment-input-ph"
						:disabled="commentSending"
						:focus="commentInputFocus"
						@focus="onInputFocus"
						@blur="onInputBlur"
						confirm-type="send"
						@confirm="sendComment"
					/>
					<text class="comment-cancel" v-if="replyTarget" @click="cancelReply">取消</text>
				</view>
				<view class="comment-send" :class="{ 'comment-send-active': commentText.trim() }" @click="sendComment">
					<text>{{ commentSending ? '发送中' : '发送' }}</text>
				</view>
				</view>
			</view>

			<!-- 删除评论确认弹窗（底部弹出） -->
			<view class="sheet-mask" v-if="deleteSheetVisible" @click="closeDeleteSheet">
				<view class="sheet-panel" @click.stop>
					<view class="sheet-title">删除这条评论？</view>
					<view class="sheet-desc">删除后不可恢复，确认要删除吗？</view>
					<view class="sheet-btn sheet-danger" @click="confirmDelete">删除</view>
					<view class="sheet-btn sheet-cancel" @click="closeDeleteSheet">取消</view>
				</view>
			</view>
		</view>
</template>

<script>
import NavBar from '../../components/modules/nav-bar/nav-bar.vue';
import apiConfig from '../../utils/api.js';
import config from '../../utils/config.js';
import reportApi from '../../utils/report-api.js';
import { loadRoles, isBadgeRole as badgeRoleFn, badgeLabel as badgeLabelFn, badgeStyle as badgeStyleFn } from '../../utils/role-badges.js';

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
				author_role: '',
				author_level: 0,
				created_at: '',
			},
			// ===== 评论区状态 =====
			commentList: [],
			commentTotal: 0,
			commentPage: 1,
			hasMoreComments: false,
			commentLoading: false,
			commentText: '',
			commentSending: false,
			replyTarget: null,
			myUserId: 0,
			isAdminUser: false,
			commentInputFocus: false,
			deleteSheetVisible: false,
			deleteTarget: null,
		};
	},
	computed: {
		sanitizedContent() {
			return this.enhanceContent(this.sanitizeHtml(this.mdToHtml(this.article.content)));
		},
		avatarUrl() {
			return this.article.author_avatar
				? apiConfig.getImageUrl(this.article.author_avatar)
				: apiConfig.getServerUrl(config.defaultAvatar);
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
		loadRoles();
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
					// 文章就绪后加载评论
					if (data && data.id) {
						this.checkLogin();
						this.loadComments(true);
					}
					});
			}
		} catch (e) { /* silent */ }
	},
	methods: {
		// 点击用户头像 → 私聊（未登录弹窗引导；自己头像不动作）
		chatWith(userId, nickname) {
			if (!userId) {
				uni.showToast({ title: '用户信息缺失', icon: 'none' });
				return;
			}
			const myId = uni.getStorageSync('userId');
			if (!myId) {
				uni.showModal({
					title: '未登录',
					content: '登录后才能私聊，现在去登录？',
					confirmText: '去登录',
					success: (r) => {
						if (r.confirm) uni.navigateTo({ url: '/pages/auth/login' });
					}
				});
				return;
			}
			if (Number(myId) === Number(userId)) {
				uni.showToast({ title: '这是你自己', icon: 'none' });
				return;
			}
			uni.navigateTo({
				url: `/pages/chat/chat?user_id=${userId}&nickname=${encodeURIComponent(nickname || '用户')}`
			});
		},
		// 举报评论
		reportComment(c) {
			if (!uni.getStorageSync('userId')) {
				uni.showModal({
					title: '未登录',
					content: '登录后才能举报，现在去登录？',
					confirmText: '去登录',
					success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pages/auth/login' }); }
				});
				return;
			}
			reportApi.showReportFlow('comment', c.id, '这条评论');
		},
		// 举报文章
		reportArticleFn() {
			if (!this.article.id) {
				uni.showToast({ title: '文章信息缺失', icon: 'none' });
				return;
			}
			if (!uni.getStorageSync('userId')) {
				uni.showModal({
					title: '未登录',
					content: '登录后才能举报，现在去登录？',
					confirmText: '去登录',
					success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pages/auth/login' }); }
				});
				return;
			}
			reportApi.showReportFlow('article', this.article.id, '这篇文章');
		},
		// 角色徽章辅助（注册为实例方法，供模板调用）
		isBadgeRole(name) { return badgeRoleFn(name); },
		badgeLabel(name) { return badgeLabelFn(name); },
		badgeStyle(name) { return badgeStyleFn(name); },
		bindLinks() {
			// 在 DOM 中找到所有 <a> 链接，绑定原生 click 事件
			// uni-app 的 v-html 渲染的元素不经过 Vue 事件系统，需要用原生方式
			// 注意：document 仅 H5 平台存在，App 端无 DOM API，需条件编译隔离
			// #ifdef H5
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
			// #endif
		},
		// Markdown → HTML（轻量转换：标题/链接/图片/加粗/斜体/行内代码/列表/引用）
		mdToHtml(md) {
			if (!md) return '';
			// 兼容字面 \n（数据以 JSON 转义形式存储）
			md = String(md).replace(/\\n/g, '\n');
			const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			const inline = (s) => {
				// 图片 ![alt](url)（URL 允许空格）
				s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, u) => `<img src="${esc(u.trim())}" alt="${esc(alt)}" />`);
				// 链接 [text](url)（URL 允许空格）
				s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => `<a href="${esc(u.trim())}">${t}</a>`);
				// 行内代码 `code`
				s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
				// 加粗 **text**
				s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
				// 斜体 *text*
				s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
				return s;
			};
			const lines = md.split(/\r?\n/);
			const out = [];
			let inList = null; // 'ul' | 'ol'
			const closeList = () => { if (inList) { out.push('</' + inList + '>'); inList = null; } };
			for (let line of lines) {
				const t = line.trim();
				if (!t) { closeList(); continue; }
				let m;
				if ((m = t.match(/^(#{1,4})\s+(.*)/))) {
					closeList();
					const lv = m[1].length;
					out.push(`<h${lv}>${inline(m[2])}</h${lv}>`);
				} else if (/^[-*]\s+/.test(t)) {
					if (inList !== 'ul') { closeList(); out.push('<ul>'); inList = 'ul'; }
					out.push(`<li>${inline(t.replace(/^[-*]\s+/, ''))}</li>`);
				} else if (/^\d+[.、]\s+/.test(t)) {
					if (inList !== 'ol') { closeList(); out.push('<ol>'); inList = 'ol'; }
					out.push(`<li>${inline(t.replace(/^\d+[.、]\s+/, ''))}</li>`);
				} else if (/^>\s?/.test(t)) {
					closeList();
					out.push(`<blockquote>${inline(t.replace(/^>\s?/, ''))}</blockquote>`);
				} else {
					closeList();
					out.push(`<p>${inline(t)}</p>`);
				}
			}
			closeList();
			return out.join('');
		},
		sanitizeHtml(html) {
			if (!html) return '';
			return html
				.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
				.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
				.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
				.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
				.replace(/<embed[^>]*>/gi, '')
				.replace(/<link[^>]*>/gi, '')
				.replace(/<meta[^>]*>/gi, '')
				.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
				.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
				.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
				.replace(/\s+srcdoc\s*=\s*"[^"]*"/gi, '')
				.replace(/\s+srcdoc\s*=\s*'[^']*'/gi, '')
				.replace(/javascript\s*:/gi, '')
				.replace(/data:\s*text\/html/gi, '');
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
				.replace(/<h4>/gi, '<h4 class="content-h4">')
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
			// ===== 评论区方法 =====
			getCommentAvatar(avatar) {
				return avatar
					? apiConfig.getImageUrl(avatar)
					: apiConfig.getServerUrl(config.defaultAvatar);
			},
			checkLogin() {
				const ui = uni.getStorageSync('userInfo');
				const loggedIn = uni.getStorageSync('isLoggedIn');
				if (loggedIn && ui && ui.id) {
					this.myUserId = ui.id;
					this.isAdminUser = (ui.role === 'admin' || ui.role === 'super_admin');
					return true;
				}
				this.isAdminUser = false;
				return false;
			},
			onInputFocus() {
				if (!this.checkLogin()) {
					uni.hideKeyboard();
					uni.showModal({
						title: '提示',
						content: '登录后才能参与评论，是否去登录？',
						confirmText: '去登录',
						success: (res) => {
							if (res.confirm) {
								uni.navigateTo({ url: '/pages/auth/login' });
							}
						},
					});
				}
			},
			loadComments(force) {
				const aid = this.article.id;
				if (!aid || this.commentLoading) return;
				if (force) {
					this.commentPage = 1;
					this.commentList = [];
				}
				this.commentLoading = true;
				const that = this;
				uni.request({
					url: apiConfig.baseUrl + 'comments.php',
					method: 'GET',
					data: { article_id: aid, page: this.commentPage, limit: 20 },
					success: (res) => {
						try {
							const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
							if (result && result.code === 200) {
								const items = result.data || [];
								// 构建 reply_to 映射：parent_id → 父评论昵称
								const idMap = {};
								that.commentList.concat(items).forEach((c) => { idMap[c.id] = c.nickname; });
								items.forEach((c) => {
									if (c.parent_id > 0 && idMap[c.parent_id]) {
										c.reply_to = idMap[c.parent_id];
									} else {
										c.reply_to = '';
									}
								});
								that.commentList = that.commentList.concat(items);
								that.commentTotal = result.total || that.commentList.length;
								that.hasMoreComments = that.commentList.length < that.commentTotal;
								that.commentPage++;
							}
						} catch (e) {
							console.log('Comment parse error', e);
						}
					},
					complete: () => {
						that.commentLoading = false;
					},
				});
			},
			onInputBlur() {
				this.commentInputFocus = false;
			},
			startReply(c) {
				if (!this.checkLogin()) {
					this.onInputFocus();
					return;
				}
				this.replyTarget = c;
				// 触发 input 聚焦（先置 false 再置 true 才能连续触发）
				this.commentInputFocus = false;
				this.$nextTick(() => {
					this.commentInputFocus = true;
				});
			},
			cancelReply() {
				this.replyTarget = null;
				this.commentInputFocus = false;
			},
			isMine(uid) {
				return this.myUserId > 0 && Number(uid) === this.myUserId;
			},
			sendComment() {
				if (this.commentSending) return;
				const content = (this.commentText || '').trim();
				if (!content) {
					uni.showToast({ title: '请输入评论内容', icon: 'none' });
					return;
				}
				if (!this.checkLogin()) {
					this.onInputFocus();
					return;
				}
				const aid = this.article.id;
				if (!aid) {
					uni.showToast({ title: '文章信息缺失', icon: 'none' });
					return;
				}
				this.commentSending = true;
				const that = this;
				const payload = { article_id: aid, content: content };
				if (this.replyTarget) {
					payload.parent_id = this.replyTarget.id;
				}
				uni.request({
					url: apiConfig.baseUrl + 'comments.php',
					method: 'POST',
					header: { 'Content-Type': 'application/json' },
					data: payload,
					success: (res) => {
						try {
							const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
							if (result && result.code === 200) {
								uni.showToast({ title: '评论成功', icon: 'success' });
								that.commentText = '';
								that.replyTarget = null;
								that.commentInputFocus = false;
								that.commentTotal = result.total || that.commentTotal + 1;
								// 重新加载第一页（保证回复分组正确）
								that.commentPage = 1;
								that.commentList = [];
								that.loadComments(true);
							} else if (result && result.code === 401) {
								uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
								uni.navigateTo({ url: '/pages/auth/login' });
							} else {
								uni.showToast({ title: (result && result.message) || '评论失败', icon: 'none' });
							}
						} catch (e) {
							console.log('Send comment error', e);
							uni.showToast({ title: '评论失败', icon: 'none' });
						}
					},
					fail: () => {
						uni.showToast({ title: '网络错误', icon: 'none' });
					},
					complete: () => {
						that.commentSending = false;
					},
				});
			},
			togglePin(c) {
				const that = this;
				uni.request({
					url: apiConfig.baseUrl + 'comments.php',
					method: 'POST',
					header: { 'Content-Type': 'application/json' },
					data: { action: 'pin', comment_id: c.id, pinned: c.is_top == 1 ? 0 : 1 },
					success: (res) => {
						try {
							const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
							if (result && result.code === 200) {
								uni.showToast({ title: result.message || '操作成功', icon: 'none' });
								c.is_top = c.is_top == 1 ? 0 : 1;
							} else {
								uni.showToast({ title: (result && result.message) || '操作失败', icon: 'none' });
							}
						} catch (e) {
							uni.showToast({ title: '操作失败', icon: 'none' });
						}
					},
					fail: () => {
						uni.showToast({ title: '网络错误', icon: 'none' });
					},
				});
			},
			openDeleteSheet(c) {
				this.deleteTarget = c;
				this.deleteSheetVisible = true;
			},
			closeDeleteSheet() {
				this.deleteSheetVisible = false;
				this.deleteTarget = null;
			},
			confirmDelete() {
				const c = this.deleteTarget;
				if (!c) return;
				const that = this;
				uni.request({
					url: apiConfig.baseUrl + 'comments.php?id=' + c.id,
					method: 'DELETE',
					success: (r) => {
						try {
							const result = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
							if (result && result.code === 200) {
								uni.showToast({ title: '已删除', icon: 'success' });
								that.commentList = that.commentList.filter((x) => x.id !== c.id);
								that.commentTotal = Math.max(0, that.commentTotal - 1);
							} else {
								uni.showToast({ title: (result && result.message) || '删除失败', icon: 'none' });
							}
						} catch (e) {
							uni.showToast({ title: '删除失败', icon: 'none' });
						}
					},
					fail: () => {
						uni.showToast({ title: '网络错误', icon: 'none' });
					},
					complete: () => {
						that.closeDeleteSheet();
					},
				});
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
.author-name-row {
	display: flex;
	align-items: center;
	gap: 8upx;
	flex-wrap: wrap;
}

.role-badge {
	font-size: 18upx;
	padding: 1upx 10upx;
	border-radius: 20upx;
	flex-shrink: 0;
}
.role-badge.super { color: #b8860b; background: #fff8e6; border: 1upx solid #f0d48a; }
.role-badge.admin { color: #1b44a6; background: #f0f5ff; border: 1upx solid #b8cdf5; }
.role-badge.editor { color: #1a7d3a; background: #e8f8ee; border: 1upx solid #b7e4c7; }
.role-badge.level { color: #7c5cfc; background: #f3f0ff; border: 1upx solid #d4c8f7; }

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
.section-text >>> .content-h4 {
	font-size: 28upx;
	font-weight: 600;
	color: #2d3748;
	margin: 24upx 0 10upx;
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
.footer-report {
	margin-top: 16upx;
	font-size: 22upx;
	color: #9ca3af;
	padding: 8upx 16upx;
	text-decoration: underline;
}
/* ===== 评论区样式 ===== */
.comment-section {
	background: #ffffff;
	padding: 24upx 32upx 32upx;
	margin: 0 0 16upx;
}
.comment-refresh {
	font-size: 22upx;
	color: #909398;
	margin-left: auto;
	padding: 4upx 12upx;
}
.comment-list {
	margin-top: 8upx;
}
.comment-item {
	display: flex;
	gap: 20upx;
	padding: 20upx 0;
	border-bottom: 1upx solid #f2f4f8;
}
.comment-item:last-child {
	border-bottom: none;
}
.comment-reply {
	margin-left: 72upx;
	background: #fafbfd;
	border-radius: 12upx;
	padding: 16upx 20upx;
	border-bottom: none;
	margin-bottom: 8upx;
}
.comment-avatar {
	width: 64upx;
	height: 64upx;
	border-radius: 50%;
	background: #eef1f5;
	flex-shrink: 0;
}
.comment-main {
	flex: 1;
	min-width: 0;
}
.comment-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12upx;
}
.comment-user {
	display: flex;
	align-items: center;
	gap: 8upx;
	flex-wrap: wrap;
	min-width: 0;
}
.comment-nick {
	font-size: 26upx;
	font-weight: 600;
	color: #2d3748;
}
.comment-pin {
	font-size: 18upx;
	padding: 1upx 10upx;
	border-radius: 20upx;
	color: #b8860b;
	background: #fff8e6;
	border: 1upx solid #f0d48a;
	flex-shrink: 0;
}
.comment-ops {
	display: flex;
	align-items: center;
	gap: 16upx;
	flex-shrink: 0;
}
.comment-time {
	font-size: 20upx;
	color: #b0b3ba;
}
.comment-pin-btn {
	font-size: 22upx;
	color: #b8860b;
	padding: 4upx 8upx;
}
.comment-del {
	font-size: 22upx;
	color: #e11d48;
	padding: 4upx 8upx;
}
.comment-report {
	font-size: 22upx;
	color: #9ca3af;
	padding: 4upx 8upx;
}
.comment-content {
	margin-top: 10upx;
	font-size: 28upx;
	color: #374151;
	line-height: 1.6;
	word-break: break-word;
}
.comment-at {
	color: #3071f6;
}
.comment-more {
	padding: 20upx 0 4upx;
	text-align: center;
}
.comment-more text {
	font-size: 24upx;
	color: #3071f6;
}
.comment-more-end {
	color: #c0c3c9 !important;
}
.comment-empty {
	padding: 48upx 0 32upx;
	text-align: center;
}
.comment-empty text {
	font-size: 24upx;
	color: #b0b3ba;
}
/* ===== 底部输入栏 ===== */
.comment-bar {
	background: #ffffff;
	border-top: 1upx solid #eef1f5;
	padding: 14upx 24upx calc(14upx + env(safe-area-inset-bottom));
}
.comment-bar-inner {
	display: flex;
	align-items: center;
	gap: 16upx;
}
.comment-input-wrap {
	flex: 1;
	display: flex;
	align-items: center;
	background: #f2f4f8;
	border-radius: 999upx;
	padding: 0 24upx;
	height: 68upx;
}
.comment-input {
	flex: 1;
	font-size: 26upx;
	height: 68upx;
	color: #1a1a2e;
}
.comment-input-ph {
	color: #b0b3ba;
}
.comment-cancel {
	font-size: 22upx;
	color: #909398;
	padding-left: 16upx;
	flex-shrink: 0;
}
.comment-send {
	height: 68upx;
	padding: 0 32upx;
	border-radius: 999upx;
	background: #e4e9f2;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}
.comment-send text {
	font-size: 26upx;
	color: #9aa3b2;
}
.comment-send-active {
	background: linear-gradient(90deg, #1b44a6, #3071f6);
}
.comment-send-active text {
	color: #ffffff;
}
/* ===== 删除确认弹窗 ===== */
.sheet-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.45);
	z-index: 999;
	display: flex;
	align-items: flex-end;
}
.sheet-panel {
	width: 100%;
	background: #ffffff;
	border-radius: 24upx 24upx 0 0;
	padding: 32upx 32upx calc(32upx + env(safe-area-inset-bottom));
	animation: sheet-up 0.25s ease-out;
}
@keyframes sheet-up {
	from { transform: translateY(100%); }
	to { transform: translateY(0); }
}
.sheet-title {
	font-size: 32upx;
	font-weight: 700;
	color: #1a1a2e;
	text-align: center;
	margin-bottom: 12upx;
}
.sheet-desc {
	font-size: 24upx;
	color: #909398;
	text-align: center;
	margin-bottom: 32upx;
}
.sheet-btn {
	height: 92upx;
	border-radius: 16upx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 30upx;
	margin-bottom: 16upx;
}
.sheet-danger {
	background: #e11d48;
	color: #ffffff;
	font-weight: 600;
}
.sheet-cancel {
	background: #f2f4f8;
	color: #374151;
}
</style>
