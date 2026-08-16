import {
  blurFilter,
  diagonalGradient,
  EYE_SHADE_DEF,
  glowFilter,
  groundShadow,
  livingEye,
  rimLight,
  specular,
  sphereGradient,
  verticalGradient,
} from './shading'

/**
 * ภาพมอนสเตอร์ วาดด้วย SVG
 *
 * ทำไมใช้ SVG ไม่ใช้ไฟล์รูป
 *   - ไฟล์เล็กมาก เทียบกับ PNG ที่ใบละหลายร้อย KB
 *     เด็กที่เปิดผ่านเน็ตมือถือในห้องเรียนจึงโหลดทันที
 *   - คมทุกขนาด ขึ้นโปรเจกเตอร์หน้าห้องก็ไม่แตก
 *   - ขยับได้ด้วย CSS โดยไม่ต้องทำไฟล์เพิ่ม
 *
 * วิธีทำให้ดูมีมิติ (เรียงจากชั้นหลังไปหน้า)
 *   1. เงาตกกระทบบนพื้นแบบเบลอ ทำให้ตัวละคร "วางอยู่บนพื้น" ไม่ลอย
 *   2. อวัยวะด้านหลังใช้สีเข้มกว่า เกิดระยะชัด
 *   3. ลำตัวใช้ไล่สีทรงกลม แสงมาจากซ้ายบนเสมอทุกตัว
 *   4. เงาบริเวณที่ชิ้นส่วนมาบรรจบกัน ทำให้เห็นว่าซ้อนกันจริง
 *   5. แสงขอบด้านขวาล่าง ดันตัวละครให้หลุดจากพื้นหลัง
 *   6. จุดแสงสะท้อนบนผิวมัน
 *
 * ทุกฟังก์ชันคืน "เนื้อใน" ของ svg ไม่ใช่แท็ก svg เต็ม
 * ระบบพิกัด: ทุกตัววาดในกรอบ 100 × 100
 */

export const MONSTER_VIEWBOX = '0 0 100 100'

/** ก็อบลินเครื่องคิดเลข — ตัวเล็กเจ้าเล่ห์ ถือเครื่องคิดเลขที่กดผิดปุ่ม */
function goblinCalculator(): string {
  const p = 'gc'
  return `
    <defs>
      ${EYE_SHADE_DEF}
      ${sphereGradient(`${p}-skin`, '#bef264', '#84cc16', '#3f6212')}
      ${sphereGradient(`${p}-head`, '#d9f99d', '#a3e635', '#4d7c0f')}
      ${verticalGradient(`${p}-calc`, '#64748b', '#1e293b')}
      ${blurFilter(`${p}-blur`, 2.6)}
    </defs>

    ${groundShadow(`${p}-blur`, 50, 93, 27)}

    <!-- หูอยู่หลังหัว ใช้สีเข้มกว่าเพื่อให้เกิดระยะ -->
    <path d="M26 46 L10 26 L30 36 Z" fill="#4d7c0f"/>
    <path d="M74 46 L90 26 L70 36 Z" fill="#4d7c0f"/>
    <path d="M27 45 L15 30 L29 37 Z" fill="#65a30d"/>
    <path d="M73 45 L85 30 L71 37 Z" fill="#65a30d"/>

    <!-- ลำตัว -->
    <ellipse cx="50" cy="62" rx="26" ry="27" fill="url(#${p}-skin)"/>
    <!-- เงาใต้คาง ทำให้หัวดูซ้อนอยู่หน้าลำตัว -->
    <ellipse cx="50" cy="47" rx="21" ry="7" fill="#365314" opacity=".45"/>

    <!-- หัว -->
    <ellipse cx="50" cy="44" rx="24" ry="22" fill="url(#${p}-head)"/>
    ${specular(40, 33, 8, 5, -28, 0.45)}

    ${livingEye(41, 43, 7, '#365314')}
    ${livingEye(59, 43, 7, '#365314', 0.3)}

    <!-- ปากยิ้มกว้างพร้อมเขี้ยว -->
    <path d="M40 54 Q50 63 60 54 Q50 59 40 54 Z" fill="#1a2e05"/>
    <path d="M44 56 L46 60 L48 56 Z" fill="#fff"/>
    <path d="M52 56 L54 60 L56 56 Z" fill="#fff"/>

    ${rimLight('M70 34 Q74 46 70 56', '#ecfccb', 2)}

    <!-- เครื่องคิดเลขอยู่หน้าสุด มีเงาทาบบนลำตัว -->
    <ellipse cx="50" cy="76" rx="19" ry="5" fill="#1a2e05" opacity=".3"/>
    <rect x="33" y="72" width="34" height="21" rx="4" fill="url(#${p}-calc)"/>
    <rect x="33" y="72" width="34" height="4" rx="2" fill="#94a3b8" opacity=".55"/>
    <rect x="36" y="76" width="28" height="7" rx="1.5" fill="#a3e635"/>
    <rect x="36" y="76" width="28" height="3" rx="1.5" fill="#d9f99d" opacity=".6"/>
    <g fill="#cbd5e1">
      <rect x="37" y="85" width="6" height="5" rx="1.2"/>
      <rect x="46" y="85" width="6" height="5" rx="1.2"/>
      <rect x="55" y="85" width="6" height="5" rx="1.2"/>
    </g>`
}

