/**
 * ภาพตัวละครที่เด็กเลือกเป็นอวตาร วาดด้วย SVG
 *
 * ออกแบบให้เป็นชุดเดียวกัน: หัวกลมโต ตาโต สัดส่วนแบบการ์ตูนเด็ก
 * ต่างกันที่ทรงผม สีเสื้อ และของประจำตัวที่บอกอาชีพ
 *
 * ระบบพิกัด: กรอบ 100 × 100 เหมือนมอนสเตอร์ จึงสลับกันแสดงได้
 *
 * เรื่อง id ของไล่สี:
 * ไล่สีที่ "เหมือนกันทุกตัว" (ผิว เงาพื้น ตา) ใช้ id ร่วมกันได้
 * เพราะต่อให้ชนกันบนหน้าเดียวก็ได้ผลลัพธ์เดียวกัน
 * ส่วนไล่สีเสื้อผ้าที่สีต่างกันทุกตัว ต้องมี prefix ประจำตัวเสมอ
 * ไม่งั้นนักเวทจะไปหยิบไล่สีเสื้อของนักรบมาใช้ กลายเป็นเสื้อแดงทั้งหน้า
 */

import {
  EYE_SHADE_DEF,
  candyStyle,
  blurFilter,
  edgeClip,
  edgeLight,
  groundShadow,
  livingEye,
  rimLight,
  specular,
  sphereGradient,
  verticalGradient,
} from './shading'
import { breathe, flicker, mote, motes, sway } from './motion'

export const HERO_VIEWBOX = '0 0 100 100'

/** สีผิวกลาง ใช้ทุกตัวเพื่อไม่ให้สื่อว่ามีสีผิวไหนเป็นค่ามาตรฐาน */
const SKIN_SHADE = '#c98a60'

/**
 * นิยามที่ทุกอวตารใช้เหมือนกันเป๊ะ จึงใช้ id ซ้ำได้อย่างปลอดภัย
 */
const SHARED_DEFS = `
  ${EYE_SHADE_DEF}
  ${sphereGradient('heroSkin', '#fbdcc0', '#e8b48c', '#b9784f')}
  ${blurFilter('heroBlur', 2.6)}
  ${blurFilter('heroSoft', 1.2)}
  ${edgeClip('heroHeadRim', 60, 22, 40, 34)}`

/**
 * เส้นรอบตัวจริงของลำตัว เก็บไว้ที่เดียวเพื่อให้แสงขอบเดินตามเป๊ะเสมอ
 *
 * เดิมเสื้อยาวลงไปจบที่ขอบล่างของกรอบภาพ (y=96) ซึ่งแปลว่าตัวละครไม่มีขาเลย
 * มองเผิน ๆ เหมือนสไตล์ที่ตั้งใจ แต่พอเรนเดอร์ออกมาดูจริงจะเห็นว่ามันอ่านเป็น
 * ตัวหมากรุกมากกว่าเป็นคน และตอนเดินในสนามรบก็ได้แค่ขยับขึ้นลงทั้งก้อน
 *
 * ย่นชายเสื้อขึ้นมาที่ y=80 แล้วใส่ขาลงไปในที่ว่างที่เหลือ
 */
const BODY_PATH = 'M31 80 Q29 66 50 62 Q71 66 69 80 Z'

/**
 * เฉพาะ "ขอบขวา" ของลำตัว ตัดท่อนปิดด้านล่างออก
 *
 * ถ้าตีเส้นทับ BODY_PATH ทั้งเส้น ท่อน Z ที่ลากปิดตรงชายเสื้อจะถูกตีเส้นด้วย
 * กลายเป็นแถบเทานอนขวางชายเสื้อทุกตัว ซึ่งไม่ใช่แสงขอบแต่เป็นขอบกรอบ
 */
const BODY_RIGHT_EDGE = 'M50 62 Q71 66 69 80'

/**
 * หน้าตาแบบเดียวกันทุกตัว ไล่สีทรงกลมทำให้หัวดูเป็นลูกกลม ไม่ใช่วงกลมแบน
 *
 * หัวเอียงซ้ายขวาช้ากว่าลำตัวหายใจ ทำให้สองจังหวะไม่ตรงกัน
 * ซึ่งเป็นสิ่งที่ทำให้ท่ายืนนิ่งดูเป็นธรรมชาติแทนที่จะดูเป็นหุ่นยนต์
 */
function face(): string {
  return sway(rawFace(), 5.2, 2.6, 50, 58)
}

