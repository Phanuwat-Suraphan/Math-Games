import { getPlanet } from '../solar/planets'
import type { Planet, PlanetId } from '../solar/planets'

/**
 * เดินสำรวจผิวดาว · ลงจากยานไปเดินบนดาวกลม ๆ ดวงเล็กแบบเจ้าชายน้อย
 *
 * ของที่เด็กสัมผัสได้เองระหว่างเดิน ล้วนมาจากข้อมูลจริงของดาวดวงนั้น
 *   - แรงโน้มถ่วง  กระโดดบนดาวอังคารได้สูงกว่าบนโลก 2.5 เท่า บนดาวพฤหัสบดีกระโดดได้นิดเดียว
 *   - ดวงอาทิตย์   ยิ่งไกลยิ่งเล็ก มองจากดาวพุธใหญ่เกือบ 3 เท่า มองจากดาวเนปจูนเหลือจุดเล็ก ๆ
 *   - ท้องฟ้า      ดาวพุธไม่มีอากาศฟ้าจึงมืด ดาวศุกร์เมฆหนาจนมองไม่เห็นดวงอาทิตย์
 *   - พื้น         ดาวแก๊สไม่มีพื้นแข็ง เด็กจึงลอยอยู่เหนือยอดเมฆด้วยยานลอยฟ้าแทน
 *                  ซึ่งตรงกับเนื้อหา ป.6 ว่าดาวเคราะห์ชั้นนอกเป็นดาวแก๊ส
 *
 * จุดสำรวจทุกจุดเป็นเรื่องจริง ส่วนไหนที่ของจริงมนุษย์ไปไม่ได้ (ดาวพุธ ดาวศุกร์ร้อนจัด)
 * หน้าจอบอกตรง ๆ ว่าในเกมใส่ชุดพิเศษ ไม่ปล่อยให้เด็กเข้าใจผิดว่าไปยืนได้จริง
 */

export type SurfaceKind = 'rock' | 'gas'

export type PoiKind =
  | 'crater'
  | 'ice'
  | 'sign'
  | 'volcano'
  | 'probe'
  | 'cloud'
  | 'tree'
  | 'water'
  | 'mountain'
  | 'rover'
  | 'storm'
  | 'lightning'
  | 'crystal'
  | 'telescope'

export type SkyExtra = 'stars' | 'clouds' | 'moon' | 'haze' | 'moons' | 'rings' | 'uprightRings' | 'triton'

export interface Poi {
  id: string
  /** มุมรอบดาว หน่วยเรเดียน ยานจอดอยู่ที่มุม 0 */
  angle: number
  kind: PoiKind
  title: string
  fact: string
}

export interface Surface {
  planet: PlanetId
  kind: SurfaceKind
  /** สีท้องฟ้าด้านบนกับใกล้ขอบฟ้า */
  sky: readonly [string, string]
  /** สีพื้นด้านสว่างกับด้านเข้ม */
  ground: readonly [string, string]
  /** ดาวศุกร์เมฆหนาจนมองไม่เห็นดวงอาทิตย์จากพื้น */
  sunVisible: boolean
  skyExtras: readonly SkyExtra[]
  /** ประโยคแรกตอนลงจอด */
  intro: string
  /** บอกตรง ๆ ว่าของจริงอันตรายแค่ไหน */
  caution?: string
  pois: readonly Poi[]
}

