<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">{{ peerName }}</text>
			<view class="nav-action" @click="showMore = !showMore">⋯</view>
		</view>

		<!-- 更多操作菜单 -->
		<view class="mask-light" v-if="showMore" @click="showMore = false">
			<view class="more-menu" @click.stop>
				<view class="more-item" @click="reportPeer">举报用户</view>
				<view class="more-item danger" @click="handleBlock">{{ blocked ? '取消拉黑' : '拉黑' }}</view>
				<view class="more-item" @click="handleClear">清空聊天记录</view>
				<view class="more-item" @click="showMore = false">取消</view>
			</view>
		</view>

		<scroll-view class="chat-body" scroll-y="true" :scroll-top="scrollTop" :scroll-with-animation="true"
			show-scrollbar="false" @scrolltolower="loadOlder">
			<view class="load-older" v-if="hasMore" @click="loadOlder">加载更早消息</view>
			<view class="load-older" v-if="!hasMore && messages.length > 10">没有更早的消息了</view>

			<view class="msg-row" v-for="m in messages" :key="m.id"
				:class="m.sender_id === myUserId ? 'row-mine' : 'row-peer'">
				<image v-if="m.sender_id !== myUserId" class="msg-avatar" :src="peerAvatar || defaultAvatar" mode="aspectFill"></image>
				<view class="bubble-wrap" @longpress="longPressMsg(m)">
					<view class="bubble" :class="m.sender_id === myUserId ? 'bubble-mine' : 'bubble-peer'">
						<text class="bubble-text" user-select="true">{{ m.content }}</text>
					</view>
					<view class="msg-meta" v-if="m.sender_id === myUserId">
						<text class="msg-status" v-if="m.reported == 1">已举报</text>
					</view>
				</view>
				<image v-if="m.sender_id === myUserId" class="msg-avatar" :src="myAvatar || defaultAvatar" mode="aspectFill"></image>
			</view>

			<view class="empty-tip" v-if="!loading && messages.length === 0">
				<text>{{ peerBlockedMe ? '对方已拉黑你，无法发送消息' : '打个招呼吧～' }}</text>
			</view>
			<view class="load-older" v-if="loading">加载中...</view>
		</scroll-view>

		<!-- 底部输入栏 -->
		<view class="input-bar" :style="{ paddingBottom: safeArea + 'px' }">
			<input class="chat-input" v-model="inputText" placeholder="输入消息..." confirm-type="send"
				@confirm="sendMsg" :disabled="peerBlockedMe" />
			<view class="send-btn" :class="{ disabled: !inputText.trim() || sending }" @click="sendMsg">发送</view>
		</view>

		<!-- 消息操作弹层（长按） -->
		<view class="mask-light" v-if="actionMsg" @click="actionMsg = null">
			<view class="more-menu" @click.stop>
				<view class="more-item" @click="copyMsg">复制</view>
				<view class="more-item" v-if="actionMsg.sender_id !== myUserId" @click="reportMsg">举报</view>
				<view class="more-item" @click="actionMsg = null">取消</view>
			</view>
		</view>
	</view>
</template>

<script>
import apiConfig from '../../utils/api.js';
import config from '../../utils/config.js';
import chatApi from '../../utils/chat-api.js';
import reportApi from '../../utils/report-api.js';

