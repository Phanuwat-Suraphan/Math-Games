import { newPlayer, type Player } from './progress'
import { compareStudents, rosterPlayerId, studentKey, type StudentInfo } from './classroom'

/**
 * ทะเบียนนักเรียน: อ่านรายชื่อจากไฟล์ CSV หรือข้อความที่คัดลอกจาก Excel
 * แล้วสร้าง/ปรับปรุงผู้เล่นของนักเรียนแต่ละคน (ความก้าวหน้าเดิมไม่หาย)
 */

export interface RosterRow extends StudentInfo {
  /** ชื่อเล่น (ใช้แสดงในเกม ถ้าไม่มีใช้ชื่อจริง) */
  nick: string
  /** แถวที่เท่าไรในไฟล์ (ไว้บอกครูเมื่อมีข้อผิดพลาด) */
  line: number
}

export interface RosterRead {
  rows: RosterRow[]
  errors: string[]
}

/** แยก CSV/TSV เป็นตาราง รองรับเครื่องหมายคำพูด จุลภาคในช่อง ขึ้นบรรทัดใหม่ในช่อง และ BOM */
export function parseTable(input: string): string[][] {
  const textIn = input.replace(/^﻿/, '')
  const firstLine = textIn.split(/\r?\n/, 1)[0] ?? ''
  const sep = firstLine.includes('\t') ? '\t' : firstLine.split(';').length > firstLine.split(',').length ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < textIn.length; i += 1) {
    const ch = textIn[i]
    if (quoted) {
      if (ch === '"') {
        if (textIn[i + 1] === '"') {
          cell += '"'
          i += 1
        } else quoted = false
      } else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === sep) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && textIn[i + 1] === '\n') i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ''))
}

type Field = 'no' | 'code' | 'prefix' | 'first' | 'last' | 'full' | 'nick' | 'room'

const HEADER_WORDS: [Field, string[]][] = [
  ['nick', ['ชื่อเล่น', 'nickname', 'nick']],
  ['full', ['ชื่อสกุล', 'ชื่อนามสกุล', 'ชื่อและนามสกุล', 'fullname', 'name']],
  ['last', ['นามสกุล', 'สกุล', 'lastname', 'surname', 'last']],
  ['first', ['ชื่อจริง', 'ชื่อ', 'firstname', 'first']],
  ['prefix', ['คำนำหน้าชื่อ', 'คำนำหน้า', 'prefix', 'title']],
  ['code', ['เลขประจำตัวนักเรียน', 'เลขประจำตัว', 'รหัสนักเรียน', 'รหัส', 'studentid', 'id', 'code']],
  ['no', ['เลขที่', 'ลำดับที่', 'ลำดับ', 'ที่', 'no', 'number']],
  ['room', ['ห้องเรียน', 'ห้อง', 'ชั้น', 'room', 'class']],
]

function headerField(cell: string): Field | null {
  const c = cell.toLowerCase().replace(/[\s\-–_.()]/g, '')
  for (const [field, words] of HEADER_WORDS) if (words.includes(c)) return field
  return null
}

const PREFIXES = ['เด็กชาย', 'เด็กหญิง', 'ด.ช.', 'ด.ญ.', 'ดช.', 'ดญ.', 'นางสาว', 'น.ส.', 'นาย', 'นาง', 'Mr.', 'Miss', 'Ms.', 'Mrs.']

/** แยก "ด.ช.สมชาย ใจดี" เป็นคำนำหน้า ชื่อ นามสกุล */
export function splitThaiName(full: string): { prefix: string; first: string; last: string } {
  let rest = full.trim().replace(/\s+/g, ' ')
  let prefix = ''
  for (const p of PREFIXES) {
    if (rest.startsWith(p)) {
      prefix = p === 'เด็กชาย' || p === 'ดช.' ? 'ด.ช.' : p === 'เด็กหญิง' || p === 'ดญ.' ? 'ด.ญ.' : p
      rest = rest.slice(p.length).trim()
      break
    }
  }
  const space = rest.indexOf(' ')
  return space < 0 ? { prefix, first: rest, last: '' } : { prefix, first: rest.slice(0, space), last: rest.slice(space + 1) }
}

