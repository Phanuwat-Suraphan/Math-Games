/**
 * โมเดลของมินิเกมที่ไม่ใช่การเลือกตอบ
 *
 * ทำไมต้องมี: ถ้าทั้งเกมมีแต่ปุ่มสี่ตัวเลือก เด็กจะเดาได้ 25% ทุกข้อ
 * และที่สำคัญกว่านั้นคือมันน่าเบื่อ เพราะร่างกายทำท่าเดิมตลอดคือแตะปุ่ม
 * การจับคู่ โยงเส้น ลากวาง และรับของที่ตกลงมา
 * บังคับให้เด็กใช้มือกับสายตาต่างกันไป จึงรู้สึกเป็นคนละเกม
 *
 * ทุกอย่างในไฟล์นี้เป็นข้อมูลล้วน ไม่มีการอ้างถึง React หรือ DOM
 * ตรรกะจึงทดสอบได้โดยไม่ต้องเปิดเบราว์เซอร์
 */

import type { Grade } from '../questionEngine/types'
import type { SkillId } from '../types/stats'

export type MinigameKind = 'matching' | 'connect' | 'dragdrop' | 'catch'

/** ข้อมูลที่ทุกมินิเกมมีเหมือนกัน */
export interface MinigameBase {
  id: string
  kind: MinigameKind
  grade: Grade
  skill: SkillId
  /** ชื่อที่เด็กเห็น */
  title: string
  /** คำสั่งว่าต้องทำอะไร เขียนเป็นภาษาที่เด็ก ป.4 อ่านเข้าใจ */
  instruction: string
  /** เรื่องราวสั้น ๆ ที่ทำให้การเล่นมีเหตุผล ไม่ใช่แค่แบบฝึกหัด */
  story: string
  successText: string
}

/** ไพ่หนึ่งใบในเกมจับคู่ */
export interface MatchCard {
  id: string
  /** ไพ่สองใบที่ pairId ตรงกันคือคู่กัน */
  pairId: string
  text: string
  /** ฝั่งซ้ายคือโจทย์ ฝั่งขวาคือคำตอบ ใช้กันไม่ให้จับคู่โจทย์กับโจทย์ */
  side: 'prompt' | 'answer'
}

export interface MatchingGame extends MinigameBase {
  kind: 'matching'
  cards: MatchCard[]
  pairCount: number
}

/** ปลายเส้นหนึ่งจุดในเกมโยงเส้น */
export interface ConnectNode {
  id: string
  text: string
}

export interface ConnectGame extends MinigameBase {
  kind: 'connect'
  left: ConnectNode[]
  right: ConnectNode[]
  /** id ฝั่งซ้าย → id ฝั่งขวาที่ถูกต้อง */
  solution: Record<string, string>
}

/** ช่องว่างที่ต้องลากตัวเลขมาวาง */
export interface DropSlot {
  id: string
  correctTileId: string
}

/** ตัวเลขที่ลากได้ */
export interface DragTile {
  id: string
  text: string
}

export interface DragDropGame extends MinigameBase {
  kind: 'dragdrop'
  /**
   * ข้อความสมการที่มีช่องว่าง
   * ใช้ {slotId} เป็นตำแหน่งช่อง เช่น "{a} + {b} = 12"
   */
  template: string
  slots: DropSlot[]
  tiles: DragTile[]
}

/** ของหนึ่งชิ้นที่ตกลงมา */
export interface FallingItem {
  id: string
  text: string
  value: number
  correct: boolean
  /** ตำแหน่งแนวนอนตอนเริ่มตก 0 = ซ้ายสุด 1 = ขวาสุด */
  lane: number
  /** วินาทีนับจากเริ่มด่านที่ของชิ้นนี้เริ่มตก */
  dropAt: number
  /** วินาทีที่ใช้ตกจากบนถึงล่าง ยิ่งน้อยยิ่งเร็ว */
  fallSeconds: number
}

export interface CatchGame extends MinigameBase {
  kind: 'catch'
  /** กฎว่าอะไรคือของที่ต้องรับ เช่น "รับเฉพาะจำนวนที่หารด้วย 3 ลงตัว" */
  rule: string
  items: FallingItem[]
  /** ต้องรับของถูกกี่ชิ้นจึงผ่าน */
  targetCatches: number
  /** พลาดรับของผิดได้กี่ครั้ง */
  allowedMistakes: number
}

export type Minigame = MatchingGame | ConnectGame | DragDropGame | CatchGame

/** ผลของการเล่นหนึ่งรอบ ใช้ต่อเข้ากับระบบรางวัลเดิม */
export interface MinigameResult {
  kind: MinigameKind
  /** จำนวนครั้งที่ตอบถูก ใช้เป็นจำนวน "ข้อ" ที่ส่งเข้าสถิติทักษะ */
  correct: number
  /** จำนวนครั้งที่ตอบผิด */
  wrong: number
  cleared: boolean
  secondsUsed: number
}