export const SURFACES: readonly Surface[] = [
  {
    planet: 'mercury',
    kind: 'rock',
    sky: ['#020208', '#0b0b1a'],
    ground: ['#a8a29e', '#57534e'],
    sunVisible: true,
    skyExtras: ['stars'],
    intro: 'ดาวพุธไม่มีอากาศห่อหุ้ม ท้องฟ้าจึงมืดสนิทเห็นดาวได้แม้ตอนกลางวัน',
    caution: 'ของจริงกลางวันร้อนถึงราว 430°C กลางคืนหนาวถึงราว −180°C ในเกมเราใส่ชุดอวกาศพิเศษนะ',
    pois: [
      { id: 'caloris', angle: 0.9, kind: 'crater', title: 'แอ่งคาโลริส', fact: 'แอ่งคาโลริสกว้างราว 1,500 กิโลเมตร เกิดจากอุกกาบาตก้อนยักษ์พุ่งชนเมื่อนานมาแล้ว' },
      { id: 'polar-ice', angle: 2.6, kind: 'ice', title: 'น้ำแข็งในหลุมเงา', fact: 'ในหลุมลึกแถบขั้วดาวที่แสงอาทิตย์ส่องไม่ถึงเลย มีน้ำแข็งซ่อนอยู่ ทั้งที่ดาวพุธอยู่ใกล้ดวงอาทิตย์ที่สุด' },
      { id: 'long-day', angle: 4.4, kind: 'sign', title: 'ป้ายบอกเวลา', fact: 'จากเช้าวันหนึ่งถึงเช้าวันถัดไปบนดาวพุธ ยาวเท่ากับ 176 วันบนโลก' },
    ],
  },
  {
    planet: 'venus',
    kind: 'rock',
    sky: ['#b45309', '#fbbf24'],
    ground: ['#c2410c', '#7c2d12'],
    sunVisible: false,
    skyExtras: ['haze'],
    intro: 'ท้องฟ้าดาวศุกร์เป็นสีส้มทึบ เมฆหนาจนมองไม่เห็นดวงอาทิตย์จากพื้นเลย',
    caution: 'ของจริงร้อนถึงราว 465°C และอากาศกดทับหนักกว่าบนโลกราว 90 เท่า ยังไม่มีมนุษย์คนไหนไปได้',
    pois: [
      { id: 'volcano', angle: 1.0, kind: 'volcano', title: 'ภูเขาไฟ', fact: 'ดาวศุกร์มีภูเขาไฟมากกว่าดาวเคราะห์ดวงไหน ๆ ในระบบสุริยะ' },
      { id: 'venera', angle: 2.7, kind: 'probe', title: 'ยานเวเนรา', fact: 'ยานเวเนราของรัสเซียลงจอดบนดาวศุกร์และส่งภาพผิวดาวกลับมาเป็นครั้งแรก ก่อนจะพังเพราะร้อนจัด' },
      { id: 'acid-clouds', angle: 4.5, kind: 'cloud', title: 'เมฆกรด', fact: 'เมฆของดาวศุกร์เป็นกรดกำมะถัน หนาจนกักความร้อนไว้ ดาวศุกร์จึงร้อนที่สุดในระบบสุริยะ' },
    ],
  },
  {
    planet: 'earth',
    kind: 'rock',
    sky: ['#2563eb', '#bae6fd'],
    ground: ['#4ade80', '#15803d'],
    sunVisible: true,
    skyExtras: ['clouds', 'moon'],
    intro: 'กลับถึงบ้านแล้ว! ท้องฟ้าสีฟ้าเพราะอากาศกระเจิงแสงสีฟ้าไปทั่วฟ้า',
    pois: [
      { id: 'forest', angle: 1.0, kind: 'tree', title: 'ป่าไม้', fact: 'ต้นไม้สร้างแก๊สออกซิเจนให้เราหายใจ โลกเป็นดาวดวงเดียวที่รู้ว่ามีสิ่งมีชีวิต' },
      { id: 'ocean', angle: 2.7, kind: 'water', title: 'มหาสมุทร', fact: 'น้ำปกคลุมผิวโลกราว 3 ใน 4 ส่วน มองจากอวกาศโลกจึงเป็นสีฟ้า' },
      { id: 'everest', angle: 4.4, kind: 'mountain', title: 'ยอดเขาเอเวอเรสต์', fact: 'ยอดเขาเอเวอเรสต์สูงราว 8.8 กิโลเมตร สูงที่สุดบนโลก แต่ภูเขาไฟโอลิมปัสบนดาวอังคารสูงกว่าราวสองเท่าครึ่ง' },
    ],
  },
  {
    planet: 'mars',
    kind: 'rock',
    sky: ['#c2410c', '#fed7aa'],
    ground: ['#ea580c', '#7c2d12'],
    sunVisible: true,
    skyExtras: ['haze'],
    intro: 'ท้องฟ้าดาวอังคารเป็นสีส้มอมชมพูเพราะฝุ่น แต่ตอนพระอาทิตย์ตกกลับเป็นสีฟ้า',
    caution: 'อากาศบนดาวอังคารบางมากและหายใจไม่ได้ ต้องใส่ชุดอวกาศตลอดเวลา',
    pois: [
      { id: 'olympus', angle: 1.0, kind: 'mountain', title: 'ภูเขาไฟโอลิมปัส', fact: 'ภูเขาไฟโอลิมปัสสูงราว 22 กิโลเมตร เป็นภูเขาที่สูงที่สุดในระบบสุริยะ' },
      { id: 'rover', angle: 2.6, kind: 'rover', title: 'รถสำรวจเพอร์เซเวียแรนซ์', fact: 'รถหุ่นยนต์เพอร์เซเวียแรนซ์ลงจอดเมื่อปี ค.ศ. 2021 กำลังเก็บหินเพื่อหาร่องรอยสิ่งมีชีวิตในอดีต' },
      { id: 'ice-cap', angle: 4.4, kind: 'ice', title: 'ขั้วน้ำแข็ง', fact: 'ที่ขั้วของดาวอังคารมีน้ำแข็ง ทั้งน้ำแข็งธรรมดาและน้ำแข็งแห้งที่เกิดจากแก๊สคาร์บอนไดออกไซด์' },
    ],
  },
  {
    planet: 'jupiter',
    kind: 'gas',
    sky: ['#78350f', '#fde68a'],
    ground: ['#f1dcc0', '#a16207'],
    sunVisible: true,
    skyExtras: ['moons'],
    intro: 'ดาวพฤหัสบดีเป็นดาวแก๊ส ไม่มีพื้นแข็งให้ยืน เราจึงลอยอยู่เหนือยอดเมฆด้วยยานลอยฟ้า',
    caution: 'ลึกลงไปใต้เมฆ แก๊สถูกบีบแน่นขึ้นเรื่อย ๆ จนยานทุกลำถูกบีบพัง ห้ามดำลงไปนะ',
    pois: [
      { id: 'red-spot', angle: 1.0, kind: 'storm', title: 'จุดแดงใหญ่', fact: 'พายุหมุนจุดแดงใหญ่กว้างกว่าโลกทั้งใบ และพัดไม่หยุดมาหลายร้อยปีแล้ว' },
      { id: 'lightning', angle: 2.7, kind: 'lightning', title: 'ฟ้าผ่ายักษ์', fact: 'ในเมฆของดาวพฤหัสบดีมีฟ้าแลบฟ้าผ่า สว่างและแรงกว่าบนโลกหลายเท่า' },
      { id: 'juno', angle: 4.4, kind: 'probe', title: 'ยานจูโน', fact: 'ยานจูโนของนาซาโคจรรอบดาวพฤหัสบดีตั้งแต่ปี ค.ศ. 2016 คอยศึกษาพายุและแกนกลางของดาว' },
    ],
  },
  {
    planet: 'saturn',
    kind: 'gas',
    sky: ['#a16207', '#fef3c7'],
    ground: ['#f6e7c1', '#b8925a'],
    sunVisible: true,
    skyExtras: ['rings'],
    intro: 'ดาวเสาร์เป็นดาวแก๊ส เราลอยอยู่เหนือเมฆ มองขึ้นไปเห็นวงแหวนพาดเต็มฟ้า',
    pois: [
      { id: 'hexagon', angle: 1.0, kind: 'cloud', title: 'พายุหกเหลี่ยม', fact: 'ที่ขั้วเหนือของดาวเสาร์มีพายุรูปหกเหลี่ยม กว้างกว่าโลกสองใบเรียงกัน' },
      { id: 'ring-ice', angle: 2.7, kind: 'crystal', title: 'ก้อนน้ำแข็งจากวงแหวน', fact: 'วงแหวนของดาวเสาร์ทำจากก้อนน้ำแข็งและหิน มีตั้งแต่ขนาดเม็ดทรายจนถึงขนาดบ้าน' },
      { id: 'cassini', angle: 4.4, kind: 'probe', title: 'ยานแคสสินี', fact: 'ยานแคสสินีโคจรสำรวจดาวเสาร์นาน 13 ปี แล้วดิ่งลงไปในเมฆของดาวเสาร์เมื่อปี ค.ศ. 2017' },
    ],
  },
  {
    planet: 'uranus',
    kind: 'gas',
    sky: ['#0e7490', '#a5f3fc'],
    ground: ['#c9f3f5', '#4fb3bf'],
    sunVisible: true,
    skyExtras: ['uprightRings'],
    intro: 'ดาวยูเรนัสเป็นดาวแก๊สสีฟ้าอมเขียว ดวงอาทิตย์ไกลจนเหลือแค่จุดสว่างเล็ก ๆ',
    caution: 'ดาวยูเรนัสหนาวที่สุดในบรรดาดาวเคราะห์ เคยวัดได้ราว −224°C',
    pois: [
      { id: 'tilt', angle: 1.0, kind: 'sign', title: 'ป้ายบอกฤดู', fact: 'ดาวยูเรนัสนอนตะแคง ขั้วดาวหันเข้าหาดวงอาทิตย์ได้ ฤดูหนึ่งจึงยาวนานราว 21 ปี' },
      { id: 'diamond-rain', angle: 2.7, kind: 'crystal', title: 'ฝนเพชร', fact: 'นักวิทยาศาสตร์คิดว่าลึกลงไปใต้เมฆของดาวยูเรนัส อาจมีฝนเป็นเพชรตกลงมา' },
      { id: 'voyager', angle: 4.4, kind: 'probe', title: 'ยานวอยเจอร์ 2', fact: 'ยานวอยเจอร์ 2 เป็นยานลำเดียวที่เคยบินผ่านดาวยูเรนัส เมื่อปี ค.ศ. 1986' },
    ],
  },
  {
    planet: 'neptune',
    kind: 'gas',
    sky: ['#1e1b4b', '#3b82f6'],
    ground: ['#94b4ff', '#1d4ed8'],
    sunVisible: true,
    skyExtras: ['stars', 'triton'],
    intro: 'ดาวเนปจูนอยู่ไกลที่สุด ลอยเหนือเมฆสีน้ำเงินเข้ม ดวงอาทิตย์เหลือเป็นแค่ดาวดวงหนึ่ง',
    pois: [
      { id: 'dark-spot', angle: 1.0, kind: 'storm', title: 'จุดมืดใหญ่', fact: 'ยานวอยเจอร์ 2 พบพายุยักษ์จุดมืดใหญ่เมื่อปี ค.ศ. 1989 ต่อมาพายุนี้ก็หายไป' },
      { id: 'winds', angle: 2.7, kind: 'cloud', title: 'ลมเร็วที่สุด', fact: 'ลมบนดาวเนปจูนเร็วกว่า 2,000 กิโลเมตรต่อชั่วโมง เร็วกว่าเสียงเสียอีก' },
      { id: 'triton', angle: 4.4, kind: 'telescope', title: 'ส่องดวงจันทร์ไทรทัน', fact: 'ไทรทันเป็นดวงจันทร์ใหญ่ที่สุดของดาวเนปจูน และโคจรสวนทางกับการหมุนของดาว' },
    ],
  },
]