/** สไลม์ตัวเลข — ก้อนวุ้นโปร่งแสงที่กลืนตัวเลขเข้าไป */
function numberSlime(): string {
  const p = 'ns'
  return `
    <defs>
      ${EYE_SHADE_DEF}
      <radialGradient id="${p}-body" cx="35%" cy="25%" r="80%">
        <stop offset="0%" stop-color="#bbf7d0" stop-opacity=".97"/>
        <stop offset="45%" stop-color="#34d399" stop-opacity=".92"/>
        <stop offset="100%" stop-color="#047857" stop-opacity=".95"/>
      </radialGradient>
      ${blurFilter(`${p}-blur`, 3)}
      ${blurFilter(`${p}-soft`, 1.6)}
      ${blurFilter(`${p}-inner`, 0.5)}
    </defs>

    ${groundShadow(`${p}-blur`, 50, 92, 31)}

    <!-- ตัวสไลม์ ขยับเหมือนหายใจ -->
    <path d="M18 86 Q14 44 50 40 Q86 44 82 86 Z" fill="url(#${p}-body)">
      <animate attributeName="d"
        values="M18 86 Q14 44 50 40 Q86 44 82 86 Z;
                M16 86 Q18 50 50 45 Q82 50 84 86 Z;
                M18 86 Q14 44 50 40 Q86 44 82 86 Z"
        dur="3.4s" repeatCount="indefinite"/>
    </path>

    <!-- แสงส่องทะลุด้านล่าง บอกว่าตัวโปร่งแสง -->
    <ellipse cx="50" cy="82" rx="24" ry="6" fill="#a7f3d0" opacity=".4" filter="url(#${p}-soft)"/>

    <!--
      จุดแสงสะท้อนต้องอยู่ในตัวสไลม์เท่านั้น
      ถ้าล้นออกนอกขอบ สีขาวจะไปทับพื้นหลังเข้มแล้วกลายเป็นก้อนเทา
      ดูเหมือนมีหูงอกออกมา ซึ่งเป็นข้อผิดพลาดที่เห็นได้ชัดมาก
    -->
    ${specular(38, 56, 7, 10, -22, 0.45)}
    ${specular(60, 54, 3.5, 5, -18, 0.28)}

    <!--
      ตัวเลขที่ถูกกลืน อยู่ "ข้างใน" จึงเบลอกว่าผิวด้านนอกเล็กน้อย
      ต้องเลี่ยงจุดแสงสะท้อนกับดวงตา ไม่งั้นสีขาวจะกลบจนอ่านไม่ออก
    -->
    <g fill="#064e3b" opacity=".85" filter="url(#${p}-inner)"
       font-family="system-ui, sans-serif" font-weight="800">
      <text x="23" y="76" font-size="13">7</text>
      <text x="66" y="78" font-size="12">3</text>
      <text x="46" y="54" font-size="10">5</text>
    </g>

    ${livingEye(40, 62, 7.5, '#065f46')}
    ${livingEye(60, 62, 7.5, '#065f46', 0.4)}

    <path d="M43 76 Q50 83 57 76" stroke="#065f46" stroke-width="3.2"
      fill="none" stroke-linecap="round"/>

    ${/*
      แสงขอบต้องเดินตามเส้นรอบตัวจริง ไม่ใช่เส้นตรงลอย ๆ ข้างตัว
      ขอบขวาของสไลม์ผ่านจุด (72,50) (81,66) (82,84)
      จึงวางแสงเยื้องเข้าด้านในราว 2 หน่วย เผื่อตอนตัวขยับหายใจ
    */ ''}
    ${rimLight('M71 50 Q83 66 80 82', '#d1fae5', 2)}`
}

/** ค้างคาวเศษส่วน — ปีกโปร่งแสงแบ่งเป็นส่วน ๆ */
function fractionBat(): string {
  const p = 'fb'
  return `
    <defs>
      ${EYE_SHADE_DEF}
      ${sphereGradient(`${p}-body`, '#c4b5fd', '#8b5cf6', '#4c1d95')}
      ${diagonalGradient(`${p}-wing`, '#8b5cf6', '#3b0764')}
      ${blurFilter(`${p}-blur`, 2.4)}
    </defs>

    ${groundShadow(`${p}-blur`, 50, 93, 20)}

    <g>
      <animateTransform attributeName="transform" type="rotate"
        values="-5 50 54; 5 50 54; -5 50 54" dur="2.6s" repeatCount="indefinite"/>

      <!-- ปีกหลังเข้มกว่าปีกหน้า สร้างระยะชัด -->
      <path d="M38 54 Q12 36 4 54 Q17 57 10 70 Q26 65 38 68 Z"
        fill="url(#${p}-wing)" opacity=".95"/>
      <path d="M62 54 Q88 36 96 54 Q83 57 90 70 Q74 65 62 68 Z"
        fill="url(#${p}-wing)" opacity=".95"/>

      <!-- โครงกระดูกปีก ทำให้เห็นว่าปีกเป็นแผ่นบาง -->
      <g stroke="#2e1065" stroke-width="1.5" opacity=".75" fill="none">
        <path d="M30 52 L28 68 M21 53 L19 68 M13 55 L11 68"/>
        <path d="M70 52 L72 68 M79 53 L81 68 M87 55 L89 68"/>
      </g>
      <!--
        แสงบนขอบปีกด้านบน
        ต้องลากตามขอบบนของปีกจริง (M38 54 Q12 36 4 54) เยื้องเข้าเล็กน้อย
        ถ้าลากเป็นเส้นโค้งลอยกลางปีก จะกลายเป็นรอยขีดสีเทาพาดปีก
      -->
      <path d="M37 55 Q14 39 6 54" stroke="#ddd6fe" stroke-width="1.3"
        fill="none" opacity=".38" stroke-linecap="round"/>
      <path d="M63 55 Q86 39 94 54" stroke="#ddd6fe" stroke-width="1.3"
        fill="none" opacity=".38" stroke-linecap="round"/>
    </g>

    <!-- หูอยู่หลังหัว -->
    <path d="M39 44 L34 27 L47 40 Z" fill="#5b21b6"/>
    <path d="M61 44 L66 27 L53 40 Z" fill="#5b21b6"/>

    <ellipse cx="50" cy="58" rx="17" ry="19" fill="url(#${p}-body)"/>
    ${specular(43, 48, 6, 8, -25, 0.42)}

    ${livingEye(44, 55, 6, '#3b0764')}
    ${livingEye(56, 55, 6, '#3b0764', 0.25)}

    <!-- เขี้ยวเล็ก -->
    <path d="M46 67 L48 72 L50 67 Z" fill="#fff"/>
    <path d="M52 67 L54 72 L56 67 Z" fill="#fff"/>

    ${rimLight('M63 47 Q67 58 61 71', '#ede9fe', 1.8)}

    <text x="41" y="90" fill="#ddd6fe" font-family="system-ui, sans-serif"
      font-size="13" font-weight="800">1/2</text>`
}

