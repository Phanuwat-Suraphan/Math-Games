import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sky } from '../components/Sky'
import { CharacterArt } from '../components/Art'

/** หน้าเปิดเกม: โลโก้ + แถบโหลด แล้วไปหน้าเริ่มเกมเอง (หรือแตะเพื่อข้าม) */
export function SplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = window.setTimeout(() => navigate('/start', { replace: true }), 2200)
    return () => window.clearTimeout(t)
  }, [navigate])

  return (
    <div className="mh-splash" onClick={() => navigate('/start', { replace: true })} data-testid="mh-splash">
      <Sky city={false} />
      <CharacterArt id="hero" size={140} className="mh-splash-hero" />
      <h1 className="mh-logo">
        <span className="mh-logo-main">MONEY HERO</span>
        <span className="mh-logo-ribbon">ปฏิบัติการเมืองเงินทอง</span>
      </h1>
      <div className="mh-loading-bar" aria-hidden="true">
        <div />
      </div>
      <p className="mh-splash-tap">แตะเพื่อเริ่ม</p>
    </div>
  )
}
