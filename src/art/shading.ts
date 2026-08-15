/**
 * ชิ้นส่วนแสงเงาที่ใช้ร่วมกันทุกภาพ
 *
 * ทำไมต้องมีไฟล์นี้: SVG หลายภาพอยู่บนหน้าเดียวกันได้
 * ถ้าตั้งชื่อ id ของไล่สีหรือฟิลเตอร์ซ้ำกัน เบราว์เซอร์จะหยิบอันแรกที่เจอ
 * ภาพที่เหลือจะไปดึงไล่สีของภาพอื่นมาใช้จนสีเพี้ยนทั้งหน้า
 *
 * ทุกฟังก์ชันในไฟล์นี้จึงบังคับให้ส่ง prefix เข้ามาเสมอ
 */

/** ไล่สีทรงกลม ใช้ทำให้ผิวโค้งดูมีปริมาตร แสงมาจากซ้ายบน */
export function sphereGradient(
  id: string,
  light: string,
  mid: string,
  dark: string,
): string {
  return `
    <radialGradient id="${id}" cx="35%" cy="28%" r="78%">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="48%" stop-color="${mid}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </radialGradient>`
}

/** ไล่สีแนวดิ่ง ใช้กับพื้นผิวแบนที่ต้องการให้ดูมีทิศทางแสง */
export function verticalGradient(
  id: string,
  top: string,
  bottom: string,
): string {
  return `
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${top}"/>
      <stop offset="100%" stop-color="${bottom}"/>
    </linearGradient>`
}

/** ไล่สีแนวเฉียง ให้ความรู้สึกว่าแสงส่องมาจากมุมหนึ่ง */
export function diagonalGradient(
  id: string,
  from: string,
  to: string,
): string {
  return `
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>`
}

/** ฟิลเตอร์เบลอ ใช้ทำเงาตกกระทบให้ขอบนุ่ม ไม่ใช่เงาขอบคม */
export function blurFilter(id: string, amount = 2.5): string {
  return `
    <filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${amount}"/>
    </filter>`
}

/** ฟิลเตอร์เรืองแสง ใช้กับของที่ควรดูเปล่งประกาย เช่น คริสตัลหรือเวทมนตร์ */
export function glowFilter(id: string, amount = 2): string {
  return `
    <filter id="${id}" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="${amount}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>`
}

/**
 * เงาตกกระทบบนพื้น
 * วางไว้ก่อนตัวละครเสมอ เพื่อให้อยู่ใต้ตัว ไม่ทับตัวละคร
 */
export function groundShadow(
  filterId: string,
  cx: number,
  cy: number,
  rx: number,
  ry = rx * 0.2,
): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
    fill="#000" opacity=".32" filter="url(#${filterId})"/>`
}

/**
 * แสงขอบ — เส้นสว่างบาง ๆ ที่ขอบด้านตรงข้ามแหล่งแสง
 * เป็นเทคนิคที่ทำให้วัตถุ "หลุดออกมาจากพื้นหลัง" ชัดที่สุด
 */
export function rimLight(path: string, color = '#fff', width = 1.6): string {
  return `<path d="${path}" fill="none" stroke="${color}"
    stroke-width="${width}" opacity=".35" stroke-linecap="round"/>`
}

/**
 * กรอบสำหรับตัดแสงขอบ ใส่ใน defs
 * ปกติครอบเฉพาะฝั่งตรงข้ามแหล่งแสง คือฝั่งขวาของภาพ
 */
export function edgeClip(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`
}

/**
 * แสงขอบแบบตีเส้นทับรูปทรงจริง แล้วตัดให้เหลือแค่ฝั่งเดียว
 *
 * ต่างจาก rimLight ตรงที่ไม่ต้องเดาพิกัดเส้นรอบตัวเอง
 * ให้ส่ง element ตัวเดิมที่ใช้วาดตัวละครเข้ามาเลย (fill จะถูกบังคับเป็น none)
 * แสงจึงเดินตามเส้นรอบตัวเป๊ะ ๆ เสมอ แม้จะแก้รูปทรงทีหลัง
 *
 * เส้นถูกวาดคร่อมขอบ ครึ่งหนึ่งจึงล้นออกนอกตัวเล็กน้อย
 * ซึ่งตรงกับแสงขอบของจริงที่เลียออกมานอกเงา
 */
export function edgeLight(
  clipId: string,
  element: string,
  color = '#fff',
  width = 2.2,
  opacity = 0.32,
): string {
  return `<g clip-path="url(#${clipId})" fill="none" stroke="${color}"
    stroke-width="${width}" opacity="${opacity}" stroke-linecap="round">${element}</g>`
}

/** จุดแสงสะท้อนบนผิวมัน ทำให้ดูเป็นวัตถุมีผิวจริง */
export function specular(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotate = -25,
  opacity = 0.4,
): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff"
    opacity="${opacity}" transform="rotate(${rotate} ${cx} ${cy})"/>`
}

/**
 * ดวงตาที่ดูมีชีวิต
 *
 * ชั้นที่ทำให้ดูมีมิติ: เบ้าตาลึก → ตาขาวโค้ง → ม่านตา → รูม่านตา
 * → แสงสะท้อนดวงใหญ่ → แสงสะท้อนดวงเล็ก → เปลือกตาบน
 */
export function livingEye(
  cx: number,
  cy: number,
  r: number,
  irisColor = '#3b1d5e',
  blinkDelay = 0,
): string {
  const pupil = r * 0.45
  return `
    <ellipse cx="${cx}" cy="${cy + r * 0.08}" rx="${r * 1.05}" ry="${r * 1.02}"
      fill="#000" opacity=".22"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fdfdff"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#eyeShade)" opacity=".18"/>
    <circle cx="${cx}" cy="${cy + r * 0.1}" r="${r * 0.62}" fill="${irisColor}">
      <animate attributeName="cy"
        values="${cy + r * 0.1};${cy + r * 0.1};${cy - r * 0.15};${cy + r * 0.1}"
        dur="5s" begin="${blinkDelay}s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${cy + r * 0.1}" r="${pupil}" fill="#0b0616">
      <animate attributeName="cy"
        values="${cy + r * 0.1};${cy + r * 0.1};${cy - r * 0.15};${cy + r * 0.1}"
        dur="5s" begin="${blinkDelay}s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx - r * 0.3}" cy="${cy - r * 0.32}" r="${r * 0.26}" fill="#fff" opacity=".95"/>
    <circle cx="${cx + r * 0.25}" cy="${cy + r * 0.3}" r="${r * 0.13}" fill="#fff" opacity=".55"/>`
}

/**
 * ไล่สีที่ใช้ในดวงตา ต้องใส่ใน defs ของภาพที่เรียก livingEye
 *
 * อันนี้จงใจใช้ id ซ้ำกันได้ทุกภาพ ต่างจากไล่สีอื่น
 * เพราะนิยามเหมือนกันเป๊ะทุกภาพ ต่อให้ชนกันก็ได้ผลเดียวกัน
 * การชน id เป็นปัญหาเฉพาะตอนที่นิยามต่างกันเท่านั้น
 */
export const EYE_SHADE_DEF = `
  <radialGradient id="eyeShade" cx="50%" cy="18%" r="80%">
    <stop offset="0%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#1e1b4b" stop-opacity="1"/>
  </radialGradient>`
