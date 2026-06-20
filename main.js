/**
 * 应用入口文件
 * 负责初始化Vue应用并挂载到DOM上
 */

// 导入根组件
import App from './App.vue'

// Vue 2 版本初始化

// Vue 3 版本初始化
// #ifdef VUE3
import {
	createSSRApp
} from 'vue'
import store from './store' // 导入状态管理

/**
 * 创建Vue 3应用实例
 * @returns {Object} 包含app实例的对象
 */
export function createApp() {
	// 创建SSR应用
	const app = createSSRApp(App)
	// 使用状态管理
	app.use(store)
	return {
		app
	}
}
// #endif
