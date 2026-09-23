/**
 * บันทึกผลของโหมดที่จบในรอบเดียว ลงในสมุดสถิติของผู้เล่น
 *
 * ทำไมเป็นฟังก์ชันบริสุทธิ์ทั้งหมด
 *
 * ทุกฟังก์ชันรับผู้เล่นกับผลของรอบ แล้วคืนสมุดสถิติชุดใหม่
 * ไม่แตะ localStorage ไม่แตะ React ไม่แก้ของเดิม
 * จึงทดสอบได้ครบทุกเส้นทางโดยไม่ต้องเปิดเบราว์เซอร์
 * ซึ่งสำคัญมากกับไฟล์ชนิดนี้ เพราะข้อผิดพลาดของมันคือ
 * "สถิติที่เด็กทำได้หายไป" ซึ่งไม่มีอะไรฟ้องเลยจนกว่าเด็กจะทัก
 *
 * ทำไมทุกค่ามีเพดาน
 *
 * localStorage แก้ได้ด้วยมือ และเคยมีเด็กลองแก้มาแล้ว
 * ถ้าปล่อยให้ค่าเป็นอะไรก็ได้ หน้าจอจะพยายามวาดแถบความคืบหน้า
 * ที่ยาวเป็นล้านเปอร์เซ็นต์ หรือได้ NaN แล้วแสดงคำว่า NaN ให้เด็กเห็น
 */

import type { Player } from '../types/player'
import type { PlayerRecords } from '../types/records'

/**
 * เพดานของทุกตัวนับ
 *
 * เลือกให้สูงเกินกว่าที่เล่นจริงจะไปถึงได้มาก แต่ยังเป็นจำนวนเต็มที่ปลอดภัย
 * หน้าที่ของมันคือกันค่าที่ถูกแก้มา ไม่ใช่จำกัดการเล่น
 */
const MAX_COUNT = 9_999_999

export function createEmptyRecords(): PlayerRecords {
  return {
    survivorRuns: 0,
    survivorBestSeconds: 0,
    survivorKills: 0,
    survivorBossKills: 0,
    survivorEvolutions: [],
    survivorUltimates: 0,
    duelPlays: 0,
    duelWins: 0,
    towerBestFloor: 0,
    timePlays: 0,
    timeCastles: 0,
    timeCorrect: 0,
    zombiePlays: 0,
    zombieCures: 0,
    zombieCorrect: 0,
  }
}

function clamp(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(MAX_COUNT, Math.floor(value)))
}

/**
 * อ่านสมุดสถิติของผู้เล่นแบบปลอดภัย
 *
 * ผู้เล่นที่บันทึกไว้ก่อนมีระบบนี้จะไม่มีฟิลด์ records เลย
 * และ migration ก็เติมให้แล้ว แต่ยังมีทางอื่นที่ผู้เล่นเข้ามาได้
 * เช่น ข้อมูลที่สร้างในเทสต์ หรือ object ที่ประกอบขึ้นเองในหน้าจอ
 * การอ่านผ่านฟังก์ชันนี้ที่เดียวทำให้ทุกทางปลอดภัยเหมือนกันหมด
 */
export function recordsOf(player: Player): PlayerRecords {
  const raw = player.records
  if (!raw) return createEmptyRecords()

  return {
    survivorRuns: clamp(raw.survivorRuns),
    survivorBestSeconds: clamp(raw.survivorBestSeconds),
    survivorKills: clamp(raw.survivorKills),
    survivorBossKills: clamp(raw.survivorBossKills),
    survivorEvolutions: Array.isArray(raw.survivorEvolutions)
      ? [...new Set(raw.survivorEvolutions.filter((id) => typeof id === 'string'))]
      : [],
    survivorUltimates: clamp(raw.survivorUltimates),
    duelPlays: clamp(raw.duelPlays),
    duelWins: clamp(raw.duelWins),
    towerBestFloor: clamp(raw.towerBestFloor),
    timePlays: clamp(raw.timePlays),
    timeCastles: clamp(raw.timeCastles),
    timeCorrect: clamp(raw.timeCorrect),
    zombiePlays: clamp(raw.zombiePlays),
    zombieCures: clamp(raw.zombieCures),
    zombieCorrect: clamp(raw.zombieCorrect),
  }
}

/**
 * ผลของหนึ่งรอบในสนามรบ เท่าที่สมุดสถิติสนใจ
 *
 * ตั้งใจไม่รับ RunSummary ของเครื่องยนต์โดยตรง
 * เพราะ RunSummary มีของสำหรับหน้าจอสรุปปนอยู่ด้วย เช่นชื่อร่างสมบูรณ์ที่แปลแล้ว
 * ถ้าผูกกับมัน การเพิ่มฟิลด์ให้หน้าจอสรุปจะกลายเป็นการแก้ระบบบันทึกไปด้วยทุกครั้ง
 */
export interface SurvivorRunResult {
  survivedSeconds: number
  kills: number
  bossesDown: number
  /** รหัสอาวุธที่ปลุกร่างสมบูรณ์ได้ในรอบนี้ */
  evolvedIds: string[]
  ultimatesUsed: number
}

