/**
 * ไอคอนของรางวัลและสถานะ วาดด้วย SVG
 *
 * แทนอีโมจิเพราะอีโมจิหน้าตาต่างกันในแต่ละเครื่อง
 * เหรียญบน Windows กับบน iPad ไม่เหมือนกัน เด็กในห้องเดียวกันจะเห็นคนละแบบ
 * และอีโมจิย่อเล็กแล้วอ่านไม่ออก
 *
 * ระบบพิกัด: กรอบ 24 × 24 เหมือนไอคอนทั่วไป
 *
 * เรื่องอนิเมชัน: ไอคอนหนึ่งตัวโผล่บนหน้าจอพร้อมกันได้หลายสิบชิ้น
 * (เหรียญทุกใบ ดาวทุกดวง) จึงใส่การขยับเฉพาะตัวที่ "ควรดูมีชีวิต"
 * คือเหรียญ ดาว หัวใจ ไฟ และคริสตัล
 * ส่วนกุญแจ เครื่องหมายถูก โล่ ดาบ เป็นป้ายบอกสถานะ ต้องอยู่นิ่ง
 * ถ้าทุกอย่างขยับหมด สายตาจะไม่รู้ว่าควรมองตรงไหน
 */

export const ICON_VIEWBOX = '0 0 24 24'

/** เหรียญทอง */
export function coinIcon(): string {
  return `
    <circle cx="12" cy="12" r="9.5" fill="#b45309"/>
    <circle cx="12" cy="11" r="8.5" fill="#fbbf24"/>
    <circle cx="12" cy="11" r="6.4" fill="#fcd34d"/>
    <path d="M12 6.6 L13.4 9.6 L16.6 10 L14.2 12.2 L14.9 15.4 L12 13.8
             L9.1 15.4 L9.8 12.2 L7.4 10 L10.6 9.6 Z" fill="#b45309" opacity=".55"/>
    <ellipse cx="9.4" cy="7.6" rx="2" ry="1.2" fill="#fef3c7" opacity=".7"
      transform="rotate(-30 9.4 7.6)"/>
    <!-- ประกายวิ่งผ่านหน้าเหรียญเป็นระยะ บอกว่าเป็นโลหะขัดเงา -->
    <path d="M4 14 L8 2 L11 2 L7 14 Z" fill="#fffbeb" opacity="0">
      <animate attributeName="opacity" values="0;0;.6;0;0"
        keyTimes="0;0.62;0.72;0.84;1" dur="4.6s" repeatCount="indefinite"/>
      <animateTransform attributeName="transform" type="translate"
        values="-4 0; -4 0; 14 0; 14 0" keyTimes="0;0.62;0.84;1"
        dur="4.6s" repeatCount="indefinite"/>
    </path>`
}

/** ดาว ใช้ทั้งแบบได้แล้วและยังไม่ได้ */
export function starIcon(filled = true): string {
  const path =
    'M12 2.6 L14.9 8.7 L21.5 9.6 L16.7 14.2 L17.9 20.8 L12 17.6 L6.1 20.8 ' +
    'L7.3 14.2 L2.5 9.6 L9.1 8.7 Z'

  return filled
    ? `<path d="${path}" fill="#fbbf24" stroke="#b45309" stroke-width="1" stroke-linejoin="round"/>
       <path d="M12 5.4 L13.9 9.6 L18.4 10.2 L15.2 13.3 L15.9 17.6 L12 15.5 Z"
         fill="#fde68a" opacity=".65"/>
       <!-- ประกายแวบตรงมุมบนขวา สั้นและห่าง จึงสะดุดตาโดยไม่กวน -->
       <g fill="#fffbeb" opacity="0">
         <animate attributeName="opacity" values="0;0;1;0;0"
           keyTimes="0;0.7;0.78;0.88;1" dur="5.2s" repeatCount="indefinite"/>
         <path d="M17.6 5.2 L18.3 7 L20.1 7.7 L18.3 8.4 L17.6 10.2
                  L16.9 8.4 L15.1 7.7 L16.9 7 Z"/>
       </g>`
    : `<path d="${path}" fill="none" stroke="#475569" stroke-width="1.6" stroke-linejoin="round"/>`
}

