/**
 * ฉากประจำโลก วาดด้วย SVG
 *
 * ใช้เป็นภาพหัวการ์ดโลกบนแผนที่ และเป็นพื้นหลังของหน้าด่าน
 * แต่ละโลกมีสีและรูปทรงต่างกันชัดเจน เด็กจึงจำได้ว่าอยู่โลกไหน
 * โดยไม่ต้องอ่านชื่อ
 *
 * ระบบพิกัด: กรอบ 320 × 160 (แนวนอน เหมาะกับหัวการ์ด)
 *
 * หลักที่ทำให้ฉากดูลึก: ทัศนมิติบรรยากาศ
 * ของที่อยู่ไกลจะสีจางลง คอนทราสต์ต่ำลง และเอียงไปทางสีฟ้าของอากาศ
 * ของที่อยู่ใกล้จะสีเข้มและอิ่มกว่า
 * เทคนิคนี้ให้ความรู้สึกลึกได้มากกว่าการวาดเงาให้ของแต่ละชิ้นเสียอีก
 *
 * เรื่อง id: ทุกฉากอยู่บนหน้าแผนที่เดียวกันได้พร้อมกัน
 * ไล่สีทุกอันจึงต้องมี prefix ประจำฉาก ไม่งั้นฟ้าของทุกโลกจะเป็นสีเดียวกันหมด
 */

import { drift, flicker, motes, sway } from './motion'

export const SCENE_VIEWBOX = '0 0 320 160'

/** ท้องฟ้าไล่สีสามช่วง ให้ขอบฟ้าสว่างกว่าหัวเสมอ เหมือนฟ้าจริง */
function sky(id: string, top: string, mid: string, bottom: string): string {
  return `
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${top}"/>
      <stop offset="55%" stop-color="${mid}"/>
      <stop offset="100%" stop-color="${bottom}"/>
    </linearGradient>`
}

/** หมอกบาง ๆ ที่เส้นขอบฟ้า เป็นตัวแยกชั้นไกลกับชั้นใกล้ให้ตาอ่านออก */
function haze(id: string, color: string): string {
  return `
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${color}" stop-opacity=".55"/>
    </linearGradient>`
}

/**
 * ดวงอาทิตย์หรือดวงจันทร์พร้อมรัศมี
 *
 * รัศมีต้องเป็นไล่สีแบบรัศมีเท่านั้น ห้ามใช้วงกลมทึบซ้อนกัน
 * วงกลมทึบต่อให้ตั้ง opacity ต่ำแค่ไหนก็ยังมีขอบคม
 * เวลาไปทาบบนฟ้าจะเห็นเป็นแผ่นจานสีเทาชัดเจน ไม่ใช่แสงฟุ้ง
 *
 * id ของไล่สีต้องไม่ซ้ำข้ามฉาก จึงบังคับให้ส่งเข้ามา
 */
function celestial(
  id: string,
  cx: number,
  cy: number,
  r: number,
  core: string,
  glow: string,
  glowR = r * 3.2,
): string {
  return `
    <radialGradient id="${id}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${glow}" stop-opacity=".55"/>
      <stop offset="35%" stop-color="${glow}" stop-opacity=".22"/>
      <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
    <circle cx="${cx}" cy="${cy}" r="${glowR}" fill="url(#${id})">
      <animate attributeName="r" values="${glowR};${glowR * 1.1};${glowR}"
        dur="6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${core}"/>`
}

