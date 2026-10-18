<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 头部：只讲「我现在是哪一版」 -->
		<view class="hdr">
			<view class="nav">
				<view class="nav-back" @click="goBack">
					<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
				</view>
				<text class="nav-title">版本更新</text>
				<view class="nav-placeholder"></view>
			</view>
			<view class="hero">
				<text class="hero-lbl">{{ downloading ? '正在下载' : '当前版本' }}</text>
				<view class="hero-vrow">
					<text class="hero-ver">{{ downloading ? updateInfo.latestVersion : currentVersion }}</text>
					<text class="hero-chip" :class="{ 'chip-ok': status === 'latest' && !downloading }">{{ heroChip }}</text>
				</view>
				<text class="hero-meta">{{ heroMeta }}</text>
			</view>
			<view class="deco d1"></view>
			<view class="deco d2"></view>
		</view>

		<scroll-view class="body" scroll-y="true">
			<!-- 检查中 -->
			<view class="card" v-if="status === 'checking'">
				<view class="state">
					<view class="spin"></view>
					<text class="state-t">正在检查更新…</text>
				</view>
			</view>

			<!-- 检查失败 -->
			<view class="card" v-else-if="status === 'error'">
				<view class="state">
					<view class="dot dot-x">✕</view>
					<text class="state-t t-err">检查失败，可能是网络不通</text>
				</view>
				<view class="btn-line" @click="checkUpdate">重新检查</view>
			</view>

			<!-- 有新版本 -->
			<block v-else-if="status === 'available'">
				<view class="card">
					<view class="cmp">
						<view class="cmp-side">
							<text class="cmp-k">当前</text>
							<text class="cmp-n old">{{ currentVersion }}</text>
						</view>
						<text class="cmp-arw">›››</text>
						<view class="cmp-side">
							<text class="cmp-k">可更新</text>
							<text class="cmp-n new">{{ updateInfo.latestVersion }}</text>
						</view>
					</view>
					<view class="hr"></view>
					<view class="grid">
						<view class="g">
							<text class="g-k">更新类型</text>
							<text class="g-v">{{ isApk ? '完整安装包' : '热更新包' }}</text>
						</view>
						<view class="g">
							<text class="g-k">预计大小</text>
							<text class="g-v">{{ isApk ? '约 47 MB' : '约 0.5 MB' }}</text>
						</view>
						<view class="g">
							<text class="g-k">发布时间</text>
							<text class="g-v">{{ publishDate }}</text>
						</view>
					</view>
					<view class="lan-row">
						<view class="lan-dot" :class="{ 'lan-on': lanOk }"></view>
						<text class="lan-t">{{ lanOk
							? '已识别内网，从 ' + lanHost + ' 直连下载（更快、不走公网）'
							: '未连内网，走公网下载' }}</text>
					</view>
				</view>

				<view class="card">
					<view class="sec-h">
						<text class="sec-t">更新内容</text>
						<text class="sec-m">{{ items.length }} 项</text>
					</view>
					<view class="item" v-for="(it, i) in showItems" :key="i">
						<text class="tag" :class="'tag-' + it.cls">{{ it.tag }}</text>
						<text class="item-t">{{ it.text }}</text>
					</view>
					<view class="more" v-if="items.length > 3" @click="expanded = !expanded">
						{{ expanded ? '收起' : '展开全部 ' + items.length + ' 项' }}
					</view>
				</view>

				<view class="hint">
					<text class="hint-i">i</text>
					<text class="hint-t">{{ isApk
						? '本次含原生代码改动，需要安装完整包（支持断点续传）。装完请手动打开一次。'
						: '热更新包很小，下载完会自动安装并重启，不用你动手。' }}</text>
				</view>
			</block>

			<!-- 已是最新 -->
			<view class="card" v-else-if="status === 'latest'">
				<view class="state">
					<view class="dot dot-ok">✓</view>
					<text class="state-t t-ok">已是最新版本</text>
				</view>
				<text class="state-sub">上次检查 {{ lastCheck }} · 官方渠道</text>
				<view class="btn-line" @click="checkUpdate">重新检查</view>
			</view>

			<!-- 下载中 -->
			<view class="card" v-if="downloading">
				<view class="prog">
					<view class="ring" :style="ringStyle">
						<text class="pc">{{ downloadProgress }}<text class="pcu">%</text></text>
					</view>
					<view class="pinfo">
						<text class="p1">下载中 · {{ speedText }}</text>
						<text class="p2">{{ etaText }}</text>
						<view class="track">
							<view class="fill" :style="{ width: downloadProgress + '%' }"></view>
						</view>
						<text class="cancel" @click="cancelDownload">取消下载</text>
					</view>
				</view>
			</view>

			<!-- 版本历史 -->
			<view class="card">
				<view class="sec-h">
					<text class="sec-t">版本历史</text>
					<text class="sec-m">近 {{ history.length }} 个版本</text>
				</view>
				<view class="tl" v-if="history.length">
					<view class="tli" v-for="(h, i) in history" :key="i" :class="{ on: i === 0 }">
						<view class="tv">
							<text class="tv-n">v{{ h.version }}</text>
							<text class="tv-d">{{ formatDate(h.created_at) }}<text v-if="i === 0"> · 最新</text></text>
						</view>
						<text class="td">{{ h.description || '无说明' }}</text>
					</view>
				</view>
				<text class="empty" v-else>暂无更新记录</text>
			</view>

			<text class="foot-text">Simple V{{ currentVersion }}</text>
		</scroll-view>

		<!-- 底部操作区：只在「有新版本 / 下载中」出现 -->
		<view class="foot" v-if="status === 'available' || downloading">
			<!-- #ifdef MP-WEIXIN -->
			<text class="mp-tip">小程序由微信自动更新，无需手动安装</text>
			<text class="later" @click="goBack">知道了</text>
			<!-- #endif -->
			<!-- #ifndef MP-WEIXIN -->
			<button class="btn" v-if="!downloading" @click="startDownload(false)">立即更新</button>
			<button class="btn btn-dis" v-else>下载中，可继续使用 App</button>
			<text class="later" v-if="!downloading" @click="goBack">稍后再说</text>
			<!-- #endif -->
		</view>
	</view>
