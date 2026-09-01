/**
 * ชนิดข้อมูลและค่าคงที่ของ Safe Zone Guardians
 *
 * เกมนี้เล่าเรื่องโลกอนาคตที่ร้อนจนอยู่ข้างนอกไม่ได้ มนุษย์ต้องหนีเข้าโดม
 * ผู้เล่นต้องออกไปเก็บของยังชีพสามชิ้นกลางซากเมือง แล้วกลับเข้ามา
 * คำนวณทรัพยากรของโดมด้วยคณิตศาสตร์ระดับชั้น ป.4
 *
 * ค่าคงที่ทั้งหมดรวมไว้ที่นี่ที่เดียว เพราะค่าพวกนี้คือ "ความยาก"
 * ที่ครูอาจอยากปรับให้เข้ากับห้องเรียนของตัวเอง การให้ต้องไล่หา
 * ตัวเลขที่กระจายอยู่ในไฟล์เกมสี่ห้าไฟล์เท่ากับปรับไม่ได้จริง
 */

/** ช่องหนึ่งช่องบนตารางเขาวงกต */
export interface Cell {
  col: number
  row: number
}

/**
 * ความละเอียดของฉากสามมิติ
 *
 * ตรึงไว้แทนที่จะปรับตามขนาดจอ เพราะฉากถูกวาดด้วยซีพียูล้วน
 * จอที่ใหญ่กว่าจึงไม่ได้แปลว่าภาพคมขึ้นเฉย ๆ แต่แปลว่าเครื่องต้องระบายสี
 * เพิ่มขึ้นเป็นเท่าตัว ซึ่งบนแท็บเล็ตของโรงเรียนคือภาพกระตุก
 * ค่านี้ยืดด้วย CSS ให้เต็มกรอบ ผลคือทุกเครื่องได้ภาพลื่นเท่ากัน
 */
export const STAGE_WIDTH = 960
export const STAGE_HEIGHT = 540

/** ขนาดหนึ่งช่องในหน่วยของโลกสามมิติ */
export const CELL_SIZE = 4

/** ความสูงของกำแพงซากตึก */
export const WALL_HEIGHT = 3.4

/**
 * ขนาดตารางเขาวงกต ต้องเป็นเลขคี่ทั้งคู่
 *
 * อัลกอริทึมขุดทางเดินใช้ช่องคี่เป็นห้องและช่องคู่เป็นกำแพงระหว่างห้อง
 * ถ้าเป็นเลขคู่ ขอบด้านหนึ่งจะกลายเป็นแถวกำแพงตันที่ไม่มีทางเข้า
 */
export const MAZE_COLS = 15
export const MAZE_ROWS = 15

/** รัศมีตัวผู้เล่นสำหรับตรวจการชน เล็กกว่าครึ่งช่องเพื่อให้เดินผ่านช่องแคบได้ */
export const PLAYER_RADIUS = 0.85

/** ความเร็วเดิน หน่วยต่อวินาที */
export const WALK_SPEED = 7.2

/** ระยะที่โดรนจะโผล่มาขวางเมื่อเข้าใกล้ไอเทม */
export const DRONE_TRIGGER_RANGE = 2.6

/**
 * หลอดความร้อน 0–100 เต็มเมื่อไร คือจบเกม
 *
 * ตัวเลขชุดนี้ผ่านการคิดเรื่อง "ความใจดี" มาแล้ว
 * ถ้าปล่อยให้เด็กร้อนตายบ่อย เขาจะเลิกสำรวจแล้วเดินตรงหาไอเทมอย่างเดียว
 * ซึ่งฆ่าความรู้สึกว่ากำลังผจญภัยในซากเมืองทิ้งไปทั้งหมด
 * ค่าที่ตั้งไว้ให้เวลาประมาณสองนาทีถ้าไม่แวะแผ่นทำความเย็นเลย
 * และให้เวลาไม่จำกัดถ้ารู้จักวนกลับไปยืนพัก ซึ่งเป็นบทเรียนของเกมนี้พอดี
 */
