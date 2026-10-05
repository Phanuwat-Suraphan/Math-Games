import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GameProvider, useGame } from './hooks/useMoneyGame'
import { SplashPage } from './pages/SplashPage'
import { StartPage } from './pages/StartPage'
import { CreatePlayerPage } from './pages/CreatePlayerPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { MapPage } from './pages/MapPage'
import { PlayersPage } from './pages/PlayersPage'
import { SettingsPage } from './pages/SettingsPage'
import { LevelPage } from './pages/LevelPage'

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
                  <MapPage />
                </NeedPlayer>
              }
            />
            <Route
              path="/level/:id/:step"
              element={
                <NeedPlayer>
                  <LevelPage />
                </NeedPlayer>
              }
            />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/badges" element={<ComingSoonPage title="🏆 รางวัล" npc="hero" back="/map" />} />
            <Route path="/profile" element={<ComingSoonPage title="👤 โปรไฟล์" npc="rabbit" back="/map" />} />
            <Route path="/stats" element={<ComingSoonPage title="📊 สถิติ" npc="fox" back="/map" />} />
            <Route path="/teacher" element={<ComingSoonPage title="โหมดคุณครู" npc="owl" />} />
            <Route path="*" element={<Navigate to="/start" replace />} />
          </Routes>
          <Toasts />
        </div>
      </HashRouter>
    </GameProvider>
  )
}
