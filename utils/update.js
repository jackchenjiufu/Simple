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

/** 当前实际运行版本：热更新装过就用 wgtVersion，否则用 APK 版本 */
export function currentVersion() {
	const stored = uni.getStorageSync('wgtVersion') || ''
	if (stored) return stored
	try {
		const sys = uni.getSystemInfoSync()
		return sys.appVersion || '1.0.0'
	} catch (e) {
		return '1.0.0'
	}
}

/**
 * 拉取更新信息（带缓存，同一次运行同版本只请求一次）
 * @param {boolean} force 忽略缓存重新请求
 * @returns {Promise<object|null>} check_update.php 的 data 字段
 */
export function fetchUpdateInfo(force) {
	const cur = currentVersion()
	if (!force && _data && _forVer === cur) return Promise.resolve(_data)
	if (!force && _promise && _forVer === cur) return _promise
	_forVer = cur
	_promise = new Promise(function(resolve) {
		uni.request({
			url: apiConfig.baseUrl + 'check_update.php',
			method: 'POST',
			data: { currentVersion: cur },
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
