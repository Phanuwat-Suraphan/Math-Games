/**
 * เขียนไฟล์ Excel (.xlsx) เองโดยไม่ใช้ไลบรารีภายนอก (เว็บนี้ทำงานออฟไลน์ได้)
 *
 * ไฟล์ .xlsx คือไฟล์ zip ที่มี XML อยู่ข้างใน ใช้ zip แบบไม่บีบอัด (stored) จึงเขียนง่ายและเปิดได้ทุกโปรแกรม
 * - ข้อความเก็บแบบ inline string ไม่ต้องมีตาราง sharedStrings
 * - แถวหัวตารางตัวหนา มีพื้นสี และตรึงไว้ด้านบนเวลาเลื่อน
 * - ตั้งความกว้างคอลัมน์ได้ และตั้งหน้ากระดาษ A4 ไว้ให้พิมพ์จาก Excel ได้ทันที
 */

export type XCell = string | number | null | undefined

export interface XSheet {
  /** ชื่อชีต (ตัดอักขระที่ Excel ไม่รับ และยาวไม่เกิน 31 ตัว) */
  name: string
  rows: XCell[][]
  /** ความกว้างคอลัมน์ (หน่วยตัวอักษร) */
  widths?: number[]
  /** จำนวนแถวหัวตาราง (ตัวหนา ตรึงไว้) ค่าเริ่มต้น 1 */
  headerRows?: number
  /** พิมพ์แนวนอน (ตารางกว้าง) */
  landscape?: boolean
}

/* ------------------------------------------------------------------ */
/* zip แบบไม่บีบอัด                                                     */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i += 1) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const name = utf8(f.name)
    const crc = crc32(f.data)
    const local = new Uint8Array(30 + name.length)
    const v = new DataView(local.buffer)
    v.setUint32(0, 0x04034b50, true)
    v.setUint16(4, 20, true) // เวอร์ชันที่ต้องใช้แตกไฟล์
    v.setUint16(6, 0x0800, true) // ชื่อไฟล์เป็น UTF-8
    v.setUint16(8, 0, true) // ไม่บีบอัด
    v.setUint16(10, 0, true)
    v.setUint16(12, 0x21, true) // วันที่ 1980-01-01
    v.setUint32(14, crc, true)
    v.setUint32(18, f.data.length, true)
    v.setUint32(22, f.data.length, true)
    v.setUint16(26, name.length, true)
    v.setUint16(28, 0, true)
    local.set(name, 30)
    parts.push(local, f.data)

    const cen = new Uint8Array(46 + name.length)
    const w = new DataView(cen.buffer)
    w.setUint32(0, 0x02014b50, true)
    w.setUint16(4, 20, true)
    w.setUint16(6, 20, true)
    w.setUint16(8, 0x0800, true)
    w.setUint16(10, 0, true)
    w.setUint16(12, 0, true)
    w.setUint16(14, 0x21, true)
    w.setUint32(16, crc, true)
    w.setUint32(20, f.data.length, true)
    w.setUint32(24, f.data.length, true)
    w.setUint16(28, name.length, true)
    w.setUint32(42, offset, true)
    cen.set(name, 46)
    central.push(cen)
    offset += local.length + f.data.length
  }
  const cenSize = central.reduce((s, c) => s + c.length, 0)
  const end = new Uint8Array(22)
  const e = new DataView(end.buffer)
  e.setUint32(0, 0x06054b50, true)
  e.setUint16(8, files.length, true)
  e.setUint16(10, files.length, true)
  e.setUint32(12, cenSize, true)
  e.setUint32(16, offset, true)
  const all = [...parts, ...central, end]
  const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0))
  let at = 0
  for (const p of all) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/* ------------------------------------------------------------------ */
/* SpreadsheetML                                                       */
/* ------------------------------------------------------------------ */

function esc(text: string): string {
  // ตัดอักขระควบคุมที่ XML ไม่รับ
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** A, B, …, Z, AA, AB, … */
export function colName(i: number): string {
  let n = i + 1
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function sheetName(raw: string, used: Set<string>): string {
  const base = raw.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'ชีต'
  let name = base
  let i = 2
  while (used.has(name)) {
    const tail = ` (${i})`
    name = base.slice(0, 31 - tail.length) + tail
    i += 1
  }
  used.add(name)
  return name
}

function sheetXml(s: XSheet): string {
  const head = s.headerRows ?? 1
  const cols = s.widths?.length
    ? `<cols>${s.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(4, Math.min(80, w))}" customWidth="1"/>`).join('')}</cols>`
    : ''
  const pane = head > 0 ? `<pane ySplit="${head}" topLeftCell="A${head + 1}" activePane="bottomLeft" state="frozen"/>` : ''
  const rows = s.rows
    .map((row, r) => {
      const style = r < head ? ' s="1"' : ''
      const cells = row
        .map((v, c) => {
          const ref = `${colName(c)}${r + 1}`
          if (v === null || v === undefined || v === '') return r < head ? `<c r="${ref}"${style}/>` : ''
          if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${style}><v>${v}</v></c>`
          return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`
        })
        .join('')
      return `<row r="${r + 1}">${cells}</row>`
    })
    .join('')
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>` +
    cols +
    `<sheetData>${rows}</sheetData>` +
    '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
    // กระดาษ A4 (paperSize 9) ย่อให้พอดีความกว้างหน้า ส่วนความยาวต่อหน้าได้ตามจริง
    `<pageSetup paperSize="9" orientation="${s.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>` +
    '</worksheet>'
  )
}

const STYLES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="2"><font><sz val="14"/><name val="TH Sarabun New"/></font><font><b/><sz val="14"/><name val="TH Sarabun New"/></font></fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>'

/** สร้างไฟล์ .xlsx จากหลายชีต */
export function buildXlsx(sheets: XSheet[]): Uint8Array {
  const used = new Set<string>()
  const list = sheets.map((s) => ({ ...s, name: sheetName(s.name, used) }))
  const files: { name: string; data: Uint8Array }[] = [
    {
      name: '[Content_Types].xml',
      data: utf8(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          list.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
          '</Types>',
      ),
    },
    {
      name: '_rels/.rels',
      data: utf8(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>',
      ),
    },
    {
      name: 'xl/workbook.xml',
      data: utf8(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          `<sheets>${list.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>` +
          '</workbook>',
      ),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: utf8(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          list.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
          `<Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
          '</Relationships>',
      ),
    },
    { name: 'xl/styles.xml', data: utf8(STYLES) },
    ...list.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: utf8(sheetXml(s)) })),
  ]
  return zipStore(files)
}

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