/** ดาวกะพริบ กระจายจังหวะให้ไม่กะพริบพร้อมกัน */
function stars(
  seeds: ReadonlyArray<readonly [number, number, number]>,
  color = '#fff',
): string {
  return seeds
    .map(
      ([cx, cy, r], i) =>
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}">
          <animate attributeName="opacity" values=".25;1;.4;.9;.25"
            dur="${2.6 + i * 0.53}s" begin="${i * 0.4}s" repeatCount="indefinite"/>
        </circle>`,
    )
    .join('')
}

/** โลก 1 — ป่าจำนวนมหัศจรรย์ */
function forest(): string {
  const p = 'sc1'

  /** ต้นสนหนึ่งต้น ใช้ซ้ำได้ทุกชั้นความลึก โดยเปลี่ยนสีกับขนาด */
  const pine = (x: number, base: number, h: number, w: number, fill: string) => `
    <polygon points="${x},${base} ${x - w},${base} ${x},${base - h}
      ${x + w},${base}" fill="${fill}"/>
    <polygon points="${x},${base - h * 0.32} ${x - w * 0.78},${base - h * 0.32}
      ${x},${base - h * 1.28} ${x + w * 0.78},${base - h * 0.32}" fill="${fill}"/>`

  return `
    <defs>
      ${sky(`${p}-sky`, '#08160f', '#0f2b1d', '#2b5c3f')}
      ${haze(`${p}-haze`, '#4ade80')}
      <linearGradient id="${p}-ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#166534"/>
        <stop offset="100%" stop-color="#052e16"/>
      </linearGradient>
      <radialGradient id="${p}-moonlit" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fde68a" stop-opacity=".22"/>
        <stop offset="100%" stop-color="#fde68a" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect width="320" height="160" fill="url(#${p}-sky)"/>
    ${stars(
      [
        [40, 22, 1.2],
        [88, 14, 1],
        [130, 30, 1.4],
        [190, 18, 1],
        [230, 40, 1.2],
        [300, 24, 1.1],
      ],
      '#d9f99d',
    )}
    ${celestial(`${p}-halo`, 264, 34, 18, '#fde68a', '#fde68a')}

    ${/* ลำแสงจันทร์ทาบลงพื้น เป็นตัวเชื่อมฟ้ากับพื้นให้ฉากไม่แยกเป็นสองแถบ */ ''}
    <polygon points="264,34 210,160 320,160" fill="url(#${p}-moonlit)"/>

    ${/* ชั้นไกล: ต้นไม้จางและจม อยู่ในหมอก */ ''}
    <path d="M0 96 Q80 78 160 92 Q240 106 320 88 L320 160 L0 160 Z" fill="#1f4d38"/>
    <g opacity=".55">
      ${pine(30, 96, 26, 11, '#2f6b4d')}
      ${pine(118, 100, 22, 9, '#2f6b4d')}
      ${pine(196, 94, 28, 12, '#2f6b4d')}
      ${pine(292, 98, 24, 10, '#2f6b4d')}
    </g>
    <rect y="72" width="320" height="34" fill="url(#${p}-haze)" opacity=".45"/>

    ${/* ชั้นกลาง: เห็นลำต้น เริ่มมีรายละเอียด และไหวตามลม */ ''}
    <path d="M0 112 Q80 94 160 110 Q240 126 320 106 L320 160 L0 160 Z"
      fill="url(#${p}-ground)"/>
    ${sway(
      `<rect x="56" y="104" width="8" height="22" fill="#3f2d1d"/>
       ${pine(60, 112, 42, 18, '#166534')}`,
      5.4,
      1.6,
      60,
      126,
    )}
    ${sway(
      `<rect x="228" y="106" width="8" height="22" fill="#3f2d1d"/>
       ${pine(232, 114, 46, 20, '#166534')}`,
      6.1,
      1.4,
      232,
      128,
      0.8,
    )}
    ${sway(pine(112, 118, 34, 15, '#15803d'), 4.7, 1.8, 112, 118, 1.4)}
    ${sway(pine(286, 120, 30, 13, '#15803d'), 5.9, 1.6, 286, 120, 2.1)}

    ${/* ชั้นใกล้สุด: หญ้าเข้มและอิ่มสี ปิดขอบล่าง */ ''}
    <path d="M0 140 Q80 126 160 138 Q240 150 320 136 L320 160 L0 160 Z"
      fill="#22c55e" opacity=".5"/>

    ${/* หิ่งห้อยลอยขึ้นจากพงหญ้า เป็นตัวที่ทำให้ป่าดูมีชีวิตมากที่สุด */ ''}
    ${motes(
      [
        [150, 132, 2.2],
        [186, 138, 1.8],
        [122, 136, 2],
        [246, 134, 1.9],
        [70, 140, 1.6],
        [206, 142, 2.1],
      ],
      '#bef264',
      4.4,
      52,
    )}

    ${/* ตัวเลขเวทลอยอยู่กลางอากาศ เรืองแสงอ่อน ๆ */ ''}
    <g fill="#fef3c7" font-family="system-ui, sans-serif" font-weight="800">
      ${flicker(`<text x="146" y="60" font-size="15" opacity=".6">7</text>`, 3.4, 0.25, 0.7)}
      ${flicker(
        `<text x="196" y="46" font-size="12" opacity=".5">3</text>`,
        4.2,
        0.2,
        0.6,
        0.9,
      )}
    </g>`
}

