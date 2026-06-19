<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<!-- 返回按钮 -->
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<!-- 导航标题 -->
			<text class="nav-title">{{ message?.sender || '消息详情' }}</text>
			<!-- 占位元素，使标题居中 -->
			<view class="nav-placeholder"></view>
		</view>
		
		<!-- 内容滚动区域 -->
		<scroll-view class="content-area" scroll-y="true" :scroll-top="scrollTop" @scroll="onScroll">
			<!-- 对话列表 -->
			<view class="chat-container" v-if="message">
				<!-- 对话消息项 -->
				<view 
					v-for="(msg, index) in chatMessages" 
					:key="index" 
					:class="['message-item', { 'my-message': msg.isMine, 'other-message': !msg.isMine }]"
				>
					<!-- 对方消息 -->
					<template v-if="!msg.isMine">
						<image-lazy class="avatar" :src="msg.avatar || '/static/img/default-avatar.png'" mode="aspectFill" :compress="true"></image-lazy>
						<view class="message-bubble other-bubble">
							<text class="message-sender">{{ msg.senderName || '对方用户' }}</text>
							<text class="message-text">{{ msg.content }}</text>
							<text class="message-time">{{ formatDateTime(msg.created_at) }}</text>
						</view>
					</template>
					<!-- 我的消息 -->
					<template v-else>
						<view class="message-bubble my-bubble">
							<text class="message-sender">{{ msg.senderName || '我' }}</text>
							<text class="message-text">{{ msg.content }}</text>
							<text class="message-time">{{ formatDateTime(msg.created_at) }}</text>
						</view>
						<image-lazy class="avatar" :src="msg.avatar || '/static/img/default-avatar.png'" mode="aspectFill" :compress="true"></image-lazy>
					</template>
				</view>
			</view>
			
			<!-- 空状态，当消息数据不存在时显示 -->
			<view class="empty-state" v-else>
				<text class="empty-text">暂无消息</text>
				<button class="btn btn-back" @click="goBack">返回</button>
			</view>
		</scroll-view>
		
		<!-- 回复输入框，始终显示 -->
		<view class="reply-input-container">
			<input 
				class="reply-input" 
				v-model="replyContent" 
				placeholder="输入消息..." 
				@confirm="sendReply"
			>
			<button class="btn-send" @click="sendReply">发送</button>
		</view>
	</view>

</template>

<script>
// 引入API配置
import apiConfig from '../../utils/api.js';
// 引入请求工具
import request from '../../utils/request.js';