export function surfaceFor(id: PlanetId): Surface {
  const found = SURFACES.find((surface) => surface.planet === id)
  if (!found) throw new Error(`ไม่มีผิวดาวของ ${id}`)
  return found
}

export function isPoiOf(planet: PlanetId, poi: unknown): poi is string {
  return typeof poi === 'string' && surfaceFor(planet).pois.some((item) => item.id === poi)
}

/* ------------------------------------------------------------------ *
 * ฟิสิกส์การเดินและกระโดด
 *
 * หน่วยเป็นพิกเซลบนจอ ไม่ใช่เมตร เพราะเป้าหมายคือให้เด็ก "รู้สึก" ความต่าง
 * ความเร็วตอนกระโดดเท่ากันทุกดาว เปลี่ยนแค่แรงโน้มถ่วง
 * ความสูงที่กระโดดได้จึงแปรผกผันกับแรงโน้มถ่วงพอดี ตรงกับฟิสิกส์จริง
 * ------------------------------------------------------------------ */

export const WALK_SPEED = 170
export const JUMP_SPEED = 330
/** แรงโน้มถ่วงบนโลก หน่วยพิกเซลต่อวินาทีกำลังสอง เลือกให้กระโดดบนโลกได้ราว 60 พิกเซล */
export const EARTH_GRAVITY = 900
/** อยู่ห่างจากจุดสำรวจไม่เกินเท่านี้ (พิกเซลตามผิวดาว) ถึงจะสำรวจได้ */
export const REACH = 70

