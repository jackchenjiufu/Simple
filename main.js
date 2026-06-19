/**
 * 应用入口文件
 * 负责初始化Vue应用并挂载到DOM上
 */

// 导入根组件
import App from './App.vue'

// Vue 2 版本初始化
// #ifndef VUE3
import Vue from 'vue'
import store from './store' // 导入状态管理

// 关闭生产环境提示
Vue.config.productionTip = false

// 设置应用类型
App.mpType = 'app'

// 创建Vue实例
const app = new Vue({
	...App,  // 扩展App组件
	store     // 注入状态管理
})

// 挂载应用
app.$mount()
// #endif

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
