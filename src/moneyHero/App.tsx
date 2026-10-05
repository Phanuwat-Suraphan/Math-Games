import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GameProvider, useGame } from './hooks/useMoneyGame'
import { SplashPage } from './pages/SplashPage'
import { StartPage } from './pages/StartPage'
import { CreatePlayerPage } from './pages/CreatePlayerPage'
import { ComingSoonPage } from './pages/ComingSoonPage'

/** ต้องมีผู้เล่นก่อน ถ้ายังไม่มีให้กลับไปหน้าเริ่มเกม */
function NeedPlayer({ children }: { children: JSX.Element }) {
  const { player } = useGame()
  return player ? children : <Navigate to="/start" replace />
}

function Toasts() {
  const { toasts } = useGame()
  return (
    <div className="mh-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="mh-toast">
          <span className="mh-toast-icon">{t.icon}</span>
          {t.text}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  return (
    <GameProvider>
      <HashRouter>
        <div className="mh-app">
          <Routes>
            <Route path="/" element={<SplashPage />} />
            <Route path="/start" element={<StartPage />} />
            <Route path="/create" element={<CreatePlayerPage />} />
            <Route
              path="/map"
              element={
                <NeedPlayer>
                  <ComingSoonPage title="แผนที่เมืองเงินทอง" npc="hero" />
                </NeedPlayer>
              }
            />
            <Route path="/players" element={<ComingSoonPage title="เปลี่ยนผู้เล่น" npc="rabbit" />} />
            <Route path="/settings" element={<ComingSoonPage title="ตั้งค่า" npc="owl" />} />
            <Route path="/teacher" element={<ComingSoonPage title="โหมดคุณครู" npc="owl" />} />
            <Route path="*" element={<Navigate to="/start" replace />} />
          </Routes>
          <Toasts />
        </div>
      </HashRouter>
    </GameProvider>
  )
}