/** โลก 2 — ปราสาทเศษส่วน */
function castle(): string {
  const p = 'sc2'

  /** ธงบนยอดหอคอย สะบัดตามลม */
  const flag = (x: number, y: number) => `
    <path d="M${x} ${y} L${x} ${y + 14}" stroke="#c7d2fe" stroke-width="1.4"/>
    <path d="M${x} ${y} Q${x + 8} ${y + 2} ${x + 12} ${y + 5}
             Q${x + 8} ${y + 6} ${x} ${y + 8} Z" fill="#818cf8">
      <animate attributeName="d"
        values="M${x} ${y} Q${x + 8} ${y + 2} ${x + 12} ${y + 5} Q${x + 8} ${y + 6} ${x} ${y + 8} Z;
                M${x} ${y} Q${x + 8} ${y + 6} ${x + 12} ${y + 3} Q${x + 8} ${y + 8} ${x} ${y + 8} Z;
                M${x} ${y} Q${x + 8} ${y + 2} ${x + 12} ${y + 5} Q${x + 8} ${y + 6} ${x} ${y + 8} Z"
        dur="2.4s" repeatCount="indefinite"/>
    </path>`

  /** หน้าต่างที่ไฟติดดับไม่พร้อมกัน ทำให้ปราสาทดูมีคนอยู่ */
  const window_ = (x: number, y: number, i: number) =>
    flicker(
      `<rect x="${x}" y="${y}" width="12" height="18" rx="6" fill="#fcd34d"/>
       <rect x="${x}" y="${y}" width="12" height="18" rx="6" fill="#fff" opacity=".25"/>`,
      3.2 + i * 0.7,
      0.3,
      0.95,
      i * 0.6,
    )

  return `
    <defs>
      ${sky(`${p}-sky`, '#120f38', '#1e1b4b', '#4338ca')}
      ${haze(`${p}-haze`, '#818cf8')}
      <linearGradient id="${p}-wall" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#4338ca"/>
        <stop offset="42%" stop-color="#312e81"/>
        <stop offset="100%" stop-color="#1e1b4b"/>
      </linearGradient>
      <linearGradient id="${p}-tower" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#4f46e5"/>
        <stop offset="55%" stop-color="#3730a3"/>
        <stop offset="100%" stop-color="#1e1b4b"/>
      </linearGradient>
      <linearGradient id="${p}-roof" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#818cf8"/>
        <stop offset="100%" stop-color="#3730a3"/>
      </linearGradient>
      <linearGradient id="${p}-cloud" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a5b4fc" stop-opacity=".38"/>
        <stop offset="100%" stop-color="#a5b4fc" stop-opacity=".06"/>
      </linearGradient>
    </defs>

    <rect width="320" height="160" fill="url(#${p}-sky)"/>
    ${stars([
      [30, 18, 1.3],
      [104, 12, 1],
      [148, 24, 1.1],
      [206, 14, 1.4],
      [268, 22, 1],
      [298, 40, 1.2],
      [76, 34, 0.9],
    ])}
    ${celestial(`${p}-halo`, 56, 36, 14, '#e0e7ff', '#c7d2fe')}

    ${/* เมฆบางลอยผ่านหน้าปราสาท ยิ่งลอยช้ายิ่งดูอยู่ไกล */ ''}
    ${drift(
      `<ellipse cx="-40" cy="52" rx="46" ry="9" fill="url(#${p}-cloud)"/>
       <ellipse cx="10" cy="48" rx="34" ry="7" fill="url(#${p}-cloud)"/>`,
      34,
      420,
    )}
    ${drift(
      `<ellipse cx="-90" cy="76" rx="58" ry="10" fill="url(#${p}-cloud)"/>`,
      52,
      480,
      6,
    )}

    ${/* เนินไกลหลังปราสาท ทำให้ปราสาทไม่ลอยอยู่บนความว่าง */ ''}
    <path d="M0 118 Q70 96 140 114 Q220 132 320 108 L320 160 L0 160 Z"
      fill="#252163" opacity=".9"/>

    <g fill="url(#${p}-wall)">
      <rect x="96" y="62" width="128" height="70"/>
    </g>
    <g fill="url(#${p}-tower)">
      <rect x="82" y="46" width="26" height="86"/>
      <rect x="212" y="46" width="26" height="86"/>
      <rect x="146" y="30" width="28" height="102"/>
    </g>

    ${/* ใบเสมาบนกำแพง เป็นรายละเอียดเล็กที่ทำให้อ่านว่าเป็นปราสาททันที */ ''}
    <g fill="#3730a3">
      <rect x="110" y="56" width="10" height="8"/>
      <rect x="126" y="56" width="10" height="8"/>
      <rect x="184" y="56" width="10" height="8"/>
      <rect x="200" y="56" width="10" height="8"/>
    </g>

    <g fill="url(#${p}-roof)">
      <polygon points="82,46 95,26 108,46"/>
      <polygon points="212,46 225,26 238,46"/>
      <polygon points="146,30 160,6 174,30"/>
    </g>
    ${flag(95, 12)}
    ${flag(160, -8)}

    ${window_(118, 80, 0)}
    ${window_(190, 80, 1)}
    ${window_(154, 56, 2)}

    <rect x="146" y="100" width="28" height="32" rx="14" fill="#0c0a2e"/>
    <rect x="146" y="100" width="28" height="32" rx="14" fill="url(#${p}-cloud)" opacity=".4"/>

    <rect y="104" width="320" height="30" fill="url(#${p}-haze)" opacity=".35"/>
    <rect x="0" y="132" width="320" height="28" fill="#15123d"/>

    ${/* ผงเวทลอยขึ้นหน้าประตู */ ''}
    ${motes(
      [
        [140, 130, 1.6],
        [180, 132, 1.3],
        [160, 128, 1.5],
      ],
      '#c7d2fe',
      5,
      40,
    )}

    <g fill="#c7d2fe" font-family="system-ui, sans-serif" font-weight="800">
      ${flicker(`<text x="44" y="98" font-size="16" opacity=".65">1/2</text>`, 4, 0.3, 0.75)}
      ${flicker(
        `<text x="256" y="86" font-size="14" opacity=".55">3/4</text>`,
        4.8,
        0.25,
        0.65,
        1.2,
      )}
    </g>`
}