</template>

<script>
import apiConfig from '../../utils/api.js';
export default {
	data() {
		return {
			statusBarHeight: 0,
			status: 'checking',
			expanded: false,
			currentVersion: '1.0.0',
			/** 已装资源包版本（热更新），仅供展示，不参与版本比较 */
			wgtVersion: '',
			changelog: [],
			updateInfo: {
				latestVersion: '',
				downloadUrl: '',
				apkDownloadUrl: '',
				downloadUrlLan: '',
				description: ''
			},
			lastCheck: '刚刚',
			lanOk: false,
			lanBase: 'http://192.168.1.32',
			downloading: false,
			downloadProgress: 0,
			downloadSpeed: 0,
			downloadTotal: 0,
			downloadTask: null,
			_progressTimer: null,
			_lastTick: 0,
			_lastBytes: 0
		};
	},
	computed: {
		/** 完整的安装包 / 只有前端资源，决定文案和大小预估 */
		isApk() {
			var u = this.updateInfo.downloadUrl || this.updateInfo.apkDownloadUrl || '';
			return u.indexOf('.apk') > 0;
		},
		/** 只显示主机部分，别在手机上糊一长串 URL */
		lanHost() {
			return String(this.lanBase || '').replace(/^https?:\/\//, '');
		},
		/** 真正要下的地址：内网可达且后端给了内网地址就走内网 */
		dlUrl() {
			if (this.lanOk && this.updateInfo.downloadUrlLan) return this.updateInfo.downloadUrlLan;
			return this.updateInfo.downloadUrl;
		},
		/** 把 description 拆成分条：支持「【新增】…；【修复】…」，没标签就按关键词猜 */
		items() {
			var desc = String(this.updateInfo.description || '').trim();
			if (!desc) return [{ tag: '更新', cls: 'add', text: '新版本已准备就绪' }];
			return desc.split(/[；;\n]+/).map(function (s) {
				return s.trim();
			}).filter(Boolean).map(function (s) {
				var m = /^【(.+?)】\s*(.*)$/.exec(s);
				var tag = '', text = s;
				if (m) { tag = m[1]; text = m[2]; }
				if (!tag) {
					if (/修复|修掉|解决|崩溃|闪退/.test(s)) tag = '修复';
					else if (/优化|调整|提速|精简/.test(s)) tag = '优化';
					else tag = '新增';
				}
				var cls = tag.indexOf('修') >= 0 ? 'fix' : (tag.indexOf('优') >= 0 ? 'opt' : 'add');
				return { tag: tag, cls: cls, text: text };
			});
		},
		showItems() {
			return this.expanded ? this.items : this.items.slice(0, 3);
		},
		history() {
			return Array.isArray(this.changelog) ? this.changelog.slice(0, 3) : [];
		},
		publishDate() {
			if (!this.history.length || !this.history[0].created_at) return '—';
			return this.formatDate(this.history[0].created_at).slice(5);
		},
		heroChip() {
			if (this.downloading) return '下载中';
			if (this.status === 'available') return '有新版本';
			if (this.status === 'latest') return '已最新';
			if (this.status === 'error') return '检查失败';
			return '检查中';
		},
		heroMeta() {
			if (this.downloading) {
				return this.downloadTotal
					? '已下载 ' + this.sizeText(this.downloadTotal * this.downloadProgress / 100) + ' / ' + this.sizeText(this.downloadTotal)
					: '准备中…';
			}
			if (this.status === 'available') return '可更新到 ' + this.updateInfo.latestVersion + ' · 官方渠道';
			var meta = '安装版本 ' + this.currentVersion;
			if (this.wgtVersion && compareVersion(this.wgtVersion, this.currentVersion) > 0) {
				meta += ' · 资源包 ' + this.wgtVersion;
			}
			return meta + ' · 官方渠道';
		},
		speedText() {
			if (!this.downloadSpeed) return '连接中…';
			return this.sizeText(this.downloadSpeed) + '/s';
		},
		etaText() {
			if (!this.downloadTotal || !this.downloadSpeed) return '正在获取文件大小…';
			var left = (this.downloadTotal - this.downloadTotal * this.downloadProgress / 100) / this.downloadSpeed;
			if (left < 1) return '即将完成 · 断点续传已开启';
			if (left < 60) return '剩余约 ' + Math.round(left) + ' 秒 · 断点续传已开启';
			return '剩余约 ' + Math.round(left / 60) + ' 分钟 · 断点续传已开启';
		},
		ringStyle() {
			var p = Math.max(0, Math.min(100, this.downloadProgress));
			return 'background: conic-gradient(#3071f6 0% ' + p + '%, #eef1f6 ' + p + '% 100%);';
		}
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		// 「当前版本」= 安装包版本。热更新只改资源，不算版本升级，单独一行展示
		this.currentVersion = systemInfo.appVersion || '1.0.0';
		this.wgtVersion = uni.getStorageSync('wgtVersion') || '';
		this.probeLan();
		this.checkUpdate();
	},
	onUnload() {
		if (this.downloadTask) this.downloadTask.abort();
		if (this._progressTimer) clearInterval(this._progressTimer);
	},
	methods: {
		goBack() { uni.navigateBack(); },
		/**
		 * 探一下内网：/dl/ping.txt 是个 2 字节小文件，几百毫秒就能判断。
		 * 探不到就当不在家，走公网，不影响任何功能。
		 */
		probeLan() {
			var self = this;
			try {
				uni.request({
					url: this.lanBase + '/dl/ping.txt',
					method: 'GET',
					timeout: 1500,
					success: function (r) { self.lanOk = r.statusCode === 200; },
					fail: function () { self.lanOk = false; }
				});
			} catch (e) {
				this.lanOk = false;
			}
		},
		sizeText(bytes) {
			var n = Number(bytes) || 0;
			if (!n) return '—';
			if (n < 1024) return n + ' B';
			if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
			return (n / 1048576).toFixed(1) + ' MB';
		},
		stamp() {
			var d = new Date();
			var p = function (v) { return v < 10 ? '0' + v : '' + v; };
			return p(d.getHours()) + ':' + p(d.getMinutes());
		},
		async checkUpdate() {
			this.status = 'checking';
			try {
				var wgtVersion = uni.getStorageSync('wgtVersion') || '';
				// currentVersion 仅为兼容旧后端；新后端按 appVersion 判断全量包
				var ver = wgtVersion && compareVersion(wgtVersion, this.currentVersion) > 0
					? wgtVersion : this.currentVersion;
				const res = await uni.request({
					url: apiConfig.baseUrl + 'check_update.php',
					method: 'POST',
					data: { currentVersion: ver, appVersion: this.currentVersion, wgtVersion: wgtVersion },
					header: { 'Content-Type': 'application/json' }
				});
				if (res.statusCode === 200) {
					const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
					if (result && result.code === 200 && result.data && result.data.hasUpdate) {
						if (result.data.lanBase) this.lanBase = result.data.lanBase;
						var lanUrl = result.data.downloadUrlLan
							|| (result.data.hotUpdate && result.data.hotUpdate.downloadUrlLan) || '';
						this.updateInfo = {
							latestVersion: result.data.latestVersion,
							downloadUrl: result.data.downloadUrl,
							apkDownloadUrl: result.data.apkDownloadUrl || '',
							downloadUrlLan: lanUrl,
							description: result.data.description
						};
						this.status = 'available';
					} else {
						this.status = 'latest';
					}
					if (result && result.data && result.data.changelog) {
						this.changelog = result.data.changelog;
					}
				} else {
					this.status = 'error';
				}
			} catch (e) {
				this.status = 'error';
			}
			this.lastCheck = this.stamp();
		},
		startDownload(forcePublic) {
			if (!this.updateInfo.downloadUrl && !this.updateInfo.apkDownloadUrl) {
				uni.showToast({ title: '下载地址无效', icon: 'none' });
				return;
			}
			// #ifndef APP-PLUS
			uni.showModal({
				title: '小程序自动更新',
				content: '微信会在你下次打开小程序时自动加载最新版本，不需要手动下载安装。',
				showCancel: false
			});
			return;
			// #endif
			this.downloading = true;
			this.downloadProgress = 0;
			this.downloadSpeed = 0;
			this.downloadTotal = 0;
			this._lastTick = Date.now();
			this._lastBytes = 0;
			var url = (forcePublic === true) ? this.updateInfo.downloadUrl : this.dlUrl;
			var usingLan = !forcePublic && this.lanOk && !!this.updateInfo.downloadUrlLan && url === this.updateInfo.downloadUrlLan;
			var apkUrl = this.updateInfo.apkDownloadUrl;
			var latestVersion = this.updateInfo.latestVersion;
			if (typeof plus === 'undefined') return;
			var self = this;

			// 按文件类型分流：.apk → 全量包（系统安装器，不自动重启）；.wgt → 热更新
			var isWgt = url && url.indexOf('.wgt') > 0;
			var isApk = url && url.indexOf('.apk') > 0;
			if (isApk) {
				self._downloadAndInstallApk(url, usingLan);
				return;
			}

			// === WGT更新：下载 → 安装 → 重启 ===
			if (isWgt) {
				var dtask = plus.downloader.createDownload(url, { filename: '_doc/update/' }, function (d, status) {
					if (status === 200) {
						uni.showToast({ title: '正在安装…', icon: 'loading', duration: 5000 });
						plus.runtime.install(d.filename, { force: true }, function () {
							uni.hideToast();
							uni.setStorageSync('wgtVersion', latestVersion);
							uni.showToast({ title: '更新成功，即将重启', icon: 'none' });
							setTimeout(function () { plus.runtime.restart(); }, 1500);
						}, function (e) {
							uni.hideToast();
							// WGT安装失败 → 降级到APK下载安装
							if (apkUrl && apkUrl.indexOf('.apk') > 0) {
								self._downloadAndInstallApk(apkUrl, false);
							} else {
								uni.showToast({ title: '安装失败: ' + ((e && e.message) || ''), icon: 'none' });
								self.downloading = false;
							}
						});
					} else if (usingLan) {
						// 内网下载失败（换了 WiFi / 家里没开机）→ 自动改走公网再来一次
						uni.showToast({ title: '内网下载失败，改走公网', icon: 'none' });
						self.startDownload(true);
					} else if (apkUrl && apkUrl.indexOf('.apk') > 0) {
						// WGT下载失败 → 降级到APK下载安装
						self._downloadAndInstallApk(apkUrl, false);
					} else {
						uni.showToast({ title: '下载失败', icon: 'none' });
						self.downloading = false;
					}
				});
				self.downloadTask = dtask;
				self._bindProgress(dtask);
				dtask.start();
				return;
			}

			// === APK更新：下载 → 安装 ===
			if (apkUrl && apkUrl.indexOf('.apk') > 0) {
				self._downloadAndInstallApk(apkUrl, false);
			}
		},
		// #ifdef APP-PLUS
		/** 进度 / 速度 / 总大小：statechanged 是唯一数据源 */
		_bindProgress(task) {
			var self = this;
			task.addEventListener('statechanged', function (t) {
				if (t.totalSize > 0) self.downloadTotal = t.totalSize;
				if (t.state === 3 && t.totalSize > 0) {
					self.downloadProgress = Math.min(100, parseInt(t.downloadedSize / t.totalSize * 100));
					var now = Date.now();
					var dt = (now - self._lastTick) / 1000;
					if (dt >= 0.4) {
						var db = t.downloadedSize - self._lastBytes;
						if (db >= 0) self.downloadSpeed = db / dt;
						self._lastTick = now;
						self._lastBytes = t.downloadedSize;
					}
				}
				if (t.state === 4) self.downloadTask = null;
			});
		},
		_downloadAndInstallApk(apkUrl, isLan) {
			var self = this;
			var dtask = plus.downloader.createDownload(apkUrl, { filename: '_doc/update/' }, function (d, status) {
				if (status === 200) {
					// 转成绝对本地路径（_doc/ 前缀的路径部分设备 install 无法识别）
					var localPath = d.filename;
					try { localPath = plus.io.convertLocalFileSystemURL(d.filename); } catch (e) {}
					self.downloadProgress = 100;
					uni.showToast({ title: '下载完成，正在安装…', icon: 'none', duration: 3000 });
					// 拉起系统安装器（HBuilder 内部 FileProvider，Android 7+ 兼容）
					plus.runtime.install(localPath, {}, function () {
						uni.showToast({ title: '安装成功', icon: 'none' });
						self.downloading = false;
					}, function () {
						// install 失败 → 用 FileProvider 显式调起系统安装器（Android 7.0+ 禁止 file:// 直开）
						try {
							var main = plus.android.runtimeMainActivity();
							var Intent = plus.android.importClass('android.content.Intent');
							var File = plus.android.importClass('java.io.File');
							var Uri = plus.android.importClass('android.net.Uri');
							// Android 8.0+ 未开启"安装未知应用"权限时安装器不会弹出 → 引导去设置
							try {
								if (plus.os.name === 'Android' && !main.getPackageManager().canRequestPackageInstalls()) {
									var permIntent = new Intent('android.settings.MANAGE_UNKNOWN_APP_SOURCES', Uri.parse('package:' + main.getPackageName()));
									permIntent.addFlags(0x01000000);
									main.startActivity(permIntent);
									uni.showToast({ title: '请开启"允许安装未知应用"后重试', icon: 'none', duration: 3000 });
									self.downloading = false;
									return;
								}
							} catch (permErr) {}
							var uri = null;
							try {
								var FileProvider = plus.android.importClass('androidx.core.content.FileProvider');
								uri = FileProvider.getUriForFile(main, main.getPackageName() + '.dc.fileprovider', new File(localPath));
							} catch (fpErr) {
								try {
									var SupportFP = plus.android.importClass('android.support.v4.content.FileProvider');
									uri = SupportFP.getUriForFile(main, main.getPackageName() + '.dc.fileprovider', new File(localPath));
								} catch (fpErr2) {
									uri = Uri.fromFile(new File(localPath));
								}
							}
							var intent = new Intent('android.intent.action.VIEW');
							intent.setDataAndType(uri, 'application/vnd.android.package-archive');
							intent.addFlags(0x00000001);
							intent.addFlags(0x01000000);
							main.startActivity(intent);
							uni.showToast({ title: '请在弹出的安装器中完成安装', icon: 'none' });
						} catch (e2) {
							plus.runtime.openURL(apkUrl);
							uni.showToast({ title: '未弹出安装器，已打开下载链接', icon: 'none' });
						}
						self.downloading = false;
					});
				} else if (isLan) {
					// 内网拉不动就退回公网，别让用户卡在「下载失败」
					uni.showToast({ title: '内网下载失败，改走公网', icon: 'none' });
					self.startDownload(true);
				} else {
					uni.showToast({ title: '下载失败，请稍后重试', icon: 'none' });
					self.downloading = false;
				}
			});
			self.downloadTask = dtask;
			self._bindProgress(dtask);
			dtask.start();
		},
		// #endif
		cancelDownload() {
			if (this.downloadTask) {
				this.downloadTask.abort();
				this.downloadTask = null;
			}
			if (this._progressTimer) {
				clearInterval(this._progressTimer);
				this._progressTimer = null;
			}
			this.downloading = false;
			this.downloadProgress = 0;
			this.downloadSpeed = 0;
			this.downloadTotal = 0;
		},
		formatDate(dateStr) {
			if (!dateStr) return '';
			return String(dateStr).substring(0, 10);
		}
	}
}

function compareVersion(v1, v2) {
	var a1 = String(v1 || '').split('.').map(Number);
	var a2 = String(v2 || '').split('.').map(Number);
	for (var i = 0; i < Math.max(a1.length, a2.length); i++) {
		var n1 = a1[i] || 0;
		var n2 = a2[i] || 0;
		if (n1 > n2) return 1;
		if (n1 < n2) return -1;
	}
	return 0;
}
</script>

<style>
.content { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: #ffffff; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #1b44a6; flex-shrink: 0; }

/* ---------- 头部 ---------- */
.hdr { position: relative; background: linear-gradient(160deg, #1b44a6 0%, #2a5cc4 100%); border-radius: 0 0 44upx 44upx; padding-bottom: 76upx; overflow: hidden; flex-shrink: 0; }
.nav { display: flex; align-items: center; justify-content: space-between; padding: 12upx 24upx 0; position: relative; z-index: 2; height: 72upx; }
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { font-size: 26upx; font-weight: 600; color: #ffffff; letter-spacing: 1upx; }
.nav-placeholder { width: 72upx; }
.hero { position: relative; z-index: 2; padding: 16upx 34upx 0; }
.hero-lbl { font-size: 21upx; color: rgba(255,255,255,0.62); letter-spacing: 1upx; }
.hero-vrow { display: flex; align-items: flex-end; margin-top: 6upx; }
.hero-ver { font-size: 62upx; font-weight: 700; color: #ffffff; line-height: 1; letter-spacing: 1upx; }
.hero-chip { margin-left: 16upx; margin-bottom: 6upx; padding: 5upx 14upx; border-radius: 10upx; font-size: 19upx; color: #ffffff; background: rgba(255,255,255,0.18); border: 1upx solid rgba(255,255,255,0.24); }
.chip-ok { background: rgba(16,185,129,0.22); border-color: rgba(16,185,129,0.5); }
.hero-meta { display: block; margin-top: 14upx; font-size: 21upx; color: rgba(255,255,255,0.6); }
.deco { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.07); z-index: 1; }
.d1 { width: 380upx; height: 380upx; top: -144upx; right: -128upx; }
.d2 { width: 220upx; height: 220upx; bottom: -112upx; left: -92upx; background: rgba(255,255,255,0.05); }

/* ---------- 主体 ---------- */
.body { flex: 1; min-height: 0; background: #f5f7fb; padding: 0 28upx; margin-top: -52upx; box-sizing: border-box; position: relative; z-index: 3; }
.card { background: #ffffff; border-radius: 28upx; padding: 28upx 26upx 30upx; margin-bottom: 22upx; box-shadow: 0 8upx 32upx rgba(23,38,74,0.09); }

/* 版本对比 */
.cmp { display: flex; align-items: center; justify-content: space-between; }
.cmp-side { flex: 1; display: flex; flex-direction: column; align-items: center; }
.cmp-k { font-size: 19upx; color: #9ca3af; }
.cmp-n { font-size: 34upx; font-weight: 700; margin-top: 6upx; }
.cmp-n.old { color: #9aa1ac; }
.cmp-n.new { color: #3071f6; }
.cmp-arw { font-size: 26upx; color: #c8ced8; padding: 0 8upx; margin-top: 20upx; letter-spacing: 2upx; }
.hr { height: 1upx; background: #edf0f4; margin: 24upx 0 22upx; }
.grid { display: flex; }
.g { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
.g + .g:before { content: ""; position: absolute; left: 0; top: 6upx; bottom: 6upx; width: 1upx; background: #edf0f4; }
.g-k { font-size: 19upx; color: #9ca3af; }
.g-v { font-size: 23upx; font-weight: 600; color: #374151; margin-top: 6upx; }
.lan-row { display: flex; align-items: center; margin-top: 22upx; padding-top: 20upx; border-top: 1upx solid #edf0f4; }
.lan-dot { width: 12upx; height: 12upx; border-radius: 50%; background: #c8ced8; margin-right: 12upx; flex-shrink: 0; }
.lan-on { background: #10b981; }
.lan-t { flex: 1; font-size: 20upx; line-height: 1.5; color: #6b7280; }

/* 更新内容 */
.sec-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10upx; }
.sec-t { font-size: 25upx; font-weight: 700; color: #0f172a; letter-spacing: 1upx; }
.sec-m { font-size: 20upx; color: #9ca3af; }
.item { display: flex; align-items: flex-start; padding: 10upx 0; }
.tag { flex-shrink: 0; font-size: 19upx; font-weight: 700; line-height: 1.6; padding: 3upx 12upx; border-radius: 10upx; margin-right: 14upx; }
.tag-add { color: #1d4ed8; background: #e8efff; }
.tag-fix { color: #b45309; background: #fef3c7; }
.tag-opt { color: #0f766e; background: #dcfce7; }
.item-t { flex: 1; font-size: 23upx; line-height: 1.62; color: #3f4756; }
.more { display: flex; align-items: center; justify-content: center; font-size: 21upx; color: #3071f6; padding-top: 16upx; margin-top: 8upx; border-top: 1upx dashed #edf0f4; }

/* 说明条 */
.hint { display: flex; align-items: flex-start; background: #f3f7ff; border: 1upx solid #e2ebff; border-radius: 22upx; padding: 18upx 22upx; margin-bottom: 22upx; }
.hint-i { flex-shrink: 0; width: 26upx; height: 26upx; line-height: 26upx; text-align: center; border-radius: 50%; background: #3071f6; color: #ffffff; font-size: 17upx; font-weight: 700; margin-right: 14upx; margin-top: 2upx; }
.hint-t { flex: 1; font-size: 20upx; line-height: 1.6; color: #4c5a75; }

/* 状态卡 */
.state { display: flex; align-items: center; }
.state-t { font-size: 27upx; color: #303132; font-weight: 600; margin-left: 16upx; }
.t-ok { color: #10b981; }
.t-err { color: #ef4444; }
.state-sub { display: block; font-size: 21upx; color: #9ca3af; margin: 14upx 0 0 62upx; }
.dot { width: 46upx; height: 46upx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22upx; font-weight: 700; flex-shrink: 0; }
.dot-ok { background: #ecfdf5; color: #10b981; }
.dot-x { background: #fef2f2; color: #ef4444; }
.spin { width: 36upx; height: 36upx; border: 3upx solid #e5e7eb; border-top-color: #3071f6; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
.btn-line { margin-top: 22upx; height: 68upx; line-height: 68upx; text-align: center; border-radius: 18upx; background: #f1f5fb; color: #3071f6; font-size: 24upx; font-weight: 600; }

/* 下载进度 */
.prog { display: flex; align-items: center; }
.ring { position: relative; width: 148upx; height: 148upx; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.ring:before { content: ""; position: absolute; width: 122upx; height: 122upx; border-radius: 50%; background: #ffffff; }
.pc { position: relative; z-index: 2; font-size: 34upx; font-weight: 700; color: #3071f6; }
.pcu { font-size: 19upx; color: #9ca3af; font-weight: 600; }
.pinfo { flex: 1; margin-left: 26upx; }
.p1 { display: block; font-size: 25upx; font-weight: 600; color: #0f172a; }
.p2 { display: block; font-size: 21upx; color: #6b7280; margin: 6upx 0 14upx; }
.track { height: 12upx; background: #eef1f6; border-radius: 6upx; overflow: hidden; }
.fill { height: 100%; border-radius: 6upx; background: linear-gradient(90deg, #3071f6, #5b93ff); transition: width 0.3s ease; }
.cancel { display: block; text-align: right; font-size: 20upx; color: #9ca3af; text-decoration: underline; margin-top: 14upx; }

/* 版本历史时间线 */
.tl { position: relative; padding-left: 30upx; }
.tl:before { content: ""; position: absolute; left: 7upx; top: 10upx; bottom: 12upx; width: 1upx; background: #edf0f4; }
.tli { position: relative; padding-bottom: 24upx; }
.tli:last-child { padding-bottom: 0; }
.tli:before { content: ""; position: absolute; left: -30upx; top: 8upx; width: 15upx; height: 15upx; border-radius: 50%; background: #ffffff; border: 3upx solid #cdd6e6; box-sizing: border-box; }
.tli.on:before { border-color: #3071f6; background: #3071f6; }
.tv { display: flex; align-items: baseline; }
.tv-n { font-size: 23upx; font-weight: 700; color: #0f172a; }
.tv-d { font-size: 19upx; color: #9ca3af; margin-left: 12upx; }
.td { display: block; font-size: 21upx; color: #6b7280; line-height: 1.55; margin-top: 6upx; }
.empty { display: block; text-align: center; font-size: 21upx; color: #c0c4cc; padding: 24upx 0; }

.foot-text { display: block; text-align: center; font-size: 20upx; color: #c0c4cc; padding: 20upx 0 44upx; }

/* ---------- 底部按钮 ---------- */
.foot { padding: 14upx 28upx 30upx; background: #f5f7fb; flex-shrink: 0; }
.btn { width: 100%; height: 88upx; line-height: 88upx; border-radius: 24upx; border: none; background: #3071f6; color: #ffffff; font-size: 27upx; font-weight: 600; letter-spacing: 1upx; box-shadow: 0 14upx 30upx rgba(48,113,246,0.28); }
.btn:active { background: #285ed4; }
.btn-dis { background: #e6ebf3; color: #9aa1ac; box-shadow: none; }
.later { display: block; text-align: center; font-size: 21upx; color: #9aa1ac; margin-top: 18upx; }
.mp-tip { display: block; text-align: center; font-size: 22upx; line-height: 1.7; color: #6b7280; padding: 8upx 0; }
::-webkit-scrollbar { width: 0; height: 0; display: none; }
</style>