export default {
	// 组件数据
	data() {
			return {
				statusBarHeight: 0, // 状态栏高度，用于适配不同机型
				messageId: '', // 消息ID
				userId: '', // 用户ID，用于新消息场景
				message: null, // 消息详情数据
				replyContent: '', // 回复内容
				chatMessages: [], // 对话消息列表
				scrollTop: 0, // 滚动位置
				scrollHeight: 0 // 滚动高度
			};
		},
	
	// 页面加载时触发
		onLoad(options) {
			// 获取系统信息，用于设置状态栏高度
			const systemInfo = uni.getSystemInfoSync();
			this.statusBarHeight = systemInfo.statusBarHeight || 0;
			
			// 初始化message对象，确保聊天容器能显示
			this.message = {
				sender: '未知用户',
				avatar: '/static/img/default-avatar.png',
				content: '点击输入框发送消息',
				created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
				unread: 0
			};
			
			// 从参数中获取消息ID或用户ID
			if (options && options.id) {
				this.messageId = options.id;
				// 加载消息详情数据
				this.loadMessageDetail();
			} else if (options && options.userId) {
				this.userId = options.userId;
				// 用于新消息场景，加载聊天记录
				this.loadChatHistory();
			}
			
			// 监听事件通道，接收从列表页或用户主页传递的数据
			const eventChannel = this.getOpenerEventChannel();
			if (eventChannel) {
				// 接收从消息列表传递的消息数据
				eventChannel.on('setMessage', (message) => {
					this.message = message;
					// 设置对方用户ID，确保聊天历史API能获取正确的聊天记录
					if (message && message.other_user_id) {
						this.userId = message.other_user_id;
					}
					// 加载聊天记录
					this.loadChatHistory();
				});
				// 接收从用户主页传递的用户数据
				eventChannel.on('setUser', (user) => {
					this.message = {
						sender: user.nickname || user.username,
						avatar: user.avatar,
						content: '点击输入框发送消息',
						created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
						unread: 0
					};
					// 设置对方用户ID，确保聊天历史API能获取正确的聊天记录
					if (user && user.id) {
						this.userId = user.id;
					}
					// 加载聊天记录
					this.loadChatHistory();
				});
			}
		},
	
	methods: {
			// 加载消息详情数据
		async loadMessageDetail() {
			try {
				
				// 检查是否已从事件通道获取到消息数据
				if (this.message) {
					// 设置对方用户ID，确保聊天历史API能获取正确的聊天记录
					if (this.message.other_user_id) {
						this.userId = this.message.other_user_id;
					} else if (this.message.sender_id && this.message.sender_id !== getApp().globalData.userInfo?.id) {
						// 如果没有other_user_id，但有sender_id且不是当前用户，则使用sender_id作为对方用户ID
						this.userId = this.message.sender_id;
					} else if (this.message.receiver_id && this.message.receiver_id !== getApp().globalData.userInfo?.id) {
						// 如果没有other_user_id和有效的sender_id，则使用receiver_id作为对方用户ID
						this.userId = this.message.receiver_id;
					}
					// 加载聊天记录
					this.loadChatHistory();
					return;
				}
				
				// 尝试调用真实的API获取消息详情，使用带缓存的请求工具
				const apiUrl = 'get_message_detail.php';
				
				const response = await request.get(apiUrl, {
					id: this.messageId
				}, {
					cache: true,
					cacheTime: 5 * 60 * 1000 // 缓存5分钟
				});
				
				
				// request.get()直接返回结果对象，不需要再解析statusCode
				if (response && (response.code === 200 || response.success)) {
					// API返回成功，使用真实数据
					this.message = response.data || {
						id: this.messageId,
						sender: '未知用户',
						avatar: '/static/img/default-avatar.png',
						created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
						unread: 0
					};
					
					// 设置对方用户ID，确保聊天历史API能获取正确的聊天记录
					const currentUserId = parseInt(getApp().globalData.userInfo?.id || 0);
					const messageData = response.data || {};
					
					if (messageData.sender_id && messageData.sender_id !== currentUserId) {
						// 如果消息发送者不是当前用户，则使用发送者ID作为对方用户ID
						this.userId = messageData.sender_id;
					} else if (messageData.receiver_id && messageData.receiver_id !== currentUserId) {
						// 如果消息发送者是当前用户，则使用接收者ID作为对方用户ID
						this.userId = messageData.receiver_id;
					}
				} else {
					// API返回错误，使用默认数据
					console.error('获取消息详情失败:', response.message || '未知错误');
					this.message = {
						id: this.messageId,
						sender: '未知用户',
						avatar: '/static/img/default-avatar.png',
						created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
						unread: 0
					};
				}
				
				// 加载聊天记录
				this.loadChatHistory();
			} catch (error) {
				console.error('加载消息详情失败:', error);
				// 使用默认数据
				this.message = {
					id: this.messageId,
					sender: '未知用户',
					avatar: '/static/img/default-avatar.png',
					created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
					unread: 0
				};
				// 加载聊天记录
				this.loadChatHistory();
				uni.showToast({
					title: '加载消息详情失败',
					icon: 'none'
				});
			}
		},
			
			// 加载聊天记录
		loadChatHistory() {
			
			// 保存从事件通道或初始设置中获得的原始对方用户名和头像
			// 这个用户名已经是正确的对方用户名，不要轻易覆盖
			const originalSenderName = this.message.sender || '对方用户';
			const originalSenderAvatar = this.message.avatar || '/static/img/default-avatar.png';
			
			// 调用真实的API获取聊天记录，使用带缓存的请求工具
			// 只使用userId来获取聊天记录，messageId是消息ID，不是用户ID
			if (this.userId) {
				request.get(apiConfig.endpoints.chatHistory, {
					user_id: this.userId
				}, {
					cache: true,
					cacheTime: 1 * 60 * 1000 // 缓存1分钟
				}).then((res) => {
					// 确保即使没有聊天记录，导航栏也显示正确的用户名
					const currentUser = getApp().globalData.userInfo || {};
					const currentUserId = parseInt(currentUser.id || 0);
					
					// 保持原始用户名和头像，不被覆盖
					let otherUserName = originalSenderName;
					let otherUserAvatar = originalSenderAvatar;
					
					if (res && (res.code === 200 || res.success)) {
						// 更新聊天记录
						if (Array.isArray(res.data)) {
							// 处理聊天记录
							if (res.data.length > 0) {
								// 处理聊天记录
								this.chatMessages = res.data.map(msg => {
									// 获取消息发送者ID和接收者ID
									const msgSenderId = parseInt(msg.sender_id || 0);
									const msgReceiverId = parseInt(msg.receiver_id || 0);
									
									// 打印调试信息
									
									// 确定消息的发送者名称
									let senderName = '未知用户';
									let senderAvatar = '/static/img/default-avatar.png';
									let isMine = false;
									
									// 如果是自己发送的消息
									if (msgSenderId === currentUserId) {
										isMine = true;
										senderName = '我';
										senderAvatar = currentUser.avatar || senderAvatar;
									} else {
										// 否则，显示对方的名称
										isMine = false;
										senderName = msg.sender_name || msg.sender_nickname || '对方用户';
										senderAvatar = msg.sender_avatar || msg.avatar || senderAvatar;
									}
									
									return {
										...msg,
										isMine: isMine,
										senderName: senderName,
										avatar: senderAvatar
									};
								});
									
								// 滚动到底部
								this.scrollToBottom();
							} else {
								// 聊天记录为空
								this.chatMessages = [];
							}
						} else {
							// 如果返回的数据不是数组，保持当前聊天记录不变
							console.warn('返回的数据不是数组，保持当前聊天记录不变');
						}
					} else {
						console.error('获取聊天记录失败:', res.message || '未知错误');
						// API返回错误，保持当前聊天记录不变
						console.warn('API返回错误，保持当前聊天记录不变');
					}
					
					// 确保导航栏显示的是原始的对方用户名，而不是被覆盖的错误值
					this.message.sender = originalSenderName;
					this.message.avatar = originalSenderAvatar;
				}).catch((err) => {
					console.error('获取聊天记录失败:', err);
					// API调用失败，保持当前聊天记录不变，让用户可以继续发送消息
					console.warn('API调用失败，保持当前聊天记录不变，用户可以继续发送消息');
					uni.showToast({
						title: '获取聊天记录失败，但您可以继续发送消息',
						icon: 'none'
					});
				});
			} else {
				console.warn('没有对方用户ID，无法获取聊天记录');
				uni.showToast({
					title: '无法获取聊天记录，缺少必要参数',
					icon: 'none'
				});
			}
		},
			
			// 返回上一页
			goBack() {
				uni.navigateBack({
					delta: 1
				});
			},
			
			// 格式化日期时间
			formatDateTime(dateString) {
				if (!dateString || typeof dateString !== 'string') {
					return '';
				}
				
				try {
					const date = new Date(dateString);
					
					// 检查日期是否有效
					if (isNaN(date.getTime())) {
						return dateString;
					}
					
					const hour = String(date.getHours()).padStart(2, '0');
					const minute = String(date.getMinutes()).padStart(2, '0');
					
					return `${hour}:${minute}`;
				} catch (error) {
					console.error('格式化日期时出错:', error);
					return dateString;
				}
			},
			
			// 发送消息
			sendReply() {
				if (!this.replyContent.trim()) {
					uni.showToast({
						title: '消息内容不能为空',
						icon: 'none'
					});
					return;
				}
				
				
				// 模拟发送消息
				uni.showLoading({
					title: '发送中...'
				});
				
				// 获取当前用户信息
			const currentUser = getApp().globalData.userInfo || {};
			
			// 创建新消息对象
			const newMessage = {
				isMine: true,
				sender_id: parseInt(currentUser.id || 0),
				senderName: '我',
				avatar: currentUser.avatar || '/static/img/default-avatar.png',
				content: this.replyContent,
				created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
			};
				
				// 将新消息添加到聊天记录
				this.chatMessages.push(newMessage);
				// 清空输入框
				this.replyContent = '';
				// 滚动到底部
				this.scrollToBottom();
				
				// 调用真实的API发送消息
				uni.request({
					url: apiConfig.getUrl(apiConfig.endpoints.sendMessage),
					method: 'POST',
					header: {
						'Content-Type': 'application/json'
					},
					data: {
						receiver_id: this.userId || this.messageId,
						content: newMessage.content
					},
					success: (res) => {
						uni.hideLoading();
						
						// 检查响应状态码（200或201都是成功）
						if (res.statusCode === 200 || res.statusCode === 201) {
							// 检查响应数据
							let result;
							try {
								// 尝试解析响应数据
								result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
								if (result && (result.code === 200 || result.code === 201 || result.success)) {
									uni.showToast({
										title: '发送成功',
										icon: 'success'
									});
									// 发送成功，不需要重新加载聊天记录，本地已经添加了新消息
									// this.loadChatHistory(); // 注释掉这行，避免覆盖本地消息
								} else {
									// API返回错误信息
									console.error('发送消息失败:', result.message || '未知错误');
									uni.showToast({
										title: result.message || '发送失败',
										icon: 'none'
									});
									// 如果发送失败，从聊天记录中移除刚才添加的本地消息
									this.chatMessages.pop();
									this.scrollToBottom();
								}
							} catch (parseError) {
								// 解析失败，可能是HTML格式的404响应
								console.error('API返回HTML响应，解析失败:', parseError);
								uni.showToast({
									title: '发送失败',
									icon: 'none'
								});
								// 如果发送失败，从聊天记录中移除刚才添加的本地消息
								this.chatMessages.pop();
								this.scrollToBottom();
							}
						} else {
							// HTTP状态码错误
							console.error('发送消息失败，状态码:', res.statusCode);
							uni.showToast({
								title: '发送失败',
								icon: 'none'
							});
							// 如果发送失败，从聊天记录中移除刚才添加的本地消息
							this.chatMessages.pop();
							this.scrollToBottom();
						}
					},
					fail: (err) => {
						// API调用失败
						console.error('发送消息API调用失败:', err);
						uni.hideLoading();
						uni.showToast({
							title: '发送失败，请检查网络连接',
							icon: 'none'
						});
						// 如果发送失败，从聊天记录中移除刚才添加的本地消息
						this.chatMessages.pop();
						this.scrollToBottom();
					}
				});
			},
			
			// 滚动到底部
			scrollToBottom() {
				setTimeout(() => {
					uni.createSelectorQuery().select('.chat-container').boundingClientRect((rect) => {
						if (rect) {
							this.scrollTop = rect.height;
						}
					}).exec();
				}, 100);
			},
			
			// 滚动事件处理
			onScroll(e) {
				this.scrollTop = e.detail.scrollTop;
			}
		}
};
</script>