/** โลก 3 — ทะเลทรายทศนิยม */
function desert(): string {
  const p = 'sc3'
  return `
    <defs>
      ${sky(`${p}-sky`, '#7c2d12', '#c2410c', '#fbbf24')}
      ${haze(`${p}-haze`, '#fed7aa')}
      <linearGradient id="${p}-dune1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ea9c2f"/>
        <stop offset="100%" stop-color="#b45309"/>
      </linearGradient>
      <linearGradient id="${p}-dune2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fcd34d"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
      <radialGradient id="${p}-sunglow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fef3c7" stop-opacity=".5"/>
        <stop offset="100%" stop-color="#fef3c7" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect width="320" height="160" fill="url(#${p}-sky)"/>
    <circle cx="240" cy="46" r="70" fill="url(#${p}-sunglow)">
      <animate attributeName="r" values="70;78;70" dur="7s" repeatCount="indefinite"/>
    </circle>
    ${celestial(`${p}-halo`, 240, 46, 22, '#fffbeb', '#fef3c7', 62)}

    ${/* พีระมิดไกล ๆ จางลงเพราะอยู่หลังม่านอากาศร้อน */ ''}
    <g opacity=".45">
      <polygon points="150,112 168,84 186,112" fill="#b45309"/>
      <polygon points="168,84 186,112 168,112" fill="#7c2d12"/>
      <polygon points="188,116 202,94 216,116" fill="#b45309"/>
      <polygon points="202,94 216,116 202,116" fill="#7c2d12"/>
    </g>
    <rect y="92" width="320" height="30" fill="url(#${p}-haze)" opacity=".4"/>

    ${/* เนินทรายชั้นไกล สันเนินรับแสงอาทิตย์จึงสว่างเป็นเส้น */ ''}
    <path d="M0 116 Q60 92 120 114 Q180 134 240 112 Q286 96 320 110 L320 160 L0 160 Z"
      fill="url(#${p}-dune1)"/>
    <path d="M0 116 Q60 92 120 114 Q180 134 240 112 Q286 96 320 110"
      fill="none" stroke="#fde68a" stroke-width="1.6" opacity=".5"/>

    ${/* กระบองเพชร มีด้านสว่างกับด้านเงา */ ''}
    <g>
      <rect x="60" y="96" width="8" height="28" rx="4" fill="#166534"/>
      <rect x="60" y="96" width="3" height="28" rx="1.5" fill="#22c55e" opacity=".7"/>
      <rect x="48" y="102" width="8" height="16" rx="4" fill="#14532d"/>
      <rect x="72" y="98" width="8" height="20" rx="4" fill="#15803d"/>
      <rect x="72" y="98" width="3" height="20" rx="1.5" fill="#22c55e" opacity=".6"/>
    </g>

    ${/* เนินทรายชั้นใกล้ อิ่มสีที่สุด */ ''}
    <path d="M0 136 Q80 120 160 134 Q240 148 320 132 L320 160 L0 160 Z"
      fill="url(#${p}-dune2)"/>
    <path d="M0 136 Q80 120 160 134 Q240 148 320 132"
      fill="none" stroke="#fffbeb" stroke-width="1.4" opacity=".45"/>

    ${/* ทรายปลิวตามลม เป็นริ้วบางพัดจากซ้ายไปขวา */ ''}
    ${drift(
      `<path d="M-60 124 Q-30 120 0 124" stroke="#fef3c7" stroke-width="1.2"
         fill="none" opacity=".35"/>
       <path d="M-100 130 Q-70 127 -40 131" stroke="#fef3c7" stroke-width="1"
         fill="none" opacity=".25"/>`,
      9,
      440,
    )}
    ${drift(
      `<path d="M-40 108 Q-14 105 12 109" stroke="#fff7ed" stroke-width="1"
         fill="none" opacity=".3"/>`,
      13,
      400,
      3,
    )}

    ${/* ฝุ่นทรายฟุ้งขึ้นจากพื้น */ ''}
    ${motes(
      [
        [90, 146, 1.6],
        [200, 148, 1.4],
        [268, 144, 1.5],
      ],
      '#fef3c7',
      5.2,
      26,
    )}

    <g fill="#78350f" font-family="system-ui, sans-serif" font-weight="800" opacity=".7">
      <text x="112" y="146" font-size="15">0.5</text>
      <text x="238" y="140" font-size="13">1.2</text>
    </g>`
}