/** แมงป่องทศนิยม — หางชูสูงปลายเป็นจุดทศนิยมเรืองแสง */
function decimalScorpion(): string {
  const p = 'ds'
  return `
    <defs>
      ${EYE_SHADE_DEF}
      ${sphereGradient(`${p}-shell`, '#fcd34d', '#f59e0b', '#92400e')}
      ${verticalGradient(`${p}-tail`, '#f59e0b', '#b45309')}
      ${blurFilter(`${p}-blur`, 2.8)}
      ${glowFilter(`${p}-glow`, 2.4)}
    </defs>

    ${groundShadow(`${p}-blur`, 48, 92, 29)}

    <!-- ขาหลังเข้ม อยู่หลังลำตัว -->
    <g stroke="#78350f" stroke-width="4.5" stroke-linecap="round" fill="none">
      <path d="M34 66 L22 58 M44 68 L38 56"/>
    </g>

    <!-- หางโค้งขึ้น ปล้องไล่ขนาดให้ดูมีความลึก -->
    <path d="M66 70 Q88 66 86 44 Q84 28 70 26" stroke="url(#${p}-tail)"
      stroke-width="8" fill="none" stroke-linecap="round"/>
    <g fill="#b45309" opacity=".55">
      <ellipse cx="76" cy="68" rx="3.4" ry="2.6"/>
      <ellipse cx="84" cy="58" rx="3" ry="2.4"/>
      <ellipse cx="85" cy="45" rx="2.8" ry="2.4"/>
      <ellipse cx="78" cy="32" rx="2.6" ry="2.2"/>
    </g>

    <!-- ปลายหางคือจุดทศนิยม เรืองแสงเป็นจังหวะ -->
    <circle cx="69" cy="24" r="8" fill="#fbbf24" filter="url(#${p}-glow)">
      <animate attributeName="r" values="7.4;9.2;7.4" dur="1.8s" repeatCount="indefinite"/>
    </circle>
    <circle cx="69" cy="24" r="3.4" fill="#fffbeb"/>

    <!-- ลำตัว -->
    <ellipse cx="46" cy="66" rx="25" ry="16" fill="url(#${p}-shell)"/>
    <!-- ปล้องเปลือก -->
    <g stroke="#92400e" stroke-width="1.4" opacity=".5" fill="none">
      <path d="M36 53 Q36 66 36 79 M46 51 Q46 66 46 81 M56 53 Q56 66 56 79"/>
    </g>
    ${specular(36, 58, 9, 5, -20, 0.45)}

    <!-- ขาหน้าสว่างกว่าขาหลัง -->
    <g stroke="#b45309" stroke-width="4.5" stroke-linecap="round" fill="none">
      <path d="M34 74 L20 84 M46 78 L42 90 M58 76 L64 88"/>
    </g>

    <!-- ก้ามอยู่หน้าสุด -->
    <path d="M24 60 Q9 52 12 42 Q23 46 27 56 Z" fill="#f59e0b"/>
    <path d="M24 60 Q13 55 15 47" stroke="#78350f" stroke-width="1.6" fill="none"/>
    <path d="M22 70 Q6 73 7 82 Q19 79 26 72 Z" fill="#d97706"/>

    ${livingEye(40, 62, 5.5, '#78350f')}
    ${livingEye(52, 62, 5.5, '#78350f', 0.35)}

    ${rimLight('M64 56 Q70 66 62 78', '#fef3c7', 1.8)}

    <text x="35" y="78" fill="#78350f" font-family="system-ui, sans-serif"
      font-size="10" font-weight="800" opacity=".8">0.5</text>`
}