export const MAX_HEAT = 100
export const HEAT_PER_SECOND = 0.85
/** ยืนบนแผ่นทำความเย็นแล้วลดลงเร็วกว่าที่ขึ้นหลายเท่า จึงคุ้มที่จะวนกลับมา */
export const COOLING_PER_SECOND = 22
/** ตอบโจทย์โดรนผิด ความร้อนพุ่งขึ้นทันที แต่ไม่ถึงกับจบเกมในครั้งเดียว */
export const HEAT_PENALTY_WRONG = 12
/** เก็บไอเทมได้แล้วรู้สึกโล่ง ลดความร้อนเป็นรางวัลเล็ก ๆ */
export const HEAT_RELIEF_ON_PICKUP = 15
/** รัศมีของแผ่นทำความเย็น */
export const COOLER_RADIUS = 1.8

/**
 * ทิศที่กล้องมองตลอดทั้งด่าน ไม่หมุนตามตัวละคร
 *
 * เคยให้กล้องหมุนตามหลังตัวละครแบบเกมผจญภัยทั่วไป ซึ่งดูดีกว่ามาก
 * แต่พังเรื่องการบังคับทันทีที่ลองเดิน เพราะถ้ากล้องหมุนตามทิศที่เดิน
 * แล้วให้ปุ่ม "ซ้าย" หมายถึงซ้ายของกล้อง การกดซ้ายค้างไว้จะกลายเป็นเดินวนเป็นวงกลม
 * เนื่องจากทุกครั้งที่หันซ้าย กล้องก็หันตาม แล้วซ้ายอันใหม่ก็เลื่อนไปอีก
 *
 * กล้องที่นิ่งทำให้ปุ่มบนจอหมายถึงทิศเดิมเสมอ ตรงกับแผนที่ย่อเป๊ะ ๆ
 * และตรงกับสิ่งที่นิ้วคาดหวังบนแท็บเล็ต ซึ่งสำคัญกว่าความสวยของกล้องมาก
 * ตัวละครยังหันหน้าตามทิศที่เดินอยู่ ฉากจึงไม่ได้ดูแข็งทื่อไปเสียหมด
 */
export const CAMERA_YAW = 0

/** ระยะที่หมอกฝุ่นกลืนทุกอย่างจนหมด ใช้ทั้งวาดภาพและตัดของที่ไกลเกินทิ้ง */
export const FOG_START = 9
export const FOG_END = 30

/** ไอเทมยังชีพสามชิ้นตามที่เอกสารออกแบบกำหนด */
export type SurvivalItemId = 'oxygen' | 'water' | 'seed'

export interface SurvivalItem {
  id: SurvivalItemId
  emoji: string
  name: string
  /** ประโยคที่ขึ้นตอนเก็บได้ ผูกไอเทมเข้ากับเหตุผลว่าทำไมถึงต้องมี */
  gained: string
  color: string
  accent: string
}

export const SURVIVAL_ITEMS: readonly SurvivalItem[] = [
  {
    id: 'oxygen',
    emoji: '💨',
    name: 'ถังออกซิเจน',
    gained: 'อากาศสะอาดพอให้โดมหายใจต่อได้อีกหลายวัน',
    color: '#38bdf8',
    accent: '#e0f2fe',
  },
  {
    id: 'water',
    emoji: '💧',
    name: 'เครื่องกรองน้ำ',
    gained: 'น้ำขุ่นกลายเป็นน้ำดื่มได้ ทุกหยดจะไม่ถูกทิ้งอีกแล้ว',
    color: '#22d3ee',
    accent: '#cffafe',
  },
  {
    id: 'seed',
    emoji: '🌱',
    name: 'ธนาคารเมล็ดพันธุ์',
    gained: 'เมล็ดพันธุ์คืออาหารของปีหน้า และป่าของอีกสิบปีข้างหน้า',
    color: '#4ade80',
    accent: '#dcfce7',
  },
]

