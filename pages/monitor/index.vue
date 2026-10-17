<template>
  <view
    class="page"
    :style="{ paddingTop: (statusBar + headH + headGap) + 'px' }"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <!-- 状态栏遮罩：固定在 0~statusBar 之间，避免内容上滑钻进系统状态栏 -->
    <view class="sb-mask" :style="{ height: statusBar + 'px' }"></view>

    <!-- 顶部导航：与首页 nav-bar 同一套样式（白底 / 88rpx / 文字页签 + 下划线） -->
    <view class="hd" :style="{ top: statusBar + 'px' }">
      <view
        class="nav-item"
        :class="{ active: tab === 'overview' }"
        @tap="switchTab('overview')"
      >
        <text class="nav-label">总览</text>
        <view class="nav-indicator" v-if="tab === 'overview'"></view>
      </view>
      <view
        class="nav-item"
        :class="{ active: tab === 'alerts' }"
        @tap="switchTab('alerts')"
      >
        <text class="nav-label">告警</text>
        <view class="nav-badge" v-if="todayPending > 0">{{ todayPending }}</view>
        <view class="nav-indicator" v-if="tab === 'alerts'"></view>
      </view>
      <view
        class="nav-item"
        :class="{ active: tab === 'dashboard' }"
        @tap="switchTab('dashboard')"
      >
        <text class="nav-label">仪表板</text>
        <view class="nav-indicator" v-if="tab === 'dashboard'"></view>
      </view>
      <view
        class="nav-item"
        :class="{ active: tab === 'video' }"
        @tap="switchTab('video')"
      >
        <text class="nav-label">视频</text>
        <view class="nav-indicator" v-if="tab === 'video'"></view>
      </view>
      <view class="hd-right" hover-class="hd-right-hv" :hover-stay-time="60" @tap="onProbe">
        <text class="probe-t" :class="{ 'probe-t-on': probing }">{{ probing ? '检测中' : lastAutoText }}</text>
      </view>
    </view>

    <!-- 加载中 -->
    <block v-if="loading && tab === 'overview'">
      <view class="card dark sk-dark">
        <view class="sk-b sk-h1"></view>
        <view class="sk-b sk-h2"></view>
      </view>
      <view class="card">
        <view v-for="n in 4" :key="n" class="sk-row">
          <view class="sk-b sk-badge"></view>
          <view class="sk-mid">
            <view class="sk-b sk-m1"></view>
            <view class="sk-b sk-m2"></view>
          </view>
          <view class="sk-b sk-right"></view>
        </view>
      </view>
    </block>

    <!-- 失败 -->
    <view v-else-if="error && tab === 'overview'" class="card err">
      <text class="err-t">加载失败</text>
      <text class="err-m">{{ error }}</text>
      <view class="retry" hover-class="retry-hover" @tap="reload">
        <text class="retry-t">重试</text>
      </view>
    </view>

    <!-- 总览 -->
    <block v-else-if="tab === 'overview'">
      <!-- 深色汇总卡 -->
      <view class="card dark">
        <view class="d-main">
          <text class="d-num">{{ online }}/{{ total }}</text>
          <text class="d-lb">服务在线</text>
        </view>
        <text class="d-sub">最后检查 {{ lastCheckText }} · {{ dateText }}</text>
      </view>

      <!-- 今日告警 -->
      <text class="sec-t">今日告警</text>
      <view class="card stats">
        <view class="stat">
          <text class="stat-n">{{ todayTotal }}</text>
          <text class="stat-l">命中</text>
        </view>
        <view class="stat stat-line">
          <text class="stat-n">{{ todayHuman }}</text>
          <text class="stat-l">真人</text>
        </view>
        <view class="stat stat-line">
          <text class="stat-n">{{ todayPending }}</text>
          <text class="stat-l">待裁决</text>
        </view>
        <view class="stat stat-line">
          <text class="stat-n">{{ todayFiltered }}</text>
          <text class="stat-l">已过滤</text>
        </view>
      </view>

      <!-- 入口：推送设置 -->
      <view class="card nav">
        <view class="nav-row" hover-class="nav-hv" :hover-stay-time="60" @tap="goPush">
          <text class="nav-t">告警推送设置</text>
          <text class="nav-a">›</text>
        </view>
      </view>

      <!-- 服务分组 -->
      <text v-if="list.length" class="sec-t">服务状态</text>

      <view v-if="!list.length" class="card empty">
        <text class="empty-t">暂无服务</text>
        <text class="empty-s">下拉刷新或稍后再试</text>
      </view>

      <view v-for="g in groups" :key="g.key" class="card grp">
        <view class="grp-hd">
          <text class="grp-t">{{ g.title }}</text>
          <text class="grp-c">{{ g.online }} / {{ g.total }}</text>
        </view>
        <view
          v-for="(s, idx) in g.rows"
          :key="s.id || s.skey || idx"
          class="row"
          :class="{ 'row-line': idx < g.rows.length - 1 }"
          hover-class="row-hv"
          :hover-stay-time="60"
          @tap="openService(s)"
        >
          <view class="badge">
            <text class="badge-t">{{ badgeOf(s) }}</text>
          </view>
          <view class="row-mid">
            <text class="row-name">{{ s.name || s.skey }}</text>
            <text class="row-sub">{{ subOf(s) }}</text>
          </view>
          <text class="row-st" :class="isOk(s) ? 'row-st-ok' : 'row-st-off'">{{ statusOf(s) }}</text>
          <text class="row-arrow">›</text>
        </view>
      </view>
    </block>

    <!-- 告警（同页第二个页签）：直接铺开全量内容，不跳独立的告警页 -->
    <block v-else-if="tab === 'alerts'">
      <AlertsPanel ref="alertsPanel" />

      <view class="card nav">
        <view class="nav-row" hover-class="nav-hv" :hover-stay-time="60" @tap="goPush">
          <text class="nav-t">告警推送设置</text>
          <text class="nav-a">›</text>
        </view>
      </view>
    </block>

    <!-- 仪表板：数据取自 Grafana / Prometheus（后端代理，App 不持有 Grafana 凭证） -->
    <block v-else-if="tab === 'dashboard'">
      <view v-if="dashLoading" class="card empty">
        <text class="empty-t">正在读取 Grafana</text>
      </view>

      <view v-else-if="dashError" class="card err">
        <text class="err-t">加载失败</text>
        <text class="err-m">{{ dashError }}</text>
        <view class="retry" hover-class="retry-hover" @tap="loadDashboard">
          <text class="retry-t">重试</text>
        </view>
      </view>

      <block v-else>
        <view class="dash-tip">
          <text class="dash-tip-t">数据来自 Grafana · Prometheus</text>
          <text class="dash-tip-t">{{ dashTimeText }}</text>
        </view>

        <!-- 三台设备：点卡片看网口 / 端口 / 日志 -->
        <view
          v-for="h in dashHosts"
          :key="h.host"
          class="card host host-tap"
          hover-class="host-hv"
          :hover-stay-time="60"
          @tap="openHost(h)"
        >
          <view class="host-hd">
            <view class="host-l">
              <view class="dot" :class="h.up ? 'dot-on' : 'dot-off'"></view>
              <text class="host-name">{{ h.host }}</text>
            </view>
            <view class="host-r">
              <text class="host-meta" :class="h.up ? 'meta-on' : 'meta-off'">
                {{ h.up ? '在线' : '离线' }}<text v-if="h.uptime_days !== null"> · 已跑 {{ h.uptime_days }} 天</text>
              </text>
              <text class="host-more">详情 ›</text>
            </view>
          </view>

          <view class="host-metrics">
            <view class="hm">
              <view class="hm-top">
                <text class="hm-l">CPU</text>
                <text class="hm-v">{{ pct(h.cpu) }}</text>
              </view>
              <view class="bar"><view class="bar-in" :class="lvl(h.cpu)" :style="{ width: barW(h.cpu) }"></view></view>
            </view>
            <view class="hm">
              <view class="hm-top">
                <text class="hm-l">内存</text>
                <text class="hm-v">{{ pct(h.mem) }}</text>
              </view>
              <view class="bar"><view class="bar-in" :class="lvl(h.mem)" :style="{ width: barW(h.mem) }"></view></view>
            </view>
            <view class="hm">
              <view class="hm-top">
                <text class="hm-l">磁盘</text>
                <text class="hm-v">{{ pct(h.disk_max) }}</text>
              </view>
              <view class="bar"><view class="bar-in" :class="lvl(h.disk_max)" :style="{ width: barW(h.disk_max) }"></view></view>
            </view>
          </view>

          <view class="host-foot">
            <text class="hf">负载 {{ numOr(h.load) }}</text>
            <text class="hf">温度 {{ h.temp === null ? '—' : h.temp + '°C' }}</text>
            <text class="hf">↓ {{ mbps(h.net_rx) }}</text>
            <text class="hf">↑ {{ mbps(h.net_tx) }}</text>
          </view>
        </view>

        <!-- 镜像站 -->
        <view class="card svc">
          <view class="svc-hd">
            <view class="host-l">
              <view class="dot dot-on"></view>
              <text class="host-name">镜像站</text>
            </view>
            <text class="host-meta">
              {{ mirror.sync_running ? '同步中 ' + Math.round(mirror.sync_progress || 0) + '%' : '空闲' }}
            </text>
          </view>
          <view class="svc-main">
            <text class="svc-big">{{ speedFmt(mirror.speed_bps) }}</text>
          </view>
          <text class="svc-sub">对外下载速度</text>
          <view class="svc-grid">
            <view class="sg">
              <text class="sg-v">{{ bytesFmt(mirror.bytes_24h) }}</text>
              <text class="sg-l">24 小时下载</text>
            </view>
            <view class="sg sg-line">
              <text class="sg-v">{{ num0(mirror.active) }} / {{ num0(mirror.inflight) }}</text>
              <text class="sg-l">连接 / 进行中</text>
            </view>
            <view class="sg sg-line">
              <text class="sg-v">{{ tsText(mirror.last_ts) }}</text>
              <text class="sg-l">最近一次</text>
            </view>
          </view>
        </view>

        <!-- 视频播放站 -->
        <view class="card svc">
          <view class="svc-hd">
            <view class="host-l">
              <view class="dot" :class="jellyfin.collector_up ? 'dot-on' : 'dot-off'"></view>
              <text class="host-name">视频播放站</text>
            </view>
            <text class="host-meta" :class="jellyfin.playing > 0 ? 'meta-on' : ''">
              {{ jellyfin.playing > 0 ? '播放中' : '空闲' }}
            </text>
          </view>
          <view class="svc-main">
            <text class="svc-big">{{ num0(jellyfin.playing) }}</text>
            <text class="svc-unit">路播放中</text>
          </view>
          <text class="svc-sub">
            声明码率 {{ mbps(jellyfin.bitrate_bps ? jellyfin.bitrate_bps / 1000000 : 0) }} · 采集器
            {{ jellyfin.collector_up ? '正常' : '离线' }}
          </text>

          <view v-if="jfList.length" class="sess-wrap">
            <view v-for="(s, i) in jfList" :key="i" class="sess">
              <text class="sess-t">{{ s.item || '未知影片' }}</text>
              <text class="sess-s">
                {{ s.user }}<text v-if="s.client"> · {{ s.client }}</text>
                <text v-if="s.bitrate"> · {{ mbps(s.bitrate / 1000000) }}</text>
              </text>
            </view>
          </view>
          <view v-else class="sess-empty">
            <text class="sess-empty-t">当前没有人在观看</text>
          </view>
        </view>

        <!-- 24 小时趋势 -->
        <view class="card trend">
          <view class="trend-hd">
            <text class="trend-t">24 小时使用率</text>
            <view class="chips">
              <text class="chip" :class="{ on: metricKey === 'cpu' }" @tap="metricKey = 'cpu'">CPU</text>
              <text class="chip" :class="{ on: metricKey === 'mem' }" @tap="metricKey = 'mem'">内存</text>
            </view>
          </view>

          <view v-if="!dashTrend.length" class="empty-in">
            <text class="empty-s">暂无历史数据</text>
          </view>

          <view v-for="t in dashTrend" :key="t.host" class="spark">
            <view class="spark-l">
              <text class="spark-n">{{ t.host }}</text>
              <text class="spark-v">{{ pct(t.last) }}</text>
            </view>
            <view class="spark-bars">
              <view
                v-for="(v, i) in t.bars"
                :key="i"
                class="sb"
                :class="{ 'sb-last': i === t.bars.length - 1, 'sb-hot': v !== null && v >= 85 }"
                :style="{ height: barH(v) }"
              ></view>
            </view>
          </view>

          <view class="spark-x">
            <text class="spark-x-t">{{ trendFromText }}</text>
            <text class="spark-x-t">现在</text>
          </view>
        </view>

        <!-- 磁盘分区 -->
        <text class="sec-t">磁盘使用</text>
        <view class="card disk">
          <view v-if="!dashDisks.length" class="empty-in">
            <text class="empty-s">暂无磁盘数据</text>
          </view>
          <view
            v-for="(d, i) in dashDisks"
            :key="d.host + d.mp"
            class="disk-row"
            :class="{ 'row-line': i < dashDisks.length - 1 }"
          >
            <view class="disk-l">
              <text class="disk-h">{{ d.host }}</text>
              <text class="disk-mp">{{ d.mp }}</text>
            </view>
            <view class="bar disk-bar"><view class="bar-in" :class="lvl(d.pct)" :style="{ width: barW(d.pct) }"></view></view>
            <text class="disk-v">{{ pct(d.pct) }}</text>
          </view>
        </view>

        <!-- 主机详情抽屉：网口状态 / 监听端口 / 日志（同页弹出，不跳二级页） -->
        <view v-if="hostOpen" class="sheet-mask" @tap="closeHost">
          <view class="hdx" @tap.stop>
            <view class="hdx-hd">
              <view class="hdx-tl">
                <text class="hdx-t">{{ hostName }}</text>
                <text class="hdx-sub">{{ hostSubText }}</text>
              </view>
              <text class="hdx-x" hover-class="vbar-hv" :hover-stay-time="60" @tap="closeHost">✕</text>
            </view>

            <view class="hdx-body">
              <!-- 断联记录：断网时本机推不出日志，只能用外部探活倒推 -->
              <view class="hdx-sec">
                <view class="hdx-sec-hd">
                  <text class="hdx-sec-t">断联记录</text>
                  <text class="hdx-sec-n">近 7 天</text>
                </view>
                <text v-if="hostOut.summary" class="hdx-out-sum" :class="{ 'hdx-bad': hostOut.outages.length }">
                  {{ hostOut.summary }}
                </text>
                <view v-for="(o, i) in hostOut.outages" :key="'o' + i" class="hdx-out">
                  <view class="hdx-out-hd">
                    <text class="hdx-tag" :class="o.level === 'site' ? 'tag-red' : 'tag-amber'">
                      {{ o.level === 'site' ? '整站' : '单机' }}
                    </text>
                    <text class="hdx-out-t">{{ o.from }} → {{ o.to }}</text>
                  </view>
                  <text class="hdx-out-x">{{ o.text }}</text>
                </view>
                <view v-if="hostOut.available && !hostOut.outages.length" class="hdx-empty">这段时间一直在线上</view>
                <view v-if="hostOut.blips && hostOut.blips.length" class="hdx-out-links">
                  <text class="hdx-out-lk">短闪断</text>
                  <text v-for="(b, i) in hostOut.blips" :key="'b' + i" class="hdx-out-lv">
                    {{ b.at }} · {{ b.minutes }} 分钟
                  </text>
                </view>
                <view v-if="hostOut.links.length" class="hdx-out-links">
                  <text class="hdx-out-lk">网口闪断</text>
                  <text v-for="(k, i) in hostOut.links" :key="'l' + i" class="hdx-out-lv">
                    {{ k.dev }} {{ k.at }} · {{ k.sec ? k.sec + ' 秒' : '未恢复' }}
                  </text>
                </view>
              </view>

              <!-- 网口 -->
              <view class="hdx-sec">
                <view class="hdx-sec-hd">
                  <text class="hdx-sec-t">网口状态</text>
                  <text class="hdx-sec-n">{{ hostNet.length }} 个网口</text>
                </view>

                <view v-if="hostLoading" class="hdx-empty">读取中…</view>
                <view v-else-if="!hostNet.length" class="hdx-empty">暂无网口数据</view>

                <view v-for="d in hostNet" :key="d.dev" class="hdx-nic">
                  <view class="hdx-nic-hd">
                    <view class="hdx-nic-l">
                      <view class="dot" :class="d.up ? 'dot-on' : 'dot-off'"></view>
                      <text class="hdx-nic-n">{{ d.dev }}</text>
                      <text class="hdx-bd" :class="d.up ? 'bd-on' : 'bd-off'">{{ d.up ? '已连接' : '未连接' }}</text>
                    </view>
                    <text class="hdx-nic-sp">
                      {{ d.speed_mbps ? d.speed_mbps + ' Mbps' : d.duplex === 'full' ? '全双工' : '速率未知' }}
                    </text>
                  </view>
                  <view class="hdx-kv">
                    <text class="hdx-k">实时流量</text>
                    <text class="hdx-v">↓ {{ rateFmt(d.rx_bps) }}　↑ {{ rateFmt(d.tx_bps) }}</text>
                  </view>
                  <view class="hdx-kv">
                    <text class="hdx-k">MAC</text>
                    <text class="hdx-v hdx-mono">{{ d.mac || '—' }}</text>
                  </view>
                  <view class="hdx-kv">
                    <text class="hdx-k">错误 / 丢包</text>
                    <text class="hdx-v" :class="{ 'hdx-bad': d.err_in || d.err_out || d.drop_in || d.drop_out }">
                      收 {{ d.err_in || 0 }} 错 · {{ d.drop_in || 0 }} 丢　发 {{ d.err_out || 0 }} 错 · {{ d.drop_out || 0 }} 丢
                    </text>
                  </view>
                </view>
              </view>

              <!-- 端口 -->
              <view class="hdx-sec">
                <view class="hdx-sec-hd">
                  <text class="hdx-sec-t">监听端口</text>
                  <text class="hdx-sec-n">{{ hostPorts.items.length }} 个</text>
                </view>
                <text v-if="hostPorts.hint" class="hdx-hint">{{ hostPorts.hint }}</text>
                <view v-if="!hostPorts.items.length" class="hdx-empty">暂无端口数据</view>
                <view v-for="(p, i) in hostPorts.items" :key="p.proto + '-' + p.port" class="hdx-port" :class="{ 'hdx-port-line': i < hostPorts.items.length - 1 }">
                  <text class="hdx-port-n">:{{ p.port }}</text>
                  <text class="hdx-port-p">{{ p.proc || p.addr || '—' }}</text>
                  <text v-if="p.note" class="hdx-port-note">{{ p.note }}</text>
                  <text v-else-if="p.ok === false" class="hdx-port-bad">不通</text>
                </view>
              </view>

              <!-- 日志 -->
              <view class="hdx-sec">
                <view class="hdx-sec-hd">
                  <text class="hdx-sec-t">日志</text>
                  <view class="hdx-chips">
                    <text
                      v-for="s in LOG_SRC"
                      :key="s.k"
                      class="hdx-chip"
                      :class="{ on: logSrc === s.k }"
                      @tap="setLogSrc(s.k)"
                    >{{ s.t }}</text>
                  </view>
                </view>
                <text v-if="hostLogs.hint" class="hdx-hint">{{ hostLogs.hint }}</text>
                <view v-if="!hostLogs.items.length" class="hdx-empty">暂无日志</view>
                <view class="hdx-logs">
                  <view v-for="(l, i) in hostLogs.items" :key="i" class="hdx-line">
                    <text class="hdx-lt">{{ shortTime(l.t) }}</text>
                    <text class="hdx-lm" :class="'hdx-lv-' + l.level">{{ l.msg }}</text>
                  </view>
                </view>
              </view>
            </view>

            <view class="hdx-foot">
              <text class="hdx-ref" :class="{ dim: hostBusy }" hover-class="vbar-hv" @tap="reloadHost">
                {{ hostBusy ? '刷新中…' : '刷新' }}
              </text>
            </view>
          </view>
        </view>
      </block>
    </block>

    <!-- 视频：Jellyfin 内网直连（照网易爆米花：右上角 ＋ 添加源 → 海报墙 → 点开即播） -->
    <block v-else-if="tab === 'video'">
      <!-- 还没添加源 -->
      <view v-if="!jfToken" class="card vid">
        <view class="vid-hd">
          <view class="host-l">
            <view class="dot dot-wait"></view>
            <text class="host-name">视频站 · Jellyfin</text>
          </view>
          <text class="host-meta">未添加</text>
        </view>
        <text class="vid-sub">添加家里的 Jellyfin，海报墙直接在 App 里看，片子不用下载。</text>
        <view class="vid-btn" hover-class="vid-btn-hv" :hover-stay-time="60" @tap="openAdd">
          <text class="vid-btn-t">＋ 添加媒体源</text>
        </view>
        <text class="vid-note">只允许内网访问 · 片子不出家门</text>
      </view>

      <!-- 已连接 -->
      <block v-else>
        <view class="vbar">
          <view class="vbar-l">
            <view class="dot" :class="jfOnline ? 'dot-on' : 'dot-off'"></view>
            <text class="vbar-t">{{ jfUser || 'Jellyfin' }}</text>
          </view>
          <view class="vbar-r">
            <text class="vbar-a" hover-class="vbar-hv" :hover-stay-time="60" @tap="loadViews(true)">刷新</text>
            <text class="vbar-a vbar-plus" hover-class="vbar-hv" :hover-stay-time="60" @tap="openAdd">＋</text>
          </view>
        </view>

        <scroll-view v-if="jfViews.length" scroll-x class="vchips" :show-scrollbar="false">
          <view
            v-for="v in jfViews"
            :key="v.Id"
            class="vchip"
            :class="{ on: v.Id === jfViewId }"
            @tap="pickView(v)"
          >
            <text class="vchip-t">{{ v.Name }}</text>
          </view>
        </scroll-view>

        <view v-if="jfLoading" class="card empty">
          <text class="empty-t">正在读取片库…</text>
        </view>

        <view v-else-if="jfErr" class="card err">
          <text class="err-t">打不开片库</text>
          <text class="err-m">{{ jfErr }}</text>
          <text class="err-hint">视频站只允许内网观看，确认手机连的是家里的 WiFi</text>
          <view class="err-btns">
            <view class="retry" hover-class="retry-hover" :hover-stay-time="60" @tap="loadViews(true)">
              <text class="retry-t">重试</text>
            </view>
            <view class="retry" hover-class="retry-hover" :hover-stay-time="60" @tap="openAdd">
              <text class="retry-t">重新添加</text>
            </view>
          </view>
        </view>

        <view v-else-if="!jfItems.length" class="card empty">
          <text class="empty-t">这个库里还没有影片</text>
        </view>

        <view v-else class="grid">
          <view
            v-for="it in jfItems"
            :key="it.Id"
            class="poster"
            hover-class="poster-hv"
            :hover-stay-time="60"
            @tap="openItem(it)"
          >
            <view class="poster-box">
              <image v-if="imgOf(it)" class="poster-img" :src="imgOf(it)" mode="aspectFill" />
              <view v-else class="poster-ph">
                <text class="poster-ph-t">{{ (it.Name || '?').slice(0, 1) }}</text>
              </view>
            </view>
            <text class="poster-n">{{ it.Name }}</text>
            <text class="poster-s">{{ subOfItem(it) }}</text>
          </view>
        </view>
      </block>

      <!-- 添加源：底部弹层 -->
      <view v-if="addOpen" class="sheet-mask" @tap="closeAdd">
        <view class="sheet" @tap.stop>
          <view class="sheet-hd">
            <text class="sheet-t">添加媒体源</text>
            <text class="sheet-x" hover-class="vbar-hv" @tap="closeAdd">✕</text>
          </view>

          <view class="fld">
            <text class="fld-l">Jellyfin 地址</text>
            <input class="fld-i" v-model="form.base" placeholder="http://192.168.1.32:8096/jellyfin" />
          </view>
          <view class="fld">
            <text class="fld-l">用户名</text>
            <input class="fld-i" v-model="form.user" placeholder="Jellyfin 账号" />
          </view>
          <view class="fld">
            <text class="fld-l">密码</text>
            <input class="fld-i" v-model="form.pass" password placeholder="Jellyfin 密码" />
          </view>

          <view v-if="formErr" class="sheet-err">
            <text class="sheet-err-t">{{ formErr }}</text>
          </view>

          <view class="sheet-btn" :class="{ dim: formBusy }" hover-class="vid-btn-hv" :hover-stay-time="60" @tap="doConnect">
            <text class="sheet-btn-t">{{ formBusy ? '连接中…' : '连接' }}</text>
          </view>
          <text class="sheet-tip">手机直连家庭内网，地址和密码只存在本机，不上传服务器</text>
        </view>
      </view>
    </block>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow, onHide, onUnload, onPullDownRefresh } from '@dcloudio/uni-app';