export default {
	data() {
		return {
			statusBarHeight: 0,
			safeArea: 0,
			conversationId: 0,
			peerId: 0,
			peerName: '',
			peerBlockedMe: false,
			blocked: false,
			messages: [],
			page: 1,
			hasMore: false,
			loading: false,
			sending: false,
			inputText: '',
			scrollTop: 0,
			myUserId: 0,
			showMore: false,
			actionMsg: null,
			pollTimer: null,
			peerAvatar: '',
			myAvatar: '',
			defaultAvatar: apiConfig.getServerUrl(config.defaultAvatar),
		};
	},
	onLoad(options) {
		const info = uni.getSystemInfoSync();
		this.statusBarHeight = info.statusBarHeight || 0;
		this.safeArea = info.safeAreaInsets ? (info.safeAreaInsets.bottom || 0) : 0;
		this.myUserId = uni.getStorageSync('userId') || 0;
		this.peerId = parseInt(options.user_id || options.peer_id || 0, 10);
		this.peerName = options.nickname ? decodeURIComponent(options.nickname) : '聊天';
		if (options.conversation_id) this.conversationId = parseInt(options.conversation_id, 10);
		// 自己的头像（登录缓存）
		const ui = uni.getStorageSync('userInfo') || {};
		if (ui.avatar) this.myAvatar = this.fixUrl(ui.avatar);
		if (!this.myUserId) {
			uni.showToast({ title: '请先登录', icon: 'none' });
			setTimeout(() => uni.navigateTo({ url: '/pages/auth/login' }), 800);
			return;
		}
		this.loadMessages(true);
		// 轮询新消息（5秒）
		this.pollTimer = setInterval(() => this.pollNew(), 5000);
	},
	onShow() {
		if (this.conversationId) chatApi.markRead(this.conversationId).catch(() => {});
	},
	onUnload() {
		if (this.pollTimer) clearInterval(this.pollTimer);
	},
	methods: {
		goBack() {
			if (this.conversationId) chatApi.markRead(this.conversationId).catch(() => {});
			uni.navigateBack();
		},
		// 图片 URL 补全
		fixUrl(url) {
			if (!url) return '';
			if (url.startsWith('http://') || url.startsWith('https://')) return url;
			return config.siteUrl + (url.startsWith('/') ? url : '/' + url);
		},
		loadMessages(reset) {
			if (this.loading) return;
			// 首次私聊：尚无会话，跳过加载（发送成功后回填 conversation_id）
			if (!this.conversationId) {
				if (reset) this.messages = [];
				return;
			}
			if (reset) { this.page = 1; this.messages = []; }
			this.loading = true;
			chatApi.getMessages(this.conversationId, this.page, 20).then((res) => {
				const data = res.data || {};
				const list = data.messages || [];
				const peer = data.peer;
				if (peer && peer.nickname) this.peerName = peer.nickname;
				if (peer && peer.avatar) this.peerAvatar = this.fixUrl(peer.avatar);
				if (data.peer_blocked_me !== undefined) this.peerBlockedMe = !!data.peer_blocked_me;
				if (reset) {
					this.messages = list;
				} else {
					this.messages = list.concat(this.messages);
				}
				this.hasMore = !!data.has_more;
				if (this.hasMore) this.page++;
				// 滚动到底部
				setTimeout(() => { this.scrollTop = 99999; }, 100);
				if (this.conversationId) chatApi.markRead(this.conversationId).catch(() => {});
			}).catch((e) => {
				if (e && e.code === 403) {
					uni.showToast({ title: '无权查看该会话', icon: 'none' });
				}
			}).finally(() => { this.loading = false; });
		},
		loadOlder() {
			if (this.hasMore) this.loadMessages(false);
		},
		// 轮询新消息：只拉第一页对比长度
		pollNew() {
			if (!this.conversationId || this.loading) return;
			chatApi.getMessages(this.conversationId, 1, 20).then((res) => {
				const data = res.data || {};
				const list = data.messages || [];
				if (data.peer_blocked_me !== undefined) this.peerBlockedMe = !!data.peer_blocked_me;
				if (list.length > this.messages.length) {
					this.messages = list;
					setTimeout(() => { this.scrollTop = 99999; }, 100);
					if (this.conversationId) chatApi.markRead(this.conversationId).catch(() => {});
				}
			}).catch(() => {});
		},
		sendMsg() {
			const content = this.inputText.trim();
			if (!content || this.sending) return;
			if (this.peerBlockedMe) {
				uni.showToast({ title: '对方已拉黑你', icon: 'none' });
				return;
			}
			this.sending = true;
			chatApi.send(this.peerId, content).then((res) => {
				this.inputText = '';
				// 首次私聊：回填 conversation_id 再加载
				if (res.data && res.data.conversation_id) this.conversationId = res.data.conversation_id;
				this.loadMessages(true);
			}).catch((e) => {
				uni.showToast({ title: (e && e.message) || '发送失败', icon: 'none' });
			}).finally(() => { this.sending = false; });
		},
		handleBlock() {
			const that = this;
			uni.showModal({
				title: this.blocked ? '取消拉黑' : '拉黑',
				content: this.blocked ? `确定解除对「${this.peerName}」的拉黑？` : `拉黑后双方将无法互相发送消息。确定拉黑「${this.peerName}」？`,
				confirmColor: this.blocked ? '#3071f6' : '#e64340',
				success: (r) => {
					if (!r.confirm) return;
					const fn = this.blocked ? chatApi.unblock : chatApi.block;
					fn(this.peerId).then(() => {
						this.blocked = !this.blocked;
						this.showMore = false;
						uni.showToast({ title: this.blocked ? '已拉黑' : '已取消拉黑', icon: 'success' });
					}).catch(() => { uni.showToast({ title: '操作失败', icon: 'none' }); });
				}
			});
		},
		handleClear() {
			const that = this;
			uni.showModal({
				title: '清空聊天记录',
				content: '仅清空本地显示，不影响对方。确定清空？',
				confirmColor: '#e64340',
				success: (r) => {
					if (r.confirm) {
						that.messages = [];
						that.showMore = false;
						uni.showToast({ title: '已清空', icon: 'success' });
					}
				}
			});
		},
		longPressMsg(m) { this.actionMsg = m; },
		copyMsg() {
			if (this.actionMsg) {
				uni.setClipboardData({ data: this.actionMsg.content });
			}
			this.actionMsg = null;
		},
		reportMsg() {
			const that = this;
			if (!uni.getStorageSync('userId')) {
				uni.showModal({
					title: '未登录',
					content: '登录后才能举报，现在去登录？',
					confirmText: '去登录',
					success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pages/auth/login' }); }
				});
				that.actionMsg = null;
				return;
			}
			reportApi.showReportFlow('message', that.actionMsg.id, '这条消息').then(() => {
				that.actionMsg = null;
			}).catch(() => { that.actionMsg = null; });
		},
		reportPeer() {
			const that = this;
			if (!uni.getStorageSync('userId')) {
				uni.showModal({
					title: '未登录',
					content: '登录后才能举报，现在去登录？',
					confirmText: '去登录',
					success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pages/auth/login' }); }
				});
				that.showMore = false;
				return;
			}
			reportApi.showReportFlow('user', that.peerId, '该用户').then(() => {
				that.showMore = false;
			}).catch(() => { that.showMore = false; });
		},
	}
};
</script>