function rawFace(): string {
  return `
    <!-- เงาใต้คางบนลำคอ ทำให้หัวลอยขึ้นมาหน้าลำตัว -->
    <ellipse cx="50" cy="60" rx="12" ry="4" fill="#000" opacity=".3"
      filter="url(#heroSoft)"/>

    <circle cx="50" cy="40" r="20" fill="url(#heroSkin)"/>

    <!-- เงาที่ครึ่งล่างของหน้า ช่วยบอกว่าแสงมาจากซ้ายบน -->
    <path d="M30 44 Q50 56 70 44 L70 40 Q50 48 30 40 Z"
      fill="${SKIN_SHADE}" opacity=".3"/>

    ${specular(41, 30, 7, 4.5, -30, 0.38)}

    ${livingEye(43, 39, 4.6, '#2a1a3e')}
    ${livingEye(57, 39, 4.6, '#2a1a3e', 0.3)}

    <path d="M44 48 Q50 53.5 56 48" stroke="#2a1a3e" stroke-width="2"
      fill="none" stroke-linecap="round"/>

    <ellipse cx="35" cy="46" rx="3.4" ry="2.6" fill="#f87171" opacity=".3"/>
    <ellipse cx="65" cy="46" rx="3.4" ry="2.6" fill="#f87171" opacity=".3"/>

    ${edgeLight(
      'heroHeadRim',
      '<circle cx="50" cy="40" r="20"/>',
      '#fff5eb',
      2.2,
      0.34,
    )}`
}

/** สีกางเกงกับรองเท้า ใช้ชุดเดียวกันทุกอาชีพ */
const TROUSER = '#4b5563'
const SHOE = '#3f2a1d'

/**
 * มุมสูงสุดที่ขาแกว่งตอนเดิน หน่วยเป็นองศา
 *
 * ค่าเดียวกับที่ SMIL ใช้ เพื่อให้ท่าเดินในหน้าเลือกตัวละคร
 * กับท่าเดินในสนามรบเป็นท่าเดียวกัน ไม่ใช่คนละคนที่เดินคนละแบบ
 */
const LEG_SWING = 11

/**
 * ขาสองข้าง ก้าวสลับกันซ้ายขวา
 *
 * จุดหมุนอยู่ที่สะโพก (y=78) ไม่ใช่กลางขา เพราะขาคนหมุนรอบสะโพก
 * ถ้าหมุนรอบกลางขา ปลายเท้าจะกวาดไปข้างหน้าพร้อมกับสะโพกที่ขยับตาม
 * ซึ่งอ่านเป็นตัวละครกำลังลอยแล้วแกว่งขา ไม่ใช่กำลังเดิน
 *
 * สองข้างใช้ begin ต่างกันครึ่งจังหวะ ขาหนึ่งไปหน้าอีกขาไปหลังเสมอ
 * ถ้าเริ่มพร้อมกันจะกลายเป็นกระโดดสองขาแทนที่จะเป็นเดิน
 */
function legs(pose: number | null): string {
  const leg = (x: number) => `
    <path d="M${x} 75 L${x} 91" stroke="${TROUSER}" stroke-width="7"
      stroke-linecap="round"/>
    <ellipse cx="${x}" cy="93.6" rx="5.6" ry="3.4" fill="${SHOE}"/>`

  /*
   * pose เป็น null แปลว่าให้ขาแกว่งเองด้วย SMIL
   *
   * ใช้กับที่ที่ภาพอยู่ใน DOM จริง เช่นหน้าเลือกตัวละครกับหน้าโปรไฟล์
   * ซึ่งเบราว์เซอร์เล่นอนิเมชันให้เอง
   *
   * ส่วนสนามรบวาดด้วย canvas ซึ่งวาด SVG ผ่าน Image เท่านั้น
   * และ SMIL ในภาพจะไม่ขยับเลยเมื่อวาดลง canvas (ทดลองยืนยันแล้ว)
   * ที่นั่นจึงต้องส่งมุมมาตรง ๆ แล้วสลับภาพหลายท่าเอา
   */
  if (pose === null) {
    return `
      ${sway(leg(43), 1.1, 11, 43, 75)}
      ${sway(leg(57), 1.1, 11, 57, 75, 0.55)}`
  }

  const swing = LEG_SWING * pose
  return `
    <g transform="rotate(${swing.toFixed(1)} 43 75)">${leg(43)}</g>
    <g transform="rotate(${(-swing).toFixed(1)} 57 75)">${leg(57)}</g>`
}

/**
 * ลำตัวพร้อมแขนและขา สีเปลี่ยนตามอาชีพ
 *
 * ลำดับชั้นที่ทำให้ดูมีระยะ: ขา → แขนหลัง (เข้ม) → ลำตัว (ไล่สี) → รอยพับ → คอเสื้อ
 * ขาอยู่ล่างสุดของกอง เพื่อให้ชายเสื้อทับต้นขาไว้ ซึ่งซ่อนรอยต่อพอดี
 */
function body(p: string, dark: string, pose: number | null = null): string {
  return `
    ${legs(pose)}
    <!--
      แขนแกว่งรอบหัวไหล่ ซ้ายขวาคนละจังหวะ
      ถ้าแกว่งพร้อมกันจะดูเหมือนหุ่นเชิดที่ถูกดึงเชือกเส้นเดียว
    -->
    ${sway(
      `<path d="M30 70 L21 82" stroke="${dark}" stroke-width="9" stroke-linecap="round"/>
       <circle cx="21" cy="82" r="5" fill="url(#heroSkin)"/>`,
      3.6,
      4,
      30,
      70,
    )}
    ${sway(
      `<path d="M70 70 L79 82" stroke="${dark}" stroke-width="9" stroke-linecap="round"/>
       <circle cx="79" cy="82" r="5" fill="url(#heroSkin)"/>`,
      4.1,
      4,
      70,
      70,
      0.6,
    )}

    <path d="${BODY_PATH}" fill="url(#${p}-cloth)"/>

    <!-- รอยพับผ้าสองเส้น ทำให้ผืนผ้าไม่แบนเป็นแผ่นเดียว -->
    <g stroke="${dark}" stroke-width="1.3" opacity=".4" fill="none">
      <path d="M41 70 Q39 76 40 80 M59 70 Q61 76 60 80"/>
    </g>

    <!-- คอเสื้อ เป็นเงาลึกที่รอยต่อหัวกับตัว -->
    <path d="M42 62 Q50 70 58 62 L58 66 Q50 74 42 66 Z" fill="${dark}"/>

    ${rimLight(BODY_RIGHT_EDGE, '#fff', 2.2)}`
}

