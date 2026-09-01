import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import { useGame } from './context/useGame'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LevelUpModal } from './components/LevelUpModal'
import { QuestToastLayer } from './components/QuestToastLayer'
import { RewardToastLayer } from './components/RewardToastLayer'
import { RequirePlayer } from './routes/RequirePlayer'
import { Achievements } from './pages/Achievements'
import { Battle } from './pages/Battle'
import { PuzzleStage } from './pages/PuzzleStage'
import { MinigameStage } from './pages/MinigameStage'
import { Character } from './pages/Character'
import { CreatePlayer } from './pages/CreatePlayer'
import { Home } from './pages/Home'
import { MainMenu } from './pages/MainMenu'
import { MathChallenge } from './pages/MathChallenge'
import { NotFoundNotice } from './pages/NotFoundNotice'
import { QuestIntro } from './pages/QuestIntro'
import { Quests } from './pages/Quests'
import { Settings } from './pages/Settings'
import { Shop } from './pages/Shop'
import { Journal } from './pages/Journal'
import { Tower } from './pages/Tower'
import { Farm } from './pages/Farm'
import { SafeZone } from './pages/SafeZone'
import { Teacher } from './pages/Teacher'
import { Survivor } from './pages/Survivor'
import { DivisorDuel } from './pages/DivisorDuel'
import { StageResult } from './pages/StageResult'
import { World } from './pages/World'
import { WorldMap } from './pages/WorldMap'

function GameRoutes() {
  const { pendingLevelUp, acknowledgeLevelUp } = useGame()

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreatePlayer />} />
        <Route path="/settings" element={<Settings />} />

        <Route
          path="/menu"
          element={
            <RequirePlayer render={(player) => <MainMenu player={player} />} />
          }
        />
        <Route
          path="/map"
          element={
            <RequirePlayer render={(player) => <WorldMap player={player} />} />
          }
        />
        <Route
          path="/world/:worldId"
          element={
            <RequirePlayer render={(player) => <World player={player} />} />
          }
        />
        <Route
          path="/quest/:worldId/:stageId"
          element={
            <RequirePlayer render={(player) => <QuestIntro player={player} />} />
          }
        />
        <Route
          path="/play/:worldId/:stageId"
          element={
            <RequirePlayer
              render={(player) => <MathChallenge player={player} />}
            />
          }
        />
        <Route
          path="/puzzle/:worldId/:stageId"
          element={
            <RequirePlayer render={(player) => <PuzzleStage player={player} />} />
          }
        />
        <Route
          path="/arena"
          element={<RequirePlayer render={(player) => <Survivor player={player} />} />}
        />
        <Route
          path="/farm"
          element={<RequirePlayer render={(player) => <Farm player={player} />} />}
        />
        <Route
          path="/safezone"
          element={
            <RequirePlayer render={(player) => <SafeZone player={player} />} />
          }
        />
        <Route
          path="/teacher"
          element={<RequirePlayer render={(player) => <Teacher player={player} />} />}
        />
        <Route
          path="/duel"
          element={
            <RequirePlayer render={(player) => <DivisorDuel player={player} />} />
          }
        />
        <Route
          path="/tower"
          element={<RequirePlayer render={(player) => <Tower player={player} />} />}
        />
        <Route
          path="/journal"
          element={<RequirePlayer render={(player) => <Journal player={player} />} />}
        />
        <Route
          path="/shop"
          element={<RequirePlayer render={(player) => <Shop player={player} />} />}
        />
        <Route
          path="/minigame/:worldId/:stageId"
          element={
            <RequirePlayer render={(player) => <MinigameStage player={player} />} />
          }
        />
        <Route
          path="/battle/:worldId/:stageId"
          element={
            <RequirePlayer render={(player) => <Battle player={player} />} />
          }
        />
        <Route
          path="/result"
          element={
            <RequirePlayer
              render={(player) => <StageResult player={player} />}
            />
          }
        />
        <Route
          path="/quests"
          element={
            <RequirePlayer render={(player) => <Quests player={player} />} />
          }
        />
        <Route
          path="/character"
          element={
            <RequirePlayer render={(player) => <Character player={player} />} />
          }
        />
        <Route
          path="/achievements"
          element={
            <RequirePlayer
              render={(player) => <Achievements player={player} />}
            />
          }
        />

        <Route
          path="/404"
          element={
            <NotFoundNotice
              title="ไม่พบหน้านี้"
              message="หน้าที่หนูกำลังหาอาจถูกย้ายไปแล้ว กลับไปหน้าแรกกันนะ"
              actionLabel="กลับหน้าแรก"
              actionTo="/"
            />
          }
        />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>

      <RewardToastLayer />
      <QuestToastLayer />
      <LevelUpModal level={pendingLevelUp} onClose={acknowledgeLevelUp} />
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <HashRouter>
          {/*
            ชั้นบรรยากาศของทั้งเกม อยู่หลังทุกอย่างและไม่รับการคลิก
            วางที่นี่ครั้งเดียวแทนที่จะใส่ทีละหน้า ทุกหน้าจึงได้เหมือนกันหมด
            และตอนเปลี่ยนหน้าฉากหลังจะไม่กระพริบ เพราะไม่ได้ถูกสร้างใหม่
          */}
          <div className="ambient" aria-hidden="true">
            <div className="ambient-stars" />
            <div className="ambient-vignette" />
            <div className="ambient-grain" />
          </div>

          <div className="relative z-10">
            <GameRoutes />
          </div>
        </HashRouter>
      </GameProvider>
    </ErrorBoundary>
  )
}