<style>
.content { height: 100vh; background: #f5f6fa; display: flex; flex-direction: column; overflow: hidden; }
.status-bar { width: 100%; background: #fff; }
.nav-bar {
	height: 44px; background: #fff; display: flex; align-items: center;
	justify-content: space-between; padding: 0 12px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
}
.nav-back { width: 36px; height: 36px; display: flex; align-items: center; }
.back-icon { width: 20px; height: 20px; }
.nav-title { font-size: 16px; font-weight: 600; color: #1a1a2e; flex: 1; text-align: center; }
.nav-action { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #666; }

.chat-body { flex: 1; min-height: 0; padding: 12px 14px; box-sizing: border-box; }
.load-older { text-align: center; color: #bbb; font-size: 12px; padding: 12px 0; }
.empty-tip { text-align: center; color: #bbb; font-size: 13px; padding: 40px 0; }

.msg-row { display: flex; margin-bottom: 14px; align-items: flex-start; }
.row-mine { justify-content: flex-end; }
.row-peer { justify-content: flex-start; }
.msg-avatar {
	width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
	margin: 0 8px; background: #eee;
}
.bubble-wrap { max-width: 72%; display: flex; flex-direction: column; }
.row-mine .bubble-wrap { align-items: flex-end; }
.bubble {
	padding: 10px 14px; border-radius: 14px; font-size: 15px; line-height: 1.5;
	word-break: break-word;
}
.bubble-mine {
	background: linear-gradient(135deg, #1b44a6, #3071f6); color: #fff;
	border-top-right-radius: 4px;
}
.bubble-peer {
	background: #fff; color: #333; border: 1px solid #eee;
	border-top-left-radius: 4px;
}
.bubble-text { display: block; }
.msg-meta { margin-top: 4px; }
.msg-status { font-size: 10px; color: #f59e0b; }

.input-bar {
	display: flex; align-items: center; padding: 10px 12px;
	background: #fff; border-top: 1px solid #f0f0f0; flex-shrink: 0;
}
.chat-input {
	flex: 1; height: 40px; background: #f5f6fa; border-radius: 20px;
	padding: 0 16px; font-size: 15px;
}
.send-btn {
	margin-left: 10px; padding: 8px 18px; border-radius: 18px; font-size: 14px;
	background: linear-gradient(135deg, #1b44a6, #3071f6); color: #fff;
}
.send-btn.disabled { opacity: 0.5; }

.mask-light {
	position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 999;
	display: flex; align-items: flex-end; justify-content: center;
}
.more-menu {
	width: 100%; background: #fff; border-radius: 16px 16px 0 0;
	padding: 8px 16px 24px; box-sizing: border-box;
}
.more-item {
	padding: 16px 8px; text-align: center; font-size: 16px; color: #333;
	border-bottom: 1px solid #f5f5f5;
}
.more-item:last-child { border-bottom: none; }
.more-item.danger { color: #e64340; }
</style>