/** โลก 4 — เมืองร้อยละ */
function city(): string {
  const p = 'sc4'

  /** หน้าต่างตึกหนึ่งบาน ติดดับไม่พร้อมกัน เมืองจึงดูมีคนอยู่จริง */
  const win = (x: number, y: number, w: number, h: number, i: number) =>
    flicker(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fcd34d"/>`,
      3 + (i % 5) * 0.9,
      0.12,
      0.92,
      (i % 7) * 0.55,
    )

  return `
    <defs>
      ${sky(`${p}-sky`, '#082f49', '#0c4a6e', '#0e7490')}
      ${haze(`${p}-haze`, '#67e8f9')}
      <linearGradient id="${p}-far" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0e5b80"/>
        <stop offset="100%" stop-color="#0c4a6e"/>
      </linearGradient>
      <linearGradient id="${p}-near" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0b6d97"/>
        <stop offset="60%" stop-color="#075985"/>
        <stop offset="100%" stop-color="#03384f"/>
      </linearGradient>
      <linearGradient id="${p}-sign" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f87171"/>
        <stop offset="100%" stop-color="#991b1b"/>
      </linearGradient>
      <linearGradient id="${p}-cloud" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a5f3fc" stop-opacity=".3"/>
        <stop offset="100%" stop-color="#a5f3fc" stop-opacity="0"/>
      </linearGradient>
    </defs>

    <rect width="320" height="160" fill="url(#${p}-sky)"/>
    ${stars([
      [96, 16, 1],
      [150, 26, 1.2],
      [212, 12, 1],
      [286, 30, 1.1],
    ], '#cffafe')}
    ${celestial(`${p}-halo`, 52, 34, 13, '#f0f9ff', '#bae6fd')}

    ${drift(
      `<ellipse cx="-50" cy="44" rx="52" ry="8" fill="url(#${p}-cloud)"/>`,
      40,
      430,
    )}

    ${/* ตึกแถวไกล จางและไม่มีหน้าต่าง เป็นแค่เงาเมือง */ ''}
    <g fill="url(#${p}-far)" opacity=".75">
      <rect x="8" y="92" width="30" height="40"/>
      <rect x="54" y="80" width="26" height="52"/>
      <rect x="146" y="84" width="30" height="48"/>
      <rect x="206" y="76" width="26" height="56"/>
      <rect x="286" y="88" width="28" height="44"/>
    </g>
    <rect y="70" width="320" height="34" fill="url(#${p}-haze)" opacity=".3"/>

    ${/* ตึกแถวใกล้ ไล่สีจากซ้ายสว่างไปขวาเข้ม ทำให้ตึกเป็นกล่องไม่ใช่แผ่น */ ''}
    <g fill="url(#${p}-near)">
      <rect x="24" y="76" width="38" height="56"/>
      <rect x="72" y="56" width="44" height="76"/>
      <rect x="126" y="88" width="34" height="44"/>
      <rect x="170" y="46" width="48" height="86"/>
      <rect x="228" y="70" width="40" height="62"/>
      <rect x="276" y="94" width="30" height="38"/>
    </g>

    ${win(32, 84, 7, 9, 0)}${win(46, 84, 7, 9, 1)}
    ${win(32, 100, 7, 9, 2)}${win(46, 100, 7, 9, 3)}
    ${win(82, 66, 8, 10, 4)}${win(98, 66, 8, 10, 5)}
    ${win(82, 84, 8, 10, 6)}${win(98, 84, 8, 10, 0)}
    ${win(82, 102, 8, 10, 1)}${win(98, 102, 8, 10, 2)}
    ${win(134, 96, 7, 9, 3)}${win(147, 96, 7, 9, 4)}
    ${win(180, 56, 9, 11, 5)}${win(199, 56, 9, 11, 6)}
    ${win(180, 76, 9, 11, 0)}${win(199, 76, 9, 11, 1)}
    ${win(180, 96, 9, 11, 2)}${win(199, 96, 9, 11, 3)}
    ${win(238, 80, 8, 10, 4)}${win(252, 80, 8, 10, 5)}
    ${win(238, 98, 8, 10, 6)}${win(252, 98, 8, 10, 0)}
    ${win(284, 104, 7, 9, 1)}

    ${/* ไฟสัญญาณบนยอดตึกสูง กะพริบช้าและสม่ำเสมอเหมือนของจริง */ ''}
    <circle cx="194" cy="43" r="2.4" fill="#f87171">
      <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.4;0.5;1"
        dur="2.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="94" cy="53" r="2" fill="#f87171">
      <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.3;0.4;0.7;1"
        dur="2.8s" repeatCount="indefinite"/>
    </circle>

    <rect x="0" y="132" width="320" height="28" fill="#042235"/>

    ${/* ป้ายลดราคาห้อยอยู่ จึงแกว่งรอบมุมบนซ้ายของป้าย */ ''}
    ${sway(
      `<g transform="rotate(-8 150 40)">
        <rect x="130" y="26" width="46" height="26" rx="4" fill="#7f1d1d" opacity=".5"/>
        <rect x="128" y="24" width="46" height="26" rx="4" fill="url(#${p}-sign)"/>
        <rect x="130" y="26" width="42" height="7" rx="3" fill="#fff" opacity=".2"/>
        <text x="134" y="43" fill="#fff" font-family="system-ui, sans-serif"
          font-size="15" font-weight="800">50%</text>
      </g>`,
      4.6,
      3.5,
      128,
      24,
    )}`
}

