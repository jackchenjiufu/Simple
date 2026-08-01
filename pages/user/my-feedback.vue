<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">问题反馈</text>
			<view class="nav-placeholder"></view>
		</view>

		<view class="feedback-tab-bar" v-if="isLoggedIn">
			<view class="feedback-tab-item" :class="{ active: tab === 'submit' }" @click="tab='submit'">提交反馈</view>
			<view class="feedback-tab-item" :class="{ active: tab === 'history' }" @click="switchToHistory">历史反馈</view>
		</view>

		<!-- 提交反馈 -->
		<scroll-view class="body" scroll-y="true" v-if="isLoggedIn && tab === 'submit'" show-scrollbar="false">
			<view class="form-section">
				<view class="form-group">
					<text class="form-label">反馈类型</text>
					<view class="picker-wrapper" @click="showTypePicker = true">
						<text class="picker-text" :class="{ placeholder: !form.type }">{{ form.type || '请选择反馈类型' }}</text>
						<text class="picker-arrow">›</text>
					</view>
				</view>

				<view class="form-group">
					<text class="form-label">反馈内容 <text class="required">*</text></text>
					<textarea
						class="form-textarea"
						v-model="form.content"
						placeholder="请详细描述您遇到的问题或建议..."
						placeholder-class="placeholder-style"
						maxlength="500"
					></textarea>
					<text class="char-count">{{ form.content.length }}/500</text>
				</view>

				<view class="form-group">
					<text class="form-label">联系方式</text>
					<input
						class="form-input"
						v-model="form.contact"
						placeholder="手机号 / QQ / 微信（选填）"
						placeholder-class="placeholder-style"
					/>
				</view>

				<button class="submit-btn" @click="handleSubmit" :loading="submitting" :disabled="submitting">
					{{ submitting ? '提交中...' : '提交反馈' }}
				</button>
			</view>
		</scroll-view>

		<!-- 历史反馈 -->
		<scroll-view class="body" scroll-y="true" v-if="isLoggedIn && tab === 'history'" show-scrollbar="false" @scrolltolower="loadMore">
			<!-- 加载中 -->
			<view class="loading-box" v-if="loadingHistory">
				<view class="loading-spinner"></view>
				<text class="loading-text">加载中...</text>
			</view>

			<!-- 反馈列表 -->
			<view class="history-section" v-if="!loadingHistory">
				<view class="history-item" v-for="(item, i) in historyList" :key="i">
					<!-- 头部：类型 + 状态（点击展开/折叠，已完结的问题默认折叠） -->
					<view class="history-header" @click="toggleExpand(item)">
						<text class="history-type">{{ item.type }}</text>
						<view class="history-header-right">
							<text class="history-status" :class="'s' + (item.status || 0)">{{ item.status === 2 ? '已回复' : item.status === 3 ? '已完结' : item.status === 1 ? '已读' : '待处理' }}</text>
							<text class="expand-arrow" v-if="item.status === 3">{{ isCollapsed(item) ? '▾' : '▴' }}</text>
						</view>
					</view>

					<!-- 已完结默认折叠时显示内容预览 -->
					<text class="collapsed-preview" v-if="isCollapsed(item)" @click="toggleExpand(item)">{{ item.content }}</text>

					<!-- 对话气泡区域 -->
					<view class="chat-area" v-if="!isCollapsed(item)">
						<!-- 用户原始反馈 -->
						<view class="chat-bubble user-bubble">
							<text class="bubble-text">{{ item.content }}</text>
							<text class="bubble-time">{{ formatTime(item.created_at) }}</text>
						</view>
						
						<!-- 回复对话 -->
						<view class="chat-bubble admin-bubble" v-for="(reply, ri) in item.replies" :key="ri">
							<text class="bubble-label" v-if="reply.role === 'admin'">管理员</text>
							<text class="bubble-text">{{ reply.content }}</text>
							<text class="bubble-time">{{ formatTime(reply.created_at) }}</text>
						</view>

						<!-- 追问输入框（仅未完结可追问） -->
						<view class="reply-input-area" v-if="item.has_reply && item.status !== 3">
							<textarea
								class="reply-input"
								v-model="replyTexts[i]"
								:placeholder="'输入追问...'"
								maxlength="500"
								@focus="focusReplyIndex = i"
							></textarea>
							<button class="reply-send-btn" 
								@click="sendReply(i)" 
								:disabled="!replyTexts[i] || !replyTexts[i].trim()"
								:loading="replyingIndex === i"
							>发送</button>
						</view>
					</view>
					
					<view class="history-footer" v-if="!isCollapsed(item)">
						<text class="history-close-btn" v-if="item.status !== 3" @click="closeFeedback(item)">完结问题</text>
						<text class="history-footer-time">{{ formatTime(item.created_at) }}</text>
					</view>
				</view>

				<!-- 加载更多 -->
				<view class="load-more" v-if="hasMore">
					<text class="load-more-text">上拉加载更多</text>
				</view>
				<view class="load-more" v-if="!hasMore && historyList.length > 0">
					<text class="load-more-text end">— 已加载全部 —</text>
				</view>

				<view class="history-empty" v-if="!historyList.length && !loadingHistory">
					<text class="empty-text">暂无反馈记录</text>
				</view>
			</view>
		</scroll-view>

		<!-- 未登录 -->
		<view class="login-box" v-if="!isLoggedIn">
			<text class="login-msg">请先登录</text>
		</view>

		<!-- 类型选择弹窗 -->
		<view class="modal-overlay" v-if="showTypePicker" @click="showTypePicker = false">
			<view class="modal-content" @click.stop>
				<text class="modal-title">选择反馈类型</text>
				<view class="type-list">
					<view
						class="type-item"
						v-for="(item, i) in typeOptions"
						:key="i"
						:class="{ active: form.type === item }"
						@click="selectType(item)"
					>
						<text class="type-text">{{ item }}</text>
						<text class="type-check" v-if="form.type === item">✓</text>
					</view>
				</view>
				<button class="modal-close-btn" @click="showTypePicker = false">取消</button>
			</view>
		</view>
	</view>