/**
 * โครงร่วมของทุกอวตาร ลด boilerplate และกันลืมเงาพื้น
 *
 * เงาพื้นหดตามจังหวะหายใจ ไม่ใช่วงรีนิ่ง ๆ
 * ถ้าเงาไม่ขยับตามตัว สมองจะอ่านว่าเงาเป็นสติกเกอร์แปะพื้นทันที
 */
function hero(p: string, main: string, dark: string, extraDefs: string, gear: string): string {
  return `
    <defs>
      ${SHARED_DEFS}
      ${candyStyle('heroInk')}
      ${verticalGradient(`${p}-cloth`, main, dark)}
      ${extraDefs}
    </defs>
    <g>
      <animateTransform attributeName="transform" type="scale"
        values="1 1; 0.96 1; 1 1" dur="3.4s" repeatCount="indefinite"
        transform-origin="50 97"
        calcMode="spline" keyTimes="0;0.5;1"
        keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      ${groundShadow('heroBlur', 50, 97, 26, 4.2)}
    </g>
    <g filter="url(#heroInk)">${breathe(gear)}</g>`
}

/** นักรบ — หมวกเหล็กและโล่ */
function warrior(pose: number | null): string {
  const p = 'hw'
  return hero(
    p,
    '#dc2626',
    '#991b1b',
    `
    ${verticalGradient(`${p}-steel`, '#cbd5e1', '#475569')}
    ${sphereGradient(`${p}-gold`, '#fef08a', '#facc15', '#a16207')}`,
    `
    ${body(p, '#991b1b', pose)}
    ${face()}

    <!-- หมวกเหล็ก ไล่สีแนวดิ่งทำให้โลหะดูโค้ง -->
    <path d="M28 34 Q28 16 50 16 Q72 16 72 34 L72 30 Q50 22 28 30 Z"
      fill="url(#${p}-steel)"/>
    <rect x="46" y="16" width="8" height="18" rx="2" fill="#e2e8f0" opacity=".9"/>
    <path d="M28 30 Q50 22 72 30 L72 36 Q50 28 28 36 Z" fill="#475569"/>
    ${specular(38, 24, 6, 3, -32, 0.5)}
    ${rimLight('M66 22 Q70 28 69 33', '#f8fafc', 1.6)}

    <!-- โล่ทองอยู่หน้าลำตัว จึงมีเงาทาบบนเสื้อ และเอียงตามจังหวะยกแขน -->
    <ellipse cx="14" cy="80" rx="12" ry="15" fill="#000" opacity=".28"
      filter="url(#heroSoft)"/>
    ${sway(
      `<g transform="translate(4 62)">
        <path d="M0 0 Q-6 16 6 26 Q18 16 12 0 Q6 -3 0 0 Z" fill="url(#${p}-gold)"/>
        <path d="M3 4 Q0 14 6 20 Q12 14 9 4 Z" fill="#fef3c7" opacity=".75"/>
        ${specular(3, 7, 2.4, 4, -20, 0.55)}
        <!-- ประกายวิ่งผ่านหน้าโล่ บอกว่าเป็นโลหะขัดเงา ไม่ใช่แผ่นสีเหลือง -->
        <path d="M-2 2 L4 -1 L10 22 L4 25 Z" fill="#fff" opacity="0">
          <animate attributeName="opacity" values="0;0;.55;0;0"
            keyTimes="0;0.55;0.68;0.82;1" dur="5.2s" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="translate"
            values="-6 0; -6 0; 14 0; 14 0" keyTimes="0;0.55;0.82;1"
            dur="5.2s" repeatCount="indefinite"/>
        </path>
      </g>`,
      3.6,
      4,
      28,
      78,
    )}`,
  )
}