/** โลก 5 — ภูเขาเรขาคณิต */
function mountain(): string {
  const p = 'sc5'

  /** เกล็ดหิมะร่วง ตกช้าและส่ายไปมาเล็กน้อย */
  const snow = (x: number, r: number, dur: number, begin: number) => `
    <circle cx="${x}" cy="-4" r="${r}" fill="#fff" opacity=".75">
      <animate attributeName="cy" values="-4;164" dur="${dur}s"
        begin="${begin}s" repeatCount="indefinite"/>
      <animate attributeName="cx" values="${x};${x + 7};${x - 5};${x}"
        dur="${dur / 2}s" begin="${begin}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;.75;.75;0"
        keyTimes="0;0.1;0.85;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
    </circle>`

  return `
    <defs>
      ${sky(`${p}-sky`, '#0f172a', '#1e293b', '#7c8ba1')}
      ${haze(`${p}-haze`, '#cbd5e1')}
      <linearGradient id="${p}-far" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#64748b"/>
        <stop offset="100%" stop-color="#475569"/>
      </linearGradient>
      <linearGradient id="${p}-near" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#475569"/>
        <stop offset="52%" stop-color="#334155"/>
        <stop offset="100%" stop-color="#111827"/>
      </linearGradient>
      <linearGradient id="${p}-snow" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#fff"/>
        <stop offset="100%" stop-color="#cbd5e1"/>
      </linearGradient>
    </defs>

    <rect width="320" height="160" fill="url(#${p}-sky)"/>
    ${stars([
      [40, 16, 1.1],
      [110, 24, 1],
      [178, 14, 1.2],
      [300, 20, 1],
    ], '#e2e8f0')}
    ${celestial(`${p}-halo`, 264, 32, 15, '#f8fafc', '#cbd5e1')}

    ${/* ยอดไกลสุด จางจนเกือบกลืนฟ้า นี่คือหัวใจของความรู้สึกว่ามันไกล */ ''}
    <g opacity=".38">
      <polygon points="150,132 214,52 278,132" fill="#94a3b8"/>
      <polygon points="20,132 66,66 112,132" fill="#94a3b8"/>
    </g>
    <rect y="60" width="320" height="46" fill="url(#${p}-haze)" opacity=".35"/>

    <polygon points="0,132 70,44 140,132" fill="url(#${p}-far)"/>
    <polygon points="70,44 96,76 44,76" fill="url(#${p}-snow)"/>
    <polygon points="70,44 96,76 70,76" fill="#cbd5e1" opacity=".6"/>

    <polygon points="110,132 190,30 270,132" fill="url(#${p}-near)"/>
    <polygon points="190,30 220,68 160,68" fill="url(#${p}-snow)"/>
    <polygon points="190,30 220,68 190,68" fill="#cbd5e1" opacity=".55"/>
    ${/* หน้าผาด้านขวาของยอดใกล้อยู่ในเงา จึงเข้มกว่าอีกด้านชัดเจน */ ''}
    <polygon points="190,30 270,132 190,132" fill="#0f172a" opacity=".35"/>

    <polygon points="238,132 288,72 320,132" fill="url(#${p}-far)"/>
    <polygon points="288,72 320,132 288,132" fill="#1e293b" opacity=".4"/>

    <rect x="0" y="128" width="320" height="32" fill="#0b1220"/>

    ${/* รูปทรงเรขาคณิตเรืองแสง ลอยและหมุนช้า ๆ เหมือนของวิเศษ */ ''}
    ${/*
      รูปทรงเรขาคณิตโคลงเบา ๆ ไม่หมุนรอบตัว
      ถ้าหมุนครบรอบ จะมีช่วงที่สี่เหลี่ยมกับสามเหลี่ยมเอียงค้างอยู่
      ซึ่งอ่านเป็น "วาดเบี้ยว" มากกว่า "ของวิเศษกำลังลอย"
      โคลงไม่เกินสิบองศาแล้วกลับ จึงยังตั้งตรงอยู่เสมอ
    */ ''}
    <g stroke="#38bdf8" stroke-width="2.5" fill="none">
      ${sway(`<rect x="36" y="94" width="26" height="20"/>`, 5.4, 9, 49, 104)}
      ${sway(`<polygon points="248,112 262,90 276,112"/>`, 6.3, 8, 262, 104, 1.1)}
      <circle cx="152" cy="100" r="11">
        <animate attributeName="r" values="11;13;11" dur="3.6s" repeatCount="indefinite"/>
      </circle>
    </g>
    ${motes(
      [
        [49, 92, 1.4],
        [152, 88, 1.6],
        [262, 88, 1.3],
      ],
      '#7dd3fc',
      4.6,
      24,
    )}

    ${snow(24, 1.6, 11, 0)}${snow(72, 1.2, 14, 1.7)}${snow(118, 1.8, 9.5, 0.8)}
    ${snow(166, 1.3, 13, 3.1)}${snow(212, 1.7, 10.5, 2.2)}${snow(258, 1.2, 15, 4)}
    ${snow(298, 1.5, 12, 1.1)}${snow(140, 1.1, 16, 5.2)}

    <g fill="#bae6fd" font-family="system-ui, sans-serif" font-weight="800" opacity=".65">
      <text x="34" y="88" font-size="11">พื้นที่</text>
    </g>`
}