/** หัวใจ ใช้แสดงพลังชีวิต */
export function heartIcon(): string {
  const body = `
    <path d="M12 21 C12 21 2.6 14.8 2.6 8.8 C2.6 5.6 5 3.4 7.8 3.4
             C9.8 3.4 11.2 4.5 12 5.8 C12.8 4.5 14.2 3.4 16.2 3.4
             C19 3.4 21.4 5.6 21.4 8.8 C21.4 14.8 12 21 12 21 Z" fill="#ef4444"/>
    <path d="M8 6.4 C6.4 6.4 5.2 7.6 5.2 9 C5.2 9.8 5.5 10.6 6 11.4
             C5 9.4 5.6 7 8 6.4 Z" fill="#fca5a5"/>`

  // เต้นแบบหัวใจจริง: บีบเร็วสองจังหวะแล้วพักยาว ไม่ใช่ย่อขยายสม่ำเสมอ
  return `<g transform-origin="12 12">
    <animateTransform attributeName="transform" type="scale"
      values="1;1.13;1;1.07;1;1" keyTimes="0;0.08;0.18;0.26;0.4;1"
      dur="1.9s" repeatCount="indefinite"/>
    ${body}
  </g>`
}

/** คริสตัลพลัง ใช้แทน EXP */
export function expIcon(): string {
  const body = `
    <path d="M12 1.8 L19 8 L12 22.2 L5 8 Z" fill="#7c3aed"/>
    <path d="M12 1.8 L19 8 L12 12 L5 8 Z" fill="#a78bfa"/>
    <path d="M12 1.8 L12 12 L5 8 Z" fill="#c4b5fd"/>
    <path d="M12 12 L12 22.2 L19 8 Z" fill="#6d28d9"/>
    <!-- แสงเดินขึ้นตามสันคริสตัล ทำให้ดูเป็นของมีพลังอยู่ข้างใน -->
    <path d="M12 1.8 L12 22.2" stroke="#ede9fe" stroke-width="1" opacity="0">
      <animate attributeName="opacity" values="0;.75;0" dur="2.8s" repeatCount="indefinite"/>
    </path>`

  return `<g>
    <animateTransform attributeName="transform" type="translate"
      values="0 0; 0 -1.2; 0 0" dur="3.2s" repeatCount="indefinite"
      calcMode="spline" keyTimes="0;0.5;1"
      keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    ${body}
  </g>`
}

/** ไฟ ใช้แสดงคอมโบและการตอบถูกต่อเนื่อง */
export function flameIcon(): string {
  return `
    <path d="M12 22 C7.6 22 4.6 19 4.6 15.2 C4.6 10.4 9.4 8.6 9.4 4
             C9.4 3 9.2 2.4 9.2 2.4 C13 3.8 14.6 7.4 14.6 10
             C15.6 9.2 16 7.8 16 7.8 C18.4 10 19.4 12.6 19.4 15.2
             C19.4 19 16.4 22 12 22 Z" fill="#f97316">
      <animate attributeName="opacity" values=".92;1;.88;1;.92"
        dur="0.9s" repeatCount="indefinite"/>
    </path>
    <!-- ไส้ไฟด้านในวูบไหวเร็วกว่าเปลวนอก ไฟจริงก็ไหวไม่พร้อมกันทั้งดวง -->
    <g transform-origin="12 20">
      <animateTransform attributeName="transform" type="scale"
        values="1 1;0.92 1.1;1.06 0.95;1 1" dur="0.72s" repeatCount="indefinite"/>
      <path d="M12 22 C9.6 22 8 20.4 8 18.2 C8 15.6 11 14.4 11 11.6
               C11 11.6 14.2 13.6 14.2 16.8 C14.2 16.8 15 16 15.2 15
               C16 16.2 16 17.4 16 18.2 C16 20.4 14.4 22 12 22 Z" fill="#fbbf24"/>
    </g>`
}