/**
 * อ่านรายชื่อนักเรียน
 * - มีแถวหัวตาราง: จับคอลัมน์จากชื่อหัว (เลขที่ เลขประจำตัว คำนำหน้า ชื่อ นามสกุล ชื่อเล่น ห้อง หรือ ชื่อ-สกุล รวมช่องเดียว)
 * - ไม่มีหัวตาราง: เดาจากรูปแบบ เลขที่ | เลขประจำตัว | ชื่อ-สกุล | ชื่อเล่น
 */
export function readRoster(input: string, defaultRoom: string): RosterRead {
  const table = parseTable(input)
  const errors: string[] = []
  if (table.length === 0) return { rows: [], errors: ['ไม่พบรายชื่อในไฟล์'] }
  const headerMap = table[0].map(headerField)
  const hasHeader = headerMap.filter((f) => f !== null).length >= 2 || (headerMap.includes('first') || headerMap.includes('full'))
  let cols: (Field | null)[]
  let body: string[][]
  let firstLine: number
  if (hasHeader) {
    cols = headerMap
    body = table.slice(1)
    firstLine = 2
  } else {
    // ไม่มีหัว: ช่องที่เป็นตัวเลขล้วนช่องแรก = เลขที่ ช่องตัวเลขถัดไป = เลขประจำตัว ช่องข้อความแรก = ชื่อ-สกุล ช่องข้อความถัดไป = ชื่อเล่น
    const sample = table[0]
    cols = []
    let nums = 0
    let texts = 0
    for (const c of sample) {
      if (/^\d+$/.test(c)) cols.push(nums++ === 0 ? 'no' : nums === 2 ? 'code' : null)
      else cols.push(texts++ === 0 ? 'full' : texts === 2 ? 'nick' : null)
    }
    body = table
    firstLine = 1
  }
  if (!cols.includes('first') && !cols.includes('full')) return { rows: [], errors: ['ไม่พบคอลัมน์ชื่อ (ต้องมีหัวตาราง "ชื่อ" หรือ "ชื่อ-สกุล")'] }

  const rows: RosterRow[] = []
  const seen = new Map<string, number>()
  body.forEach((cells, i) => {
    const line = firstLine + i
    const get = (f: Field) => {
      const idx = cols.indexOf(f)
      return idx >= 0 ? (cells[idx] ?? '').trim() : ''
    }
    let prefix = get('prefix')
    let first = get('first')
    let last = get('last')
    const full = get('full')
    if (full && !first) {
      const s = splitThaiName(full)
      first = s.first
      last = last || s.last
      prefix = prefix || s.prefix
    } else if (first && !prefix) {
      const s = splitThaiName(first)
      if (s.prefix) {
        prefix = s.prefix
        first = s.first
      }
    }
    if (!first) {
      if (cells.some((c) => c !== '')) errors.push(`แถว ${line}: ไม่มีชื่อ (ข้ามแถวนี้)`)
      return
    }
    const noText = get('no').replace(/[^\d]/g, '')
    const no = noText ? Number(noText) : null
    const row: RosterRow = {
      no: no !== null && no > 0 && no < 1000 ? no : null,
      code: get('code').replace(/\s/g, '').slice(0, 20),
      prefix: prefix.slice(0, 12),
      first: first.slice(0, 40),
      last: last.slice(0, 40),
      room: (get('room') || defaultRoom).slice(0, 20),
      nick: get('nick').slice(0, 20),
      line,
    }
    const key = studentKey(row)
    const dup = seen.get(key)
    if (dup !== undefined) {
      errors.push(`แถว ${line}: ซ้ำกับแถว ${dup} (${row.code ? `เลขประจำตัว ${row.code}` : `เลขที่ ${row.no}`}) ใช้แถวหลัง`)
      const at = rows.findIndex((r) => studentKey(r) === key)
      rows[at] = row
    } else rows.push(row)
    seen.set(key, line)
  })
  if (rows.length === 0 && errors.length === 0) errors.push('ไม่พบรายชื่อในไฟล์')
  return { rows, errors }
}