// ensureLogin / goLogin 均来自公共请求层，避免重复实现登录态判断
import { fetchOverview, fetchServices, probeServices, fetchAlerts, imageUrl, ensureLogin, fetchDashboard, fetchHostDetail, fetchHostLogs, fetchHostOutages } from '../../utils/monitor-api.js';
import { guardMonitor } from '../../utils/perm.js';
// 告警页签的完整内容（统计/筛选/分组列表/裁决抽屉）
import AlertsPanel from '../../components/alerts-panel/alerts-panel.vue';

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 自动检测间隔：60 秒
const AUTO_MS = 60 * 1000;

const loading = ref(true);
const error = ref('');
const probing = ref(false);
const data = ref(null);
const dateText = ref('');
// 上次成功探测/取数的真实时间戳（0 表示还没有过）
const lastAt = ref(0);

// 轮询句柄：onHide / onUnload 必须清掉，避免页面在后台一直发请求
let timer = null;

const statusBar = (() => {
  try {
    return uni.getSystemInfoSync().statusBarHeight || 0;
  } catch (e) {
    return 0;
  }
})();

// 固定标题栏高度：与样式里 .hd 的 height 保持一致（168rpx），
// 换算成 px 后用于给页面内容留出等高的 padding-top，避免内容被遮住。
const HEAD_HEIGHT_RPX = 88;
const headH = (() => {
  try {
    return uni.upx2px(HEAD_HEIGHT_RPX);
  } catch (e) {
    return HEAD_HEIGHT_RPX / 2;
  }
})();