</template>

<script>
import apiConfig from '../../utils/api.js';
export default {
	data() {
		return {
			statusBarHeight: 0,
			isLoggedIn: false,
			submitting: false,
			showTypePicker: false,
			tab: 'submit',
			historyList: [],
			loadingHistory: false,
			page: 1,
			hasMore: true,
			replyTexts: {},
			replyingIndex: -1,
			focusReplyIndex: -1,
			expandedIds: {},
			lastSeen: {},
			pollTimer: null,
			form: {
				type: '',
				content: '',
				contact: ''
			},
			typeOptions: ['功能建议', '界面反馈', '性能问题', '内容错误', '账号问题', '其他']
		};
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		const ui = uni.getStorageSync('userInfo');
		const loggedIn = uni.getStorageSync('isLoggedIn');
		if (loggedIn && ui) {
			this.isLoggedIn = true;
		}
	},
	onShow() {
		this.startPolling();
	},
	onHide() {
		this.stopPolling();
	},
	onUnload() {
		this.stopPolling();
	},
	methods: {
		goBack() {
			uni.navigateBack();
		},
		selectType(type) {
			this.form.type = type;
			this.showTypePicker = false;
		},
		switchToHistory() {
			this.tab = 'history';
			this.historyList = [];
			this.page = 1;
			this.hasMore = true;
			this.loadHistory();
		},
		// 已完结的问题默认折叠；手动展开过的保持展开
		isCollapsed(item) {
			return item.status === 3 && !this.expandedIds[item.id];
		},
		toggleExpand(item) {
			if (item.status !== 3) return;
			if (this.expandedIds[item.id]) {
				delete this.expandedIds[item.id];
			} else {
				this.expandedIds[item.id] = true;
			}
		},
		loadHistory(silent) {
			const userInfo = uni.getStorageSync('userInfo');
			if (!userInfo || !userInfo.id) return;
			if (!silent) this.loadingHistory = true;
			uni.request({
				url: apiConfig.baseUrl + 'feedback.php',
				method: 'GET',
				data: { user_id: userInfo.id, page: this.page, limit: 10 },
				success: (res) => {
					try {
						const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
						if (result && result.code === 200) {
							const items = result.data || [];
							// 记录已见回复数（用于轮询检测新回复）
							for (const it of items) {
								this.lastSeen[it.id] = (it.replies || []).length;
							}
							if (this.page === 1) {
								this.historyList = items;
							} else {
								this.historyList = this.historyList.concat(items);
							}
							this.hasMore = items.length >= 10;
						}
					} catch (e) {
						console.log('Parse error', e);
					}
				},
				fail: () => {
					uni.showToast({ title: '网络错误', icon: 'none' });
				},
				complete: () => {
					this.loadingHistory = false;
				}
			});
		},
		loadMore() {
			if (this.loadingHistory || !this.hasMore) return;
			this.page++;
			this.loadHistory();
		},
		// ===== 实时轮询：检测管理员新回复 =====
		startPolling() {
			this.stopPolling();
			this.pollTimer = setInterval(() => this.pollNewReplies(), 20000);
		},
		stopPolling() {
			if (this.pollTimer) {
				clearInterval(this.pollTimer);
				this.pollTimer = null;
			}
		},
		pollNewReplies() {
			if (this.tab !== 'history' || !this.isLoggedIn) return;
			const userInfo = uni.getStorageSync('userInfo');
			if (!userInfo || !userInfo.id) return;
			uni.request({
				url: apiConfig.baseUrl + 'feedback.php',
				method: 'GET',
				data: { user_id: userInfo.id, page: 1, limit: 10 },
				success: (res) => {
					try {
						const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
						if (!result || result.code !== 200) return;
						const items = result.data || [];
						const newReplies = [];
						for (const it of items) {
							const reps = it.replies || [];
							const rc = reps.length;
							const prev = this.lastSeen[it.id];
							this.lastSeen[it.id] = rc;
							if (prev !== undefined && rc > prev) {
								const last = reps[rc - 1];
								if (last && last.role === 'admin') {
									newReplies.push({ item: it, reply: last });
								}
							}
						}
						if (newReplies.length) {
							this.showReplyNotification(newReplies);
							this.page = 1;
							this.loadHistory(true);
						}
					} catch (e) {
						console.log('poll error', e);
					}
				},
				fail: () => {}
			});
		},
		showReplyNotification(newReplies) {
			const r = newReplies[0];
			const title = '管理员回复了你的反馈';
			const body = r.reply.content;
			// #ifdef APP-PLUS
			try {
				plus.notification.create(title, body, '');
			} catch (e) {
				console.log('notification fail', e);
			}
			// #endif
			// #ifdef H5
			if ('Notification' in window) {
				if (Notification.permission === 'default') Notification.requestPermission();
				if (Notification.permission === 'granted') {
					try { new Notification(title, { body: body }); } catch (e) {}
				}
			}
			// #endif
			uni.showToast({ title: '管理员回复了你的反馈', icon: 'none' });
		},
		sendReply(index) {
			const item = this.historyList[index];
			const text = this.replyTexts[index];
			if (!text || !text.trim()) return;

			const userInfo = uni.getStorageSync('userInfo');
			if (!userInfo || !userInfo.id) return;

			this.replyingIndex = index;
			uni.request({
				url: apiConfig.baseUrl + 'feedback.php',
				method: 'POST',
				data: {
					action: 'reply',
					user_id: userInfo.id,
					feedback_id: item.id,
					content: text.trim()
				},
				success: (res) => {
					try {
						const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
						if (result && result.code === 200) {
							uni.showToast({ title: '追问已提交', icon: 'success' });
							this.replyTexts[index] = '';
							// 刷新列表
							this.page = 1;
							this.loadHistory();
						} else {
							uni.showToast({ title: result.message || '提交失败', icon: 'none' });
						}
					} catch (e) {
						uni.showToast({ title: '服务器异常', icon: 'none' });
					}
				},
				fail: () => {
					uni.showToast({ title: '网络错误', icon: 'none' });
				},
				complete: () => {
					this.replyingIndex = -1;
				}
			});
		},
		closeFeedback(item) {
			uni.showModal({
				title: '完结问题',
				content: '确定要将该反馈标记为已完结吗？完结后将无法继续追问。',
				confirmText: '确认完结',
				confirmColor: '#3071f6',
				success: (res) => {
					if (!res.confirm) return;
					const userInfo = uni.getStorageSync('userInfo');
					if (!userInfo || !userInfo.id) return;
					uni.request({
						url: apiConfig.baseUrl + 'feedback.php',
						method: 'POST',
						data: {
							action: 'close',
							user_id: userInfo.id,
							feedback_id: item.id
						},
						success: (res) => {
							try {
								const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
								if (result && result.code === 200) {
									uni.showToast({ title: '已完结', icon: 'success' });
									// 刷新列表，已完结的卡片会自动折叠
									this.page = 1;
									this.loadHistory();
								} else {
									uni.showToast({ title: result.message || '操作失败', icon: 'none' });
								}
							} catch (e) {
								uni.showToast({ title: '服务器异常', icon: 'none' });
							}
						},
						fail: () => {
							uni.showToast({ title: '网络错误', icon: 'none' });
						}
					});
				}
			});
		},
		formatTime(t) {
			if (!t) return '';
			try {
				const d = new Date(String(t).replace(/-/g, '/'));
				if (isNaN(d.getTime())) return t;
				const pad = (n) => (n < 10 ? '0' + n : '' + n);
				return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
			} catch (e) {
				return t;
			}
		},
		handleSubmit() {
			if (!this.form.content.trim()) {
				uni.showToast({ title: '请填写反馈内容', icon: 'none' });
				return;
			}
			if (!this.form.type) {
				uni.showToast({ title: '请选择反馈类型', icon: 'none' });
				return;
			}

			this.submitting = true;
			const userInfo = uni.getStorageSync('userInfo');

			uni.request({
				url: apiConfig.baseUrl + 'feedback.php',
				method: 'POST',
				data: {
					user_id: userInfo.id,
					type: this.form.type,
					content: this.form.content.trim(),
					contact: this.form.contact.trim()
				},
				success: (res) => {
					try {
						const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
						if (result.code === 200) {
							uni.showToast({ title: '提交成功', icon: 'success' });
							// 清空表单
							this.form = { type: '', content: '', contact: '' };
							// 自动切换到历史tab
							this.switchToHistory();
						} else {
							uni.showToast({ title: result.message || '提交失败', icon: 'none' });
						}
					} catch (e) {
						uni.showToast({ title: '服务器响应异常', icon: 'none' });
					}
				},
				fail: () => {
					uni.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
				},
				complete: () => {
					this.submitting = false;
				}
			});
		}
	}
};
</script>

