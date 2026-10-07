import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import type { Settings } from '../engine/progress'
import { Sky } from '../components/Sky'
import { speak } from '../utils/speech'

const OPTIONS: { key: keyof Settings; icon: string; label: string; note: string }[] = [
  { key: 'sound', icon: '🔊', label: 'เสียงประกอบ', note: 'เสียงกดปุ่ม ตอบถูก รับเหรียญ' },
  { key: 'music', icon: '🎵', label: 'เพลงประกอบ', note: 'เพลงเบา ๆ บนหน้าแรกและแผนที่ (ตอนทำโจทย์จะเงียบ)' },
  { key: 'speech', icon: '🗣️', label: 'อ่านโจทย์ให้ฟัง', note: 'กดปุ่ม 🔈 แล้วเกมจะอ่านโจทย์' },
  { key: 'bigText', icon: '🔠', label: 'ตัวหนังสือใหญ่', note: 'อ่านง่ายขึ้น' },
  { key: 'reduceMotion', icon: '🐢', label: 'ลดภาพเคลื่อนไหว', note: 'สำหรับเครื่องช้า หรือเด็กที่ตาลาย' },
]

export function SettingsPage() {
  const { settings, updateSettings, resetAll, player } = useGame()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="mh-page mh-page-narrow">
      <Sky city={false} />
      <div className="mh-page-head">
        <button type="button" className="mh-icon-btn" aria-label="กลับ" onClick={() => navigate(player ? '/map' : '/start')}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="mh-title">⚙ ตั้งค่า</h1>
      </div>

      <div className="mh-card mh-settings">
        {OPTIONS.map((o) => (
          <label key={o.key} className="mh-switch-row">
            <span className="mh-switch-icon">{o.icon}</span>
            <span className="mh-switch-text">
              <b>{o.label}</b>
              <span>{o.note}</span>
            </span>
            <input
              type="checkbox"
              className="mh-switch"
              checked={settings[o.key]}
              onChange={(e) => {
                updateSettings({ [o.key]: e.target.checked })
                if (o.key === 'speech' && e.target.checked) window.setTimeout(() => speak('สวัสดีจ้ะ'), 50)
              }}
            />
          </label>
        ))}
      </div>

      <div className="mh-card mh-settings">
        <b>ล้างข้อมูลทั้งหมดในเครื่องนี้</b>
        <p className="mh-sub">ผู้เล่นทุกคนและคะแนนทั้งหมดจะหายไป (คุณครูควร Export CSV ก่อน)</p>
        {confirm ? (
          <div className="mh-row-buttons">
            <button
              type="button"
              className="mh-btn mh-btn-soft"
              onClick={() => {
                resetAll()
                navigate('/start')
              }}
            >
              ยืนยันล้างข้อมูล
            </button>
            <button type="button" className="mh-btn mh-btn-go" onClick={() => setConfirm(false)}>
              ไม่ล้าง
            </button>
          </div>
        ) : (
          <button type="button" className="mh-btn mh-btn-soft" onClick={() => setConfirm(true)}>
            🗑️ ล้างข้อมูล
          </button>
        )}
      </div>
    </div>
  )
}