// 导航栏与第一张卡片之间的呼吸间距（24rpx）：
// 只留 nav-bar 高度会让内容贴死在下沿，看着很挤
const HEAD_GAP_RPX = 24;
const headGap = (() => {
  try {
    return uni.upx2px(HEAD_GAP_RPX);
  } catch (e) {
    return HEAD_GAP_RPX / 2;
  }
})();

function today() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEK[d.getDay()]}`;
}
dateText.value = today();

/* ---------- 取数 ---------- */

async function load(silent, quiet) {
  if (!ensureLogin()) return false;
  if (!silent && !data.value) loading.value = true;
  error.value = '';
  dateText.value = today();
  try {
    data.value = await fetchOverview();
    lastAt.value = Date.now();
    return true;
  } catch (e) {
    const msg = (e && e.message) || '网络异常';
    if (quiet) {
      // 自动刷新失败：只在控制台记，不弹 toast 刷屏，也不清空已有数据
      console.error('[overview] auto refresh failed:', msg);
    } else if (data.value) {
      // 已有数据时（下拉刷新/手动检测）失败不清空页面，只做轻提示
      uni.showToast({ title: msg, icon: 'none' });
    } else {
      error.value = msg;
    }
    return false;
  } finally {
    loading.value = false;
  }
}

function reload() {
  loading.value = true;
  load(false);
}

/* ---------- 自动检测（60s） ---------- */

function stopAuto() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startAuto() {
  stopAuto();
  timer = setInterval(() => {
    runDetect(false);
  }, AUTO_MS);
}

/**
 * 一次「探测 + 取数」。manual=true 时给用户 toast 反馈；
 * 自动检测（manual=false）失败只打日志，页面保留原有数据。
 */
async function runDetect(manual) {
  if (probing.value) return false;
  probing.value = true;
  let probed = false;
  try {
    await probeServices();
    probed = true;
    lastAt.value = Date.now();
    // 手动：失败由 load 内部弹提示；自动：quiet=true，只打日志
    const ok = await load(true, !manual);
    if (manual && ok) uni.showToast({ title: '检测完成', icon: 'none' });
    return ok;
  } catch (e) {
    // 走到这里基本是 probeServices 失败（load 自己吞掉异常并返回 false）
    const msg = (e && e.message) || '检测失败';
    if (manual) uni.showToast({ title: probed ? '检测完成' : msg, icon: 'none' });
    else console.error('[overview] auto detect failed:', msg);
    return false;
  } finally {
    probing.value = false;
  }
}

// 进入页面：只加载一次 + 起一个 60s 定时器，避免重复请求
onShow(() => {
  // 监控页签仅超级管理员可见：非超管即便从别的入口进来也直接退回首页
  if (!guardMonitor()) return;
  load(!!data.value);
  startAuto();
  if (tab.value === 'alerts' && alertsPanel.value) alertsPanel.value.reload();
  if (tab.value === 'dashboard') loadDashboard();
  if (tab.value === 'video') onVideoTab();
});

// 页面不可见 / 销毁：必须停掉定时器
onHide(() => {
  stopAuto();
});

onUnload(() => {
  stopAuto();
});

onPullDownRefresh(async () => {
  try {
    await load(true);
    if (tab.value === 'alerts' && alertsPanel.value) await alertsPanel.value.reload();
    if (tab.value === 'dashboard') await loadDashboard();
    if (tab.value === 'video') onVideoTab();
  } finally {
    uni.stopPullDownRefresh();
  }
});

async function onProbe() {
  if (probing.value) return;
  await runDetect(true);
  // 手动检测后把自动计时重置，重新计 60 秒
  startAuto();
}

/* ---------- 页面跳转 ---------- */

function goPush() {
  uni.navigateTo({ url: '/pages/monitor/push' });
}

/* ---------- 页签：总览 / 告警 / 仪表板 ---------- */

const tab = ref('overview');
const alertsPanel = ref(null);

const dashData = ref(null);
const dashLoading = ref(false);
const dashError = ref('');
const metricKey = ref('cpu');

function switchTab(t) {
  if (tab.value === t) return;
  tab.value = t;
  // 告警页签由 <alerts-panel> 自己加载（v-if 切换时会重新挂载）
  if (t === 'dashboard') loadDashboard();
  if (t === 'video') onVideoTab();
}

/* ---------- 左右滑动切页签 ---------- */

const TAB_ORDER = ['overview', 'alerts', 'dashboard', 'video'];
let tX = 0;
let tY = 0;
let tT = 0;

function onTouchStart(e) {
  const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
  if (!t) return;
  tX = t.clientX;
  tY = t.clientY;
  tT = Date.now();
}

function onTouchEnd(e) {
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
  if (!t) return;
  const dx = t.clientX - tX;
  const dy = t.clientY - tY;
  // 太慢（长按）/ 垂直位移明显更大（在上下滚）都不算左右滑
  if (Date.now() - tT > 700) return;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
  const i = TAB_ORDER.indexOf(tab.value);
  if (i < 0) return;
  const next = dx < 0 ? i + 1 : i - 1;
  if (next < 0 || next >= TAB_ORDER.length) return;
  switchTab(TAB_ORDER[next]);
}

/* ---------- 视频（Jellyfin，内网直连） ---------- */

/**
 * 照网易爆米花的做法：右上角 ＋ 添加源（地址 + 账号登录）→ 选媒体库 → 海报墙 → 点开即播。
 * Jellyfin 在家里 .32:8096（base path /jellyfin），公网没有任何隧道，
 * 所以「只允许内网观看」是靠手机直连内网实现的：不在家里 WiFi 就请求失败。
 * token 只存本机 storage，不上传后端。
 */
const JF_DEFAULT = 'http://192.168.1.32:8096/jellyfin';

const jfBase = ref('');
const jfToken = ref('');
const jfUid = ref('');
const jfUser = ref('');
const jfViews = ref([]);
const jfViewId = ref('');
const jfItems = ref([]);
const jfLoading = ref(false);
const jfErr = ref('');
const jfOnline = ref(true);

const addOpen = ref(false);
const formBusy = ref(false);
const formErr = ref('');
const form = ref({ base: JF_DEFAULT, user: '', pass: '' });

function jfDeviceId() {
  let d = uni.getStorageSync('jf_device_id');
  if (!d) {
    d = 'simple-' + Math.random().toString(36).slice(2, 10);
    uni.setStorageSync('jf_device_id', d);
  }
  return d;
}

function jfHeader(token) {
  const base = `MediaBrowser Client="Simple", Device="App", DeviceId="${jfDeviceId()}", Version="2.7.5"`;
  return token ? `${base}, Token="${token}"` : base;
}

function jfReq(url, method, body, token) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method,
      data: body || undefined,
      timeout: 12000,
      header: { 'Content-Type': 'application/json', Authorization: jfHeader(token) },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else if (res.statusCode === 401) reject(new Error('登录已失效，请重新添加'));
        else reject(new Error(`HTTP ${res.statusCode}`));
      },
      fail: (e) => reject(new Error((e && e.errMsg) || '网络异常')),
    });
  });
}

function restoreJf() {
  jfBase.value = uni.getStorageSync('jf_base') || '';
  jfToken.value = uni.getStorageSync('jf_token') || '';
  jfUid.value = uni.getStorageSync('jf_uid') || '';
  jfUser.value = uni.getStorageSync('jf_user') || '';
}

function onVideoTab() {
  restoreJf();
  if (jfToken.value) loadViews(false);
}

function openAdd() {
  restoreJf();
  formErr.value = '';
  form.value = { base: jfBase.value || JF_DEFAULT, user: jfUser.value || '', pass: '' };
  addOpen.value = true;
}

function closeAdd() {
  addOpen.value = false;
}

async function doConnect() {
  if (formBusy.value) return;
  const base = String(form.value.base || '').trim().replace(/\/+$/, '');
  const user = String(form.value.user || '').trim();
  const pass = String(form.value.pass || '');
  if (!base || !user) {
    formErr.value = '请填写地址和用户名';
    return;
  }
  formBusy.value = true;
  formErr.value = '';
  try {
    const r = await jfReq(`${base}/Users/AuthenticateByName`, 'POST', { Username: user, Pw: pass }, '');
    if (!r || !r.AccessToken) throw new Error('没有拿到登录凭证');
    uni.setStorageSync('jf_base', base);
    uni.setStorageSync('jf_token', r.AccessToken);
    uni.setStorageSync('jf_uid', (r.User && r.User.Id) || '');
    uni.setStorageSync('jf_user', (r.User && r.User.Name) || user);
    restoreJf();
    addOpen.value = false;
    jfOnline.value = true;
    uni.showToast({ title: '已连接', icon: 'none' });
    await loadViews(true);
  } catch (e) {
    const msg = (e && e.message) || '连接失败';
    formErr.value =
      msg.indexOf('HTTP 401') >= 0
        ? '账号或密码不对'
        : msg.indexOf('fail') >= 0
          ? `连不上 ${base}，确认手机连的是家里 WiFi`
          : msg;
  } finally {
    formBusy.value = false;
  }
}

async function loadViews(force) {
  if (!jfToken.value) return;
  if (!force && jfViews.value.length) return;
  jfLoading.value = true;
  jfErr.value = '';
  try {
    const r = await jfReq(`${jfBase.value}/Users/${jfUid.value}/Views`, 'GET', null, jfToken.value);
    const all = (r && r.Items) || [];
    const usable = all.filter(
      (v) => v.CollectionType === 'movies' || v.CollectionType === 'tvshows' || v.CollectionType === 'boxsets',
    );
    jfViews.value = usable.length ? usable : all;
    const pick =
      jfViews.value.find((v) => v.CollectionType === 'movies') || jfViews.value[0] || null;
    jfOnline.value = true;
    if (pick) {
      jfViewId.value = pick.Id;
      await loadItems(pick.Id);
    } else {
      jfItems.value = [];
    }
  } catch (e) {
    jfOnline.value = false;
    jfErr.value = (e && e.message) || '网络异常';
    jfItems.value = [];
  } finally {
    jfLoading.value = false;
  }
}

async function loadItems(viewId) {
  jfLoading.value = true;
  jfErr.value = '';
  try {
    const q =
      `ParentId=${viewId}&Recursive=true&IncludeItemTypes=Movie,Series` +
      '&SortBy=DateCreated&SortOrder=Descending&Limit=60' +
      '&Fields=PrimaryImageAspectRatio,ProductionYear,RunTimeTicks';
    const r = await jfReq(`${jfBase.value}/Users/${jfUid.value}/Items?${q}`, 'GET', null, jfToken.value);
    jfItems.value = (r && r.Items) || [];
  } catch (e) {
    jfErr.value = (e && e.message) || '网络异常';
    jfItems.value = [];
  } finally {
    jfLoading.value = false;
  }
}

function pickView(v) {
  if (jfViewId.value === v.Id) return;
  jfViewId.value = v.Id;
  loadItems(v.Id);
}

/** 海报：Jellyfin 图片接口只能靠 URL 带 api_key */
function imgOf(it) {
  const tag = it && it.ImageTags && it.ImageTags.Primary;
  if (!tag) return '';
  return `${jfBase.value}/Items/${it.Id}/Images/Primary?maxHeight=420&tag=${tag}&ApiKey=${jfToken.value}`;
}

function subOfItem(it) {
  const y = it && it.ProductionYear ? String(it.ProductionYear) : '';
  const min = it && it.RunTimeTicks ? Math.round(it.RunTimeTicks / 600000000) : 0;
  if (y && min) return `${y} · ${min} 分钟`;
  if (y) return y;
  if (it && it.Type === 'Series') return '剧集';
  return '';
}

/* ---------- 剧集选集 ---------- */

const epOpen = ref(false);
const epLoading = ref(false);
const epErr = ref('');
const epItems = ref([]);
const epName = ref('');

function closeEpisodes() {
  epOpen.value = false;
}

/** 拉某部剧的所有分集（Jellyfin: /Shows/{seriesId}/Episodes） */
async function openEpisodes(it) {
  epName.value = it.Name || '剧集';
  epItems.value = [];
  epErr.value = '';
  epLoading.value = true;
  epOpen.value = true;
  try {
    const q =
      `UserId=${jfUid.value}&Fields=RunTimeTicks` +
      '&SortBy=ParentIndexNumber,IndexNumber&SortOrder=Ascending';
    const r = await jfReq(`${jfBase.value}/Shows/${it.Id}/Episodes?${q}`, 'GET', null, jfToken.value);
    epItems.value = (r && r.Items) || [];
    if (!epItems.value.length) epErr.value = '这部剧没有可播放的分集';
  } catch (e) {
    epErr.value = (e && e.message) || '读取剧集失败';
  } finally {
    epLoading.value = false;
  }
}

/** S01E03；没有季号就退回「第 3 集」 */
function epNo(ep) {
  const s = ep && ep.ParentIndexNumber;
  const n = ep && ep.IndexNumber;
  if (s && n) return `S${String(s).padStart(2, '0')}E${String(n).padStart(2, '0')}`;
  if (n) return `第 ${n} 集`;
  return '·';
}

/** 副标题：进度 + 时长 */
function epSub(ep) {
  const parts = [];
  const u = (ep && ep.UserData) || {};
  const posMin = u.PlaybackPositionTicks ? Math.round(u.PlaybackPositionTicks / 600000000) : 0;
  if (u.Played) parts.push('已看完');
  else if (posMin) parts.push(`看到 ${posMin} 分`);
  const min = ep && ep.RunTimeTicks ? Math.round(ep.RunTimeTicks / 600000000) : 0;
  if (min) parts.push(`${min} 分钟`);
  return parts.join(' · ');
}

function playEpisode(ep) {
  if (!ep || !ep.Id) return;
  epOpen.value = false;
  const label = `${epName.value} ${epNo(ep)}`;
  uni.navigateTo({ url: `/pages/monitor/player?id=${ep.Id}&name=${encodeURIComponent(label)}` });
}

function openItem(it) {
  if (!it || !it.Id) return;
  // 统一进详情页：电影看简介/演职员，剧集在详情页里选集
  uni.navigateTo({ url: `/pages/monitor/detail?id=${it.Id}` });
}

/* ---------- 仪表板（Grafana / Prometheus，后端代理） ---------- */

async function loadDashboard() {
  if (!ensureLogin()) return;
  if (!dashData.value) dashLoading.value = true;
  dashError.value = '';
  try {
    dashData.value = await fetchDashboard();
  } catch (e) {
    const msg = (e && e.message) || '网络异常';
    if (dashData.value) uni.showToast({ title: msg, icon: 'none' });
    else dashError.value = msg;
  } finally {
    dashLoading.value = false;
  }
}

const dashHosts = computed(() => (dashData.value && Array.isArray(dashData.value.hosts) ? dashData.value.hosts : []));

/** 趋势：把 [[ts, v], ...] 摊成柱高数组，只取最近 24 个点 */
const dashTrend = computed(() => {
  const t = (dashData.value && dashData.value.trend) || {};
  const rows = Array.isArray(t.hosts) ? t.hosts : [];
  const key = metricKey.value;
  return rows
    .map((h) => {
      const pts = (Array.isArray(h[key]) ? h[key] : []).slice(-24);
      const bars = pts.map((p) => (p && Number.isFinite(Number(p[1])) ? Number(p[1]) : null));
      const last = bars.length ? bars[bars.length - 1] : null;
      const fromTs = pts.length && pts[0] ? Number(pts[0][0]) : 0;
      return { host: h.host, bars, last, fromTs };
    })
    .filter((h) => h.bars.length);
});

/** 趋势图左侧时间标签：用真实起点（Prometheus 数据可能不足 24 小时） */
const trendFromText = computed(() => {
  const first = dashTrend.value[0];
  if (!first || !first.fromTs) return '起始';
  const d = new Date(first.fromTs * 1000);
  if (isNaN(d.getTime())) return '起始';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
});

/** 镜像站 / 视频站（全局指标，不带 host） */
const mirror = computed(() => (dashData.value && dashData.value.mirror) || {});
const jellyfin = computed(() => (dashData.value && dashData.value.jellyfin) || {});
const jfList = computed(() => (Array.isArray(jellyfin.value.list) ? jellyfin.value.list : []));

/** 磁盘分区拍平，按使用率降序，最紧的排最前 */
const dashDisks = computed(() => {
  const out = [];
  dashHosts.value.forEach((h) => {
    (Array.isArray(h.disk) ? h.disk : []).forEach((d) => {
      out.push({ host: h.host, mp: d.mp || '/', pct: Number(d.pct) || 0 });
    });
  });
  return out.sort((a, b) => b.pct - a.pct);
});

const dashTimeText = computed(() => {
  if (!dashData.value || !dashData.value.ts) return '';
  const d = new Date(dashData.value.ts);
  if (isNaN(d.getTime())) return '';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())} 更新`;
});

