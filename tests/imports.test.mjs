/**
 * ตรวจว่าไฟล์ทุกไฟล์นำเข้าชื่อที่มีอยู่จริง
 *
 * ทำไมต้องมี: ไฟล์ React (.tsx) ตรวจในเครื่องพัฒนาไม่ได้
 * เพราะติดตั้ง dependency ไม่ได้ (npm ถูกบล็อก) จึงไม่มี type ของ React
 * tsconfig.tests.json จึงไม่รวมไฟล์ .tsx เลย
 *
 * ผลคือความผิดพลาดแบบ "นำเข้าชื่อที่ไม่มีอยู่จริง" หลุดไปถึง CI ทุกครั้ง
 * ซึ่งเสียเวลารอสองนาทีต่อรอบ ทั้งที่เป็นข้อผิดพลาดที่ตรวจได้ในวินาทีเดียว
 *
 * ตัวตรวจนี้ไม่ต้องใช้ dependency ใด ๆ
 * อ่านไฟล์เป็นข้อความ หาบรรทัด import ที่ชี้ไปยังไฟล์ในโปรเจกต์เอง
 * แล้วดูว่าไฟล์ปลายทาง export ชื่อนั้นออกมาจริงไหม
 *
 * ขอบเขตที่ตั้งใจไม่ตรวจ: ไม่ตรวจ import จาก node_modules
 * และไม่ตรวจชนิดข้อมูล เพราะทำไม่ได้โดยไม่มี TypeScript เต็มรูปแบบ
 * งานนั้นยังเป็นของ CI อยู่ ตัวนี้แค่ดักข้อผิดพลาดที่พบบ่อยที่สุดให้เร็วขึ้น
 *
 * วิธีใช้
 *   node tests/imports.test.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

let passed = 0
const failures = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function check(name, fn) {
  try {
    fn()
    passed += 1
  } catch (error) {
    failures.push(`${name}: ${error.message}`)
  }
}

/** ไล่หาไฟล์ .ts และ .tsx ทั้งหมดใน src */
function collectFiles(dir) {
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...collectFiles(full))
      continue
    }
    if (/\.tsx?$/.test(entry.name)) found.push(full)
  }
  return found
}

/** หาไฟล์จริงจากเส้นทางที่เขียนใน import */
function resolveModule(fromFile, spec) {
  if (!spec.startsWith('.')) return null

  const base = path.resolve(path.dirname(fromFile), spec)
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

/**
 * ชื่อทั้งหมดที่ไฟล์หนึ่ง export ออกมา
 *
 * ครอบคลุมรูปแบบที่โปรเจกต์นี้ใช้จริง
 * ถ้าเจอ export * from จะคืน null แปลว่า "ตรวจไม่ได้" แล้วข้ามไฟล์นั้นไป
 * ยอมข้ามดีกว่ารายงานผิดว่าพัง
 */
function exportedNames(file) {
  const source = fs.readFileSync(file, 'utf8')
  if (/^\s*export\s+\*\s+from/m.test(source)) return null

  const names = new Set()

  // export function ชื่อ / export const ชื่อ / export class ชื่อ
  for (const match of source.matchAll(
    /^\s*export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)/gm,
  )) {
    names.add(match[1])
  }

  // export interface ชื่อ / export type ชื่อ / export enum ชื่อ
  for (const match of source.matchAll(/^\s*export\s+(?:interface|type|enum)\s+(\w+)/gm)) {
    names.add(match[1])
  }

  // export { ก, ข as ค } และ export { ... } from '...'
  for (const match of source.matchAll(/^\s*export\s*\{([^}]*)\}/gms)) {
    for (const piece of match[1].split(',')) {
      const cleaned = piece.trim().replace(/^type\s+/, '')
      if (!cleaned) continue
      const asMatch = cleaned.match(/\bas\s+(\w+)$/)
      names.add(asMatch ? asMatch[1] : cleaned)
    }
  }

  return names
}

const FILES = collectFiles(SRC)

check('ต้องหาไฟล์ต้นทางเจอ ไม่ใช่ตรวจไฟล์เปล่า', () => {
  assert(FILES.length > 40, `เจอแค่ ${FILES.length} ไฟล์ ซึ่งน้อยผิดปกติ`)
  assert(
    FILES.some((file) => file.endsWith('.tsx')),
    'ไม่เจอไฟล์ .tsx เลย ทั้งที่เป็นกลุ่มที่ตัวตรวจนี้มีไว้เพื่อดักโดยเฉพาะ',
  )
})

check('ทุกไฟล์ต้องนำเข้าชื่อที่ปลายทาง export ไว้จริง', () => {
  const problems = []

  for (const file of FILES) {
    const source = fs.readFileSync(file, 'utf8')

    // จับเฉพาะ import แบบมีวงเล็บปีกกา ซึ่งเป็นแบบที่พลาดได้
    for (const match of source.matchAll(
      /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gms,
    )) {
      const target = resolveModule(file, match[2])
      if (!target) continue

      const available = exportedNames(target)
      if (!available) continue

      for (const piece of match[1].split(',')) {
        const cleaned = piece.trim().replace(/^type\s+/, '')
        if (!cleaned) continue
        const name = cleaned.split(/\s+as\s+/)[0].trim()
        if (!name) continue

        if (!available.has(name)) {
          problems.push(
            `${path.relative(ROOT, file)} นำเข้า "${name}" จาก ${match[2]} ` +
              'แต่ไฟล์นั้นไม่ได้ export ชื่อนี้',
          )
        }
      }
    }
  }

  assert(problems.length === 0, `\n      ${problems.join('\n      ')}`)
})

check('ทุกเส้นทาง import ในโปรเจกต์ต้องชี้ไปยังไฟล์ที่มีอยู่จริง', () => {
  const missing = []

  for (const file of FILES) {
    const source = fs.readFileSync(file, 'utf8')

    for (const match of source.matchAll(/from\s*['"](\.[^'"]+)['"]/g)) {
      if (resolveModule(file, match[1])) continue
      missing.push(`${path.relative(ROOT, file)} → ${match[1]}`)
    }
  }

  assert(missing.length === 0, `\n      ${missing.join('\n      ')}`)
})

console.log(`ผ่าน ${passed} ข้อ · ตรวจ ${FILES.length} ไฟล์`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
