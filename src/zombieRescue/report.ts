/**
 * 📄 รายงานความก้าวหน้าสูตรคูณ (A4 หนึ่งหน้า) สำหรับผู้ปกครองหรือครู
 *
 * ทำไมต้องมี
 *
 * สมุดวัคซีนบนเครื่องบอกได้ละเอียดว่าเด็กคล่องข้อไหน แต่ผู้ปกครองไม่ได้เปิดเกมดู
 * หน้านี้สรุปเป็นกระดาษแผ่นเดียว: ภาพรวมแต่ละแม่ ตารางทั้ง 50 ข้อ ข้อที่ควรฝึก และคำแนะนำ
 *
 * กฎที่ห้ามแก้
 * · ชื่อผู้เล่นมาจากผู้ใช้ ต้องผ่าน esc() ทุกครั้งก่อนวางลง HTML (ข้อความอื่นมาจากค่าคงที่ในโค้ด)
 * · คำแนะนำพูดในแง่บวกเสมอ ไม่ตีตราเด็ก ("ยังพลาด" ไม่ใช่ "ไม่เก่ง")
 */

import { zheadInner } from './art'
import { TABLES } from './questions'
import type { Table } from './questions'
import { FACT_COUNT, allFacts, curedCount, weakFacts } from './vaccineBook'
import type { VaccineBook } from './vaccineBook'
import type { RushBest } from './rush'
import { VILLAGER_VIEWBOX, villagerAt, villagerFor, villagerInner } from './villagers'

export interface ReportInput {
  name: string
  /** วันที่ที่พิมพ์ (ส่งเข้ามาเป็นข้อความ ชุดทดสอบจึงได้ผลคงที่) */
  date: string
  book: VaccineBook
  rushBest: RushBest
  /** ตอบโจทย์คูณถูกรวม (records.zombieCorrect) */
  correct: number
  plays: number
  cures: number
}

export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const TABLE_COLOR: Record<number, string> = { 2: '#2E9E4F', 3: '#D9730D', 4: '#1E78D9', 5: '#8B4FC7', 10: '#E0453A' }

/** คำแนะนำตามผล เรียงจากเรื่องที่ควรทำก่อน (ไม่เกิน 3 ข้อ) */
export function reportTips(book: VaccineBook): string[] {
  const tips: string[] = []
  const weak = weakFacts(book)
  const total = curedCount(book)
  const started = allFacts(book).some((f) => f.status !== 'new')
  if (!started) return ['เริ่มจากแม่ 2 และแม่ 10 ซึ่งง่ายที่สุด เล่นโหมดฝึกสูตรคูณวันละรอบ (10 ข้อ ใช้เวลาราว 5 นาที)']
  if (weak.length) {
    tips.push(`ฝึก "ข้อที่ยังพลาด" ในเกม (แท็บสมุดวัคซีน → ฝึกข้อที่ยังพลาด) ตอนนี้มี ${weak.length} ข้อ เช่น ${weak.slice(0, 3).map((f) => `${f.groups} × ${f.each}`).join(', ')}`)
  }
  const weakest = TABLES.map((t) => ({ t, n: curedCount(book, t) })).sort((a, b) => a.n - b.n)[0]
  if (weakest.n < 10) tips.push(`แม่ที่ควรฝึกต่อคือแม่ ${weakest.t} (หายป่วย ${weakest.n}/10 คน) ลองท่องนับทีละ ${weakest.t} ด้วยกันก่อนนอน`)
  if (total >= 25 && total < FACT_COUNT) tips.push('เก่งมาก! ลองโหมด ⚡ ซอมบี้บุก! เพื่อฝึกตอบให้เร็วขึ้นโดยไม่ต้องนับนิ้ว')
  if (total === FACT_COUNT) tips.push('สะสมครบ 50 ช่องแล้ว 🎉 ลองโหมด ➗ แบ่งวัคซีน เพื่อเริ่มฝึกการหารจากสูตรคูณที่รู้แล้ว')
  return tips.slice(0, 3)
}