function pct(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  return `${Number(v).toFixed(1)}%`;
}
function numOr(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  return String(v);
}
function mbps(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  if (n >= 1000) return `${(n / 1000).toFixed(1)} Gbps`;
  if (n < 0.1) return '0 Mbps';
  return `${n.toFixed(n >= 10 ? 0 : 1)} Mbps`;
}
/** 整数显示，空值当 0（计数类指标） */
function num0(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '0';
  return String(Math.round(Number(v)));
}
/** 字节/秒 → 人类可读速度 */
function speedFmt(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '0 MB/s';
  if (n < 1024) return `${Math.round(n)} B/s`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB/s`;
  return `${(n / 1048576).toFixed(1)} MB/s`;
}
/** 累计字节 → KB/MB/GB/TB */
function bytesFmt(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '0 GB';
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  if (n < 1099511627776) return `${(n / 1073741824).toFixed(1)} GB`;
  return `${(n / 1099511627776).toFixed(2)} TB`;
}
/** 秒级时间戳 → 刚刚 / n 分钟前 / n 小时前 / M月D日 */
function tsText(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const t = n < 1e12 ? n * 1000 : n;
  const d = new Date(t);
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - t;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
/** 横向进度条宽度（百分比） */
function barW(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '0%';
  return `${Math.max(2, Math.min(100, Number(v)))}%`;
}
/** 纵向柱高（占容器百分比） */
function barH(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '2rpx';
  return `${Math.max(4, Math.min(100, Number(v)))}%`;
}
/** 阈值配色：>=85 红，>=70 黄，其余绿 */
function lvl(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return 'lv-off';
  const n = Number(v);
  if (n >= 85) return 'lv-red';
  if (n >= 70) return 'lv-amber';
  return 'lv-ok';
}

/* ---------- 主机详情抽屉（网口 / 端口 / 日志） ---------- */

const hostOpen = ref(false);
const hostName = ref('');
const hostLoading = ref(false);
const hostBusy = ref(false);
const hostNet = ref([]);
const hostPorts = ref({ available: false, items: [], hint: '' });
const hostLogs = ref({ available: false, items: [], hint: '' });
const hostOut = ref({ available: false, summary: '', outages: [], blips: [], links: [] });
const hostUp = ref(false);
const hostTs = ref('');
const logSrc = ref('all');

const LOG_SRC = [
  { k: 'all', t: '全部' },
  { k: 'err', t: '错误' },
  { k: 'app', t: '应用' },
];

const hostSubText = computed(() => {
  const bits = [];
  bits.push(hostUp.value ? '在线' : '离线');
  if (hostTs.value) bits.push(`${hostTs.value} 刷新`);
  bits.push(`${hostNet.value.length} 网口`);
  return bits.join(' · ');
});

function rateFmt(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '0 B/s';
  if (n < 1024) return `${Math.round(n)} B/s`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB/s`;
  return `${(n / 1048576).toFixed(1)} MB/s`;
}

