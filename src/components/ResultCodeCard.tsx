import { useState } from 'react'

/**
 * กล่องรหัสผลการเรียนที่เด็กส่งให้ครูท้ายคาบ
 *
 * ตั้งใจให้เห็นตัวรหัสเต็ม ๆ ไม่ใช่ซ่อนไว้หลังปุ่มคัดลอกอย่างเดียว
 *
 * เหตุผลคือปุ่มคัดลอกใช้ navigator.clipboard ซึ่งเบราว์เซอร์ปฏิเสธได้
 * เมื่อหน้าไม่ได้เปิดผ่าน https หรือเมื่อเครื่องตั้งค่าไว้เข้ม
 * ถ้าซ่อนรหัสไว้ เด็กที่กดแล้วไม่มีอะไรเกิดขึ้นจะไม่มีทางออกเลย
 * แต่ถ้าเห็นข้อความอยู่ตรงหน้า เด็กลากเลือกเองได้เสมอ
 *
 * และเพราะรหัสสั้นพอจะเห็นได้ทั้งบรรทัดจริง ๆ การให้เห็นจึงไม่ได้เสียอะไร
 */
export function ResultCodeCard({
  code,
  title = '📮 รหัสผลการเรียน',
  hint = 'ส่งรหัสบรรทัดนี้ให้คุณครูท้ายคาบ เพื่อให้คุณครูรู้ว่าหนูทำตัวชี้วัดไหนได้แล้วบ้าง',
}: {
  code: string
  title?: string
  hint?: string
}) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4">
      <p className="text-sm font-bold text-cyan-200">{title}</p>
      <p className="mt-1 text-xs text-slate-300">{hint}</p>
      <code className="mt-3 block break-all rounded-lg border border-white/10 bg-night-900/80 p-2 text-xs text-cyan-200">
        {code}
      </code>
      <button
        type="button"
        className="mt-2 text-xs text-slate-300 underline hover:text-white"
        onClick={() => {
          navigator.clipboard
            ?.writeText(code)
            .then(() => setCopied(true))
            .catch(() => setCopied(false))
        }}
      >
        {copied ? '✅ คัดลอกแล้ว' : 'คัดลอกรหัส (หรือลากเลือกข้อความเอง)'}
      </button>
    </div>
  )
}