/** โลก 6 — ถ้ำมังกรคณิต */
function dragonCave(): string {
  const p = 'sc6'

  /** ค้างคาวบินผ่านฉาก เป็นเงาดำเล็ก ๆ ที่กระพือปีก */
  const bat = (y: number, dur: number, begin: number, scale: number) => `
    <g opacity=".7">
      <animateTransform attributeName="transform" type="translate"
        from="-20 0" to="360 ${y > 60 ? -18 : 14}" dur="${dur}s"
        begin="${begin}s" repeatCount="indefinite"/>
      <g transform="translate(0 ${y}) scale(${scale})">
        <ellipse cx="0" cy="0" rx="3" ry="2.4" fill="#0b0616"/>
        <path d="M-3 -1 Q-9 -6 -13 0 Q-8 0 -3 2 Z" fill="#0b0616">
          <animate attributeName="d"
            values="M-3 -1 Q-9 -6 -13 0 Q-8 0 -3 2 Z;
                    M-3 -1 Q-9 4 -12 6 Q-8 2 -3 2 Z;
                    M-3 -1 Q-9 -6 -13 0 Q-8 0 -3 2 Z"
            dur="0.42s" repeatCount="indefinite"/>
        </path>
        <path d="M3 -1 Q9 -6 13 0 Q8 0 3 2 Z" fill="#0b0616">
          <animate attributeName="d"
            values="M3 -1 Q9 -6 13 0 Q8 0 3 2 Z;
                    M3 -1 Q9 4 12 6 Q8 2 3 2 Z;
                    M3 -1 Q9 -6 13 0 Q8 0 3 2 Z"
            dur="0.42s" repeatCount="indefinite"/>
        </path>
      </g>
    </g>`

  /** เหรียญทองที่วาววับเป็นระยะ */
  const coin = (cx: number, cy: number, r: number, i: number) => `
    <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.72}" fill="#d97706"/>
    <ellipse cx="${cx}" cy="${cy - r * 0.18}" rx="${r * 0.85}" ry="${r * 0.55}" fill="#fcd34d"/>
    <ellipse cx="${cx - r * 0.3}" cy="${cy - r * 0.3}" rx="${r * 0.3}" ry="${r * 0.18}"
      fill="#fffbeb" opacity="0">
      <animate attributeName="opacity" values="0;0;1;0;0"
        keyTimes="0;0.6;0.68;0.78;1" dur="${3.4 + i * 0.9}s"
        begin="${i * 0.7}s" repeatCount="indefinite"/>
    </ellipse>`

  return `
    <defs>
      ${/*
        อากาศในถ้ำต้องมืดตลอดทั้งใบ
        ความสว่างทั้งหมดต้องมาจากแสงลาวาที่เป็นไล่สีรัศมีเฉพาะจุดเท่านั้น
        ถ้าให้พื้นหลังสว่างเอง ถ้ำจะดูเหมือนกลางแจ้งตอนเย็น ไม่ใช่ในถ้ำ
      */ ''}
      <linearGradient id="${p}-air" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a0418"/>
        <stop offset="60%" stop-color="#160a2c"/>
        <stop offset="100%" stop-color="#2a1055"/>
      </linearGradient>
      ${/* เพดานถ้ำเข้มที่สุดด้านบน แล้วค่อยสว่างขึ้นเมื่อเข้าใกล้แสงลาวา */ ''}
      <linearGradient id="${p}-rock" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#100626"/>
        <stop offset="100%" stop-color="#3b1178"/>
      </linearGradient>
      ${/*
        หินย้อยจากเพดาน: โคนต่อกับเพดานจึงมืดเท่าเพดาน ปลายสว่างขึ้นเพราะรับแสงลาวา
        ถ้าทำปลายสว่างจัด มันจะอ่านเป็นสามเหลี่ยมเรืองแสงลอยอยู่ ไม่ใช่หินที่ห้อยลงมา
      */ ''}
      <linearGradient id="${p}-hang" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#140828"/>
        <stop offset="100%" stop-color="#4c1d95"/>
      </linearGradient>
      ${/* หินงอกจากพื้น: โคนอยู่ติดลาวาจึงสว่างอุ่น ปลายชี้ขึ้นไปในความมืด */ ''}
      <linearGradient id="${p}-grow" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="#6d28d9"/>
        <stop offset="100%" stop-color="#180a30"/>
      </linearGradient>
      <linearGradient id="${p}-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2a0f57"/>
        <stop offset="100%" stop-color="#120724"/>
      </linearGradient>
      <radialGradient id="${p}-lava" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fbbf24" stop-opacity=".7"/>
        <stop offset="40%" stop-color="#f97316" stop-opacity=".4"/>
        <stop offset="100%" stop-color="#dc2626" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${p}-eyeglow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fbbf24" stop-opacity=".7"/>
        <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect width="320" height="160" fill="url(#${p}-air)"/>

    ${/* แสงลาวาจากก้นถ้ำ เต้นช้า ๆ ทำให้ทั้งถ้ำดูอุ่นและอันตราย */ ''}
    <ellipse cx="160" cy="150" rx="150" ry="46" fill="url(#${p}-lava)">
      <animate attributeName="rx" values="150;164;150" dur="5.4s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values=".8;1;.85;1;.8" dur="3.7s" repeatCount="indefinite"/>
    </ellipse>

    ${/* เพดานถ้ำ ปิดขอบบนเป็นเส้นหยักไม่เท่ากัน */ ''}
    <path d="M0 0 L320 0 L320 14 Q280 48 240 22 Q200 50 160 20 Q120 48 80 22 Q40 48 0 12 Z"
      fill="url(#${p}-rock)"/>

    ${/*
      หินย้อย ปลายแหลมต้องชี้ "ลง" คือจุดยอดอยู่ล่าง ฐานติดเพดานอยู่บน
    */ ''}
    <g fill="url(#${p}-hang)">
      <polygon points="30,44 20,4 40,4"/>
      <polygon points="96,36 86,2 106,2"/>
      <polygon points="200,48 188,4 212,4"/>
      <polygon points="272,38 262,2 282,2"/>
      <polygon points="140,26 132,0 148,0"/>
    </g>

    ${bat(46, 13, 0, 1)}
    ${bat(30, 17, 5.5, 0.7)}
    ${bat(62, 15, 9.5, 0.85)}

    ${/*
      เงามังกรในความมืด เห็นแค่เค้าโครงกับดวงตา
      ต้องมีเขากับปากยื่นออกมาจากวงรี ไม่งั้นจะอ่านเป็นก้อนกลม ๆ ไม่ใช่หัวสัตว์
    */ ''}
    <g fill="#150733">
      <polygon points="128,62 118,30 140,52"/>
      <polygon points="192,62 202,30 180,52"/>
      <ellipse cx="160" cy="82" rx="46" ry="30"/>
      <path d="M144 100 Q160 118 176 100 Q160 108 144 100 Z"/>
    </g>
    ${/* ลมหายใจอุ่นเรืองขึ้นจากในลำคอ บอกว่ามันยังมีชีวิต */ ''}
    <ellipse cx="160" cy="80" rx="30" ry="22" fill="#7c3aed" opacity=".22">
      <animate attributeName="opacity" values=".14;.36;.14" dur="3s" repeatCount="indefinite"/>
    </ellipse>
    <ellipse cx="160" cy="102" rx="14" ry="5" fill="#f97316" opacity=".3">
      <animate attributeName="opacity" values=".12;.45;.12" dur="2.6s" repeatCount="indefinite"/>
    </ellipse>
    <circle cx="146" cy="76" r="14" fill="url(#${p}-eyeglow)"/>
    <circle cx="174" cy="76" r="14" fill="url(#${p}-eyeglow)"/>
    <g>
      ${/* ตามังกรกะพริบ: หรี่ลงพร้อมกันสั้น ๆ แล้วเปิดค้างนาน */ ''}
      <animate attributeName="opacity" values="1;1;1;1;0.06;1"
        keyTimes="0;0.4;0.75;0.93;0.96;1" dur="6.2s" repeatCount="indefinite"/>
      <circle cx="146" cy="76" r="6" fill="#fbbf24"/>
      <circle cx="174" cy="76" r="6" fill="#fbbf24"/>
      <ellipse cx="146" cy="76" rx="2" ry="5" fill="#1a0b2e"/>
      <ellipse cx="174" cy="76" rx="2" ry="5" fill="#1a0b2e"/>
      <circle cx="144" cy="73.5" r="1.4" fill="#fffbeb" opacity=".9"/>
      <circle cx="172" cy="73.5" r="1.4" fill="#fffbeb" opacity=".9"/>
    </g>

    ${/* พื้นถ้ำ */ ''}
    <path d="M0 160 L0 120 Q60 96 120 118 Q180 138 240 114 Q290 96 320 116 L320 160 Z"
      fill="url(#${p}-floor)"/>

    ${/*
      หินงอก ปลายแหลมต้องชี้ "ขึ้น" คือจุดยอดอยู่บน ฐานติดพื้นอยู่ล่าง
      ของเดิมสลับด้าน กลายเป็นสามเหลี่ยมคว่ำห้อยอยู่กลางพื้น
    */ ''}
    <g fill="url(#${p}-grow)">
      <polygon points="60,122 50,160 70,160"/>
      <polygon points="164,116 152,160 176,160"/>
      <polygon points="256,126 246,160 266,160"/>
    </g>

    ${coin(70, 142, 5, 0)}
    ${coin(84, 146, 3.6, 1)}
    ${coin(244, 143, 4.4, 2)}
    ${coin(232, 148, 3.2, 3)}

    ${/* สะเก็ดไฟลอยขึ้นจากลาวา */ ''}
    ${motes(
      [
        [100, 152, 1.8],
        [160, 156, 1.5],
        [210, 150, 1.7],
        [278, 154, 1.4],
        [40, 154, 1.6],
      ],
      '#fb923c',
      4.2,
      70,
    )}`
}