/** นักเวท — หมวกแหลมและไม้เท้าเรืองแสง */
function mage(pose: number | null): string {
  const p = 'hm'
  return hero(
    p,
    '#7c3aed',
    '#4c1d95',
    `
    ${sphereGradient(`${p}-hat`, '#a78bfa', '#6d28d9', '#3b0764')}
    ${sphereGradient(`${p}-orb`, '#e0f2fe', '#38bdf8', '#0369a1')}
    <filter id="${p}-glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`,
    `
    ${body(p, '#4c1d95', pose)}
    ${face()}

    <!-- หมวกกรวยสูงจึงโยกมากกว่าหัว จุดหมุนอยู่ที่ขอบหมวก -->
    ${sway(
      `<path d="M24 30 L50 -2 L76 30 Z" fill="url(#${p}-hat)"/>
       <!-- ด้านขวาของหมวกอยู่ในเงา ทำให้กรวยดูเป็นทรงสามมิติ -->
       <path d="M50 -2 L76 30 L50 30 Z" fill="#3b0764" opacity=".3"/>
       <path d="M22 30 Q50 22 78 30 L78 36 Q50 28 22 36 Z" fill="#4c1d95"/>
       ${flicker(
         `<circle cx="50" cy="8" r="4" fill="#fcd34d" filter="url(#${p}-glow)"/>`,
         2,
         0.4,
       )}`,
      5.2,
      4.5,
      50,
      32,
    )}

    ${/* ไม้เท้าโยกช้ากว่าตัว ลูกแก้วจึงดูมีน้ำหนักถ่วงอยู่ปลาย */ ''}
    ${sway(
      `<path d="M84 92 L84 54" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
       <path d="M83 90 L83 56" stroke="#a16207" stroke-width="1.2" opacity=".6"/>
       <circle cx="84" cy="50" r="7" fill="url(#${p}-orb)" filter="url(#${p}-glow)">
         <animate attributeName="r" values="7;8.5;7" dur="2.2s" repeatCount="indefinite"/>
       </circle>
       ${specular(82, 47.5, 2.2, 1.6, -25, 0.75)}
       <!-- ประกายเวทลอยขึ้นจากลูกแก้ว -->
       ${motes(
         [
           [80, 46, 1.4],
           [88, 44, 1.1],
           [84, 42, 1.6],
         ],
         '#bae6fd',
         3.6,
         16,
       )}`,
      4.6,
      3,
      84,
      92,
      0.4,
    )}`,
  )
}

/** นักสำรวจ — หมวกปีกกว้างและเข็มทิศ */
function explorer(pose: number | null): string {
  const p = 'he'
  return hero(
    p,
    '#16a34a',
    '#14532d',
    `
    ${sphereGradient(`${p}-hat`, '#d6a13c', '#a16207', '#5b3a08')}
    ${verticalGradient(`${p}-brim`, '#eab308', '#a16207')}
    ${sphereGradient(`${p}-brass`, '#fef3c7', '#fbbf24', '#b45309')}`,
    `
    ${body(p, '#14532d', pose)}
    ${face()}

    <!-- ปีกหมวกทอดเงาลงบนหน้า เป็นสัญญาณระยะที่อ่านง่ายที่สุด -->
    <path d="M32 24 Q32 10 50 10 Q68 10 68 24 Z" fill="url(#${p}-hat)"/>
    <ellipse cx="50" cy="26" rx="30" ry="6" fill="url(#${p}-brim)"/>
    <ellipse cx="50" cy="29" rx="26" ry="4" fill="#000" opacity=".28"
      filter="url(#heroSoft)"/>
    <rect x="32" y="21" width="36" height="5" fill="#78350f"/>
    ${specular(40, 16, 5, 3, -30, 0.4)}

    ${/* เข็มทิศแกว่งตามแขน ส่วนเข็มในหน้าปัดหมุนหาทิศของมันเอง */ ''}
    ${sway(
      `<g transform="translate(72 70)">
        <circle r="9.5" fill="#000" opacity=".25" filter="url(#heroSoft)"/>
        <circle r="9" fill="url(#${p}-brass)"/>
        <circle r="6.5" fill="#fffbeb"/>
        <g>
          <animateTransform attributeName="transform" type="rotate"
            values="-28 0 0; 34 0 0; -14 0 0; 20 0 0; -28 0 0"
            dur="6.4s" repeatCount="indefinite"
            calcMode="spline" keyTimes="0;0.28;0.5;0.76;1"
            keySplines="0.3 0 0.5 1; 0.3 0 0.5 1; 0.3 0 0.5 1; 0.3 0 0.5 1"/>
          <path d="M0 -5 L2.5 0 L0 5 L-2.5 0 Z" fill="#dc2626"/>
        </g>
        ${specular(-3, -3.5, 2.4, 1.4, -35, 0.6)}
      </g>`,
      4.1,
      4,
      72,
      78,
      0.6,
    )}`,
  )
}

