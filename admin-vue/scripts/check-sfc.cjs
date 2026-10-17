const { parse, compileTemplate, compileScript, compileStyle } = require('@vue/compiler-sfc')
const fs = require('fs')
const path = require('path')

const files = process.argv.slice(2)
let fail = 0
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  const errs = []
  const { descriptor, errors } = parse(src, { filename: f })
  errors.forEach(e => errs.push('parse: ' + e.message))
  if (descriptor.scriptSetup) {
    try { compileScript(descriptor, { id: f }) }
    catch (e) { errs.push('script: ' + e.message) }
  }
  if (descriptor.template) {
    try { compileTemplate({ source: descriptor.template.content, filename: f, id: f }) }
    catch (e) { errs.push('template: ' + e.message) }
  }
  for (const st of descriptor.styles) {
    try { compileStyle({ source: st.content, filename: f, id: f, scoped: st.scoped }) }
    catch (e) { errs.push('style: ' + e.message) }
  }
  if (errs.length) { fail++; console.log('FAIL ' + f); errs.forEach(e => console.log('   ' + e)) }
  else console.log('OK   ' + f)
}
process.exit(fail ? 1 : 0)
