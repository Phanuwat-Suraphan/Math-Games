/**
 * น้องวงเวียน ตัวนำทางประจำห้องเรขาคณิต
 *
 * มีไว้เพราะเด็กที่เปิดหน้านี้ครั้งแรกจะเจอปุ่มสิบกว่าปุ่มพร้อมกัน
 * คำแนะนำที่ลอยอยู่เฉย ๆ เด็กจะไม่อ่าน แต่ถ้ามีตัวการ์ตูนพูดด้วยจะอ่าน
 * ข้อความมาจากเครื่องมือที่เลือกอยู่ จึงเปลี่ยนตามสิ่งที่กำลังทำเสมอ
 */

interface MascotProps {
  message: string
  /** ยิ้มตาหยีตอนวาดสำเร็จ ใช้ตอนเพิ่งวางรูปเสร็จ */
  cheering?: boolean
}

export function Mascot({ message, cheering = false }: MascotProps) {
  return (
    <div className="flex items-end gap-2">
      <svg
        viewBox="0 0 80 90"
        className={`h-20 w-20 shrink-0 ${cheering ? 'geo-mascot-cheer' : 'geo-mascot-idle'}`}
        role="img"
        aria-label="น้องวงเวียน"
      >
        {/* ขาสองข้างของวงเวียน กางออกเป็นรูปตัว A */}
        <g stroke="#7c3aed" strokeWidth="7" strokeLinecap="round">
          <line x1="40" y1="34" x2="24" y2="80" />
          <line x1="40" y1="34" x2="56" y2="80" />
        </g>
        {/* เข็มปลายแหลมข้างหนึ่ง ดินสอสีชมพูอีกข้างหนึ่ง */}
        <path d="M20 74 L24 84 L28 76 Z" fill="#475569" />
        <path d="M52 76 L56 84 L60 74 Z" fill="#f472b6" />
        {/* หัวกลม ๆ ที่เป็นข้อต่อของวงเวียน */}
        <circle cx="40" cy="26" r="20" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="4" />
        {/* ตากะพริบเป็นระยะ ทำให้ดูเหมือนมีชีวิตโดยไม่ต้องขยับทั้งตัวตลอดเวลา */}
        <circle className="geo-blink" cx="33" cy="24" r="3.2" fill="#1e1b4b" />
        <circle className="geo-blink" cx="47" cy="24" r="3.2" fill="#1e1b4b" />
        <circle cx="26" cy="31" r="3.4" fill="#fb7185" opacity="0.65" />
        <circle cx="54" cy="31" r="3.4" fill="#fb7185" opacity="0.65" />
        {cheering ? (
          <path d="M34 32 Q40 39 46 32" stroke="#1e1b4b" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M36 32 Q40 35 44 32" stroke="#1e1b4b" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        )}
        {/* ดาวเล็ก ๆ บนหัว ให้ดูเป็นตัวละครไม่ใช่อุปกรณ์ */}
        <path d="M40 2 L42.4 8 L48.6 8.6 L43.8 12.6 L45.4 18.8 L40 15.4 L34.6 18.8 L36.2 12.6 L31.4 8.6 L37.6 8 Z" fill="#fcd34d" />
      </svg>

      <div className="geo-bubble relative flex-1 rounded-2xl bg-white/95 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-700">
        {message}
      </div>
    </div>
  )
}