/**
 * บันทึกผลหนึ่งรอบของสนามรบ
 *
 * เวลาที่ดีที่สุดใช้ค่ามากกว่า ส่วนที่เหลือบวกสะสม
 * เพราะ "รอดได้นานที่สุด" เป็นสถิติ ส่วน "ล้มไปทั้งหมดกี่ตัว" เป็นผลงานสะสม
 * สองอย่างนี้ต่างกัน และเด็กเข้าใจความต่างนี้ดีอยู่แล้วจากกีฬา
 */
export function recordSurvivorRun(
  player: Player,
  result: SurvivorRunResult,
): PlayerRecords {
  const records = recordsOf(player)
  const evolved = new Set(records.survivorEvolutions)
  for (const id of result.evolvedIds) {
    if (typeof id === 'string' && id.length > 0) evolved.add(id)
  }

  return {
    ...records,
    survivorRuns: clamp(records.survivorRuns + 1),
    survivorBestSeconds: Math.max(
      records.survivorBestSeconds,
      clamp(result.survivedSeconds),
    ),
    survivorKills: clamp(records.survivorKills + clamp(result.kills)),
    survivorBossKills: clamp(records.survivorBossKills + clamp(result.bossesDown)),
    survivorEvolutions: [...evolved],
    survivorUltimates: clamp(
      records.survivorUltimates + clamp(result.ultimatesUsed),
    ),
  }
}

/**
 * บันทึกผลหนึ่งตาของศึกผ่าสมการ
 *
 * นับจำนวนตาที่เล่นด้วย ไม่ใช่นับแต่ที่ชนะ
 * เพราะความสำเร็จที่นับแต่ชัยชนะจะลงโทษเด็กที่กล้าลองกับคู่ต่อสู้ที่ยากกว่า
 */
export function recordDuel(player: Player, won: boolean): PlayerRecords {
  const records = recordsOf(player)
  return {
    ...records,
    duelPlays: clamp(records.duelPlays + 1),
    duelWins: clamp(records.duelWins + (won ? 1 : 0)),
  }
}

/**
 * บันทึกผลหนึ่งเกมของผจญภัยเมืองแห่งเวลา
 *
 * นับทุกเกมที่จบ ไม่ว่าจะมีคนเข้าปราสาทหรือกดนับเหรียญตอนหมดคาบ
 * เพราะในห้องเรียน เกมส่วนใหญ่จบด้วยเสียงออด ไม่ใช่ด้วยผู้ชนะ
 */
export function recordTimeAdventure(
  player: Player,
  result: { reachedCastle: boolean; correct: number },
): PlayerRecords {
  const records = recordsOf(player)
  return {
    ...records,
    timePlays: clamp(records.timePlays + 1),
    timeCastles: clamp(records.timeCastles + (result.reachedCastle ? 1 : 0)),
    timeCorrect: clamp(records.timeCorrect + clamp(result.correct)),
  }
}

/**
 * บันทึกผลหนึ่งรอบของการฝึกอ่านนาฬิกา
 *
 * นับเฉพาะข้อที่ตอบถูก เข้าตัวนับเดียวกับเกมกระดาน
 * เพราะถ้วย "นักอ่านนาฬิกา" วัดว่าอ่านนาฬิกาถูกกี่ครั้ง ไม่ได้วัดว่าเล่นโหมดไหน
 * ไม่นับเป็นเกมที่เล่น เพราะหอเกียรติยศแสดงเป็น "เข้าปราสาท / เกมที่เล่น"
 */
export function recordTimePractice(player: Player, correct: number): PlayerRecords {
  const records = recordsOf(player)
  return { ...records, timeCorrect: clamp(records.timeCorrect + clamp(correct)) }
}

/**
 * บันทึกผลหนึ่งเกมของ ZOMBIE RESCUE
 *
 * นับทุกเกมที่จบ ไม่ว่าทีมจะสร้าง Z-CURE สำเร็จหรือกดจบตอนหมดคาบ
 * เหตุผลเดียวกับเมืองแห่งเวลา
 */
export function recordZombieRescue(
  player: Player,
  result: { cured: boolean; correct: number },
): PlayerRecords {
  const records = recordsOf(player)
  return {
    ...records,
    zombiePlays: clamp(records.zombiePlays + 1),
    zombieCures: clamp(records.zombieCures + (result.cured ? 1 : 0)),
    zombieCorrect: clamp(records.zombieCorrect + clamp(result.correct)),
  }
}

/** บันทึกผลหนึ่งรอบของการฝึกสูตรคูณ นับเฉพาะข้อที่ถูก ไม่นับเป็นเกมที่เล่น */
export function recordZombiePractice(player: Player, correct: number): PlayerRecords {
  const records = recordsOf(player)
  return { ...records, zombieCorrect: clamp(records.zombieCorrect + clamp(correct)) }
}

/** บันทึกชั้นที่ขึ้นไปถึงในหอคอย เก็บเฉพาะค่าที่ดีที่สุด */
export function recordTowerRun(player: Player, reachedFloor: number): PlayerRecords {
  const records = recordsOf(player)
  return {
    ...records,
    towerBestFloor: Math.max(records.towerBestFloor, clamp(reachedFloor)),
  }
}
