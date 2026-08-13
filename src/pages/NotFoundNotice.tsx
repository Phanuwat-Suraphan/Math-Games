import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'

interface NotFoundNoticeProps {
  title: string
  message: string
  actionLabel: string
  actionTo: string
  emoji?: string
}

/** หน้าจอแจ้งเตือนแบบเป็นมิตร ใช้แทนการปล่อยให้เกมพังเมื่อหาข้อมูลไม่เจอ */
export function NotFoundNotice({
  title,
  message,
  actionLabel,
  actionTo,
  emoji = '🧭',
}: NotFoundNoticeProps) {
  const navigate = useNavigate()

  return (
    <ScreenLayout width="narrow" className="flex min-h-screen flex-col justify-center">
      <div className="surface-card p-8 text-center">
        <p aria-hidden="true" className="text-6xl">
          {emoji}
        </p>
        <h1 className="mt-4 text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-slate-300">{message}</p>
        <Button
          className="mt-6"
          size="lg"
          fullWidth
          onClick={() => navigate(actionTo, { replace: true })}
        >
          {actionLabel}
        </Button>
      </div>
    </ScreenLayout>
  )
}
