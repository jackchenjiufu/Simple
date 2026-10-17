<template>
	<view class="vp-page">
		<!-- 标准导航栏：状态栏适配 + 返回按钮 -->
		<NavBar mode="back" title="视频" />
		<!-- 视频播放区 -->
		<view class="vp-video-wrap">
			<video
				v-if="videoUrl"
				class="vp-video"
				:src="videoUrl"
				:poster="imageUrl || ''"
				controls
				autoplay
				object-fit="contain"
				:show-center-play-btn="true"
				@error="onError"
			></video>
			<view v-else class="vp-empty">
				<text>视频地址无效</text>
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

export default {
	components: { NavBar },
	data() {
		return {
			id: 0,
			videoUrl: '',
			imageUrl: '',
			title: '视频',
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
	onLoad(options) {
		if (options && options.id) this.id = Number(options.id) || 0;
		if (options && options.video_url) this.videoUrl = decodeURIComponent(options.video_url);
		if (options && options.image_url) this.imageUrl = decodeURIComponent(options.image_url);
		if (options && options.title) this.title = decodeURIComponent(options.title) || '视频';
		this.checkLogin();
		if (this.id > 0) {
			this.loadComments(true);
		}
	},
	methods: {
		goBack() {
			const pages = getCurrentPages();
			if (pages.length > 1) uni.navigateBack();
			else uni.switchTab({ url: '/pages/tabbar/tabbar-1/tabbar-1' });
		},
		onError(e) {
			uni.showToast({ title: '视频加载失败', icon: 'none' });
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
		onInputBlur() {
			this.commentInputFocus = false;
		},
		loadComments(force) {
			const cid = this.id;
			if (!cid || this.commentLoading) return;
			if (force) {
				this.commentPage = 1;
				this.commentList = [];
			}
			this.commentLoading = true;
			const that = this;
			uni.request({
				url: apiConfig.baseUrl + 'comments.php',
				method: 'GET',
				data: { type: 'content', content_id: cid, page: this.commentPage, limit: 20 },
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
			const cid = this.id;
			if (!cid) {
				uni.showToast({ title: '视频信息缺失', icon: 'none' });
				return;
			}
			this.commentSending = true;
			const that = this;
			const payload = { type: 'content', content_id: cid, content: content };
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
		// 点击用户头像 → 私聊
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
	}
};
</script>

<style scoped>
.vp-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: #fff;
}
.vp-video-wrap {
	width: 100%;
	background: #000;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 45vh;
	min-height: 400upx;
}
.vp-video {
	width: 100%;
	height: 100%;
}
.vp-empty {
	color: #999;
	font-size: 28upx;
}

/* ===== 评论区 ===== */
.comment-section {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	background: #fff;
	padding: 0 32upx;
}
.section-divider {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24upx 0 16upx;
}
.divider-text {
	font-size: 30upx;
	font-weight: 600;
	color: #303132;
}
.comment-refresh {
	font-size: 26upx;
	color: #1b44a6;
	padding: 8upx;
}
.comment-list {
	padding-bottom: 24upx;
}
.comment-item {
	display: flex;
	padding: 20upx 0;
	border-bottom: 1px solid #f5f6fa;
}
.comment-item.comment-reply {
	margin-left: 72upx;
	padding: 16upx 0;
}
.comment-avatar {
	width: 64upx;
	height: 64upx;
	border-radius: 50%;
	flex-shrink: 0;
	margin-right: 20upx;
	background: #f0f0f0;
}
.comment-main {
	flex: 1;
	min-width: 0;
}
.comment-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.comment-user {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8upx;
}
.comment-nick {
	font-size: 26upx;
	font-weight: 600;
	color: #303132;
}
.comment-pin {
	font-size: 20upx;
	color: #e64340;
	border: 1px solid #e64340;
	border-radius: 4upx;
	padding: 0 8upx;
}
.role-badge {
	font-size: 20upx;
	border-radius: 4upx;
	padding: 0 8upx;
	margin-left: 4upx;
}
.role-badge.super { color: #e64340; background: #fdeaea; }
.role-badge.admin { color: #1b44a6; background: #e8edfb; }
.role-badge.level { color: #b8860b; background: #fdf6e3; }
.comment-ops {
	display: flex;
	align-items: center;
	gap: 16upx;
	flex-shrink: 0;
}
.comment-time {
	font-size: 22upx;
	color: #9ca3af;
}
.comment-pin-btn,
.comment-report,
.comment-del {
	font-size: 24upx;
	padding: 4upx;
}
.comment-pin-btn { color: #1b44a6; }
.comment-report { color: #9ca3af; }
.comment-del { color: #e64340; }
.comment-content {
	margin-top: 8upx;
	font-size: 28upx;
	color: #4b5563;
	line-height: 1.5;
	word-break: break-all;
}
.comment-at {
	color: #1b44a6;
}
.comment-more {
	text-align: center;
	padding: 24upx 0;
	font-size: 26upx;
	color: #1b44a6;
}
.comment-more-end {
	color: #9ca3af;
}
.comment-empty {
	text-align: center;
	padding: 60upx 0;
	font-size: 26upx;
	color: #9ca3af;
}

/* ===== 底部评论栏 ===== */
.comment-bar {
	background: #fff;
	border-top: 1px solid #f0f0f0;
	padding-bottom: env(safe-area-inset-bottom);
	flex-shrink: 0;
}
.comment-bar-inner {
	display: flex;
	align-items: center;
	padding: 16upx 24upx;
	gap: 16upx;
}
.comment-input-wrap {
	flex: 1;
	display: flex;
	align-items: center;
	background: #f5f6fa;
	border-radius: 40upx;
	padding: 0 24upx;
	height: 68upx;
}
.comment-input {
	flex: 1;
	font-size: 28upx;
	color: #303132;
}
.comment-input-ph {
	color: #9ca3af;
}
.comment-cancel {
	font-size: 26upx;
	color: #1b44a6;
	margin-left: 12upx;
}
.comment-send {
	padding: 0 28upx;
	height: 68upx;
	line-height: 68upx;
	border-radius: 40upx;
	background: #d1d5db;
	color: #fff;
	font-size: 28upx;
}
.comment-send-active {
	background: #1b44a6;
}

/* ===== 删除弹窗 ===== */
.sheet-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 999;
	display: flex;
	align-items: flex-end;
}
.sheet-panel {
	width: 100%;
	background: #fff;
	border-radius: 24upx 24upx 0 0;
	padding: 32upx 32upx calc(32upx + env(safe-area-inset-bottom));
}
.sheet-title {
	font-size: 32upx;
	font-weight: 600;
	text-align: center;
	color: #303132;
}
.sheet-desc {
	font-size: 26upx;
	color: #9ca3af;
	text-align: center;
	margin: 16upx 0 32upx;
}
.sheet-btn {
	height: 88upx;
	line-height: 88upx;
	border-radius: 16upx;
	text-align: center;
	font-size: 30upx;
	margin-bottom: 16upx;
}
.sheet-danger {
	background: #e64340;
	color: #fff;
}
.sheet-cancel {
	background: #f5f6fa;
	color: #303132;
}
</style>
