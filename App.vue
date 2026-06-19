<template>
	<view class="app-container">
		<slot />
	</view>
</template>

<script>
/**
 * 应用入口组件
 * 整个应用的根组件，负责管理应用的生命周期和全局配置
 */
export default {
	/**
	 * 应用启动时触发
	 * 可以在这里添加初始化逻辑，如：
	 * - 检查更新
	 * - 初始化用户状态
	 * - 加载全局配置
	 */
	onLaunch: function() {
		// 应用启动时可以添加一些初始化逻辑
	},
	
	/**
	 * 应用显示时触发
	 * 当应用从后台切换到前台时调用
	 * 可以在这里添加显示时的逻辑，如：
	 * - 刷新数据
	 * - 恢复用户会话
	 */
	onShow: function() {
		// 应用显示时的逻辑
	},
	
	/**
	 * 应用隐藏时触发
	 * 当应用从前台切换到后台时调用
	 * 可以在这里添加隐藏时的逻辑，如：
	 * - 暂停后台任务
	 * - 保存应用状态
	 */
	onHide: function() {
		// 应用隐藏时的逻辑
	}
};
</script>

<style>
/* 引入全局CSS文件 */
@import "./static/css/global.css";

/* 应用容器样式 */
.app-container {
	width: 100%;
	height: 100vh;
	background-color: var(--bg-light);
}

/* 解决一些机型上的滚动问题 */
page {
	width: 100%;
	height: 100%;
}
</style>
