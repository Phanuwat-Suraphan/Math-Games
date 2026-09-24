/**
 * 📝 ใบงานสูตรคูณ ZOMBIE RESCUE: สร้างหน้า HTML พร้อมพิมพ์ A4 (หน้า 1 ใบงาน · หน้า 2 เฉลย)
 *
 * ทำไมสร้างเป็นข้อความ HTML ในโค้ดเกม
 *
 * ครูกดพิมพ์ได้จากในเกมทันที ไม่ต้องมีไฟล์แยก และทุกครั้งที่กดได้ชุดใหม่ (เด็กข้างกันลอกกันไม่ได้)
 * ชุดโจทย์คำนวณจากเลขชุด (seed) อย่างเดียว เลขชุดพิมพ์อยู่บนใบงานและใบเฉลย
 * ครูจึงจับคู่ใบงานกับเฉลยได้ และสร้างชุดเดิมซ้ำได้ ชุดทดสอบตรวจเฉลยทุกข้อ
 *
 * กฎที่ห้ามแก้
 * · โจทย์เป็นคู่ในสมุดวัคซีนเสมอ (แม่ 2 3 4 5 10 คูณ 1–10) เรียง กลุ่ม × แม่ เหมือนในเกม
 * · ข้อหา □ ต้องมีอย่างน้อย 2 กลุ่ม (ไม่งั้นคำตอบคือ 1 เสมอ)
 * · ภาพให้นับไม่เกิน 30 ชิ้น
 * · ข้อความทั้งหมดมาจากค่าคงที่ในไฟล์นี้ ไม่มีข้อความจากผู้ใช้ จึงวางลง HTML ได้ตรง ๆ
 */

import { zheadInner } from './art'
import { MAX_DRAWN, TABLES } from './questions'
import type { Rng, Table } from './questions'
import { villagerAt, villagerInner, villagerZombieInner, VILLAGER_COUNT, VILLAGER_VIEWBOX } from './villagers'

export type SheetTable = Table | 'mix'
export type SheetKind = 'product' | 'missingGroups' | 'missingEach' | 'picture' | 'story'

export interface SheetItem {
  kind: SheetKind
  groups: number
  each: Table
  product: number
  /** ข้อความของโจทย์ปัญหา (เฉพาะ story) */
  text?: string
  unit?: string
}

export interface Worksheet {
  table: SheetTable
  seed: number
  items: SheetItem[]
}

/** จำนวนข้อของแต่ละตอน รวม 20 ข้อ */
export const SHEET_PARTS: Array<{ kind: SheetKind | 'missing'; count: number; title: string }> = [
  { kind: 'product', count: 8, title: 'ตอนที่ 1 · หาผลคูณ' },
  { kind: 'missing', count: 6, title: 'ตอนที่ 2 · เติมตัวเลขใน □' },
  { kind: 'picture', count: 4, title: 'ตอนที่ 3 · ดูภาพแล้วเขียนประโยคการคูณ' },
  { kind: 'story', count: 2, title: 'ตอนที่ 4 · โจทย์ปัญหา' },
]
export const SHEET_TOTAL = SHEET_PARTS.reduce((s, p) => s + p.count, 0)

const STORIES: Array<{ text: (g: number, e: number) => string; unit: string }> = [
  { text: (g, e) => `ชาวเมือง ${g} กลุ่ม กลุ่มละ ${e} คน ต้องฉีดวัคซีนคนละ 1 เข็ม ต้องใช้วัคซีนทั้งหมดกี่เข็ม`, unit: 'เข็ม' },
  { text: (g, e) => `ดร.ซอมโบ ใส่ยาลงกล่อง ${g} กล่อง กล่องละ ${e} ขวด มียาทั้งหมดกี่ขวด`, unit: 'ขวด' },
  { text: (g, e) => `ทีมผู้รอดชีวิตเก็บเสบียงได้ ${g} ถุง ถุงละ ${e} กระป๋อง ได้เสบียงทั้งหมดกี่กระป๋อง`, unit: 'กระป๋อง' },
  { text: (g, e) => `รถพยาบาล ${g} คัน คันละ ${e} คน พาชาวเมืองไปโรงพยาบาลได้ทั้งหมดกี่คน`, unit: 'คน' },
  { text: (g, e) => `ห้องทดลองมีชั้นวาง ${g} ชั้น ชั้นละ ${e} หลอด มีหลอดทดลองทั้งหมดกี่หลอด`, unit: 'หลอด' },
]