/** นักประดิษฐ์ — แว่นตาช่างและประแจ */
function inventor(pose: number | null): string {
  const p = 'hi'
  return hero(
    p,
    '#ea580c',
    '#7c2d12',
    `
    ${sphereGradient(`${p}-hair`, '#a16207', '#78350f', '#3b1a06')}
    ${verticalGradient(`${p}-metal`, '#e2e8f0', '#64748b')}
    ${verticalGradient(`${p}-lens`, '#7dd3fc', '#0369a1')}`,
    `
    ${body(p, '#7c2d12', pose)}
    ${face()}

    <path d="M28 26 Q28 12 50 12 Q72 12 72 26 L72 24 Q50 18 28 24 Z"
      fill="url(#${p}-hair)"/>

    <!-- แว่นดันขึ้นบนหัว จึงมีเงาทาบบนผม -->
    <g transform="translate(0 -14)">
      <ellipse cx="50" cy="26" rx="21" ry="4" fill="#000" opacity=".3"
        filter="url(#heroSoft)"/>
      <rect x="30" y="20" width="40" height="4" rx="2" fill="#44403c"/>
      <circle cx="40" cy="22" r="7" fill="url(#${p}-lens)" opacity=".8"
        stroke="#57534e" stroke-width="2.5"/>
      <circle cx="60" cy="22" r="7" fill="url(#${p}-lens)" opacity=".8"
        stroke="#57534e" stroke-width="2.5"/>
      ${specular(37.5, 19.5, 2.4, 1.6, -30, 0.6)}
      ${specular(57.5, 19.5, 2.4, 1.6, -30, 0.6)}
    </g>

    ${/* ประแจหมุนไปมาเหมือนกำลังขันน็อต แล้วหยุดพักก่อนขันรอบใหม่ */ ''}
    ${sway(
      `<g>
        <animateTransform attributeName="transform" type="rotate"
          values="28 80 74; 28 80 74; 62 80 74; 28 80 74; 28 80 74"
          dur="3.8s" repeatCount="indefinite"
          calcMode="spline" keyTimes="0;0.3;0.5;0.7;1"
          keySplines="0 0 1 1; 0.3 0 0.4 1; 0.6 0 0.7 1; 0 0 1 1"/>
        <rect x="77" y="60" width="6" height="26" rx="2" fill="url(#${p}-metal)"/>
        <path d="M74 60 L74 54 L79 57 L84 54 L84 60 Z" fill="#f1f5f9"/>
        <rect x="77" y="60" width="2" height="26" fill="#fff" opacity=".35"/>
      </g>`,
      4.1,
      4,
      72,
      78,
      0.6,
    )}`,
  )
}

/** นักวิทยาศาสตร์ — เสื้อกาวน์และหลอดทดลอง */
function scientist(pose: number | null): string {
  const p = 'hs'
  return hero(
    p,
    '#f8fafc',
    '#94a3b8',
    `
    ${sphereGradient(`${p}-cap`, '#7dd3fc', '#0ea5e9', '#075985')}
    ${verticalGradient(`${p}-glass`, '#cffafe', '#67e8f9')}`,
    `
    ${body(p, '#94a3b8', pose)}
    <path d="M50 62 L50 80" stroke="#94a3b8" stroke-width="1.6" opacity=".7"/>
    ${face()}

    <path d="M28 32 Q26 14 50 14 Q74 14 72 32 Q64 22 50 24 Q36 22 28 32 Z"
      fill="url(#${p}-cap)"/>
    ${specular(38, 20, 6, 3.4, -30, 0.4)}
    ${rimLight('M66 20 Q70 26 69 31', '#e0f2fe', 1.6)}

    ${/* หลอดทดลองแกว่งตามแขน ของเหลวข้างในกระเพื่อมและผุดฟองหลายเม็ด */ ''}
    ${sway(
      `<g transform="translate(76 66)">
        <path d="M0 0 L0 14 Q0 22 6 22 Q12 22 12 14 L12 0 Z"
          fill="url(#${p}-glass)" opacity=".8" stroke="#0891b2" stroke-width="2"/>
        <path d="M0 12 L12 12 L12 14 Q12 22 6 22 Q0 22 0 14 Z" fill="#22d3ee">
          <animate attributeName="d"
            values="M0 12 L12 12 L12 14 Q12 22 6 22 Q0 22 0 14 Z;
                    M0 13 L12 11 L12 14 Q12 22 6 22 Q0 22 0 14 Z;
                    M0 11 L12 13 L12 14 Q12 22 6 22 Q0 22 0 14 Z;
                    M0 12 L12 12 L12 14 Q12 22 6 22 Q0 22 0 14 Z"
            dur="3.2s" repeatCount="indefinite"/>
        </path>
        <rect x="2" y="2" width="2" height="16" rx="1" fill="#fff" opacity=".55"/>
        ${mote(4, 18, 1.6, '#a5f3fc', 2.4, 14)}
        ${mote(8, 19, 1.1, '#a5f3fc', 3.1, 15, 0.7)}
        ${mote(6, 17, 1.3, '#ecfeff', 2.8, 12, 1.4)}
      </g>`,
      4.1,
      4,
      72,
      78,
      0.6,
    )}`,
  )
}

