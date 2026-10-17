/* Validate .vue files with @vue/compiler-sfc */
const fs = require('fs')
const path = require('path')
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc')

const files = process.argv.slice(2)
let failed = 0
for (const f of files) {
  try {
    const src = fs.readFileSync(f, 'utf8')
    const { descriptor, errors } = parse(src, { filename: f })
    if (errors && errors.length) throw errors[0]
    let bindings = {}
    if (descriptor.scriptSetup || descriptor.script) {
      const s = compileScript(descriptor, { id: 'validate' })
      bindings = s.bindings || {}
    }
    if (descriptor.template) {
      compileTemplate({
        source: descriptor.template.content,
        filename: f,
        id: 'validate',
        compilerOptions: { bindingMetadata: bindings }
      })
    }
    console.log('OK  ' + f)
  } catch (e) {
    failed++
    console.error('FAIL ' + f)
    console.error('     ' + (e.message || e))
    if (e.loc) console.error('     loc: ' + JSON.stringify(e.loc))
  }
}
process.exit(failed ? 1 : 0)