<style>
.content { width: 100%; min-height: 100vh; background-color: #f8f9fb; display: flex; flex-direction: column; }
.status-bar { background-color: #ffffff; width: 100%; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 88upx; background-color: #ffffff; padding: 0 24upx; border-bottom: 1px solid #f0f0f0; }
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { font-size: 30upx; font-weight: 600; color: #303132; }
.nav-placeholder { width: 72upx; }
.body { flex: 1; padding: 24upx; }

/* 加载中 */
.loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80upx 0; }
.loading-spinner { width: 48upx; height: 48upx; border: 4upx solid #e0e0e0; border-top-color: #3071f6; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 24upx; color: #909398; margin-top: 16upx; }

/* 表单 */
.form-section { background: #ffffff; border-radius: 16upx; padding: 32upx 28upx; box-shadow: 0 2upx 12upx rgba(0, 0, 0, 0.04); }
.form-group { margin-bottom: 32upx; }
.form-label { display: block; font-size: 28upx; font-weight: 500; color: #303132; margin-bottom: 16upx; }
.required { color: #ef4444; }
.picker-wrapper { display: flex; align-items: center; justify-content: space-between; height: 88upx; padding: 0 24upx; background: #f8f9fb; border-radius: 12upx; border: 1px solid #e8e8e8; }
.picker-text { font-size: 28upx; color: #303132; }
.picker-text.placeholder { color: #c0c4cc; }
.picker-arrow { font-size: 36upx; color: #c0c4cc; font-weight: 300; }
.form-input { height: 88upx; padding: 0 24upx; background: #f8f9fb; border-radius: 12upx; border: 1px solid #e8e8e8; font-size: 28upx; color: #303132; }
.form-textarea { width: 100%; min-height: 240upx; padding: 24upx; background: #f8f9fb; border-radius: 12upx; border: 1px solid #e8e8e8; font-size: 28upx; color: #303132; box-sizing: border-box; }
.placeholder-style { color: #c0c4cc; font-size: 28upx; }
.char-count { display: block; text-align: right; font-size: 22upx; color: #c0c4cc; margin-top: 8upx; }
.submit-btn { width: 100%; height: 88upx; line-height: 88upx; background: #3071f6; color: #ffffff; font-size: 30upx; font-weight: 600; border-radius: 16upx; border: none; margin-top: 16upx; }
.submit-btn:active { background: #285ed4; }
.submit-btn[disabled] { opacity: 0.7; }
.login-box { flex: 1; display: flex; align-items: center; justify-content: center; }
.login-msg { font-size: 28upx; color: #909398; }

/* 历史列表 */
.history-section { padding-bottom: 40upx; }
.history-item { background: #fff; border-radius: 16upx; padding: 24upx; margin-bottom: 20upx; box-shadow: 0 2upx 12upx rgba(0, 0, 0, 0.04); }
.history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16upx; }
.history-type { font-size: 24upx; color: #3071f6; background: #f0f5ff; padding: 4upx 16upx; border-radius: 20upx; font-weight: 500; }
.history-status { font-size: 22upx; padding: 4upx 14upx; border-radius: 20upx; background: #f3f4f6; color: #909398; }
.history-status.s1 { background: #fff8e6; color: #b8860b; }
.history-status.s2 { background: #e8f8ee; color: #1a7d3a; }
.history-status.s3 { background: #f0f0f0; color: #909398; }
.history-header-right { display: flex; align-items: center; gap: 12upx; }
.expand-arrow { font-size: 26upx; color: #b0b4bc; line-height: 1; }
.collapsed-preview { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 26upx; color: #909398; line-height: 1.5; }

/* 对话气泡 */
.chat-area { display: flex; flex-direction: column; gap: 12upx; }
.chat-bubble { max-width: 85%; padding: 16upx 20upx; border-radius: 16upx; position: relative; }
.user-bubble { align-self: flex-end; background: #3071f6; color: #fff; border-bottom-right-radius: 4upx; }
.admin-bubble { align-self: flex-start; background: #f0f2f5; color: #303132; border-bottom-left-radius: 4upx; }
.bubble-label { font-size: 20upx; font-weight: 600; color: #3071f6; display: block; margin-bottom: 4upx; }
.bubble-text { font-size: 26upx; line-height: 1.5; display: block; }
.bubble-time { font-size: 20upx; color: rgba(255,255,255,0.6); display: block; margin-top: 6upx; text-align: right; }
.admin-bubble .bubble-time { color: #aaa; }

/* 追问输入区 */
.reply-input-area { display: flex; align-items: flex-end; gap: 12upx; margin-top: 12upx; }
.reply-input { flex: 1; min-height: 72upx; max-height: 144upx; padding: 12upx 16upx; background: #f8f9fb; border: 1px solid #e0e0e0; border-radius: 12upx; font-size: 24upx; color: #303132; box-sizing: border-box; }
.reply-send-btn { flex-shrink: 0; height: 72upx; line-height: 72upx; padding: 0 24upx; background: #3071f6; color: #fff; font-size: 24upx; border-radius: 12upx; border: none; min-width: 100upx; text-align: center; }
.reply-send-btn:active { background: #285ed4; }
.reply-send-btn[disabled] { opacity: 0.5; }

.history-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12upx; }
.history-footer .history-footer-time { margin-top: 0; }
.history-close-btn { font-size: 22upx; color: #909398; padding: 6upx 20upx; border: 1upx solid #d8dbe0; border-radius: 20upx; line-height: 1.4; }
.history-close-btn:active { color: #ef4444; border-color: #ef4444; }
.history-footer-time { font-size: 20upx; color: #d1d5db; display: block; text-align: right; }

/* 顶部标签栏 */
.feedback-tab-bar { display: flex; background: #ffffff; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
.feedback-tab-item { flex: 1; text-align: center; padding: 24upx 0 20upx; font-size: 28upx; color: #909398; position: relative; }
.feedback-tab-item.active { color: #1b44a6; font-weight: 600; }
.feedback-tab-item.active::after { content: ""; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40upx; height: 4upx; background: #1b44a6; border-radius: 2upx; }

/* 加载更多 */
.load-more { text-align: center; padding: 24upx 0; }
.load-more-text { font-size: 22upx; color: #c0c4cc; }
.load-more-text.end { color: #d1d5db; }

/* 空状态 */
.history-empty { text-align: center; padding: 100upx 0; }
.empty-text { font-size: 28upx; color: #909398; }

/* 弹窗 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 40upx; }
.modal-content { background: #fff; border-radius: 28upx; padding: 36upx 32upx 28upx; width: 86%; max-width: 560upx; box-shadow: 0 16upx 48upx rgba(0, 0, 0, 0.15); max-height: 78vh; overflow-y: auto; }
.modal-title { font-size: 32upx; font-weight: 600; color: #303132; display: block; text-align: center; margin-bottom: 24upx; }
.type-list { margin-bottom: 24upx; }
.type-item { display: flex; align-items: center; justify-content: space-between; padding: 24upx 20upx; margin-bottom: 4upx; border-radius: 12upx; border-bottom: 1px solid #f3f4f6; }
.type-item:active { background: #f3f6fc; }
.type-item.active { background: #f0f5ff; border-left: 4upx solid #3071f6; padding-left: 16upx; }
.type-item:last-child { border-bottom: none; }
.type-text { font-size: 28upx; color: #303132; }
.type-check { font-size: 32upx; color: #3071f6; font-weight: 600; }
.modal-close-btn { width: 100%; height: 88upx; line-height: 88upx; background: #ffffff; color: #3071f6; font-size: 28upx; font-weight: 500; border-radius: 16upx; border: 2upx solid #3071f6; }
.modal-close-btn:active { background: #f0f5ff; }
</style>