export interface WalkInput {
  left: boolean
  right: boolean
  /** กดกระโดดหนึ่งครั้ง ใช้แล้วผู้เรียกต้องล้างเอง */
  jump: boolean
}

export interface WalkState {
  /** มุมรอบดาวที่ยืนอยู่ หน่วยเรเดียน 0 ถึง 2π */
  angle: number
  /** ความสูงจากพื้น หน่วยพิกเซล */
  height: number
  /** ความเร็วแนวตั้ง พิกเซลต่อวินาที บวกคือขึ้น */
  velocity: number
  facing: 1 | -1
  walking: boolean
  /** เวลาที่เดินมาแล้ว ใช้ขยับขาเป็นจังหวะ */
  stride: number
}

export function startState(): WalkState {
  // เริ่มข้างยาน ไม่ทับยาน เด็กจะเห็นยานของตัวเองชัด ๆ
  return { angle: 0.12, height: 0, velocity: 0, facing: 1, walking: false, stride: 0 }
}

export function gravityPx(planet: Planet): number {
  return (EARTH_GRAVITY * planet.gravityTenths) / 10
}

/** สูงสุดที่กระโดดได้บนดาวดวงนี้ หน่วยพิกเซล */
export function jumpHeight(planet: Planet): number {
  return (JUMP_SPEED * JUMP_SPEED) / (2 * gravityPx(planet))
}