/** โจรร้อยละ — ผ้าปิดหน้า ถือป้ายลดราคาปลอม */
function percentageBandit(): string {
  const p = 'pb'
  return `
    <defs>
      ${EYE_SHADE_DEF}
      ${sphereGradient(`${p}-skin`, '#fde8d0', '#f5cba7', '#c98d5e')}
      ${verticalGradient(`${p}-cloak`, '#334155', '#0b1120')}
      ${verticalGradient(`${p}-sign`, '#ef4444', '#991b1b')}
      ${blurFilter(`${p}-blur`, 2.6)}
    </defs>

    ${groundShadow(`${p}-blur`, 50, 93, 25)}

    <!-- ผ้าคลุมพลิ้วด้านหลัง -->
    <path d="M30 88 Q22 62 34 52 Q30 72 36 88 Z" fill="#0f172a" opacity=".85"/>
    <path d="M70 88 Q78 62 66 52 Q70 72 64 88 Z" fill="#0f172a" opacity=".85"/>

    <!-- ลำตัว -->
    <path d="M32 92 Q30 60 50 56 Q70 60 68 92 Z" fill="url(#${p}-cloak)"/>
    <!-- รอยพับผ้า -->
    <g stroke="#020617" stroke-width="1.4" opacity=".45" fill="none">
      <path d="M42 62 Q40 78 42 92 M58 62 Q60 78 58 92"/>
    </g>

    <!-- แขน -->
    <path d="M35 68 L24 82" stroke="#1e293b" stroke-width="8" stroke-linecap="round"/>
    <path d="M65 68 L76 60" stroke="#1e293b" stroke-width="8" stroke-linecap="round"/>

    <!-- เงาใต้คาง -->
    <ellipse cx="50" cy="57" rx="15" ry="5" fill="#020617" opacity=".55"/>

    <!-- ฮู้ดคลุมหัว -->
    <path d="M28 44 Q28 20 50 20 Q72 20 72 44 Q64 34 50 34 Q36 34 28 44 Z"
      fill="#1e293b"/>
    <circle cx="50" cy="44" r="16" fill="url(#${p}-skin)"/>
    ${specular(43, 36, 6, 4, -30, 0.4)}

    <!-- ผ้าปิดตา -->
    <rect x="33" y="37" width="34" height="10" rx="3" fill="#0b1120"/>
    <circle cx="42" cy="42" r="3" fill="#fbbf24"/>
    <circle cx="58" cy="42" r="3" fill="#fbbf24"/>
    <circle cx="42.8" cy="41.2" r="1" fill="#fff"/>
    <circle cx="58.8" cy="41.2" r="1" fill="#fff"/>

    <path d="M43 53 Q50 57 57 53" stroke="#8a5a3a" stroke-width="2.2"
      fill="none" stroke-linecap="round"/>

    ${/* ขอบขวาของลำตัวผ่าน (58.6,60) (64.5,67) (67.6,78) จึงเยื้องเข้ามาราว 2 หน่วย */ ''}
    ${rimLight('M61 58 Q66 70 65 88', '#94a3b8', 1.8)}

    <!-- ป้ายลดราคาปลอม เอียงและมีเงาทาบ -->
    <g transform="rotate(-14 80 56)">
      <rect x="67" y="45" width="27" height="20" rx="3" fill="#7f1d1d" opacity=".5"
        transform="translate(1.5 2)"/>
      <rect x="67" y="45" width="27" height="20" rx="3" fill="url(#${p}-sign)"/>
      <rect x="67" y="45" width="27" height="7" rx="3" fill="#fca5a5" opacity=".35"/>
      <text x="70" y="59" fill="#fff" font-family="system-ui, sans-serif"
        font-size="11" font-weight="800">-20%</text>
    </g>`
}

/** โกเลมเรขาคณิต — หุ่นหินประกอบจากรูปทรงเรขาคณิต */
function geometryGolem(): string {
  const p = 'gg'
  return `
    <defs>
      ${EYE_SHADE_DEF}
      ${diagonalGradient(`${p}-stone`, '#cbd5e1', '#475569')}
      ${diagonalGradient(`${p}-dark`, '#64748b', '#1e293b')}
      ${sphereGradient(`${p}-core`, '#bae6fd', '#0ea5e9', '#075985')}
      ${blurFilter(`${p}-blur`, 3)}
      ${glowFilter(`${p}-glow`, 2.6)}
    </defs>

    ${groundShadow(`${p}-blur`, 50, 94, 32)}

    <!-- แขนหลังเข้มกว่า -->
    <rect x="6" y="50" width="14" height="30" rx="4" fill="url(#${p}-dark)"/>
    <rect x="80" y="50" width="14" height="30" rx="4" fill="url(#${p}-dark)"/>

    <!-- ขา -->
    <rect x="33" y="84" width="13" height="10" rx="3" fill="#334155"/>
    <rect x="54" y="84" width="13" height="10" rx="3" fill="#334155"/>

    <!-- ลำตัว -->
    <rect x="24" y="44" width="52" height="42" rx="5" fill="url(#${p}-stone)"/>
    <!-- รอยแตกบนหิน ทำให้ผิวดูมีเนื้อ -->
    <g stroke="#334155" stroke-width="1.3" opacity=".55" fill="none">
      <path d="M32 50 L36 60 L31 68 M68 52 L64 62 L69 72"/>
    </g>
    <rect x="30" y="50" width="40" height="30" rx="4" fill="#94a3b8"/>
    <rect x="30" y="50" width="40" height="7" rx="3" fill="#e2e8f0" opacity=".5"/>

    <!-- แกนพลังเรืองแสงตรงอก -->
    <polygon points="50,56 63,76 37,76" fill="url(#${p}-core)" filter="url(#${p}-glow)">
      <animate attributeName="opacity" values="1;.6;1" dur="2.4s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="50,61 58,74 42,74" fill="#e0f2fe" opacity=".6"/>

    <!-- เงาใต้หัว -->
    <ellipse cx="50" cy="44" rx="20" ry="5" fill="#1e293b" opacity=".5"/>

    <!-- หัวทรงสามเหลี่ยม -->
    <polygon points="50,8 76,42 24,42" fill="url(#${p}-stone)"/>
    <polygon points="50,15 68,40 32,40" fill="#cbd5e1"/>
    <polygon points="50,15 58,40 32,40" fill="#e2e8f0" opacity=".55"/>

    ${livingEye(42, 32, 5.5, '#0c4a6e')}
    ${livingEye(58, 32, 5.5, '#0c4a6e', 0.3)}

    ${rimLight('M74 48 Q77 64 74 84', '#f1f5f9', 2)}`
}

