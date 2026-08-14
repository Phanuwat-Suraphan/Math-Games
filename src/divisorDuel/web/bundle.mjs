import fs from 'fs'
import path from 'path'
const SRC = process.argv[2]
// เรียงตาม dependency: deadHand ต้องมาหลัง deck เพราะเรียกใช้ countNumbers
// และ suggest ต้องมาก่อน ai เพราะ ai ยืมตัวประกอบสมการจาก suggest
const ORDER = ['rules','cards','engine/equation','engine/damage','engine/deck',
               'engine/deadHand','engine/game','engine/suggest','engine/ai']
const EXP = /export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g
const out = ['const __M = {};']
for (const name of ORDER) {
  let code = fs.readFileSync(path.join(SRC, name + '.js'), 'utf8')
  const names = new Set()
  let m
  while ((m = EXP.exec(code))) names.add(m[1])
  EXP.lastIndex = 0
  // แปลง import ให้ดึงจากโมดูลที่โหลดไว้แล้ว
  code = code.replace(/import\s*\{([^}]*)\}\s*from\s*['"](\.{1,2}\/[^'"]+)['"];?/g, (_, ids, spec) => {
    const dep = path.normalize(path.join(path.dirname(name), spec)).replace(/\.js$/, '').replace(/\\/g,'/')
    const clean = ids.split(',').map(s => s.trim()).filter(Boolean)
      .map(s => s.replace(/\s+as\s+/, ': ')).join(', ')
    return clean ? `const { ${clean} } = __M['${dep}'];` : ''
  })
  code = code.replace(/^\s*import\s+['"][^'"]+['"];?$/gm, '')
  code = code.replace(/\bexport\s+/g, '')
  out.push(`__M['${name}'] = (() => {\n${code}\nreturn { ${[...names].join(', ')} };\n})();`)
}
fs.writeFileSync(process.argv[3], out.join('\n'))
console.log('bundle:', [...ORDER].join(' → '))
