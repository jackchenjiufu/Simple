<template>
  <div>
    <!-- 顶部统计卡片 -->
    <el-row :gutter="16">
      <el-col :span="4" v-for="s in statItems" :key="s.label">
        <el-card shadow="hover" style="margin-bottom:16px;text-align:center" :body-style="{padding:'16px 8px'}">
          <div style="font-size:28px;font-weight:700;color:#1b44a6">{{ s.value }}</div>
          <div style="font-size:13px;color:#909399;margin-top:6px">
            {{ s.label }}
            <el-badge v-if="s.badge" :value="s.badge" :hidden="!s.badge" style="margin-left:4px" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- 左列：趋势 + 最近动态 -->
      <el-col :span="16">
        <!-- 7日注册趋势 -->
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>近 7 日注册趋势</template>
          <div v-if="userGrowth.length" style="display:flex;align-items:flex-end;gap:12px;height:140px;padding:0 8px">
            <div v-for="d in userGrowth" :key="d.date" style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end">
              <span style="font-size:11px;color:#666;margin-bottom:4px">{{ d.count }}</span>
              <div :style="{height: Math.max(d.count * 30, 4) + 'px', width:'100%', background:'#3071f6', borderRadius:'4px 4px 0 0', opacity:0.7}"></div>
              <span style="font-size:11px;color:#999;margin-top:4px">{{ d.date.slice(5) }}</span>
            </div>
          </div>
          <div v-else style="color:#909399;font-size:13px;text-align:center;padding:20px">暂无数据</div>
        </el-card>

        <!-- 最近动态 -->
        <el-card shadow="never">
          <template #header>最近动态</template>
          <div v-if="recentLogs.length">
            <div v-for="log in recentLogs.slice(0,8)" :key="log.id" style="padding:8px 0;font-size:13px;color:#555;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;gap:8px">
              <el-tag :type="log.type==='admin'?'danger':log.type==='login'?'warning':'info'" size="small" style="flex-shrink:0">{{ log.type }}</el-tag>
              <span style="color:#999;flex-shrink:0">{{ log.created_at?.substring(0,16) }}</span>
              <span>{{ log.message || log.action || '-' }}</span>
            </div>
          </div>
          <div v-else style="color:#909399;font-size:13px;text-align:center;padding:20px">暂无动态</div>
        </el-card>
      </el-col>

      <!-- 右列：服务器状态 + 快速入口 -->
      <el-col :span="8">
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>服务器状态</template>
          <div v-if="serverInfo" style="font-size:13px;color:#555;line-height:2.2">
            <div><span style="color:#999;display:inline-block;width:80px">PHP</span>{{ serverInfo.php_version }}</div>
            <div><span style="color:#999;display:inline-block;width:80px">数据库</span>{{ serverInfo.db_version || 'MySQL' }}</div>
            <div><span style="color:#999;display:inline-block;width:80px">连接数</span>{{ serverInfo.db_connections || '-' }}</div>
            <div><span style="color:#999;display:inline-block;width:80px">内存</span>{{ serverInfo.memory_current }}</div>
            <div><span style="color:#999;display:inline-block;width:80px">磁盘</span>{{ serverInfo.disk_usage }}</div>
            <div><span style="color:#999;display:inline-block;width:80px">数据表</span>{{ serverInfo.table_count }} 张</div>
          </div>
          <div v-else style="color:#909399;font-size:13px">加载中...</div>
        </el-card>

        <el-card shadow="never">
          <template #header>快速入口</template>
          <el-space wrap>
            <el-button size="small" @click="$router.push('/users')">用户管理</el-button>
            <el-button size="small" @click="$router.push('/feedback')">反馈管理</el-button>
            <el-button size="small" @click="$router.push('/logs')">系统日志</el-button>
            <el-button size="small" @click="$router.push('/carousel')">轮播管理</el-button>
            <el-button size="small" @click="$router.push('/version')">版本管理</el-button>
            <el-button size="small" @click="$router.push('/permissions')">权限管理</el-button>
          </el-space>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const statItems = ref([])
const recentLogs = ref([])
const userGrowth = ref([])
const serverInfo = ref(null)

onMounted(async () => {
  try {
    // 统计数据
    const [sr, fl, lr, mr] = await Promise.all([
      api.get('/admin_stats.php'),
      api.get('/admin_feedback.php', { params: { status: 0, limit: 1 } }),
      api.get('/admin_logs.php', { params: { limit: 10 } }),
      api.get('/system_monitor.php', { params: { type: 'overview' } }).catch(() => ({ data: { code: 500 } }))
    ])

    if (sr.data.code === 200) {
      const s = sr.data.data
      statItems.value = [
        { label: '用户总数', value: s.total_users || 0 },
        { label: '今日新增', value: s.today_users || 0 },
        { label: '内容总数', value: s.total_content || 0 },
        { label: '关注关系', value: s.total_follows || 0 },
        { label: '消息总数', value: s.total_messages || 0 },
        { label: '待处理反馈', value: fl.data?.total || 0, badge: fl.data?.total || 0 }
      ]
      userGrowth.value = (s.user_growth || []).slice(-7)
    }

    if (lr.data.code === 200) recentLogs.value = lr.data.data || []

    // 服务器状态
    if (mr.data.code === 200) {
      const d = mr.data.data
      const ss = d.server_status || {}
      const ds = d.database_status || {}
      const disk = ss.disk_space
      serverInfo.value = {
        php_version: ss.php_version || '-',
        db_version: ds.database_version || '-',
        db_connections: ds.connections || '-',
        memory_current: ss.memory_usage?.current || '-',
        disk_usage: typeof disk === 'object' ? `${disk.usage_percent} 已用` : (disk || '未知'),
        table_count: ds.tables?.count || '-'
      }
    }
  } catch (e) { /* ignore */ }
})
</script>