/** ผู้พิทักษ์คณิต — มินิบอส ถือโล่และคทาเรืองแสง */
function mathGuardian(): string {
  const p = 'mg'
  return `
    <defs>
      ${EYE_SHADE_DEF}
      ${sphereGradient(`${p}-skin`, '#dbeafe', '#93c5fd', '#3b82f6')}
      ${verticalGradient(`${p}-armor`, '#3b82f6', '#1e3a8a')}
      ${verticalGradient(`${p}-shield`, '#fde047', '#a16207')}
      ${blurFilter(`${p}-blur`, 3)}
      ${glowFilter(`${p}-glow`, 3)}
    </defs>

    ${groundShadow(`${p}-blur`, 50, 94, 31)}

    <!-- คทาอยู่หลังตัว -->
    <path d="M68 26 L68 82" stroke="#78350f" stroke-width="5" stroke-linecap="round"/>
    <path d="M67 30 L67 78" stroke="#a16207" stroke-width="1.8" opacity=".7"/>
    <circle cx="68" cy="20" r="10" fill="#fbbf24" filter="url(#${p}-glow)">
      <animate attributeName="opacity" values="1;.55;1" dur="2.2s" repeatCount="indefinite"/>
    </circle>
    <text x="62" y="25" fill="#78350f" font-family="system-ui, sans-serif"
      font-size="13" font-weight="800">=</text>

    <!-- เสื้อเกราะ -->
    <path d="M28 48 Q28 34 50 32 Q72 34 72 48 L72 78 Q50 90 28 78 Z"
      fill="url(#${p}-armor)"/>
    <path d="M34 50 Q34 40 50 38 Q66 40 66 50 L66 74 Q50 83 34 74 Z"
      fill="#60a5fa"/>
    <!-- แผ่นเกราะซ้อนชั้น -->
    <path d="M34 56 Q50 62 66 56 L66 60 Q50 66 34 60 Z" fill="#1e3a8a" opacity=".45"/>
    <path d="M34 66 Q50 72 66 66 L66 70 Q50 76 34 70 Z" fill="#1e3a8a" opacity=".45"/>

    <!-- เงาใต้หมวก -->
    <ellipse cx="50" cy="33" rx="15" ry="4.5" fill="#1e3a8a" opacity=".55"/>

    <circle cx="50" cy="26" r="16" fill="url(#${p}-skin)"/>
    <path d="M34 24 Q50 6 66 24 Q50 16 34 24 Z" fill="#1e40af"/>
    ${specular(43, 18, 6, 4, -30, 0.45)}

    ${livingEye(44, 26, 5.5, '#1e3a8a')}
    ${livingEye(56, 26, 5.5, '#1e3a8a', 0.3)}

    <!-- โล่อยู่หน้าสุด มีเงาทาบบนลำตัว -->
    <ellipse cx="24" cy="60" rx="14" ry="17" fill="#1e3a8a" opacity=".35"/>
    <path d="M12 44 Q7 64 22 78 Q37 64 32 44 Q22 39 12 44 Z" fill="url(#${p}-shield)"/>
    <path d="M16 48 Q13 62 22 72 Q31 62 28 48 Q22 45 16 48 Z" fill="#fef08a"/>
    <text x="16" y="64" fill="#78350f" font-family="system-ui, sans-serif"
      font-size="13" font-weight="800">÷</text>

    ${rimLight('M68 40 Q72 58 67 76', '#dbeafe', 2)}`
}

