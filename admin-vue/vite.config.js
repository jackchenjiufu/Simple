import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  base: '/doo/admin-vue/',
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
    emptyOutDir: true
  }
})
