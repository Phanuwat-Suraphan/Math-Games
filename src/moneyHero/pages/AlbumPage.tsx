import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { DenomId } from '../engine/types'
import { useGame } from '../hooks/useMoneyGame'
import { denom } from '../data/denominations'
import { addSticker, ALBUM, albumCard, albumQuestion, STICKER_COINS, type AlbumQuestion } from '../engine/album'
import { TopBar } from '../components/TopBar'
import { MoneyPiece } from '../components/Art'
import { Confetti } from '../components/Effects'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'

/**
 * สมุดสะสมเงินไทย: การ์ดเงิน 11 ชนิด แตะการ์ดดูเรื่องน่ารู้ แล้วตอบคำถาม "ลองแลก" เพื่อรับสติกเกอร์
 * เส้นทาง #/album
 */

declare global {
  interface Window {
    __MH_ALBUM?: { answer: number }
  }
}

export function AlbumPage() {
  const { player, updatePlayer } = useGame()
  const [open, setOpen] = useState<DenomId | null>(null)
  if (!player) return null
  const album = player.album ?? []
  const coins = ALBUM.filter((c) => denom(c.id).kind === 'coin')
  const notes = ALBUM.filter((c) => denom(c.id).kind === 'note')

  const Grid = ({ list }: { list: typeof ALBUM }) => (
    <div className="mh-album-grid">
      {list.map((c) => {
        const d = denom(c.id)
        const has = album.includes(c.id)
        return (
          <button
            key={c.id}
            type="button"
            className={`mh-card mh-album-card ${has ? 'is-got' : ''}`}
            data-testid={`mh-album-card-${c.id}`}
            onClick={() => {
              playSound('click')
              setOpen(c.id)
            }}
          >
            <MoneyPiece id={c.id} base={d.kind === 'coin' ? 54 : 60} />
            <b>{d.name}</b>
            <span className="mh-album-color">{d.colorName}</span>
            <span className={`mh-album-sticker ${has ? 'is-got' : ''}`}>{has ? '⭐ เก็บแล้ว' : '❔ ยังไม่มี'}</span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="mh-level theme-bank">
      <TopBar />
      <div className="mh-page">
        <div className="mh-page-head">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title">📒 สมุดสะสมเงินไทย</h1>
          <span className="mh-album-count" data-testid="mh-album-count">
            สติกเกอร์ {album.length}/{ALBUM.length}
          </span>
        </div>
        <p className="mh-help-line">แตะการ์ดเพื่อดูเรื่องน่ารู้ แล้วตอบคำถาม "ลองแลก" ให้ถูก จะได้สติกเกอร์ +{STICKER_COINS} 🪙</p>
        <h2 className="mh-section-title">🪙 เหรียญ</h2>
        <Grid list={coins} />
        <h2 className="mh-section-title">💵 ธนบัตร</h2>
        <Grid list={notes} />
      </div>

      {open && (
        <CardModal
          id={open}
          has={album.includes(open)}
          onClose={() => setOpen(null)}
          onSticker={() => updatePlayer((p) => addSticker(p, open))}
        />
      )}
    </div>
  )
}

function CardModal({ id, has, onClose, onSticker }: { id: DenomId; has: boolean; onClose: () => void; onSticker: () => void }) {
  const d = denom(id)
  const card = albumCard(id)
  const [q, setQ] = useState<AlbumQuestion>(() => albumQuestion(id))
  const [state, setState] = useState<'ask' | 'right' | 'wrong'>('ask')
  const [fresh, setFresh] = useState(false)

  useEffect(() => {
    window.__MH_ALBUM = { answer: q.answer }
    return () => {
      window.__MH_ALBUM = undefined
    }
  }, [q])

  useEffect(() => {
    speak(`${d.name} ${d.colorName} ${card.facts.join(' ')}`)
  }, [id])

  const pick = (n: number) => {
    if (state === 'right') return
    if (n === q.answer) {
      playSound('star')
      setState('right')
      if (!has) {
        setFresh(true)
        onSticker()
        speak('ถูกต้อง ได้สติกเกอร์แล้ว', { queue: true })
      } else speak('ถูกต้อง เก่งมาก', { queue: true })
    } else {
      playSound('wrong')
      setState('wrong')
      speak('ยังไม่ถูก ลองดูคำใบ้นะ')
    }
  }

  return (
    <div className="mh-modal" role="dialog" aria-label={d.name}>
      <div className="mh-card mh-modal-card mh-album-detail" data-testid="mh-album-detail">
        {fresh && <Confetti count={24} />}
        <button type="button" className="mh-modal-close" aria-label="ปิด" data-testid="mh-album-close" onClick={onClose}>
          ✕
        </button>
        <div className="mh-album-big">
          <MoneyPiece id={id} base={d.kind === 'coin' ? 110 : 120} />
        </div>
        <h2 className="mh-step-title">{d.name}</h2>
        <ul className="mh-album-facts">
          <li>🎨 {d.colorName}</li>
          {card.facts.map((f) => (
            <li key={f}>✨ {f}</li>
          ))}
        </ul>
        <div className="mh-album-quiz">
          <b>🔄 ลองแลก: {q.text}</b>
          <div className="mh-album-opts">
            {q.options.map((n) => (
              <button
                key={n}
                type="button"
                className={`mh-choice ${state === 'right' && n === q.answer ? 'is-answer' : ''}`}
                data-testid={`mh-album-opt-${n}`}
                disabled={state === 'right'}
                onClick={() => pick(n)}
              >
                <span className="mh-choice-label">{n}</span>
              </button>
            ))}
          </div>
          {state === 'wrong' && (
            <p className="mh-feedback-text" role="status">
              💡 {q.hint}
            </p>
          )}
          {state === 'right' && (
            <p className="mh-album-got" role="status" data-testid="mh-album-got">
              {fresh ? `⭐ ได้สติกเกอร์แล้ว! +${STICKER_COINS} 🪙` : '✔ ถูกต้อง! (มีสติกเกอร์นี้แล้ว)'}
            </p>
          )}
          {state === 'right' && (
            <button
              type="button"
              className="mh-btn mh-btn-soft"
              data-testid="mh-album-more"
              onClick={() => {
                setQ(albumQuestion(id))
                setState('ask')
                setFresh(false)
              }}
            >
              🔁 ลองอีกข้อ
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