/** 2026-10-17T23:08:05+08:00 -> 23:08:05 */
function shortTime(t) {
  const m = /T(\d{2}:\d{2}:\d{2})/.exec(String(t || ''));
  return m ? m[1] : '';
}

function stamp() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function openHost(h) {
  hostName.value = h.host;
  hostUp.value = !!h.up;
  hostOpen.value = true;
  hostNet.value = [];
  hostPorts.value = { available: false, items: [], hint: '' };
  hostLogs.value = { available: false, items: [], hint: '' };
  hostOut.value = { available: false, summary: '', outages: [], blips: [], links: [] };
  logSrc.value = 'all';
  loadHost();
}

function closeHost() {
  hostOpen.value = false;
}

async function loadHost(quiet = false) {
  if (!ensureLogin()) return;
  if (!quiet) hostLoading.value = true;
  hostBusy.value = true;
  try {
    const [d, l, o] = await Promise.all([
      fetchHostDetail(hostName.value),
      fetchHostLogs(hostName.value, 100, logSrc.value),
      fetchHostOutages(hostName.value, 7).catch(() => null),
    ]);
    hostNet.value = Array.isArray(d.net) ? d.net : [];
    hostPorts.value = d.ports || { available: false, items: [], hint: '' };
    hostLogs.value = l || { available: false, items: [], hint: '' };
    hostOut.value = o || { available: false, summary: '', outages: [], blips: [], links: [] };
    hostTs.value = stamp();
  } catch (e) {
    const msg = (e && e.message) || '读取失败';
    if (quiet) uni.showToast({ title: msg, icon: 'none' });
    else hostPorts.value = { available: false, items: [], hint: msg };
  } finally {
    hostLoading.value = false;
    hostBusy.value = false;
  }
}