/** นักผจญภัย — เป้สะพายหลังและผ้าพันคอ */
function adventurer(pose: number | null): string {
  const p = 'ha'
  return hero(
    p,
    '#e11d48',
    '#881337',
    `
    ${verticalGradient(`${p}-pack`, '#ca8a04', '#713f12')}
    ${sphereGradient(`${p}-hair`, '#a16207', '#78350f', '#3b1a06')}
    ${verticalGradient(`${p}-scarf`, '#fde047', '#d97706')}`,
    `
    <!-- เป้อยู่หลังลำตัว วาดก่อนจึงถูกลำตัวบังบางส่วน -->
    <rect x="14" y="66" width="18" height="24" rx="5" fill="url(#${p}-pack)"/>
    <rect x="16" y="72" width="14" height="7" rx="2" fill="#5b3a08"/>
    <rect x="16" y="68" width="3" height="20" rx="1.5" fill="#fff" opacity=".18"/>

    ${body(p, '#881337', pose)}
    ${face()}

    <!-- ผ้าพันคอสะบัดตามลม เป็นชิ้นที่ขยับมากที่สุดในภาพ -->
    <path d="M30 58 Q50 66 70 58 L72 64 Q50 74 28 64 Z" fill="url(#${p}-scarf)">
      <animate attributeName="d"
        values="M30 58 Q50 66 70 58 L72 64 Q50 74 28 64 Z;
                M30 58 Q50 69 70 57 L72 63 Q50 77 28 64 Z;
                M30 58 Q50 64 70 59 L72 65 Q50 72 28 64 Z;
                M30 58 Q50 66 70 58 L72 64 Q50 74 28 64 Z"
        dur="4.4s" repeatCount="indefinite"/>
    </path>

    ${sway(
      `<path d="M30 22 Q34 12 50 12 Q66 12 70 22 Q60 16 50 18 Q40 16 30 22 Z"
         fill="url(#${p}-hair)"/>
       <!-- ปอยผมข้างหูสะบัดคนละจังหวะกับผ้าพันคอ -->
       <path d="M28 24 Q30 34 26 40 Q34 36 32 26 Z" fill="#5b3a08">
         <animate attributeName="d"
           values="M28 24 Q30 34 26 40 Q34 36 32 26 Z;
                   M28 24 Q26 34 21 38 Q31 37 32 26 Z;
                   M28 24 Q30 34 26 40 Q34 36 32 26 Z"
           dur="3.3s" repeatCount="indefinite"/>
       </path>
       ${specular(40, 16, 5, 2.6, -28, 0.32)}`,
      5.2,
      2.6,
      50,
      58,
    )}`,
  )
}

/** นักกีฬา — ผ้าคาดหัวและเหรียญรางวัล */
function athlete(pose: number | null): string {
  const p = 'hat'
  return hero(
    p,
    '#f43f5e',
    '#9f1239',
    `
    ${verticalGradient(`${p}-band`, '#fb7185', '#be123c')}
    ${sphereGradient(`${p}-hair`, '#3f3f46', '#27272a', '#111113')}
    ${sphereGradient(`${p}-medal`, '#fef08a', '#facc15', '#a16207')}`,
    `
    ${body(p, '#9f1239', pose)}
    ${face()}

    <!-- แถบสีขาวพาดเสื้อ เป็นลายของชุดกีฬาที่อ่านออกทันทีแม้ภาพเล็ก -->
    <path d="M38 64 L44 63 L38 80 L33 80 Z" fill="#fff" opacity=".85"/>
    <path d="M56 63 L62 64 L67 80 L62 80 Z" fill="#fff" opacity=".55"/>

    <!-- เหรียญห้อยคอ แกว่งช้ากว่าลำตัว จึงดูมีน้ำหนักจริง -->
    ${sway(
      `<path d="M44 62 L50 72 L56 62" stroke="#fbbf24" stroke-width="1.8" fill="none"/>
       <circle cx="50" cy="75" r="5.5" fill="url(#${p}-medal)"/>
       ${specular(48, 73, 1.8, 1.2, -25, 0.7)}`,
      3.4,
      3.2,
      50,
      62,
    )}

    ${sway(
      `<path d="M29 24 Q34 11 50 11 Q66 11 71 24 Q60 17 50 19 Q40 17 29 24 Z"
         fill="url(#${p}-hair)"/>
       <!-- ผ้าคาดหัวมีปลายสะบัด บอกว่าตัวละครนี้กำลังเคลื่อนไหวตลอด -->
       <!-- คาดต่ำลงมาชิดหน้าผาก เพื่อให้เห็นผมด้านบนชัดว่าเป็นผม ไม่ใช่หมวก -->
       <path d="M28 29 Q50 22 72 29 L72 33 Q50 26 28 33 Z" fill="url(#${p}-band)"/>
       <path d="M27 28 Q20 32 17 40 Q25 36 29 31 Z" fill="#be123c">
         <animate attributeName="d"
           values="M27 28 Q20 32 17 40 Q25 36 29 31 Z;
                   M27 28 Q18 30 13 36 Q23 35 29 31 Z;
                   M27 28 Q20 32 17 40 Q25 36 29 31 Z"
           dur="2.6s" repeatCount="indefinite"/>
       </path>
       ${specular(40, 15, 5, 2.4, -28, 0.3)}`,
      5.2,
      2.6,
      50,
      58,
    )}`,
  )
}

