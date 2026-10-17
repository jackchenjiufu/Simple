// 单文件校验：parse + compileScript + compileTemplate + compileStyle
// 用法: node -e "require('./scripts/validate-vue.cjs')('src/views/X.vue')"
// 任一环节失败 exit 1，全部通过 exit 0
const { parse, compileScript, compileTemplate, compileStyle } = require('@vue/compiler-sfc')
const fs = require('fs')

module.exports = (file) => {
  const src = fs.readFileSync(file, 'utf8')
  const { descriptor, errors } = parse(src, { filename: file })
  if (errors.length) { console.error('[parse]', file, errors); process.exit(1) }
  compileScript(descriptor, { id: 'validate-' + file })
  const tpl = compileTemplate({
    source: descriptor.template.content,
    filename: file,
    id: 'validate-' + file,
    compilerOptions: {}
  })
  if (tpl.errors.length) { console.error('[template]', file, tpl.errors); process.exit(1) }
  for (const st of descriptor.styles) {
    const r = compileStyle({ source: st.content, filename: file, id: 'validate-' + file, scoped: st.scoped })
    if (r.errors.length) { console.error('[style]', file, r.errors); process.exit(1) }
  }
  console.log('VALIDATE OK:', file)
  process.exit(0)
}