<style lang="scss" scoped>
/* 页面根容器样式 */
.content {
	width: 100%;
	min-height: 100vh;
	background-color: var(--bg-light);
	display: flex;
	flex-direction: column;
}

/* 状态栏占位样式 */
.status-bar {
	background-color: var(--bg-color);
	width: 100%;
	position: fixed;
	top: 0;
	left: 0;
	z-index: 1000;
}

/* 导航栏样式 */
.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 44px;
	background-color: var(--bg-color);
	border-bottom: 1px solid var(--border-color);
	width: 100%;
	box-sizing: border-box;
	padding: 0 var(--spacing-lg);
	position: fixed;
	top: var(--status-bar-height, 0);
	z-index: 1000;
}

/* 返回按钮样式 */
.nav-back {
	width: 72upx;
	height: 72upx;
	display: flex;
	align-items: center;
	justify-content: center;
}

/* 返回图标样式 */
.back-icon {
	width: 48upx;
	height: 48upx;
}

/* 导航标题样式 */
.nav-title {
	font-size: var(--font-xl);
	font-weight: 600;
	color: var(--text-primary);
	text-align: center;
	flex: 1;
}

/* 占位元素样式，使标题居中 */
.nav-placeholder {
	width: 40px;
}

/* 内容滚动区域样式 */
.content-area {
	flex: 1;
	padding: var(--spacing-lg);
	width: 100%;
	box-sizing: border-box;
	margin-top: calc(44px + var(--status-bar-height, 0));
	margin-bottom: 56px;
	overflow-y: auto;
	background-color: var(--bg-light);
}

