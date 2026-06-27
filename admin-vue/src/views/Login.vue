<template>
  <div class="login-page">
    <!-- 左侧装饰 -->
    <div class="left-panel">
      <div class="left-inner">
        <div class="logo-row">
          <div class="logo-placeholder"></div>
          <span class="logo-label">DOO 后台管理</span>
        </div>
        <div class="character-area">
          <div class="cc c1"></div>
          <div class="cc c2"></div>
          <div class="char-body"></div>
          <div class="char-head"></div>
          <span class="char-eye">👀</span>
        </div>
        <div class="footer-row">
          <span class="footer-item">隐私政策</span>
          <span class="footer-item">服务条款</span>
        </div>
      </div>
      <div class="glow g1"></div>
      <div class="glow g2"></div>
    </div>

    <!-- 右侧表单 -->
    <div class="right-panel">
      <div class="form-box">
        <div class="mobile-logo">
          <div class="logo-placeholder-sm"></div>
          <span class="mobile-logo-label">DOO 后台管理</span>
        </div>
        <div class="form-header">
          <h2 class="form-title">管理员登录</h2>
          <p class="form-desc">请输入管理员账号和密码</p>
        </div>
        <el-form ref="formRef" :model="form" :rules="rules" @keyup.enter="handleLogin" class="login-form">
          <div class="field-item">
            <label class="field-label">用户名</label>
            <el-input v-model="form.username" placeholder="请输入用户名" size="large" @focus="f1=true" @blur="f1=false"  />
          </div>
          <div class="field-item">
            <label class="field-label">密码</label>
            <el-input v-model="form.password" :type="showPwd ? 'text' : 'password'" placeholder="请输入密码" size="large" show-password @focus="f2=true" @blur="f2=false"  />
          </div>
          <el-button type="primary" size="large" class="login-btn-custom" :loading="loading" @click="handleLogin">
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '@/api'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const f1 = ref(false)
const f2 = ref(false)
const showPwd = ref(false)
const form = reactive({ username: '', password: '' })
const rules = { username: [{ required: true, message: '请输入用户名' }], password: [{ required: true, message: '请输入密码' }] }

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => {})
  if (!valid) return
  loading.value = true
  try {
    const res = await login(form.username, form.password)
    if (res.data.code === 200 && res.data.data) {
      localStorage.setItem('adminInfo', JSON.stringify(res.data.data))
      ElMessage.success('登录成功')
      router.push('/')
    } else {
      ElMessage.error(res.data.message || '登录失败')
    }
  } catch (e) { ElMessage.error('网络错误') }
  loading.value = false
}
</script>

<style scoped>
.login-page {
  width: 100%; min-height: 100vh; display: flex; background: #ffffff;
}
/* 左侧 */
.left-panel {
  display: none; position: relative; width: 50%;
  background: linear-gradient(135deg, #2c3e7b, #1b44a6 30%, #3071f6 70%, #5b8df9);
  padding: 48px; flex-direction: column; justify-content: space-between; overflow: hidden;
}
.left-inner { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
.logo-row { display: flex; align-items: center; gap: 12px; }
.logo-img { width: 36px; height: 36px; border-radius: 8px; }
.logo-label { font-size: 18px; font-weight: 600; color: #fff; }
.logo-placeholder { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.2); flex-shrink: 0; }
.logo-placeholder-sm { width: 32px; height: 32px; border-radius: 8px; background: #e0e0e0; flex-shrink: 0; }
.character-area { position: relative; width: 280px; height: 340px; align-self: center; }
.cc { position: absolute; border-radius: 50%; }
.c1 { width: 160px; height: 160px; background: rgba(255,255,255,0.06); top: 20px; right: -20px; }
.c2 { width: 90px; height: 90px; background: rgba(255,255,255,0.1); bottom: 40px; right: 30px; }
.char-body { position: absolute; width: 110px; height: 140px; background: rgba(255,255,255,0.12); border-radius: 55px 55px 35px 35px; bottom: 30px; left: 50%; transform: translateX(-50%); }
.char-head { position: absolute; width: 90px; height: 90px; background: rgba(255,215,200,0.25); border-radius: 50%; top: 55px; left: 50%; transform: translateX(-50%); }
.char-eye { position: absolute; top: 90px; left: 50%; transform: translateX(-50%); font-size: 22px; }
.footer-row { display: flex; gap: 24px; }
.footer-item { font-size: 13px; color: rgba(255,255,255,0.5); cursor: default; }
.glow { position: absolute; border-radius: 50%; z-index: 1; }
.g1 { width: 400px; height: 400px; background: rgba(255,255,255,0.04); top: -100px; right: -80px; }
.g2 { width: 500px; height: 500px; background: rgba(255,255,255,0.03); bottom: -150px; left: -100px; }

/* 右侧 */
.right-panel { width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 32px; }
.form-box { width: 100%; max-width: 400px; }
.mobile-logo { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 48px; }
.mobile-logo-img { width: 32px; height: 32px; border-radius: 8px; }
.mobile-logo-label { font-size: 18px; font-weight: 600; color: #1a1a2e; }
.form-header { text-align: center; margin-bottom: 40px; }
.form-title { font-size: 28px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px; }
.form-desc { font-size: 14px; color: #909398; margin: 0; }
.login-form { display: flex; flex-direction: column; gap: 22px; }
.field-item { display: flex; flex-direction: column; gap: 8px; }
.field-label { font-size: 14px; font-weight: 500; color: #374151; }
.field-item :deep(.el-input__wrapper) { border-radius: 12px; padding: 0 14px; height: 48px; box-shadow: 0 0 0 1.5px #e5e7eb inset; transition: all .25s; }
.field-item :deep(.el-input__wrapper:hover) { box-shadow: 0 0 0 1.5px #c0c4cc inset; }
.field-item :deep(.el-input__wrapper.is-focus), .field-item :deep(.is-focused .el-input__wrapper) { box-shadow: 0 0 0 1.5px #3071f6 inset !important; }
.field-item :deep(.el-input__inner) { font-size: 15px; }
.login-btn-custom { height: 48px; font-size: 16px; font-weight: 600; border-radius: 12px; letter-spacing: 2px; margin-top: 4px; background: linear-gradient(135deg, #1b44a6, #3071f6); border: none; }
.login-btn-custom:hover { opacity: 0.9; }

@media (min-width: 768px) {
  .left-panel { display: flex; }
  .right-panel { width: 50%; }
}
</style>