/** โล่ ใช้แสดงเกราะและการป้องกัน */
export function shieldIcon(): string {
  return `
    <path d="M12 2.2 L20.2 5.4 C20.2 13 17 19 12 21.8
             C7 19 3.8 13 3.8 5.4 Z" fill="#3b82f6"/>
    <path d="M12 4.4 L18.1 6.8 C18.1 12.8 15.6 17.4 12 19.6 Z" fill="#60a5fa"/>`
}

/** ดาบ ใช้แสดงพลังโจมตี */
export function swordIcon(): string {
  return `
    <path d="M19.6 2.4 L21.6 4.4 L11.4 14.6 L9.4 12.6 Z" fill="#cbd5e1"/>
    <path d="M19.6 2.4 L21.6 4.4 L16.5 9.5 L14.5 7.5 Z" fill="#f1f5f9"/>
    <path d="M8.4 11.6 L12.4 15.6 L10.4 17.6 L6.4 13.6 Z" fill="#a16207"/>
    <path d="M2.4 17.6 L6.4 13.6 L10.4 17.6 L6.4 21.6 Z" fill="#78350f"/>`
}

/** กุญแจล็อก ใช้กับด่านและโลกที่ยังเข้าไม่ได้ */
export function lockIcon(): string {
  return `
    <path d="M8 10 V7.4 C8 5 9.8 3.2 12 3.2 C14.2 3.2 16 5 16 7.4 V10"
      stroke="#94a3b8" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <rect x="4.8" y="10" width="14.4" height="10.8" rx="2.4" fill="#64748b"/>
    <rect x="4.8" y="10" width="14.4" height="4" rx="2" fill="#94a3b8" opacity=".5"/>
    <circle cx="12" cy="15" r="1.9" fill="#1e293b"/>
    <rect x="11.1" y="15" width="1.8" height="3.4" rx=".9" fill="#1e293b"/>`
}

/** เครื่องหมายถูก ใช้กับด่านที่ผ่านแล้ว */
export function checkIcon(): string {
  return `
    <circle cx="12" cy="12" r="9.5" fill="#22c55e"/>
    <path d="M7.4 12.4 L10.6 15.6 L16.8 8.8" stroke="#fff" stroke-width="2.6"
      fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
}

/** ถ้วยรางวัล ใช้กับด่านที่ทำได้ครบสามดาว */
export function trophyIcon(): string {
  return `
    <path d="M7 3.4 H17 V9 C17 12 14.8 14.2 12 14.2 C9.2 14.2 7 12 7 9 Z" fill="#fbbf24"/>
    <path d="M7 4.6 H4.4 V6.6 C4.4 8.4 5.6 9.6 7 9.8 Z" fill="#f59e0b"/>
    <path d="M17 4.6 H19.6 V6.6 C19.6 8.4 18.4 9.6 17 9.8 Z" fill="#f59e0b"/>
    <rect x="10.8" y="14" width="2.4" height="4" fill="#b45309"/>
    <rect x="7.6" y="18" width="8.8" height="2.6" rx="1.1" fill="#b45309"/>
    <path d="M9.6 5.4 H11 V11 C10 10.4 9.6 9 9.6 5.4 Z" fill="#fde68a" opacity=".7"/>`
}

const ICONS: Record<string, () => string> = {
  coin: coinIcon,
  star: () => starIcon(true),
  starEmpty: () => starIcon(false),
  heart: heartIcon,
  exp: expIcon,
  flame: flameIcon,
  shield: shieldIcon,
  sword: swordIcon,
  lock: lockIcon,
  check: checkIcon,
  trophy: trophyIcon,
}

export type IconName = keyof typeof ICONS

export function gameIcon(name: string): string {
  const draw = ICONS[name]
  return draw ? draw() : `<circle cx="12" cy="12" r="8" fill="#64748b"/>`
}

export function hasIcon(name: string): boolean {
  return name in ICONS
}

export const ICON_NAMES = Object.keys(ICONS)