/** แบบฟอร์มรายชื่อสำหรับให้ครูกรอกใน Excel */
export function rosterTemplate(room: string): string {
  const lines = [
    ['เลขที่', 'เลขประจำตัว', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'ชื่อเล่น', 'ห้อง'],
    ['1', '12345', 'ด.ช.', 'สมชาย', 'ใจดี', 'ต้นกล้า', room],
    ['2', '12346', 'ด.ญ.', 'มะลิ', 'รักเรียน', 'มะลิ', room],
  ]
  return '﻿' + lines.map((l) => l.join(',')).join('\r\n')
}

export function studentFromRow(r: RosterRow): StudentInfo {
  return { no: r.no, code: r.code, prefix: r.prefix, first: r.first, last: r.last, room: r.room }
}

/** หาผู้เล่นของนักเรียนคนนี้ (เทียบคีย์ประจำตัว) */
export function findStudent(players: Record<string, Player>, s: StudentInfo): Player | undefined {
  const key = studentKey(s)
  return Object.values(players).find((p) => p.student && studentKey(p.student) === key)
}

export interface RosterApply {
  players: Record<string, Player>
  added: number
  updated: number
}

/**
 * นำรายชื่อเข้าทะเบียน: คนที่มีอยู่แล้วปรับข้อมูลทะเบียน (คะแนนเดิมอยู่ครบ) คนใหม่สร้างผู้เล่นให้
 * ผู้เล่นใหม่ยังไม่ได้เลือกตัวละคร (needsAvatar) นักเรียนเลือกเองตอนเข้าเกมครั้งแรก
 */
export function applyRoster(players: Record<string, Player>, rows: RosterRow[], now = Date.now()): RosterApply {
  const out = { ...players }
  let added = 0
  let updated = 0
  for (const r of rows) {
    const student = studentFromRow(r)
    const old = findStudent(out, student)
    if (old) {
      const keepNick = old.name !== old.student?.first
      out[old.id] = { ...old, student, name: r.nick && !keepNick ? r.nick : old.name }
      updated += 1
    } else {
      let id = rosterPlayerId(student)
      while (out[id]) id += '_'
      out[id] = { ...newPlayer(r.nick || r.first, 'hero', now), id, student, needsAvatar: true }
      added += 1
    }
  }
  return { players: out, added, updated }
}

export function rosterList(players: Record<string, Player>): Player[] {
  return Object.values(players).sort(compareStudents)
}

export function hasRoster(players: Record<string, Player>): boolean {
  return Object.values(players).some((p) => p.student)
}

/* ------------------------------------------------------------------ */
/* สถานะการเข้าร่วมกิจกรรม                                              */
/* ------------------------------------------------------------------ */

export type Participation = 'none' | 'pre' | 'game' | 'post'

/** เล่นภารกิจในเกมแล้วหรือยัง (ทำโจทย์ในด่าน ด่านย่อย หรือมินิเกมอย่างน้อยหนึ่งอย่าง) */
export function hasPlayed(p: Player): boolean {
  return p.answered > 0 || Object.values(p.levels).some((l) => l.plays > 0 || l.stepDone > 0) || Object.keys(p.stages ?? {}).length > 0
}

export function participation(p: Player): Participation {
  if (p.postTest) return 'post'
  if (hasPlayed(p)) return 'game'
  if (p.preTest) return 'pre'
  return 'none'
}

export const PARTICIPATION_LABEL: Record<Participation, string> = {
  none: 'ยังไม่เริ่ม',
  pre: 'ทำแบบทดสอบก่อนเรียนแล้ว',
  game: 'กำลังทำภารกิจในเกม',
  post: 'ทำแบบทดสอบหลังเรียนแล้ว',
}