/** ตัวสุ่มที่กำหนดผลได้ด้วยเลขชุด (mulberry32) */
function seeded(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(list: T[], rng: Rng): T[] {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** เลือกคู่ที่เข้าเงื่อนไข ไม่ซ้ำกันภายในตอน (ถ้าคู่ไม่พอให้วนซ้ำจากต้นแบบสับใหม่) */
function pick(table: SheetTable, count: number, ok: (g: number, e: Table) => boolean, rng: Rng): Array<[number, Table]> {
  const tables = table === 'mix' ? TABLES : [table]
  const pool = tables.flatMap((e) => Array.from({ length: 10 }, (_, i): [number, Table] => [i + 1, e])).filter(([g, e]) => ok(g, e))
  const out: Array<[number, Table]> = []
  while (out.length < count) out.push(...shuffle(pool, rng).slice(0, count - out.length))
  return out
}

export function buildWorksheet(table: SheetTable, seed: number): Worksheet {
  const rng = seeded(seed)
  const item = (kind: SheetKind, [groups, each]: [number, Table]): SheetItem => ({ kind, groups, each, product: groups * each })
  const items: SheetItem[] = []
  items.push(...pick(table, 8, () => true, rng).map((p) => item('product', p)))
  items.push(...pick(table, 6, (g) => g >= 2, rng).map((p, i) => item(i % 2 === 0 ? 'missingGroups' : 'missingEach', p)))
  items.push(...pick(table, 4, (g, e) => g >= 2 && g * e <= MAX_DRAWN, rng).map((p) => item('picture', p)))
  const stories = shuffle(STORIES, rng)
  items.push(
    ...pick(table, 2, (g) => g >= 2, rng).map(([g, e], i) => ({ ...item('story', [g, e]), text: stories[i].text(g, e), unit: stories[i].unit })),
  )
  return { table, seed, items }
}

/** เฉลยของหนึ่งข้อเป็นข้อความสั้น */
export function answerOf(it: SheetItem): string {
  switch (it.kind) {
    case 'product':
      return String(it.product)
    case 'missingGroups':
      return `□ = ${it.groups}`
    case 'missingEach':
      return `□ = ${it.each}`
    case 'picture':
      return `${it.groups} × ${it.each} = ${it.product}`
    case 'story':
      return `${it.groups} × ${it.each} = ${it.product} ตอบ ${it.product} ${it.unit ?? ''}`.trim()
  }
}

/* ── HTML ─────────────────────────────────────────────────── */

const svg = (inner: string, vb: string, mm: number) => `<svg viewBox="${vb}" style="width:${mm}mm;height:${mm}mm" aria-hidden="true">${inner}</svg>`
const zhead = (mm: number) => svg(zheadInner(), '0 0 20 20', mm)
const tableLabel = (t: SheetTable) => (t === 'mix' ? 'รวมแม่ 2 3 4 5 10' : `แม่ ${t}`)

function itemHtml(it: SheetItem, n: number): string {
  const box = '<span class="bx"></span>'
  const line = '<span class="ln"></span>'
  switch (it.kind) {
    case 'product':
      return `<li><b>${n}.</b> ${it.groups} × ${it.each} = ${line}</li>`
    case 'missingGroups':
      return `<li><b>${n}.</b> ${box} × ${it.each} = ${it.product}</li>`
    case 'missingEach':
      return `<li><b>${n}.</b> ${it.groups} × ${box} = ${it.product}</li>`
    case 'picture': {
      const cols = Math.min(it.each, 5)
      const groups = Array.from({ length: it.groups }, () => `<span class="grp" style="grid-template-columns:repeat(${cols},auto)">${zhead(4).repeat(it.each)}</span>`).join('')
      return `<li class="pic"><b>${n}.</b><div class="grps">${groups}</div><div class="sent">${line} × ${line} = ${line}</div></li>`
    }
    case 'story':
      return `<li class="story"><b>${n}.</b> ${it.text}<div class="sent">ประโยคการคูณ ${line} × ${line} = ${line} &nbsp; ตอบ ${line} ${it.unit ?? ''}</div></li>`
  }
}

/** หน้า HTML ทั้งไฟล์ พร้อมพิมพ์ (เปิดในแท็บใหม่แล้วกดพิมพ์) */
export function worksheetHtml(sheet: Worksheet): string {
  const { items, table, seed } = sheet
  let n = 0
  const parts = SHEET_PARTS.map((part) => {
    const mine = items.slice(n, n + part.count)
    const html = `<section class="part"><h3>${part.title}</h3><ol class="${part.kind}">${mine.map((it, i) => itemHtml(it, n + i + 1)).join('')}</ol></section>`
    n += part.count
    return html
  }).join('')
  const deco = [3, 26, 41, 7].map((i) => svg(villagerZombieInner(villagerAt(i)), VILLAGER_VIEWBOX, 13)).join('')
  const cured = [3, 26, 41, 7].map((i) => svg(villagerInner(villagerAt((i + 11) % VILLAGER_COUNT)), VILLAGER_VIEWBOX, 12)).join('')
  const key = items.map((it, i) => `<li><b>${i + 1}.</b> ${answerOf(it)}</li>`).join('')
  const setNo = `ชุดที่ ${seed}`
  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ใบงานสูตรคูณ ${tableLabel(table)} · ${setNo}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mali:wght@500;600;700&family=Mitr:wght@400;500;600&display=swap">
<style>
  :root{color-scheme:light; --ink:#23324A; --dim:#5D6B82; --teal:#1E9AAE}
  *{box-sizing:border-box}
  body{margin:0; background:#E9EEF3; color:var(--ink); font-family:"Mali","Leelawadee UI",Tahoma,sans-serif}
  .bar{position:sticky; top:0; z-index:2; display:flex; justify-content:center; gap:10px; align-items:center; padding:10px 16px; background:#fff; box-shadow:0 2px 10px rgba(0,0,0,.08); font-family:"Mitr",sans-serif}
  .bar button{font:600 15px "Mitr",sans-serif; border:0; border-radius:999px; background:var(--teal); color:#fff; padding:9px 18px; cursor:pointer}
  .page{width:210mm; height:297mm; overflow:hidden; margin:14px auto; padding:12mm 13mm; background:#fff; position:relative; box-shadow:0 6px 24px rgba(0,0,0,.12)}
  header{display:flex; align-items:center; gap:4mm; border-bottom:.6mm solid var(--teal); padding-bottom:3mm}
  header h1{margin:0; font:600 17pt "Mitr",sans-serif; color:#E07415; line-height:1.15}
  header h1 small{display:block; font:400 10pt "Mali",sans-serif; color:var(--dim)}
  header .deco{margin-left:auto; display:flex}
  .who{display:grid; grid-template-columns:3fr 1fr 1fr 1.4fr; gap:4mm; margin:3.5mm 0 1mm; font-size:10.5pt}
  .who span{border-bottom:.3mm dotted #8A97AB; padding-bottom:.6mm}
  .part{margin-top:2.8mm}
  .part h3{margin:0 0 1.6mm; font:600 11.5pt "Mitr",sans-serif; color:var(--teal)}
  ol{list-style:none; margin:0; padding:0; font-size:14pt}
  ol.product, ol.missing{display:grid; grid-template-columns:repeat(4,1fr); gap:3mm 4mm}
  ol.missing{grid-template-columns:repeat(3,1fr)}
  ol.picture{display:grid; grid-template-columns:repeat(2,1fr); gap:3mm 6mm}
  ol b{font:600 10pt "Mitr",sans-serif; color:var(--dim); margin-right:1.5mm}
  .ln{display:inline-block; width:14mm; border-bottom:.35mm solid var(--ink); vertical-align:-1mm}
  .bx{display:inline-block; width:9mm; height:9mm; border:.45mm solid var(--ink); border-radius:1.6mm; vertical-align:middle}
  .pic{border:.3mm dashed #B7C1CF; border-radius:3mm; padding:1.6mm 3mm}
  .grps{display:flex; flex-wrap:wrap; gap:1.2mm; margin:.8mm 0 1.6mm}
  .grp{display:inline-grid; gap:.3mm; padding:.8mm; border:.35mm solid var(--teal); border-radius:2mm}
  .sent{font-size:13pt}
  ol.story li{font-size:12pt; line-height:1.6; margin-bottom:2.4mm}
  .score{display:flex; align-items:center; gap:4mm; margin-top:4mm; padding:2.4mm 3mm; background:#F0FAF3; border-radius:3mm; font-size:10.5pt}
  .score .heads{display:flex; flex-wrap:wrap; gap:.8mm}
  .score b{font:600 13pt "Mitr",sans-serif; white-space:nowrap}
  .foot{position:absolute; bottom:6mm; left:13mm; right:13mm; display:flex; justify-content:space-between; font:400 8pt "Mitr",sans-serif; color:#9AA6B8}
  .key h2{margin:0; font:600 16pt "Mitr",sans-serif; color:var(--teal)}
  .key ol{display:grid; grid-template-columns:repeat(2,1fr); gap:2.4mm 8mm; font-size:12.5pt; margin-top:4mm}
  .key p{color:var(--dim); font-size:10pt}
  @page{size:A4 portrait; margin:0}
  @media print{ body{background:#fff} .bar{display:none} .page{margin:0; box-shadow:none; break-after:page} .page:last-child{break-after:auto} }
</style></head><body>
<div class="bar"><span>📝 ใบงานสูตรคูณ ${tableLabel(table)} · ${setNo}</span><button type="button" onclick="window.print()">🖨️ พิมพ์ (หน้า 1 ใบงาน · หน้า 2 เฉลย)</button></div>
<div class="page">
  <header>${svg(villagerZombieInner(villagerAt(12)), VILLAGER_VIEWBOX, 16)}<h1>📝 ใบงานสูตรคูณ ${tableLabel(table)}<small>ZOMBIE RESCUE · ช่วยชาวเมืองด้วยการคูณ!</small></h1><div class="deco">${deco}</div></header>
  <div class="who"><span>ชื่อ</span><span>ชั้น</span><span>เลขที่</span><span>วันที่</span></div>
  ${parts}
  <div class="score">${cured}<div>ตอบถูกข้อละ 1 คน ระบายหน้าซอมบี้ให้เป็นคนตามจำนวนข้อที่ถูก<div class="heads">${zhead(5.4).repeat(SHEET_TOTAL)}</div></div><b>ได้ ____ / ${SHEET_TOTAL}</b></div>
  <div class="foot"><span>ZOMBIE RESCUE · ใบงานสูตรคูณ ป.2</span><span>${setNo}</span></div>
</div>
<div class="page key">
  <h2>🔑 เฉลยใบงาน ${tableLabel(table)} · ${setNo}</h2>
  <p>ประโยคการคูณที่สลับตัวคูณ (เช่น 4 × 3 กับ 3 × 4) ถือว่าถูก เพราะหนังสือแต่ละเล่มเรียงไม่เหมือนกัน</p>
  <ol>${key}</ol>
  <div class="foot"><span>ZOMBIE RESCUE · เฉลยสำหรับครู</span><span>${setNo}</span></div>
</div>
</body></html>`
}

/** เลขชุดใหม่ 1000–9999 (สั้นพอให้ครูอ่านเทียบกับใบเฉลย) */
export function newSheetSeed(rng: Rng): number {
  return 1000 + Math.floor(rng() * 9000)
}