const TAU = Math.PI * 2

function wrapAngle(angle: number): number {
  const wrapped = angle % TAU
  return wrapped < 0 ? wrapped + TAU : wrapped
}

/** มุมห่างกันแบบสั้นที่สุด อยู่ระหว่าง −π ถึง π */
export function angleGap(from: number, to: number): number {
  let gap = wrapAngle(to) - wrapAngle(from)
  if (gap > Math.PI) gap -= TAU
  if (gap < -Math.PI) gap += TAU
  return gap
}

export function stepWalk(state: WalkState, input: WalkInput, dt: number, radius: number, planet: Planet): WalkState {
  const step = Math.min(0.05, Math.max(0, dt))
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  const walking = direction !== 0
  const angle = wrapAngle(state.angle + (direction * WALK_SPEED * step) / Math.max(1, radius))

  let { height, velocity } = state
  if (input.jump && height <= 0) velocity = JUMP_SPEED
  // สูตรการเคลื่อนที่ด้วยความเร่งคงที่แบบตรงตัว ความสูงที่กระโดดได้จึงไม่เพี้ยนตามจำนวนเฟรมต่อวินาที
  // (ถ้าบวกทีละก้าวแบบหยาบ ๆ เครื่องที่เฟรมตกจะกระโดดได้เตี้ยกว่าเครื่องเร็ว)
  const gravity = gravityPx(planet)
  height += velocity * step - 0.5 * gravity * step * step
  velocity -= gravity * step
  if (height <= 0) {
    height = 0
    velocity = 0
  }

  return {
    angle,
    height,
    velocity,
    facing: direction === 0 ? state.facing : direction > 0 ? 1 : -1,
    walking,
    stride: walking ? state.stride + step : 0,
  }
}

/** จุดสำรวจที่อยู่ใกล้พอจะสำรวจได้ ถ้ามีหลายจุดเลือกจุดที่ใกล้ที่สุด */
export function poiInReach(state: WalkState, surface: Surface, radius: number): Poi | null {
  let best: Poi | null = null
  let bestGap = Infinity
  for (const poi of surface.pois) {
    const gap = Math.abs(angleGap(state.angle, poi.angle)) * radius
    if (gap <= REACH && gap < bestGap) {
      best = poi
      bestGap = gap
    }
  }
  return best
}

/* ------------------------------------------------------------------ *
 * ประโยคที่คำนวณจากข้อมูลจริง
 * ------------------------------------------------------------------ */

const AU_KM = 149_597_871

/** ดวงอาทิตย์ดูใหญ่กว่าตอนมองจากโลกกี่เท่า (ขนาดที่ตาเห็นแปรผกผันกับระยะทาง) */
export function sunScale(planet: Planet): number {
  return AU_KM / planet.distanceKm
}

function times(value: number): string {
  return value >= 10 ? String(Math.round(value)) : value.toFixed(1)
}

export function sunLine(planet: Planet): string {
  const scale = sunScale(planet)
  if (scale > 1.05) return `☀️ ดวงอาทิตย์ดูใหญ่กว่าตอนมองจากโลก ${times(scale)} เท่า เพราะอยู่ใกล้กว่า`
  if (scale < 0.95) return `☀️ ดวงอาทิตย์ดูเล็กกว่าตอนมองจากโลก ${times(1 / scale)} เท่า เพราะอยู่ไกลกว่า`
  return '☀️ ดวงอาทิตย์ขนาดเท่าที่เราเห็นทุกวัน'
}

export function jumpLine(planet: Planet): string {
  const ratio = 10 / planet.gravityTenths
  const gravity = `แรงโน้มถ่วง ${(planet.gravityTenths / 10).toFixed(1)} เท่าของโลก`
  if (ratio > 1.05) return `🦘 ${gravity} กระโดดได้สูงกว่าบนโลก ${times(ratio)} เท่า`
  if (ratio < 0.95) return `🏋️ ${gravity} กระโดดได้เตี้ยกว่าบนโลก ${times(1 / ratio)} เท่า`
  return `🦘 ${gravity} กระโดดได้สูงพอ ๆ กับบนโลก`
}

export function landLabel(id: PlanetId): string {
  const planet = getPlanet(id)
  return surfaceFor(id).kind === 'gas' ? `ลงไปลอยเหนือเมฆ${planet.name}` : `ลงไปเดินสำรวจผิว${planet.name}`
}