const SCENE_ART: Record<string, () => string> = {
  'world-1': forest,
  'world-2': castle,
  'world-3': desert,
  'world-4': city,
  'world-5': mountain,
  'world-6': dragonCave,
}

/** ภาพฉากของโลกหนึ่ง คืนภาพสำรองถ้ายังไม่มีฉากของโลกนั้น */
export function worldScene(worldId: string): string {
  const draw = SCENE_ART[worldId]
  if (draw) return draw()

  return `
    <defs>${sky('sc0-sky', '#120f38', '#1e1b4b', '#312e81')}</defs>
    <rect width="320" height="160" fill="url(#sc0-sky)"/>
    <path d="M0 120 Q80 100 160 116 Q240 132 320 112 L320 160 L0 160 Z" fill="#312e81"/>`
}

export function hasWorldScene(worldId: string): boolean {
  return worldId in SCENE_ART
}

/**
 * ฉากแบบล็อก — ฉากเดิมแต่หม่นลง ใช้กับโลกที่ยังเล่นไม่ได้
 * ยังเห็นเค้าโครงว่าโลกหน้าตาเป็นอย่างไร จึงอยากไปให้ถึง
 */
export function lockedSceneFilter(): string {
  return 'grayscale(0.85) brightness(0.45)'
}

/** ใช้ตอนทดสอบว่าครบทุกโลก */
export const SCENE_ART_IDS = Object.keys(SCENE_ART)