/** 抽屉里的「刷新」：网口 + 端口 + 当前日志一起重取 */
function reloadHost() {
  if (hostBusy.value) return;
  loadHost(true);
}

/** 切日志分类只重取日志，不动网口 */
async function setLogSrc(k) {
  if (logSrc.value === k || hostBusy.value) return;
  logSrc.value = k;
  hostBusy.value = true;
  try {
    hostLogs.value = (await fetchHostLogs(hostName.value, 100, k)) || { available: false, items: [], hint: '' };
    hostTs.value = stamp();
  } catch (e) {
    uni.showToast({ title: (e && e.message) || '读取失败', icon: 'none' });
  } finally {
    hostBusy.value = false;
  }
}

/* ---------- 告警展示辅助 ---------- */

const KIND_TEXT = { human: '真人', pending: '待裁决', other: '已过滤' };
function kindText(k) {
  return KIND_TEXT[k] || '已过滤';
}

function timeOf(ts) {
  if (!ts) return '—';
  let d = null;
  if (typeof ts === 'number') d = new Date(ts < 1e12 ? ts * 1000 : ts);
  else if (/^\d+$/.test(String(ts))) {
    const n = Number(ts);
    d = new Date(n < 1e12 ? n * 1000 : n);
  } else d = new Date(String(ts).indexOf('T') >= 0 ? ts : String(ts).replace(/-/g, '/'));
  if (!d || isNaN(d.getTime())) return '—';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function scorePct(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  if (n <= 1) return `${Math.round(n * 100)}%`;
  if (n <= 100) return `${Math.round(n)}%`;
  return '—';
}

function thumbOf(it) {
  if (!it || !it.image_path) return '';
  return imageUrl(it.image_path);
}

/* ---------- 派生数据 ---------- */

const services = computed(() => (data.value && data.value.services) || {});
const total = computed(() => Number(services.value.total) || 0);
const online = computed(() => Number(services.value.online) || 0);
const list = computed(() => (Array.isArray(services.value.list) ? services.value.list : []));

const alerts = computed(() => (data.value && data.value.alerts) || {});
const todayTotal = computed(() => Number(alerts.value.today_total) || 0);
const todayHuman = computed(() => Number(alerts.value.today_human) || 0);
const todayPending = computed(() => Number(alerts.value.today_pending) || 0);

// 「已过滤」优先直接读后端字段 today_filtered；
// 老接口没有该字段时兜底 = 命中 - 真人 - 待裁决，负值归零
const todayFiltered = computed(() => {
  const raw = alerts.value.today_filtered;
  if (raw !== undefined && raw !== null && raw !== '') {
    return Number(raw) || 0;
  }
  const diff = todayTotal.value - todayHuman.value - todayPending.value;
  return diff > 0 ? diff : 0;
});

// 顶栏副文案：上次检测的真实时刻 HH:mm:ss
function pad2(n) {
  return String(n).padStart(2, '0');
}
const lastAutoText = computed(() => {
  if (!lastAt.value) return '上次检测 —';
  const d = new Date(lastAt.value);
  return `上次检测 ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
});

const GRP_TITLE = { cloud: '云端', lan: '内网' };
function grpTitle(grp) {
  if (!grp) return '未分组';
  return GRP_TITLE[grp] || grp;
}

const groups = computed(() => {
  const items = list.value;
  const raw = Array.isArray(services.value.groups) ? services.value.groups : [];
  const out = [];
  const seen = {};

  raw.forEach((g) => {
    const key = g.grp || '';
    if (seen[key]) return;
    seen[key] = true;
    out.push({
      key: key || 'other',
      title: grpTitle(key),
      total: Number(g.total) || 0,
      online: Number(g.online) || 0,
      rows: items.filter((s) => (s.grp || '') === key),
    });
  });

  // 兜底：列表里出现但 groups 未覆盖的分组
  items.forEach((s) => {
    const key = s.grp || '';
    if (seen[key]) return;
    seen[key] = true;
    const rows = items.filter((x) => (x.grp || '') === key);
    out.push({
      key: key || 'other',
      title: grpTitle(key),
      total: rows.length,
      online: rows.filter((x) => isOk(x)).length,
      rows,
    });
  });

  return out;
});

function isOk(s) {
  return Number(s && s.ok) === 1;
}

function badgeOf(s) {
  const sk = (s && s.skey ? String(s.skey) : '').trim();
  if (sk) return sk.slice(0, 2).toUpperCase();
  const nm = (s && s.name ? String(s.name) : '').trim();
  return nm ? nm.slice(0, 1) : '·';
}

function subOf(s) {
  if (s.kind) return s.kind;
  if (isOk(s) && s.latency_ms != null) return `${s.latency_ms}ms`;
  return '未探测';
}

function statusOf(s) {
  if (!isOk(s)) return '离线';
  return s.latency_ms != null ? `在线 · ${s.latency_ms}ms` : '在线';
}

/* ---------- 服务详情 ---------- */

function openService(s) {
  if (!s || !s.id) {
    uni.showToast({ title: '该服务暂无详情', icon: 'none' });
    return;
  }
  const name = encodeURIComponent(s.name || s.skey || '服务');
  uni.navigateTo({ url: `/pages/monitor/service?id=${s.id}&name=${name}` });
}

/* ---------- 时间 ---------- */

function toTs(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return n < 1e12 ? n * 1000 : n;
  }
  const t = Date.parse(s.replace(' ', 'T'));
  return isNaN(t) ? 0 : t;
}

const lastCheck = computed(() => {
  let ts = 0;
  list.value.forEach((s) => {
    const t = toTs(s.checked_at);
    if (t > ts) ts = t;
  });
  if (!ts) ts = toTs(data.value && data.value.ts);
  return ts;
});

const lastCheckText = computed(() => {
  if (!lastCheck.value) return '—';
  const diff = Date.now() - lastCheck.value;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = new Date(lastCheck.value);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 0 36rpx 60rpx;
  background: #f7f8fa;
}

/* 状态栏遮罩：盖住 0~statusBar，滚动时内容不会钻到系统状态栏下面 */
.sb-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 21;
  background: #ffffff;
  pointer-events: none;
}

/* 顶部导航：与首页 nav-bar 完全一致（白底 / 88rpx / 文字页签 / 下划线 / 底部分隔线）
   height 88rpx 与 script 里 HEAD_HEIGHT_RPX 保持一致 */
.hd {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 20;
  box-sizing: border-box;
  height: 88rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 18rpx;
  padding: 0 32rpx;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 8rpx 16rpx;
  min-width: 80rpx;
}
.nav-label {
  font-size: 26rpx;
  color: #9ca3af;
  line-height: 1.4;
  transition: color 0.25s ease;
}
.nav-item.active .nav-label {
  color: #1b44a6;
  font-weight: 600;
}
.nav-indicator {
  position: absolute;
  bottom: -2rpx;
  width: 32rpx;
  height: 4rpx;
  border-radius: 2rpx;
  background: #1b44a6;
}
.nav-badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 26rpx;
  height: 26rpx;
  padding: 0 6rpx;
  box-sizing: border-box;
  border-radius: 13rpx;
  background: #ef4444;
  color: #ffffff;
  font-size: 9px;
  line-height: 26rpx;
  text-align: center;
}
.hd-right {
  margin-left: auto;
  flex-shrink: 0;
  padding: 8rpx 4rpx;
}
.hd-right-hv {
  opacity: 0.6;
}
.probe-t {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.probe-t-on {
  color: #2563eb;
}

/* 区块标题行（标题 + 右侧动作） */
.sec-row {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  margin: 8rpx 4rpx 16rpx;
}
.sec-more {
  font-size: 12px;
  color: #2563eb;
}

/* 告警行 */
.a-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 22rpx 28rpx;
}
.thumb {
  width: 84rpx;
  height: 84rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #eef1f5;
  flex-shrink: 0;
}
.thumb-img {
  width: 84rpx;
  height: 84rpx;
  display: block;
}
.thumb-ph {
  width: 100%;
  height: 100%;
  background: #eef1f5;
}
.a-mid {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  margin-left: 20rpx;
  margin-right: 16rpx;
}
.a-t {
  font-size: 13.5px;
  color: #0f172a;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.a-s {
  margin-top: 6rpx;
  font-size: 11px;
  color: #94a3b8;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 卡片 */
.card {
  background: #ffffff;
  border: 1rpx solid #edf0f4;
  border-radius: 32rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}

/* 深色汇总卡 */
.dark {
  background: #0f172a;
  border-color: #0f172a;
  border-radius: 36rpx;
  padding: 40rpx 36rpx 34rpx;
}
.d-main {
  display: flex;
  flex-direction: row;
  align-items: baseline;
}
.d-num {
  font-size: 34px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.05;
  letter-spacing: -1rpx;
}
.d-lb {
  margin-left: 14rpx;
  font-size: 14px;
  color: #94a3b8;
}
.d-sub {
  display: block;
  margin-top: 16rpx;
  font-size: 11px;
  color: #64748b;
}

/* 区块标题 */
.sec-t {
  display: block;
  margin: 8rpx 0 16rpx 4rpx;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 1rpx;
}

/* 入口行 */
.nav {
  padding: 0;
  overflow: hidden;
}
.nav-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 32rpx;
}
.nav-row-line {
  border-top: 1rpx solid #edf0f4;
}
.nav-t {
  font-size: 14px;
  color: #0f172a;
}
.nav-a {
  font-size: 18px;
  color: #cbd5e1;
  line-height: 1;
}
.nav-hv {
  background-color: #f4f6f9;
}

/* 告警四格 */
.stats {
  display: flex;
  flex-direction: row;
  padding: 30rpx 0;
}
.stat {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
/* 四格之间的分隔：1rpx 竖线 */
.stat-line {
  border-left: 1rpx solid #edf0f4;
}
.stat-n {
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.stat-l {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #94a3b8;
  white-space: nowrap;
}
/* 小屏（375px 及以下）四格收窄，数字降一档避免挤 */
@media (max-width: 375px) {
  .stat-n {
    font-size: 36rpx;
  }
  .stat-l {
    font-size: 20rpx;
  }
}

/* 分组 */
.grp {
  padding: 0;
}
.grp-hd {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx 18rpx;
}
.grp-t {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.grp-c {
  font-size: 11.5px;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

/* 服务行 */
.row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 26rpx 28rpx;
}
.row-line {
  border-bottom: 1rpx solid #f1f4f8;
}
.badge {
  width: 68rpx;
  height: 68rpx;
  border-radius: 16rpx;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.badge-t {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
}
.row-mid {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  margin-left: 20rpx;
  margin-right: 16rpx;
}
.row-name {
  font-size: 13.5px;
  color: #0f172a;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.row-sub {
  margin-top: 6rpx;
  font-size: 11px;
  color: #94a3b8;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.row-st {
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  text-align: right;
}
.row-st-ok {
  color: #059669;
}
.row-st-off {
  color: #dc2626;
}
/* 行可点击：右侧箭头 + 按下反馈 */
.row-arrow {
  margin-left: 10rpx;
  font-size: 15px;
  color: #cbd5e1;
  flex-shrink: 0;
}
.row-hv {
  background: #f8fafc;
}

/* ===== 仪表板（Grafana 数据源） ===== */

.dash-tip {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 0 6rpx 16rpx;
}
.dash-tip-t {
  font-size: 11px;
  color: #94a3b8;
}

/* 设备卡 */
.host {
  padding: 28rpx 30rpx 24rpx;
}
.host-hd {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.host-l {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  margin-right: 12rpx;
  flex-shrink: 0;
}
.dot-on {
  background: #10b981;
}
.dot-off {
  background: #ef4444;
}
.host-name {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}
.host-meta {
  font-size: 11px;
  color: #94a3b8;
}
.meta-on {
  color: #059669;
}
.meta-off {
  color: #dc2626;
}

.host-metrics {
  display: flex;
  flex-direction: row;
  margin-top: 24rpx;
}
.hm {
  flex: 1;
  min-width: 0;
  padding-right: 20rpx;
}
.hm:last-child {
  padding-right: 0;
}
.hm-top {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10rpx;
}
.hm-l {
  font-size: 11px;
  color: #94a3b8;
}
.hm-v {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}
.bar {
  height: 8rpx;
  border-radius: 4rpx;
  background: #eef2f7;
  overflow: hidden;
}
.bar-in {
  height: 8rpx;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}
.lv-ok {
  background: #10b981;
}
.lv-amber {
  background: #f59e0b;
}
.lv-red {
  background: #ef4444;
}
.lv-off {
  background: #cbd5e1;
}
.host-foot {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 22rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #f1f4f8;
}
.hf {
  flex: 1;
  min-width: 0;
  font-size: 10.5px;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 镜像站 / 视频站卡 */
.svc {
  padding: 28rpx 30rpx 24rpx;
}
.svc-hd {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.svc-main {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  margin-top: 18rpx;
}
.svc-big {
  font-size: 30px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
  letter-spacing: -0.5rpx;
  font-variant-numeric: tabular-nums;
}
.svc-unit {
  margin-left: 10rpx;
  font-size: 13px;
  color: #94a3b8;
}
.svc-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 11px;
  color: #94a3b8;
}
.svc-grid {
  display: flex;
  flex-direction: row;
  margin-top: 22rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #f1f4f8;
}
.sg {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.sg-line {
  border-left: 1rpx solid #f1f4f8;
  padding-left: 20rpx;
}
.sg-v {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sg-l {
  margin-top: 6rpx;
  font-size: 10.5px;
  color: #94a3b8;
  white-space: nowrap;
}
.sess-wrap {
  margin-top: 20rpx;
  padding-top: 6rpx;
  border-top: 1rpx solid #f1f4f8;
}
.sess {
  padding: 14rpx 0;
  display: flex;
  flex-direction: column;
}
.sess-t {
  font-size: 12.5px;
  color: #0f172a;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.sess-s {
  margin-top: 5rpx;
  font-size: 10.5px;
  color: #94a3b8;
}
.sess-empty {
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f1f4f8;
}
.sess-empty-t {
  font-size: 11px;
  color: #b6c0cd;
}

/* 24 小时趋势 */
.trend {
  padding: 28rpx 30rpx 22rpx;
}
.trend-hd {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22rpx;
}
.trend-t {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.chips {
  display: flex;
  flex-direction: row;
  background: #f1f5f9;
  border-radius: 999rpx;
  padding: 4rpx;
}
.chip {
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  font-size: 11.5px;
  color: #64748b;
  transition: all 0.2s ease;
}
.chip.on {
  background: #ffffff;
  color: #1b44a6;
  font-weight: 600;
}
.spark {
  margin-bottom: 18rpx;
}
.spark-l {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.spark-n {
  font-size: 11.5px;
  color: #475569;
}
.spark-v {
  font-size: 11.5px;
  font-weight: 600;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}
.spark-bars {
  height: 110rpx;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: space-between;
}
.sb {
  flex: 1;
  margin-right: 2rpx;
  border-radius: 3rpx 3rpx 0 0;
  background: #c7d8f5;
}
.sb:last-child {
  margin-right: 0;
}
.sb-last {
  background: #1b44a6;
}
.sb-hot {
  background: #ef4444;
}
.spark-x {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 10rpx;
}
.spark-x-t {
  font-size: 10px;
  color: #b6c0cd;
}

/* 视频站（内网限定） */
.vid {
  padding: 28rpx 30rpx 26rpx;
}
.vid-hd {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.vid-sub {
  display: block;
  margin-top: 14rpx;
  font-size: 11.5px;
  color: #94a3b8;
}
.vid-btn {
  margin-top: 26rpx;
  height: 88rpx;
  border-radius: 999rpx;
  background: #1b44a6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vid-btn-hv {
  opacity: 0.85;
}
.vid-btn-t {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
}
.vid-note {
  display: block;
  margin-top: 14rpx;
  text-align: center;
  font-size: 10.5px;
  color: #b6c0cd;
}
.vid-tip {
  margin-top: 24rpx;
  padding-top: 22rpx;
  border-top: 1rpx solid #f1f4f8;
  display: flex;
  flex-direction: column;
}
.vid-tip-t {
  font-size: 13.5px;
  font-weight: 600;
  color: #0f172a;
}
.vid-tip-s {
  margin-top: 8rpx;
  font-size: 11.5px;
  color: #94a3b8;
}
.vid-again {
  margin-top: 20rpx;
  align-self: flex-start;
  padding: 12rpx 32rpx;
  border: 1rpx solid #cbd5e1;
  border-radius: 999rpx;
}
.vid-again-t {
  font-size: 12.5px;
  color: #475569;
}
.dot-wait {
  background: #cbd5e1;
}

/* 视频站：工具条 / 媒体库 / 海报墙 / 添加弹层 */
.vbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 6rpx 20rpx;
}
.vbar-l {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.vbar-t {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.vbar-r {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.vbar-a {
  margin-left: 26rpx;
  font-size: 12.5px;
  color: #2563eb;
}
.vbar-plus {
  font-size: 20px;
  line-height: 1;
  padding-bottom: 4rpx;
}
.vbar-hv {
  opacity: 0.55;
}
.vchips {
  white-space: nowrap;
  margin-bottom: 24rpx;
}
.vchip {
  display: inline-block;
  padding: 10rpx 26rpx;
  margin-right: 14rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
}
.vchip.on {
  background: #1b44a6;
}
.vchip-t {
  font-size: 12px;
  color: #475569;
}
.vchip.on .vchip-t {
  color: #ffffff;
  font-weight: 600;
}
.grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 0 4rpx;
}
.poster {
  width: 31.5%;
  margin-bottom: 30rpx;
  display: flex;
  flex-direction: column;
}
.poster-hv {
  opacity: 0.75;
}
.poster-box {
  width: 100%;
  height: 306rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #e8edf4;
}
.poster-img {
  width: 100%;
  height: 100%;
  display: block;
}
.poster-ph {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8edf4;
}
.poster-ph-t {
  font-size: 28px;
  font-weight: 700;
  color: #b6c0cd;
}
.poster-n {
  margin-top: 12rpx;
  font-size: 12.5px;
  color: #0f172a;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.poster-s {
  margin-top: 4rpx;
  font-size: 10.5px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.err-hint {
  margin-top: 14rpx;
  font-size: 11px;
  color: #b6c0cd;
  text-align: center;
}

/* 添加媒体源：底部弹层 */
.sheet-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 60;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.sheet {
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 36rpx calc(36rpx + env(safe-area-inset-bottom));
}
.sheet-hd {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.sheet-t {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}
.sheet-x {
  font-size: 16px;
  color: #94a3b8;
  padding: 8rpx 8rpx 8rpx 24rpx;
}
.fld {
  margin-top: 22rpx;
}
.fld-l {
  display: block;
  margin-bottom: 10rpx;
  font-size: 11.5px;
  color: #64748b;
}
.fld-i {
  height: 84rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  border-radius: 16rpx;
  background: #f4f6f9;
  font-size: 13.5px;
  color: #0f172a;
}
.sheet-btn {
  margin-top: 34rpx;
  height: 88rpx;
  border-radius: 999rpx;
  background: #1b44a6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-btn.dim {
  opacity: 0.6;
}
.sheet-btn-t {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
}
.sheet-tip {
  display: block;
  margin-top: 20rpx;
  text-align: center;
  font-size: 10.5px;
  color: #b6c0cd;
}

/* ---------- 主机详情抽屉（网口 / 端口 / 日志） ---------- */
.host-tap {
  transition: transform 0.12s ease;
}
.host-hv {
  opacity: 0.92;
  transform: scale(0.994);
}
.host-r {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}
.host-more {
  font-size: 11px;
  color: #1b44a6;
}

.hdx {
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 28rpx 30rpx calc(18rpx + env(safe-area-inset-bottom));
  height: 78vh;
  display: flex;
  flex-direction: column;
}
.hdx-hd {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #edf0f4;
}
.hdx-tl {
  display: flex;
  flex-direction: column;
}
.hdx-t {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}
.hdx-sub {
  margin-top: 6rpx;
  font-size: 10.5px;
  color: #94a3b8;
}
.hdx-x {
  font-size: 16px;
  color: #94a3b8;
  padding: 4rpx 4rpx 4rpx 24rpx;
}
.hdx-body {
  flex: 1;
  min-height: 0;
  margin-top: 8rpx;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.hdx-sec {
  padding-top: 18rpx;
}
.hdx-sec-hd {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}
.hdx-sec-t {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.hdx-sec-n {
  font-size: 10.5px;
  color: #94a3b8;
}
.hdx-empty {
  padding: 20rpx 0;
  font-size: 11px;
  color: #b6c0cd;
}
.hdx-hint {
  display: block;
  margin-bottom: 10rpx;
  padding: 12rpx 16rpx;
  border-radius: 12rpx;
  background: #f6f8fb;
  font-size: 10.5px;
  color: #7b8794;
  line-height: 1.5;
}

/* 断联记录 */
.hdx-out-sum {
  display: block;
  margin-bottom: 10rpx;
  font-size: 12px;
  color: #334155;
}
.hdx-out {
  margin-bottom: 10rpx;
  padding: 14rpx 16rpx;
  border-radius: 12rpx;
  background: #f8fafc;
}
.hdx-out-hd {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.hdx-tag {
  margin-right: 10rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  font-size: 10px;
  line-height: 1.6;
}
.tag-red {
  background: #fee2e2;
  color: #b91c1c;
}
.tag-amber {
  background: #fef3c7;
  color: #b45309;
}
.hdx-out-t {
  font-size: 12px;
  font-weight: 500;
  color: #0f172a;
}
.hdx-out-x {
  display: block;
  margin-top: 6rpx;
  font-size: 11px;
  line-height: 1.5;
  color: #64748b;
}
.hdx-out-links {
  margin-top: 4rpx;
}
.hdx-out-lk {
  margin-right: 8rpx;
  font-size: 10.5px;
  color: #94a3b8;
}
.hdx-out-lv {
  display: block;
  font-size: 10.5px;
  line-height: 1.6;
  color: #7b8794;
}

/* 网口卡片 */
.hdx-nic {
  margin-bottom: 14rpx;
  padding: 16rpx 18rpx;
  border-radius: 14rpx;
  background: #f7f9fc;
}
.hdx-nic-hd {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.hdx-nic-l {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10rpx;
}
.hdx-nic-n {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.hdx-bd {
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  font-size: 9.5px;
}
.bd-on {
  background: #e7f6ed;
  color: #1a7f37;
}
.bd-off {
  background: #f2f4f7;
  color: #8b949e;
}
.hdx-nic-sp {
  font-size: 11px;
  color: #475569;
}
.hdx-kv {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 3rpx 0;
}
.hdx-k {
  width: 132rpx;
  flex-shrink: 0;
  font-size: 10.5px;
  color: #8b949e;
}
.hdx-v {
  flex: 1;
  font-size: 11.5px;
  color: #24324a;
  line-height: 1.45;
}
.hdx-mono {
  font-family: Menlo, Consolas, monospace;
  font-size: 10.5px;
}
.hdx-bad {
  color: #cf222e;
}

/* 端口 */
.hdx-port {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 14rpx;
  padding: 12rpx 2rpx;
}
.hdx-port-line {
  border-bottom: 1rpx solid #f2f4f7;
}
.hdx-port-n {
  width: 130rpx;
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: #1b44a6;
  font-family: Menlo, Consolas, monospace;
}
.hdx-port-p {
  flex: 1;
  font-size: 11.5px;
  color: #475569;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.hdx-port-note {
  font-size: 9.5px;
  color: #8b949e;
}
.hdx-port-bad {
  font-size: 10px;
  color: #cf222e;
}

/* 日志 */
.hdx-chips {
  display: flex;
  flex-direction: row;
  gap: 10rpx;
}
.hdx-chip {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: #f2f4f7;
  font-size: 10px;
  color: #64748b;
}
.hdx-chip.on {
  background: #1b44a6;
  color: #ffffff;
}
.hdx-logs {
  margin-top: 4rpx;
  padding: 12rpx 14rpx;
  border-radius: 14rpx;
  background: #0f172a;
}
.hdx-line {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 4rpx 0;
}
.hdx-lt {
  width: 112rpx;
  flex-shrink: 0;
  font-size: 9.5px;
  color: #64748b;
  font-family: Menlo, Consolas, monospace;
}
.hdx-lm {
  flex: 1;
  font-size: 10.5px;
  line-height: 1.5;
  color: #cbd5e1;
  word-break: break-all;
  font-family: Menlo, Consolas, monospace;
}
.hdx-lv-err {
  color: #ff9b9b;
}
.hdx-lv-warn {
  color: #ffd28a;
}

.hdx-foot {
  padding-top: 12rpx;
  display: flex;
  flex-direction: row;
  justify-content: center;
}
.hdx-ref {
  padding: 12rpx 60rpx;
  border-radius: 999rpx;
  background: #eef2fb;
  font-size: 12px;
  color: #1b44a6;
}
.hdx-ref.dim {
  opacity: 0.55;
}

/* 剧集选集弹层 */
.ep-sheet {
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  max-height: 76vh;
  display: flex;
  flex-direction: column;
}
.ep-title {
  max-width: 76%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.ep-tip {
  display: block;
  padding: 64rpx 0;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
}
.ep-err {
  display: block;
  padding: 56rpx 24rpx;
  text-align: center;
  font-size: 12px;
  color: #ef4444;
}
.ep-list {
  max-height: 62vh;
}
.ep-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 20rpx 12rpx;
  border-bottom: 1rpx solid #f1f5f9;
}
.ep-no {
  width: 116rpx;
  font-size: 11.5px;
  font-weight: 600;
  color: #1b44a6;
}
.ep-mid {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ep-name {
  font-size: 13px;
  color: #0f172a;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.ep-sub {
  margin-top: 4rpx;
  font-size: 10.5px;
  color: #94a3b8;
}
.ep-go {
  margin-left: 12rpx;
  font-size: 11.5px;
  color: #94a3b8;
}

/* 磁盘分区 */
.disk {
  padding: 0;
}
.disk-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 24rpx 30rpx;
}
.disk-l {
  width: 190rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.disk-h {
  font-size: 12.5px;
  color: #0f172a;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.disk-mp {
  margin-top: 4rpx;
  font-size: 10.5px;
  color: #94a3b8;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.disk-bar {
  flex: 1;
  margin: 0 20rpx;
}
.disk-v {
  width: 92rpx;
  text-align: right;
  font-size: 12.5px;
  font-weight: 600;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.empty-in {
  padding: 40rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 空数据 */
.empty {
  padding: 72rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-t {
  font-size: 13.5px;
  color: #64748b;
}
.empty-s {
  margin-top: 10rpx;
  font-size: 11px;
  color: #94a3b8;
}

/* 失败 */
.err {
  padding: 64rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.err-t {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}
.err-m {
  margin-top: 12rpx;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}
.retry {
  margin-top: 32rpx;
  padding: 16rpx 48rpx;
  border: 1rpx solid #0f172a;
  border-radius: 999rpx;
}
.retry-hover {
  opacity: 0.6;
}
.retry-t {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.err-btns {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.err-btns .retry {
  margin-left: 8rpx;
  margin-right: 8rpx;
  padding: 16rpx 36rpx;
}
.sheet-err {
  margin-top: 8rpx;
  padding: 18rpx 22rpx;
  border-radius: 12rpx;
  background: #fef2f2;
}
.sheet-err-t {
  font-size: 12px;
  line-height: 1.6;
  color: #b91c1c;
}

/* 骨架 */
.sk-dark {
  padding: 40rpx 36rpx 34rpx;
}
.sk-b {
  background: #eef1f5;
  border-radius: 8rpx;
  animation: sk-pulse 1.3s ease-in-out infinite;
}
.sk-h1 {
  width: 190rpx;
  height: 42rpx;
  background: rgba(255, 255, 255, 0.18);
}
.sk-h2 {
  width: 140rpx;
  height: 18rpx;
  margin-top: 22rpx;
  background: rgba(255, 255, 255, 0.1);
}
.sk-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 26rpx 28rpx;
}
.sk-badge {
  width: 68rpx;
  height: 68rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
}
.sk-mid {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 20rpx;
}
.sk-m1 {
  width: 200rpx;
  height: 22rpx;
}
.sk-m2 {
  width: 120rpx;
  height: 16rpx;
  margin-top: 12rpx;
}
.sk-right {
  width: 110rpx;
  height: 18rpx;
  flex-shrink: 0;
}
@keyframes sk-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}
</style>
