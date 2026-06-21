<template>

	<view class="content">

		<NavBar title="公告详情" />



		<scroll-view class="body" scroll-y="true" v-if="announcement" show-scrollbar="false">

			<!-- 头部 -->

			<view class="detail-header">

				<view class="header-avatar">

					<text class="avatar-text">{{ announcement.title.charAt(0) }}</text>

				</view>

				<view class="header-info">

					<text class="header-name">系统公告</text>

					<text class="header-time">{{ formatDateTime(announcement.created_at) }}</text>

				</view>

			</view>



			<!-- 内容 -->

			<view class="detail-body">

				<text class="detail-title">{{ announcement.title }}</text>

				<view class="detail-content">

					<text>{{ announcement.content }}</text>

				</view>

			</view>

		</scroll-view>



		<view class="empty-state" v-else>

			<text>加载中...</text>

		</view>

	</view>

</template>



<script>

import NavBar from '../../components/nav-bar.vue';

import apiConfig from '../../utils/api.js';

export default {

	components: { NavBar },

	data() {

		return { announcement: null, id: null }

	},

	onLoad(options) {

		this.id = options.id;

		if (this.id) this.loadDetail();

	},

	methods: {

		async loadDetail() {

			try {

				const res = await uni.request({

					url: apiConfig.baseUrl + apiConfig.endpoints.announcements,

					method: 'POST',

					data: { action: 'get_announcements' },

					header: { 'Content-Type': 'application/json' }

				});

				const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;

				if (result.code === 200 && result.data) {

					this.announcement = result.data.find(item => item.id == this.id);

				}

			} catch(e) { console.error(e); }

		},

		formatDateTime(t) {

			if (!t) return '';

			return t.substr(0, 16).replace('T', ' ');

		}

	}

}

</script>



<style>

.content { height: 100vh; background: #f8f9fb; display: flex; flex-direction: column; overflow: hidden; }















.body { flex: 1; min-height: 0; padding: 24upx; }



.detail-header {

	display: flex;

	align-items: center;

	padding: 24upx;

	background: #ffffff;

	border-radius: 16upx;

	margin-bottom: 20upx;

	box-shadow: 0 2upx 12upx rgba(0,0,0,0.04);

}

.header-avatar {

	width: 80upx; height: 80upx;

	border-radius: 50%;

	background: linear-gradient(135deg, #1b44a6, #3071f6);

	display: flex; align-items: center; justify-content: center;

	margin-right: 20upx; flex-shrink: 0;

}

.avatar-text { font-size: 32upx; font-weight: 700; color: #ffffff; }

.header-info { flex: 1; }

.header-name { display: block; font-size: 28upx; font-weight: 600; color: #303132; margin-bottom: 4upx; }

.header-time { display: block; font-size: 22upx; color: #909398; }



.detail-body {

	background: #ffffff;

	border-radius: 16upx;

	padding: 32upx 28upx;

	box-shadow: 0 2upx 12upx rgba(0,0,0,0.04);

}

.detail-title { display: block; font-size: 36upx; font-weight: 700; color: #303132; margin-bottom: 20upx; line-height: 1.4; }

.detail-content { font-size: 28upx; color: #4b5563; line-height: 1.8; }



.empty-state { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 26upx; color: #909398; }

</style>