/** มังกรแห่งตัวเลข — บอสใหญ่ ปีกกางเต็มกรอบ */
function dragonOfNumbers(): string {
  const p = 'dn'
  return `
    <defs>
      ${EYE_SHADE_DEF}
      ${sphereGradient(`${p}-body`, '#fca5a5', '#dc2626', '#7f1d1d')}
      ${diagonalGradient(`${p}-wing`, '#991b1b', '#450a0a')}
      ${verticalGradient(`${p}-belly`, '#fecaca', '#f87171')}
      ${blurFilter(`${p}-blur`, 3.2)}
      ${glowFilter(`${p}-glow`, 2.6)}
    </defs>

    ${groundShadow(`${p}-blur`, 50, 94, 35)}

    <!-- ปีกกระพือ อยู่หลังสุด -->
    <g>
      <animateTransform attributeName="transform" type="translate"
        values="0 0; 0 -2.5; 0 0" dur="3.2s" repeatCount="indefinite"/>
      <path d="M32 50 Q4 22 0 52 Q15 56 6 76 Q26 68 36 66 Z" fill="url(#${p}-wing)"/>
      <path d="M68 50 Q96 22 100 52 Q85 56 94 76 Q74 68 64 66 Z" fill="url(#${p}-wing)"/>
      <g stroke="#2a0505" stroke-width="1.6" opacity=".7" fill="none">
        <path d="M24 44 L21 64 M14 48 L11 68 M6 54 L4 70"/>
        <path d="M76 44 L79 64 M86 48 L89 68 M94 54 L96 70"/>
      </g>
      <!-- แสงเดินตามขอบบนของปีก (M32 50 Q4 22 0 52) เยื้องเข้ามาเล็กน้อย -->
      <path d="M31 51 Q7 27 3 52" stroke="#f87171" stroke-width="1.4"
        fill="none" opacity=".4" stroke-linecap="round"/>
      <path d="M69 51 Q93 27 97 52" stroke="#f87171" stroke-width="1.4"
        fill="none" opacity=".4" stroke-linecap="round"/>
    </g>

    <!-- หาง -->
    <path d="M36 64 Q28 86 44 92 Q56 94 62 86" stroke="#b91c1c"
      stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M36 64 Q30 84 44 90" stroke="#f87171" stroke-width="3"
      fill="none" opacity=".45"/>

    <!-- เขา อยู่หลังหัว -->
    <path d="M33 40 L25 20 L44 34 Z" fill="#7f1d1d"/>
    <path d="M67 40 L75 20 L56 34 Z" fill="#7f1d1d"/>
    <path d="M34 39 L29 26 L42 35 Z" fill="#b91c1c"/>
    <path d="M66 39 L71 26 L58 35 Z" fill="#b91c1c"/>

    <!-- ลำตัว -->
    <ellipse cx="50" cy="58" rx="24" ry="22" fill="url(#${p}-body)"/>
    <!-- ท้องสีอ่อน เป็นเทคนิคที่ทำให้สัตว์ดูมีปริมาตรทันที -->
    <ellipse cx="50" cy="66" rx="16" ry="13" fill="url(#${p}-belly)"/>
    <g stroke="#f87171" stroke-width="1.2" opacity=".6" fill="none">
      <path d="M38 62 L62 62 M40 68 L60 68 M42 74 L58 74"/>
    </g>
    ${specular(40, 45, 8, 6, -28, 0.42)}

    <!-- หงอน -->
    <path d="M50 34 L45 18 L55 18 Z" fill="#fbbf24" filter="url(#${p}-glow)"/>

    ${livingEye(41, 52, 7.5, '#7f1d1d')}
    ${livingEye(59, 52, 7.5, '#7f1d1d', 0.35)}

    <!-- ปากพร้อมเขี้ยว -->
    <path d="M39 68 Q50 78 61 68 Q50 73 39 68 Z" fill="#450a0a"/>
    <path d="M42 69 L44 75 L46 69 Z" fill="#fff"/>
    <path d="M54 69 L56 75 L58 69 Z" fill="#fff"/>

    ${/* ขอบขวาของลำตัวผ่าน (68.5,44) (74,58) (66.5,74) จึงเยื้องเข้ามาราว 2–3 หน่วย */ ''}
    ${rimLight('M66 44 Q79 57 63 74', '#fecaca', 2.2)}

    <!--
      ตัวเลขลอยรอบตัว
      ต้องเรืองแสงสีเดียวกับหงอน ไม่งั้นจะอ่านเป็นตัวหนังสือเทาหลุดจากภาพ
    -->
    <g fill="#fbbf24" filter="url(#${p}-glow)"
       font-family="system-ui, sans-serif" font-weight="800" opacity=".75">
      <text x="14" y="26" font-size="11">8
        <animate attributeName="opacity" values=".75;.25;.75" dur="3s" repeatCount="indefinite"/>
      </text>
      <text x="82" y="30" font-size="10">4
        <animate attributeName="opacity" values=".3;.8;.3" dur="3.6s" repeatCount="indefinite"/>
      </text>
      <text x="16" y="90" font-size="9">2
        <animate attributeName="opacity" values=".6;.2;.6" dur="4.2s" repeatCount="indefinite"/>
      </text>
    </g>`
}


/**
 * ผีสมการ ตัวโปร่งแสงที่ไม่มีขา ลอยส่ายไปมา
 *
 * ทำเป็นชายผ้าหยักด้านล่างแทนขา แล้วให้หยักขยับตลอดเวลา
 * เป็นวิธีที่ทำให้ "ลอย" อ่านออกทันทีโดยไม่ต้องมีเงาหรือคำอธิบาย
 * เงาบนพื้นจึงจางกว่าตัวอื่นมาก เพราะมันไม่ได้ยืนอยู่บนพื้นจริง
 */
function equationWraith(): string {
  const p = 'ew'
  return `
    <defs>
      ${EYE_SHADE_DEF}
      ${sphereGradient(`${p}-body`, '#e0e7ff', '#a5b4fc', '#4c1d95')}
      ${blurFilter(`${p}-blur`, 3)}
      ${blurFilter(`${p}-soft`, 2)}
      ${glowFilter(`${p}-glow`, 2.4)}
    </defs>

    <!-- เงาจางมาก เพราะตัวนี้ลอยอยู่ ไม่ได้แตะพื้น -->
    <ellipse cx="50" cy="94" rx="20" ry="4" fill="#000" opacity=".2" filter="url(#${p}-blur)"/>

    <g>
      <animateTransform attributeName="transform" type="translate"
        values="0 0; 0 -4.5; 0 0" dur="3.7s" repeatCount="indefinite"/>

      <!-- ตัวผี ชายล่างหยักและขยับตลอด -->
      <path d="M26 60 Q26 26 50 26 Q74 26 74 60 L74 82
               Q68 74 62 82 Q56 90 50 82 Q44 74 38 82 Q32 90 26 82 Z"
        fill="url(#${p}-body)" opacity=".93">
        <animate attributeName="d"
          values="M26 60 Q26 26 50 26 Q74 26 74 60 L74 82 Q68 74 62 82 Q56 90 50 82 Q44 74 38 82 Q32 90 26 82 Z;
                  M26 60 Q26 26 50 26 Q74 26 74 60 L74 84 Q68 92 62 84 Q56 76 50 84 Q44 92 38 84 Q32 76 26 84 Z;
                  M26 60 Q26 26 50 26 Q74 26 74 60 L74 82 Q68 74 62 82 Q56 90 50 82 Q44 74 38 82 Q32 90 26 82 Z"
          dur="2.9s" repeatCount="indefinite"/>
      </path>

      ${rimLight('M50 26 Q74 26 74 60', '#ede9fe', 2)}
      ${specular(40, 40, 7, 9, -24, 0.4)}

      <!-- เครื่องหมายสมการลอยอยู่ในตัว บอกว่าเป็นผีของสมการ -->
      <text x="50" y="72" text-anchor="middle" font-size="13" font-weight="bold"
        fill="#ddd6fe" opacity=".65" filter="url(#${p}-soft)">=</text>

      ${livingEye(42, 47, 7, '#4c1d95', 0.4)}
      ${livingEye(58, 47, 7, '#4c1d95', 0.9)}
    </g>`
}

