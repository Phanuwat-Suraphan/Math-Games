/** ดาว 0–3 ดวง ดวงที่ยังไม่ได้เป็นสีเทา (มีตัวเลขกำกับสำหรับโปรแกรมอ่านหน้าจอ) */
export function Stars({ n, max = 3 }: { n: number; max?: number }) {
  return (
    <span className="mh-stars" aria-label={`${n} ดาว จาก ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < n ? '' : 'mh-star-off'}>
          ⭐
        </span>
      ))}
    </span>
  )
}
