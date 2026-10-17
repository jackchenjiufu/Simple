import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    // element-plus 按需引入：模板中 el-* 组件 + 命令式 ElMessage/Box 自动带样式，去掉全量注册
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts'
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts'
    })
  ],
  base: '/doo/admin-vue/',
  // 构建时间戳：页面底部显示，用于快速判断"手机上跑的是哪一版"
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      // 只代理 API 前缀，避免吞掉 base 路径 /doo/admin-vue/（页面本身）
      '/doo/server/api': {
        target: 'http://139.196.185.197:7070',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../admin-vue-dist',
    assetsDir: 'assets',
    // outDir 在项目根外，Vite 默认不清空导致旧哈希文件累积；显式开启清空
    emptyOutDir: true,
    // 压缩产物，减小体积
    minify: 'esbuild'
  }
})
