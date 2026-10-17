import { ref } from 'vue'
import { useRoute } from 'vue-router'

// 移动模式判断：URL 带 mobile=1(App 内 web-view 嵌入) 或窗口宽度 < 768
export function useMobile() {
  const route = useRoute()
  const isMobile = ref(window.innerWidth < 768 || route.query.mobile === '1')
  const check = () => {
    isMobile.value = window.innerWidth < 768 || route.query.mobile === '1'
  }
  window.addEventListener('resize', check)
  return { isMobile }
}