/**
 * อัศวินจำนวนเฉพาะ ตัวถึกที่มีโล่
 *
 * รูปทรงเหลี่ยมและหนัก ต่างจากตัวอื่นที่กลมและนุ่ม
 * เด็กจึงอ่านออกตั้งแต่ยังไม่เข้าใกล้ว่าตัวนี้ตีทีเดียวไม่ล้ม
 */
function primeKnight(): string {
  const p = 'pk'
  return `
    <defs>
      ${EYE_SHADE_DEF}
      ${verticalGradient(`${p}-plate`, '#cbd5e1', '#334155')}
      ${verticalGradient(`${p}-shield`, '#fcd34d', '#b45309')}
      ${blurFilter(`${p}-blur`, 3)}
      ${glowFilter(`${p}-glow`, 2)}
    </defs>

    ${groundShadow(`${p}-blur`, 50, 93, 26)}

    <g>
      <animateTransform attributeName="transform" type="translate"
        values="0 0; 0 -1.6; 0 0" dur="2.5s" repeatCount="indefinite"/>

      <!-- ขาสองข้าง สั้นและหนา -->
      <rect x="34" y="74" width="11" height="18" rx="3" fill="#334155"/>
      <rect x="55" y="74" width="11" height="18" rx="3" fill="#334155"/>

      <!-- ลำตัวเป็นเกราะแผ่น -->
      <path d="M30 42 L70 42 L66 78 L34 78 Z" fill="url(#${p}-plate)"/>
      ${rimLight('M30 42 L70 42', '#f1f5f9', 2)}

      <!-- หมวกเกราะ มีช่องมองเป็นแถบ -->
      <path d="M34 22 Q50 12 66 22 L66 40 L34 40 Z" fill="url(#${p}-plate)"/>
      <rect x="38" y="28" width="24" height="7" rx="3" fill="#0b1220"/>
      ${livingEye(44, 31.5, 3.2, '#7f1d1d', 0.2)}
      ${livingEye(56, 31.5, 3.2, '#7f1d1d', 0.7)}

      <!-- โล่ที่มีเลข 7 ซึ่งเป็นจำนวนเฉพาะ -->
      <g>
        <animateTransform attributeName="transform" type="rotate"
          values="-4 24 60; 4 24 60; -4 24 60" dur="3.3s" repeatCount="indefinite"/>
        <path d="M12 46 L36 46 L36 64 Q24 76 12 64 Z" fill="url(#${p}-shield)"/>
        <text x="24" y="62" text-anchor="middle" font-size="15" font-weight="bold"
          fill="#78350f">7</text>
      </g>

      <!--
        แสงสะท้อนบนเกราะต้องเป็นแถบบางแนบขอบซ้าย ไม่ใช่วงรีกลางอก
        ตอนแรกใช้วงรีขนาด 6x12 กลางลำตัว ซึ่งเรนเดอร์ออกมาเป็นก้อนขาว
        ดูเหมือนภาพเสียมากกว่าดูเหมือนโลหะสะท้อนแสง
      -->
      <path d="M34 45 L34 75" stroke="#f8fafc" stroke-width="2.5" opacity=".28"
        stroke-linecap="round" fill="none"/>
    </g>`
}

/**
 * ลูกบาศก์วุ่นวาย หมุนตลอดเวลาและมีเลขคนละด้าน
 *
 * ตัวนี้ตั้งใจให้ดูเป็นเครื่องจักรมากกว่าสิ่งมีชีวิต
 * เพราะเป็นตัวที่ยิงระยะไกล เด็กจะได้แยกออกว่าไม่ต้องรอให้มันเข้ามาชน
 */
