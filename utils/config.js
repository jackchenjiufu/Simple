/**
 * 全局配置（唯一配置源）
 * 域名/API 地址变更只需改这里
 */

const config = {
  /** 服务器域名（不含端口） */
  host: '139.196.185.197',
  /** 服务端口 */
  port: '7070',
  /** 站点根路径前缀 */
  sitePath: '/doo',

  /** API 基础地址（带尾斜杠） */
  get baseUrl() {
    return `http://${this.host}:${this.port}${this.sitePath}/server/api/`
  },

  /** 站点根地址（含前缀，无尾斜杠） */
  get siteUrl() {
    return `http://${this.host}:${this.port}${this.sitePath}`
  },

  /** 上传目录地址（含前缀，无尾斜杠） */
  get uploadsUrl() {
    return `${this.siteUrl}/server/uploads`
  },

  /** 默认头像 */
  defaultAvatar: '/server/uploads/default_avatar.png',
  /** 默认封面 */
  defaultCover: '/static/img/default-cover.png'
}

export default config