/* 对话容器样式 */
.chat-container {
	width: 100%;
	min-height: 300px;
}

/* 消息项样式 */
.message-item {
	display: flex;
	margin-bottom: var(--spacing-lg);
	align-items: flex-start;
	width: 100%;
}

/* 对方消息样式 */
.other-message {
	justify-content: flex-start;
	flex-direction: row;
}

/* 我的消息样式 */
.my-message {
	justify-content: flex-end;
	flex-direction: row-reverse;
}

/* 头像样式 */
.avatar {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	margin: 0 var(--spacing-sm);
	border: 1px solid var(--border-color);
	flex-shrink: 0;
}

/* 消息气泡样式 */
.message-bubble {
	max-width: 70%;
	padding: var(--spacing-sm) var(--spacing-lg);
	border-radius: 18px;
	position: relative;
	word-wrap: break-word;
	white-space: pre-wrap;
}

/* 对方消息气泡样式 */
.other-bubble {
	background-color: var(--bg-color);
	border-bottom-left-radius: 8px;
	box-shadow: var(--shadow-sm);
}

/* 我的消息气泡样式 */
.my-bubble {
	background-color: var(--primary-color);
	color: white;
	border-bottom-right-radius: 8px;
	box-shadow: var(--shadow-sm);
}

/* 发送者名称样式 */
.message-sender {
	font-size: var(--font-xs);
	font-weight: 600;
	margin-bottom: var(--spacing-xs);
	display: block;
}