export function reportHtml(input: ReportInput): string {
  const { book } = input
  const name = esc(input.name.trim() || 'ผู้เล่น')
  const facts = allFacts(book)
  const total = curedCount(book)
  const weak = weakFacts(book)
  const head = (mm: number) => `<svg viewBox="0 0 20 20" style="width:${mm}mm;height:${mm}mm" aria-hidden="true">${zheadInner()}</svg>`
  const vil = (i: number, mm: number) => `<svg viewBox="${VILLAGER_VIEWBOX}" style="width:${mm}mm;height:${mm}mm" aria-hidden="true">${villagerInner(villagerAt(i))}</svg>`

  const bars = TABLES.map((t: Table) => {
    const n = curedCount(book, t)
    const best = input.rushBest[String(t)]
    return `<div class="bar" style="--tc:${TABLE_COLOR[t]}"><b>แม่ ${t}</b><span class="track"><span style="width:${n * 10}%"></span></span><i>${n}/10</i><small>${best ? `⚡ ${best} คน` : ''}</small></div>`
  }).join('')

  const grid = TABLES.map((t) => {
    const cells = facts
      .filter((f) => f.each === t)
      .map((f) => {
        const mark = f.status === 'weak' ? '<em class="weak">!</em>' : f.entry.got ? '<em class="ok">✓</em>' : f.status === 'trying' ? '<em class="try">•</em>' : '<em class="new"></em>'
        const face = f.entry.got ? `<svg viewBox="${VILLAGER_VIEWBOX}" aria-hidden="true">${villagerInner(villagerFor(f.each, f.groups))}</svg>` : head(5)
        return `<td>${face}<span>${f.groups}×${f.each}</span>${mark}</td>`
      })
      .join('')
    return `<tr style="--tc:${TABLE_COLOR[t]}"><th>แม่ ${t}</th>${cells}</tr>`
  }).join('')

  const weakList = weak.length
    ? weak
        .slice(0, 12)
        .map((f) => `<li>${f.groups} × ${f.each} = ${f.groups * f.each}</li>`)
        .join('')
    : '<li class="none">ไม่มีข้อที่ตอบผิดครั้งล่าสุด 👍</li>'
  const tips = reportTips(book)
    .map((t) => `<li>${esc(t)}</li>`)
    .join('')
  const mixBest = input.rushBest.mix

  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>รายงานสูตรคูณ · ${name}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mali:wght@500;600;700&family=Mitr:wght@400;500;600&display=swap">
<style>
  :root{color-scheme:light; --ink:#23324A; --dim:#5D6B82; --teal:#1E9AAE}
  *{box-sizing:border-box}
  body{margin:0; background:#E9EEF3; color:var(--ink); font-family:"Mali","Leelawadee UI",Tahoma,sans-serif}
  .tb{position:sticky; top:0; z-index:2; display:flex; justify-content:center; gap:10px; align-items:center; padding:10px 16px; background:#fff; box-shadow:0 2px 10px rgba(0,0,0,.08); font-family:"Mitr",sans-serif}
  .tb button{font:600 15px "Mitr",sans-serif; border:0; border-radius:999px; background:var(--teal); color:#fff; padding:9px 18px; cursor:pointer}
  .page{width:210mm; height:297mm; overflow:hidden; margin:14px auto; padding:12mm 13mm; background:#fff; position:relative; box-shadow:0 6px 24px rgba(0,0,0,.12)}
  header{display:flex; align-items:center; gap:4mm; border-bottom:.6mm solid var(--teal); padding-bottom:3mm}
  header h1{margin:0; font:600 17pt "Mitr",sans-serif; color:#E07415; line-height:1.2}
  header h1 small{display:block; font:400 10pt "Mali",sans-serif; color:var(--dim)}
  header .who{margin-left:auto; text-align:right; font-size:11pt}
  header .who b{display:block; font:600 15pt "Mitr",sans-serif; color:var(--ink)}
  .sum{display:grid; grid-template-columns:repeat(4,1fr); gap:3mm; margin-top:4mm}
  .sum div{border-radius:3mm; background:#F3F8FA; padding:2.4mm; text-align:center}
  .sum b{display:block; font:600 18pt "Mitr",sans-serif; color:var(--teal)}
  .sum span{font-size:9pt; color:var(--dim)}
  h2{margin:5mm 0 2mm; font:600 12pt "Mitr",sans-serif; color:var(--teal)}
  .bar{display:grid; grid-template-columns:14mm 1fr 12mm 18mm; align-items:center; gap:3mm; margin:1.4mm 0; font-size:11pt}
  .bar b{color:var(--tc)}
  .track{height:4.2mm; border-radius:2mm; background:#EEF1F5; overflow:hidden}
  .track span{display:block; height:100%; background:var(--tc)}
  .bar small{color:var(--dim)}
  table{width:100%; border-collapse:separate; border-spacing:1mm}
  th{font:600 10pt "Mitr",sans-serif; color:var(--tc); text-align:left; width:13mm}
  td{position:relative; text-align:center; border:.3mm solid #E0E6EE; border-radius:1.6mm; padding:.8mm 0 .4mm; font-size:8.4pt}
  td svg{display:block; margin:0 auto; width:6mm; height:6mm}
  td span{display:block}
  td em{position:absolute; top:-1.2mm; right:-.8mm; font-style:normal; font-weight:700; font-size:8pt; width:3.6mm; height:3.6mm; line-height:3.6mm; border-radius:50%}
  em.ok{background:#2E9E5B; color:#fff}
  em.weak{background:#E0533D; color:#fff}
  em.try{background:#FFD233; color:#23324A}
  .legend{font-size:9pt; color:var(--dim); margin-top:1mm}
  .cols{display:grid; grid-template-columns:1fr 1.3fr; gap:6mm}
  .weakl{display:grid; grid-template-columns:repeat(2,1fr); gap:1mm 4mm; list-style:none; padding:0; margin:0; font-size:12pt}
  .weakl .none{grid-column:1/-1; font-size:11pt; color:#2E7D3E}
  .tips{margin:0; padding-left:5mm; font-size:10.6pt; line-height:1.55}
  .sign{position:absolute; left:13mm; right:13mm; bottom:14mm; display:grid; grid-template-columns:1fr 1fr; gap:10mm; font-size:10pt; color:var(--dim)}
  .sign div{border-top:.35mm dotted #8A97AB; padding-top:1.2mm}
  .foot{position:absolute; bottom:6mm; left:13mm; right:13mm; display:flex; justify-content:space-between; font:400 8pt "Mitr",sans-serif; color:#9AA6B8}
  @page{size:A4 portrait; margin:0}
  @media print{ body{background:#fff} .tb{display:none} .page{margin:0; box-shadow:none} }
</style></head><body>
<div class="tb"><span>📄 รายงานสูตรคูณของ ${name}</span><button type="button" onclick="window.print()">🖨️ พิมพ์</button></div>
<div class="page">
  <header>${vil(26, 16)}<h1>📄 รายงานความก้าวหน้าสูตรคูณ<small>ZOMBIE RESCUE · สมุดวัคซีน</small></h1><div class="who"><b>${name}</b>${esc(input.date)}</div></header>
  <div class="sum">
    <div><b>${total}/${FACT_COUNT}</b><span>สติกเกอร์ชาวเมือง</span></div>
    <div><b>${Math.max(0, Math.floor(input.correct)).toLocaleString('th-TH')}</b><span>ตอบโจทย์คูณถูก (ข้อ)</span></div>
    <div><b>${Math.max(0, Math.floor(input.plays))}</b><span>เกมกระดานที่เล่น (สร้างยาสำเร็จ ${Math.max(0, Math.floor(input.cures))})</span></div>
    <div><b>${mixBest ? `⚡ ${mixBest}` : '–'}</b><span>ซอมบี้บุก! รวมทุกแม่ (ดีสุด)</span></div>
  </div>
  <h2>ภาพรวมแต่ละแม่ (หายป่วยครบ 10 คน = คล่องทั้งแม่)</h2>
  ${bars}
  <h2>สูตรคูณทั้ง 50 ข้อ</h2>
  <table>${grid}</table>
  <p class="legend">✓ คล่องแล้ว (ตอบถูก 2 ครั้งติดกัน) · • กำลังฝึก · ! ตอบผิดครั้งล่าสุด ควรทบทวน · หน้าซอมบี้ = ยังไม่ได้ลอง</p>
  <div class="cols">
    <div><h2>🔁 ข้อที่ควรทบทวน</h2><ul class="weakl">${weakList}</ul></div>
    <div><h2>💡 ฝึกต่อที่บ้าน</h2><ol class="tips">${tips}</ol></div>
  </div>
  <div class="sign"><div>ลายมือชื่อผู้ปกครอง</div><div>ลายมือชื่อครู</div></div>
  <div class="foot"><span>ZOMBIE RESCUE · รายงานนี้สร้างจากข้อมูลในเครื่องที่เล่น</span><span>${esc(input.date)}</span></div>
</div>
</body></html>`
}