export function findItem(id: SurvivalItemId): SurvivalItem {
  const found = SURVIVAL_ITEMS.find((item) => item.id === id)
  if (!found) throw new Error(`ไม่รู้จักไอเทม: ${id}`)
  return found
}

/** เขาวงกตที่สุ่มขึ้นมาแล้ว */
export interface Maze {
  cols: number
  rows: number
  /**
   * true = ช่องนี้เป็นกำแพง
   *
   * เก็บเป็นอาร์เรย์ชั้นเดียวแล้วคำนวณดัชนีเอง แทนอาร์เรย์ซ้อนอาร์เรย์
   * เพราะตัวเรนเดอร์อ่านตารางนี้ทุกเฟรมหลายร้อยครั้ง
   */
  walls: boolean[]
  /** ช่องที่ผู้เล่นเริ่มต้น อยู่มุมหนึ่งของเขาวงกตเสมอ */
  start: Cell
  /** ตำแหน่งไอเทมสามชิ้น เรียงตามลำดับใน SURVIVAL_ITEMS */
  itemCells: Record<SurvivalItemId, Cell>
  /** แผ่นทำความเย็นที่กระจายอยู่ให้แวะพัก */
  coolerCells: Cell[]
}

export function wallAt(maze: Maze, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= maze.cols || row >= maze.rows) return true
  return maze.walls[row * maze.cols + col] === true
}

/** จุดกึ่งกลางของช่องในพิกัดโลก */
export function cellCenterX(col: number): number {
  return (col + 0.5) * CELL_SIZE
}

export function cellCenterZ(row: number): number {
  return (row + 0.5) * CELL_SIZE
}

/** ช่องที่พิกัดโลกหนึ่งจุดตกอยู่ */
export function cellOf(x: number, z: number): Cell {
  return {
    col: Math.floor(x / CELL_SIZE),
    row: Math.floor(z / CELL_SIZE),
  }
}

/** ไอเทมหนึ่งชิ้นบนสนามพร้อมสถานะว่าเก็บแล้วหรือยัง */
export interface ItemState {
  id: SurvivalItemId
  x: number
  z: number
  collected: boolean
}

/** ทิศที่ผู้เล่นสั่งให้เดิน ค่าอยู่ในช่วง -1 ถึง 1 ทั้งสองแกน */
export interface MoveInput {
  x: number
  z: number
}

/** สถานะทั้งหมดของด่านเขาวงกต */
export interface MazeWorld {
  seed: string
  maze: Maze
  x: number
  z: number
  /** ทิศที่ตัวละครหันหน้า หน่วยเรเดียน ใช้ระบบเดียวกับ yaw ของกล้อง */
  heading: number
  /** กล้องตามหลังแบบหน่วง จึงมีมุมของตัวเองแยกจากตัวละคร */
  cameraYaw: number
  moving: boolean
  /** ระยะที่เดินมาแล้วทั้งหมด ใช้ทำจังหวะก้าวขาและเสียงฝีเท้า */
  stride: number
  items: ItemState[]
  heat: number
  elapsed: number
  /** ยืนอยู่บนแผ่นทำความเย็นอยู่ไหม ใช้ทั้งวาดภาพและบอกผู้เล่นบน HUD */
  cooling: boolean
  /** ไอเทมที่โดรนโผล่มาขวางอยู่ตอนนี้ null คือยังเดินได้ตามปกติ */
  challengeItem: SurvivalItemId | null
  /** จำนวนครั้งที่ความร้อนเต็มจนต้องเริ่มใหม่ ใช้ผ่อนความยากให้เด็กที่ติด */
  meltdowns: number
}

/** ขั้นตอนของเกมทั้งหมด ไล่จากซ้ายไปขวาตามเอกสารออกแบบ */
export type SafeZonePhase =
  | 'briefing'
  | 'maze'
  | 'drone'
  | 'reflection'
  | 'control'
  | 'ending'
  | 'overheated'