/* 我的消息发送者名称样式 */
.my-bubble .message-sender {
	color: rgba(255, 255, 255, 0.8);
	text-align: right;
}

/* 对方消息发送者名称样式 */
.other-bubble .message-sender {
	color: var(--text-secondary);
	text-align: left;
}

/* 消息文本样式 */
.message-text {
	font-size: var(--font-base);
	line-height: 1.6;
	margin-bottom: var(--spacing-xs);
	display: block;
}

/* 我的消息文本样式 */
.my-bubble .message-text {
	color: white;
}

/* 对方消息文本样式 */
.other-bubble .message-text {
	color: var(--text-primary);
}

/* 消息时间样式 */
.message-time {
	font-size: 10px;
	margin-top: var(--spacing-xs);
	display: block;
	text-align: right;
}

/* 我的消息时间样式 */
.my-bubble .message-time {
	color: rgba(255, 255, 255, 0.7);
}

/* 对方消息时间样式 */
.other-bubble .message-time {
	color: var(--text-tertiary);
}

/* 空状态样式 */
.empty-state {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	padding: 100px 0;
	width: 100%;
}

/* 空状态文本样式 */
.empty-text {
	font-size: var(--font-lg);
	color: var(--text-tertiary);
	margin-bottom: var(--spacing-xl);
}

/* 返回按钮样式 */
.btn-back {
	background-color: var(--primary-color);
	color: white;
	height: 40px;
	width: 120px;
	border-radius: 20px;
	font-size: var(--font-base);
	font-weight: 500;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: background-color var(--transition-fast);
}

.btn-back:hover {
	background-color: var(--primary-dark);
}

/* 回复输入框容器样式 */
.reply-input-container {
	display: flex;
	background-color: var(--bg-color);
	border-top: 1px solid var(--border-color);
	padding: var(--spacing-sm) var(--spacing-lg);
	align-items: center;
	position: fixed;
	bottom: 0;
	left: 0;
	width: 100%;
	box-sizing: border-box;
	z-index: 1000;
}

/* 回复输入框样式 */
.reply-input {
	flex: 1;
	height: 36px;
	background-color: var(--bg-light);
	border-radius: 18px;
	padding: 0 var(--spacing-lg);
	margin-right: var(--spacing-sm);
	border: 1px solid var(--border-color);
	outline: none;
	font-size: var(--font-base);
	transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.reply-input:focus {
	border-color: var(--primary-color);
	box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
}

/* 发送按钮样式 */
.btn-send {
	height: 36px;
	background-color: var(--primary-color);
	color: white;
	border-radius: 18px;
	padding: 0 var(--spacing-xl);
	border: none;
	font-size: var(--font-base);
	font-weight: 500;
	cursor: pointer;
	transition: background-color var(--transition-fast);
}

.btn-send:hover {
	background-color: var(--primary-dark);
}

.btn-send:disabled {
	background-color: var(--text-tertiary);
	cursor: not-allowed;
}
</style>