function chaosCube(): string {
  const p = 'cc'
  return `
    <defs>
      ${EYE_SHADE_DEF}
      ${diagonalGradient(`${p}-face`, '#fda4af', '#9f1239')}
      ${diagonalGradient(`${p}-side`, '#7f1d1d', '#450a0a')}
      ${blurFilter(`${p}-blur`, 3)}
      ${glowFilter(`${p}-glow`, 2.6)}
    </defs>

    ${groundShadow(`${p}-blur`, 50, 92, 24)}

    <g>
      <animateTransform attributeName="transform" type="rotate"
        values="0 50 56; 8 50 56; -8 50 56; 0 50 56" dur="4.6s" repeatCount="indefinite"/>

      <!-- หน้าบนกับหน้าข้าง ทำให้อ่านเป็นลูกบาศก์ ไม่ใช่สี่เหลี่ยมแบน -->
      <path d="M28 36 L50 24 L72 36 L50 48 Z" fill="url(#${p}-side)"/>
      <path d="M28 36 L50 48 L50 82 L28 70 Z" fill="url(#${p}-side)" opacity=".85"/>
      <path d="M72 36 L50 48 L50 82 L72 70 Z" fill="url(#${p}-face)"/>

      ${rimLight('M28 36 L50 24 L72 36', '#fecdd3', 1.8)}

      <!-- เลขคนละด้าน หมุนมาให้เห็นทีละหน้า -->
      <text x="61" y="62" text-anchor="middle" font-size="12" font-weight="bold"
        fill="#fff1f2" opacity=".9">8</text>
      <text x="39" y="62" text-anchor="middle" font-size="11" font-weight="bold"
        fill="#fecdd3" opacity=".55">3</text>

      <!-- ตาดวงเดียวตรงกลาง ทำให้ดูเป็นเครื่องจักรที่กำลังเล็ง -->
      <circle cx="50" cy="52" r="9" fill="#0b0616" opacity=".85"/>
      ${livingEye(50, 52, 6.5, '#b91c1c', 0.3)}
      <circle cx="50" cy="52" r="11" fill="none" stroke="#fb7185" stroke-width="1.6"
        opacity=".7" filter="url(#${p}-glow)">
        <animate attributeName="r" values="11;14;11" dur="1.9s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;.15;.7" dur="1.9s" repeatCount="indefinite"/>
      </circle>
    </g>`
}

/**
 * หนอนทศนิยม ตัวยาวที่เลื้อยเป็นปล้อง
 *
 * ปล้องแต่ละปล้องขยับไม่พร้อมกัน (หน่วงเวลาต่างกันทีละ 0.12 วินาที)
 * ซึ่งเป็นสิ่งเดียวที่ทำให้การเลื้อยดูเป็นการเลื้อยจริง ไม่ใช่ทั้งตัวขยับพร้อมกัน
 */
function decimalWorm(): string {
  const p = 'dw'
  const segment = (cx: number, cy: number, r: number, delay: number, opacity: number) => `
    <g>
      <animateTransform attributeName="transform" type="translate"
        values="0 0; 0 -3.4; 0 0" dur="1.5s" begin="${delay}s" repeatCount="indefinite"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${p}-body)" opacity="${opacity}"/>
    </g>`

  return `
    <defs>
      ${EYE_SHADE_DEF}
      ${sphereGradient(`${p}-body`, '#fde68a', '#f59e0b', '#92400e')}
      ${blurFilter(`${p}-blur`, 3)}
    </defs>

    ${groundShadow(`${p}-blur`, 50, 93, 28)}

    ${segment(22, 78, 8, 0.48, 0.8)}
    ${segment(34, 74, 10, 0.36, 0.86)}
    ${segment(48, 70, 12, 0.24, 0.92)}
    ${segment(63, 64, 13.5, 0.12, 0.96)}

    <!-- หัว ขยับก่อนปล้องอื่นเสมอ จึงดูเหมือนหัวเป็นตัวนำ -->
    <g>
      <animateTransform attributeName="transform" type="translate"
        values="0 0; 0 -3.4; 0 0" dur="1.5s" repeatCount="indefinite"/>
      <circle cx="76" cy="52" r="15" fill="url(#${p}-body)"/>
      ${rimLight('M66 44 Q76 37 86 46', '#fef3c7', 2)}
      ${specular(71, 46, 5, 7, -22, 0.4)}
      ${livingEye(72, 50, 5, '#7c2d12', 0.2)}
      ${livingEye(83, 52, 4.2, '#7c2d12', 0.8)}

      <!-- จุดทศนิยมบนหัว เป็นที่มาของชื่อ -->
      <circle cx="77" cy="62" r="2.6" fill="#fffbeb" opacity=".9"/>
    </g>`
}

const MONSTER_ART: Record<string, () => string> = {
  'goblin-calculator': goblinCalculator,
  'number-slime': numberSlime,
  'fraction-bat': fractionBat,
  'decimal-scorpion': decimalScorpion,
  'percentage-bandit': percentageBandit,
  'geometry-golem': geometryGolem,
  'math-guardian': mathGuardian,
  'dragon-of-numbers': dragonOfNumbers,
  'equation-wraith': equationWraith,
  'prime-knight': primeKnight,
  'chaos-cube': chaosCube,
  'decimal-worm': decimalWorm,
}

/**
 * ภาพของมอนสเตอร์ตัวหนึ่ง
 * ถ้าไม่มีภาพของตัวนั้นจะคืนภาพสำรองที่ยังดูดี ไม่ใช่กรอบว่าง
 */
export function monsterArt(monsterId: string): string {
  const draw = MONSTER_ART[monsterId]
  if (draw) return draw()

  return `
    <defs>
      ${EYE_SHADE_DEF}
      ${sphereGradient('fb-x', '#cbd5e1', '#64748b', '#1e293b')}
      ${blurFilter('fb-blur', 2.6)}
    </defs>
    ${groundShadow('fb-blur', 50, 92, 26)}
    <circle cx="50" cy="56" r="26" fill="url(#fb-x)"/>
    ${specular(40, 44, 8, 5, -28, 0.4)}
    ${livingEye(41, 52, 7, '#1e293b')}
    ${livingEye(59, 52, 7, '#1e293b', 0.3)}
    <path d="M42 68 Q50 75 58 68" stroke="#0f172a" stroke-width="3"
      fill="none" stroke-linecap="round"/>`
}

export function hasMonsterArt(monsterId: string): boolean {
  return monsterId in MONSTER_ART
}

export const MONSTER_ART_IDS = Object.keys(MONSTER_ART)