/** นักดนตรี — หมวกเบเรต์และตัวโน้ตลอย */
function musician(pose: number | null): string {
  const p = 'hmu'
  return hero(
    p,
    '#0ea5e9',
    '#075985',
    `
    ${sphereGradient(`${p}-beret`, '#38bdf8', '#0284c7', '#0c4a6e')}
    ${sphereGradient(`${p}-hair`, '#7c2d12', '#5b2410', '#2c1207')}
    <filter id="${p}-glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`,
    `
    ${body(p, '#075985', pose)}
    ${face()}

    <!-- ขลุ่ยถือเฉียง แกว่งเบา ๆ เหมือนกำลังจะยกขึ้นเป่า -->
    ${sway(
      `<path d="M30 84 L64 70" stroke="#a16207" stroke-width="4.5" stroke-linecap="round"/>
       <path d="M31 83 L63 70" stroke="#d97706" stroke-width="1.4" opacity=".7"/>
       <circle cx="40" cy="80" r="1.3" fill="#3b1a06"/>
       <circle cx="47" cy="77" r="1.3" fill="#3b1a06"/>
       <circle cx="54" cy="74" r="1.3" fill="#3b1a06"/>`,
      3.2,
      3,
      30,
      84,
    )}

    <!--
      ตัวโน้ตลอยขึ้นข้างตัว ไม่ใช่ทับลำตัว
      ครั้งแรกวางไว้ที่หน้าอกซึ่งเป็นสีฟ้าเหมือนกัน เรนเดอร์ออกมาแล้วมองไม่เห็นเลย
      ต้องย้ายออกมาอยู่บนพื้นหลังเข้ม และเพิ่มขนาดจึงจะอ่านออกว่าเป็นเสียงเพลง
    -->
    ${mote(84, 66, 3.4, '#7dd3fc', 3.6, 0)}
    ${mote(90, 56, 2.7, '#bae6fd', 4.2, 1.1)}
    ${mote(85, 46, 2.1, '#e0f2fe', 4.8, 2.2)}

    ${sway(
      `<path d="M30 25 Q34 12 50 12 Q66 12 70 25 Q60 18 50 20 Q40 18 30 25 Z"
         fill="url(#${p}-hair)"/>
       <!-- หมวกเบเรต์เอียงข้างหนึ่ง มีจุกเล็กที่ปลาย -->
       <path d="M26 24 Q30 10 52 10 Q74 10 72 22 Q50 16 26 24 Z"
         fill="url(#${p}-beret)"/>
       <circle cx="70" cy="12" r="3" fill="#0369a1"/>
       ${flicker(
         `<circle cx="70" cy="12" r="1.6" fill="#e0f2fe" filter="url(#${p}-glow)"/>`,
         2.8,
         0.5,
       )}
       ${specular(40, 15, 5, 2.6, -28, 0.34)}`,
      5.2,
      3.2,
      50,
      58,
    )}`,
  )
}

/** หมอยา — หม้อยาและใบไม้ */
function healer(pose: number | null): string {
  const p = 'hh'
  return hero(
    p,
    '#16a34a',
    '#14532d',
    `
    ${sphereGradient(`${p}-pot`, '#a3a3a3', '#57534e', '#292524')}
    ${sphereGradient(`${p}-hair`, '#166534', '#14532d', '#052e16')}
    ${verticalGradient(`${p}-leaf`, '#86efac', '#16a34a')}
    <filter id="${p}-glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="2.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`,
    `
    ${body(p, '#14532d', pose)}
    ${face()}

    <!-- หม้อยาอุ้มไว้หน้าลำตัว จึงทอดเงาลงบนเสื้อ -->
    <ellipse cx="70" cy="80" rx="11" ry="7" fill="#000" opacity=".26"
      filter="url(#heroSoft)"/>
    ${sway(
      `<path d="M60 72 Q60 86 70 86 Q80 86 80 72 Z" fill="url(#${p}-pot)"/>
       <ellipse cx="70" cy="72" rx="10" ry="3.4" fill="#78716c"/>
       <ellipse cx="70" cy="72" rx="7.5" ry="2.2" fill="#4ade80" opacity=".85"/>
       ${specular(65, 77, 2, 3.4, -22, 0.42)}
       <!-- ไอยาลอยขึ้นจากปากหม้อ เป็นสัญญาณว่ายากำลังเดือด -->
       ${mote(68, 72, 1.7, '#bbf7d0', 3.4, 0)}
       ${mote(73, 68, 1.3, '#86efac', 4, 1.3)}`,
      3.4,
      3.4,
      70,
      80,
    )}

    ${sway(
      `<path d="M28 26 Q32 11 50 11 Q68 11 72 26 Q60 17 50 19 Q40 17 28 26 Z"
         fill="url(#${p}-hair)"/>
       <!-- ใบไม้ทัดหู เรืองแสงอ่อน ๆ บอกว่าเป็นสมุนไพรวิเศษ -->
       <path d="M68 22 Q78 14 82 22 Q76 30 68 22 Z" fill="url(#${p}-leaf)"
         filter="url(#${p}-glow)"/>
       <path d="M69 22 Q76 20 81 22" stroke="#14532d" stroke-width="1"
         fill="none" opacity=".7"/>
       ${specular(40, 15, 5, 2.6, -28, 0.32)}`,
      5.2,
      2.6,
      50,
      58,
    )}`,
  )
}

