import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GameProvider, useGame } from './hooks/useMoneyGame'
import { SplashPage } from './pages/SplashPage'
import { StartPage } from './pages/StartPage'
import { CreatePlayerPage } from './pages/CreatePlayerPage'
import { MapPage } from './pages/MapPage'
import { PlayersPage } from './pages/PlayersPage'
import { SettingsPage } from './pages/SettingsPage'
import { LevelPage } from './pages/LevelPage'
import { TestPage } from './pages/TestPage'
import { BadgesPage } from './pages/BadgesPage'
import { ProfilePage } from './pages/ProfilePage'
import { StatsPage } from './pages/StatsPage'
import { ReviewPage } from './pages/ReviewPage'
import { TeacherPage } from './pages/TeacherPage'
import { CoinHuntPage } from './pages/CoinHuntPage'
import { ShopPage } from './pages/ShopPage'
import { DailyPage } from './pages/DailyPage'

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
            <Route
              path="/test/:kind"
              element={
                <NeedPlayer>
                  <TestPage />
                </NeedPlayer>
              }
            />
            <Route
              path="/badges"
              element={
                <NeedPlayer>
                  <BadgesPage />
                </NeedPlayer>
              }
            />
            <Route
              path="/profile"
              element={
                <NeedPlayer>
                  <ProfilePage />
                </NeedPlayer>
              }
            />
            <Route
              path="/stats"
              element={
                <NeedPlayer>
                  <StatsPage />
                </NeedPlayer>
              }
            />
            <Route
              path="/review"
              element={
                <NeedPlayer>
                  <ReviewPage />
                </NeedPlayer>
              }
            />
            <Route
              path="/daily"
              element={
                <NeedPlayer>
                  <DailyPage />
                </NeedPlayer>
              }
            />
            <Route
              path="/shop"
              element={
                <NeedPlayer>
                  <ShopPage />
                </NeedPlayer>
              }
            />
            <Route
              path="/ar"
              element={
                <NeedPlayer>
                  <CoinHuntPage />
                </NeedPlayer>
              }
            />
            <Route path="/teacher" element={<TeacherPage />} />
            <Route path="*" element={<Navigate to="/start" replace />} />
          </Routes>
          <Toasts />
        </div>
      </HashRouter>
    </GameProvider>
  )
}
