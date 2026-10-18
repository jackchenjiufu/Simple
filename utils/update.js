/**
 * 版本更新：请求、版本判定、更新说明拆分
 * App.vue（静默热更新）与 components/update-sheet（更新提示抽屉）共用，
 * 保证一次启动只打一次 check_update.php。
 */
import apiConfig from './api.js'

let _promise = null
let _data = null
let _forVer = ''
/** 本次运行内已点「稍后再说」的版本号 */
const _dismissed = {}

/**
 * 当前运行版本（用于展示）：装过热更新就显示资源包版本，否则显示安装包版本。
 * 注意：**不能用它判断要不要装全量包** —— 热更新过的设备这里会比安装包版本高，
 * 用它判断会让这些设备永远收不到 APK。判断全量包请用 apkVersion()。
 */
export function currentVersion() {
	const stored = uni.getStorageSync('wgtVersion') || ''
	if (stored) return stored
	return apkVersion()
}

/** 安装包（APK）版本：来自 manifest 的 versionName，热更新不改变它 */
export function apkVersion() {
	try {
		const sys = uni.getSystemInfoSync()
		return sys.appVersion || '1.0.0'
	} catch (e) {
		return '1.0.0'
	}
}

/** 已安装的热更新资源包版本，没装过返回空串 */
export function wgtVersion() {
	return uni.getStorageSync('wgtVersion') || ''
}

/**
 * 拉取更新信息（带缓存，同一次运行同版本只请求一次）
 * 同时上报两个版本号：服务端用 appVersion 判断要不要推全量包，
 * 用 wgtVersion 判断资源包是否已是最新，两者互不干扰。
 * @param {boolean} force 忽略缓存重新请求
 * @returns {Promise<object|null>} check_update.php 的 data 字段
 */
export function fetchUpdateInfo(force) {
	const cur = currentVersion()
	const apk = apkVersion()
	const wgt = wgtVersion()
	if (!force && _data && _forVer === cur) return Promise.resolve(_data)
	if (!force && _promise && _forVer === cur) return _promise
	_forVer = cur
	_promise = new Promise(function(resolve) {
		uni.request({
			url: apiConfig.baseUrl + 'check_update.php',
			method: 'POST',
			data: { currentVersion: cur, appVersion: apk, wgtVersion: wgt },
			success: function(res) {
				try {
					const r = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
					_data = (r && r.code === 200 && r.data) ? r.data : null
				} catch (e) {
					_data = null
				}
				resolve(_data)
			},
			fail: function() {
				_data = null
				resolve(null)
			}
		})
	})
	return _promise
}

/** 把后端一整段更新说明拆成条目（支持换行/分号/长句句号） */
export function splitUpdateDesc(desc) {
	const raw = String(desc || '').replace(/\r/g, '').trim()
	if (!raw) return ['新版本已准备就绪']
	const parts = raw.split(/[\n；;]+/)
	let out = []
	for (let i = 0; i < parts.length; i++) {
		const t = parts[i].trim().replace(/^[、,，.。\s]+/, '')
		if (t) out.push(t)
	}
	if (out.length === 1 && out[0].length > 40) {
		const seg = out[0].split(/。\s*/)
		const tmp = []
		for (let j = 0; j < seg.length; j++) {
			const s = seg[j].trim()
			if (s) tmp.push(s)
		}
		if (tmp.length > 1) out = tmp
	}
	return out.slice(0, 6)
}

export function dismissVersion(ver) {
	if (ver) _dismissed[String(ver)] = true
}

export function isDismissed(ver) {
	return !!_dismissed[String(ver || '')]
}