/** นักดาราศาสตร์ — กล้องส่องดาวและดาวลอยรอบตัว */
function astronomer(pose: number | null): string {
  const p = 'has'
  return hero(
    p,
    '#6d28d9',
    '#3b0764',
    `
    ${verticalGradient(`${p}-tube`, '#e2e8f0', '#475569')}
    ${sphereGradient(`${p}-hair`, '#1e1b4b', '#171436', '#0b0a1c')}
    ${sphereGradient(`${p}-lens`, '#c7d2fe', '#818cf8', '#3730a3')}
    <filter id="${p}-glow" x="-90%" y="-90%" width="280%" height="280%">
      <feGaussianBlur stdDeviation="2.6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`,
    `
    ${body(p, '#3b0764', pose)}
    ${face()}

    <!-- ดาวบนเสื้อคลุม บอกอาชีพได้แม้ตอนภาพย่อจนเห็นแค่ลำตัว -->
    ${flicker(`<circle cx="38" cy="74" r="1.7" fill="#fde68a"/>`, 3.2, 0.45)}
    ${flicker(`<circle cx="60" cy="82" r="1.3" fill="#fde68a"/>`, 4.1, 0.4)}
    ${flicker(`<circle cx="47" cy="88" r="1.1" fill="#fde68a"/>`, 2.7, 0.5)}

    <!-- กล้องส่องดาวเงยขึ้นฟ้า แกว่งช้าเพราะเป็นของหนัก -->
    ${sway(
      `<!--
         ถือด้วยมือ ไม่มีขาตั้ง
         ตอนแรกใส่ขาตั้งสามขาไว้ แต่พอเรนเดอร์ออกมาดู มันอ่านเป็นไม้สองอัน
         วางเกะกะอยู่ข้างตัว ไม่ได้อ่านเป็นขาตั้งกล้องเลย
         ของที่อธิบายตัวเองไม่ได้ในภาพขนาดนี้ ตัดออกดีกว่าเก็บไว้
       -->
       <g transform="rotate(-32 26 74)">
         <rect x="14" y="70" width="30" height="9" rx="4.5" fill="url(#${p}-tube)"/>
         <rect x="14" y="72" width="30" height="2" rx="1" fill="#fff" opacity=".45"/>
         <circle cx="45" cy="74" r="5.5" fill="url(#${p}-lens)" filter="url(#${p}-glow)">
           <animate attributeName="r" values="5.5;6.5;5.5" dur="2.6s" repeatCount="indefinite"/>
         </circle>
         ${specular(43, 72, 1.7, 1.2, -25, 0.7)}
       </g>`,
      2.6,
      4.6,
      26,
      86,
    )}

    ${sway(
      `<path d="M28 26 Q32 11 50 11 Q68 11 72 26 Q60 17 50 19 Q40 17 28 26 Z"
         fill="url(#${p}-hair)"/>
       <!-- ดาวดวงเล็กโคจรรอบหัว เป็นของประจำตัวที่ไม่มีใครมี -->
       ${motes(
         [
           [30, 18, 1.5],
           [72, 20, 1.2],
           [50, 6, 1.7],
         ],
         '#fde68a',
         4.4,
       )}
       ${specular(40, 15, 5, 2.6, -28, 0.32)}`,
      5.2,
      2.6,
      50,
      58,
    )}`,
  )
}

const HERO_ART: Record<string, (pose: number | null) => string> = {
  warrior,
  mage,
  explorer,
  inventor,
  scientist,
  adventurer,
  athlete,
  musician,
  healer,
  astronomer,
}

/**
 * ภาพของอวตารหนึ่งตัว คืนภาพสำรองถ้ายังไม่มีของตัวนั้น
 *
 * pose คือท่าของขา ตั้งแต่ -1 (ขาขวานำ) ถึง 1 (ขาซ้ายนำ)
 * ส่ง null หรือไม่ส่งเลย แปลว่าให้ขาแกว่งเองด้วยอนิเมชันในภาพ
 * ซึ่งใช้ได้เฉพาะที่ที่ภาพอยู่ใน DOM จริง เช่นหน้าเลือกตัวละคร
 */
export function heroArt(avatarId: string, pose: number | null = null): string {
  const draw = HERO_ART[avatarId]
  if (draw) return draw(pose)

  return hero(
    'hd',
    '#64748b',
    '#334155',
    '',
    `
    ${body('hd', '#334155', pose)}
    ${face()}`,
  )
}

/**
 * จำนวนท่าเดินที่สนามรบใช้สลับกัน
 *
 * สี่ท่าคือจำนวนน้อยที่สุดที่ยังอ่านเป็นการเดิน
 * ขาซ้ายนำ ผ่านกลาง ขาขวานำ แล้วผ่านกลางอีกที
 * สองท่าจะกลายเป็นการกระตุก ส่วนหกท่าขึ้นไปตาแทบแยกไม่ออกจากสี่
 * แต่กินหน่วยความจำเพิ่มขึ้นตามจำนวนภาพที่ต้องเก็บไว้
 */
export const WALK_FRAMES = 4

/**
 * ท่าของขาในเฟรมที่กำหนด
 *
 * ใช้ไซน์เพื่อให้ช่วงกลางก้าวเคลื่อนเร็วและช่วงปลายก้าวช้าลง
 * ซึ่งเป็นจังหวะของการเดินจริง ถ้าแบ่งมุมเท่า ๆ กันจะดูเป็นหุ่นยนต์
 */
export function walkPose(frame: number): number {
  return Math.sin((frame / WALK_FRAMES) * Math.PI * 2)
}

export function hasHeroArt(avatarId: string): boolean {
  return avatarId in HERO_ART
}

export const HERO_ART_IDS = Object.keys(HERO_ART)
