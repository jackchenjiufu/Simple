<template>
  <router-view />
</template>

<style>
* { box-sizing: border-box; }
html, body, #app { height: 100%; margin: 0; }

/* ===== 品牌主题变量（覆盖 element-plus） ===== */
:root {
  --brand: #3071f6;
  --brand-2: #1b44a6;
  --brand-3: #5b8df9;

  --el-color-primary: #3071f6;
  --el-color-primary-light-3: #6b97f7;
  --el-color-primary-light-5: #97b5fa;
  --el-color-primary-light-7: #c3d5fc;
  --el-color-primary-light-8: #dce6fd;
  --el-color-primary-light-9: #eef3ff;
  --el-color-primary-dark-2: #1b5ad0;

  --el-border-radius-base: 8px;
  --el-border-radius-small: 6px;
}

body {
  font-family: 'PingFang SC', 'Microsoft YaHei', -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(180deg, #f5f7fc 0%, #eef1f8 100%);
  background-attachment: fixed;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
::selection { background: var(--el-color-primary-light-7); color: #1b2b5e; }

/* ===== 滚动条 ===== */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: #c3c9dc; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #aab2cd; }
::-webkit-scrollbar-track { background: transparent; }

/* ===== 页面切换动画 ===== */
.fade-slide-enter-active,
.fade-slide-leave-active { transition: opacity .22s ease, transform .22s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateY(8px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-4px); }

/* ===== 卡片 ===== */
.el-card {
  border-radius: 12px;
  border: 1px solid #eceff7;
  box-shadow: 0 1px 2px rgba(16, 24, 60, .04), 0 2px 8px rgba(16, 24, 60, .03) !important;
  transition: box-shadow .2s ease, border-color .2s ease;
}
.el-card.is-hover-shadow:hover {
  border-color: #dfe6f7;
  box-shadow: 0 6px 16px rgba(16, 24, 60, .06), 0 16px 40px rgba(16, 24, 60, .08) !important;
}
.el-card__header {
  border-bottom: 1px solid #f2f4fa;
  font-weight: 600;
  color: #2b3350;
}

/* ===== 页面标题栏（面板内嵌式，仅底部细分隔线） ===== */
.admin-main .header-row {
  background: transparent;
  border: none;
  border-bottom: 1px solid #f0f2f8;
  border-radius: 0;
  box-shadow: none;
  padding: 0 0 16px;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.admin-main .header-row h2,
.page-title {
  font-size: 17px;
  font-weight: 700;
  color: #222a47;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.admin-main .header-row h2::before {
  content: '';
  width: 3px; height: 15px;
  border-radius: 2px;
  background: var(--brand);
  display: inline-block;
}
.admin-main .header-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

/* ===== 表格（面板内扁平化：去掉外框，保留表头底色） ===== */
.el-table {
  --el-table-header-bg-color: #f6f9fd;
  --el-table-row-hover-bg-color: #f4f8ff;
  --el-table-border-color: #eef1f7;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
}
.el-table th.el-table__cell {
  font-weight: 600; color: #5a6475; background: #f6f9fd;
  font-size: 12px; letter-spacing: .3px;
}
.el-table td.el-table__cell { padding: 11px 0; color: #3d4458; }
.el-table__inner-wrapper::before { display: none; }
.el-table .el-table__row { transition: background .18s ease; }

/* ===== 分页 ===== */
.admin-main .pagination-row {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
.el-pagination {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 4px 0;
}
.el-pagination.is-background .el-pager li { border-radius: 8px; }
.el-pagination .el-pagination__total { color: #7a849c; }

/* ===== 标签 ===== */
.el-tag { border-radius: 6px; }
.el-tag--small { font-weight: 500; }

/* ===== 对话框 ===== */
.el-overlay { backdrop-filter: blur(2px); background-color: rgba(22, 28, 56, .45); }
.el-overlay-dialog { display: flex; align-items: flex-start; justify-content: center; padding-top: 8vh; }
.el-dialog {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(16, 24, 60, .24);
}
.el-dialog__header {
  margin-right: 0;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f2f4fa;
  font-weight: 600;
}
.el-dialog__title { color: #222a47; font-weight: 700; }
.el-dialog__body { padding: 20px; }
.el-dialog__footer { padding: 12px 20px 18px; border-top: 1px solid #f2f4fa; }

/* ===== Tabs ===== */
.el-tabs__item { font-weight: 500; }
.el-tabs__item.is-active { color: var(--brand); font-weight: 600; }
.el-tabs__active-bar { background: var(--brand); height: 3px; border-radius: 2px; }

/* ===== 表单 ===== */
.el-form-item__label { color: #4a5468; font-weight: 500; }
.el-input__wrapper, .el-select__wrapper, .el-textarea__inner { border-radius: 8px; }
.el-input__wrapper.is-focus, .el-select__wrapper.is-focused, .el-textarea__inner:focus {
  box-shadow: 0 0 0 1.5px var(--el-color-primary-light-5) inset;
}
.el-button { border-radius: 8px; font-weight: 500; transition: all .18s ease; }
.el-button:active { transform: translateY(1px); }
.el-button--primary { background: #2f6bf0; border: none; }
.el-button--primary:hover, .el-button--primary:focus { background: #2560e6; opacity: 1; }
.el-button--primary.is-plain {
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  color: var(--brand);
}
.el-button--small { border-radius: 7px; }

/* 可点击元素通用按压反馈 */
.clickable { cursor: pointer; }
.clickable:active { transform: scale(.97); }

/* ===== 上传 ===== */
.el-upload--text .el-upload {
  border: 1px dashed #c9d2e8;
  border-radius: 8px;
  padding: 6px 14px;
  color: #5a6475;
  transition: all .2s;
}
.el-upload--text .el-upload:hover { border-color: var(--brand); color: var(--brand); }

/* ===== 空状态 ===== */
.el-empty__description p { color: #98a1b5; }

/* ===== 反馈对话气泡 ===== */
.chat-list { display: flex; flex-direction: column; gap: 8px; }
.chat-line {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 10px; border-radius: 10px; font-size: 12px;
}
.chat-label {
  flex-shrink: 0; font-weight: 600; font-size: 11px;
  padding: 1px 6px; border-radius: 4px;
}
.chat-user { background: #f4f6fa; }
.chat-user .chat-label { color: #7a849c; background: #e9edf5; }
.chat-admin { background: var(--el-color-primary-light-9); }
.chat-admin .chat-label { color: var(--brand); background: var(--el-color-primary-light-8); }
.chat-text { flex: 1; word-break: break-all; line-height: 1.5; }
.chat-time { flex-shrink: 0; color: #b4bccf; font-size: 11px; }
.chat-quick-reply { margin-top: 6px; }

/* ===== 权限分配列表 ===== */
.perm-list { max-height: 420px; overflow-y: auto; }
.perm-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 8px; border-bottom: 1px solid #f4f6fa;
  border-radius: 6px;
  transition: background .15s;
}
.perm-item:hover { background: #f7f9ff; }
.perm-item:last-child { border-bottom: none; }
.perm-desc { font-size: 12px; color: #98a1b5; }

/* ===== 操作按钮组 ===== */
.op-group { display: flex; gap: 4px; align-items: center; flex-wrap: nowrap; }
.op-group .el-button { margin-left: 0; }

/* ===== 折叠面板（API 管理） ===== */
.el-collapse { border: none; }
.el-collapse-item { margin-bottom: 10px; }
.el-collapse-item__header {
  background: #fff; border: 1px solid #eef0f6; border-radius: 10px;
  padding: 0 16px; height: 46px; line-height: 46px;
  font-weight: 600; color: #2b3350;
  transition: box-shadow .2s;
}
.el-collapse-item__header:hover { box-shadow: 0 4px 12px rgba(20,30,80,.06); }
.el-collapse-item__wrap { border: none; background: transparent; }
.el-collapse-item__content {
  background: #fff; border: 1px solid #eef0f6;
  border-radius: 0 0 10px 10px; padding: 6px 12px; margin-top: -1px;
}
.el-collapse-item.is-active .el-collapse-item__header { border-radius: 10px 10px 0 0; }
</style>
