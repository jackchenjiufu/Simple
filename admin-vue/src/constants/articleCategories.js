// 文章分类预设选项
// value 为实际入库值（articles.tags 首项，与 get_articles.php 的"首标签即分类"体系一致）
// label 为前端展示的中文名
export const CATEGORY_OPTIONS = [
  { value: '微博', label: '微博热搜' },
  { value: '抖音', label: '抖音热榜' },
  { value: '头条', label: '头条热榜' },
  { value: '知乎', label: '知乎热榜' },
  { value: '小红书', label: '小红书热榜' },
  { value: 'HackerNews', label: '技术分享' },
  { value: '国际新闻', label: '国际新闻' },
  { value: '其他', label: '其他' },
]

// 分类值 → 展示名；未知值原样返回（编辑时分类不在选项里也能显示）
export const catLabelOf = (value) => {
  if (!value || value === 'article') return '其他'
  const opt = CATEGORY_OPTIONS.find(o => o.value === value)
  return opt ? opt.label : value
}
