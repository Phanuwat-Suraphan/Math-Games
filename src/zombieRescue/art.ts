/**
 * ภาพของ ZOMBIE RESCUE: ตัวละคร หัวซอมบี้สำหรับนับ และกระดานแผนที่เมือง
 *
 * ทุกฟังก์ชันคืนข้อความ SVG แบบเดียวกับ src/timeAdventure/art.ts
 * หน้าจอนำไปวางด้วย dangerouslySetInnerHTML ได้อย่างปลอดภัย
 * เพราะข้อความทั้งหมดสร้างจากค่าคงที่ในไฟล์นี้ ไม่มีข้อความจากผู้เล่นปนเลย
 *
 * กระดานวาดตามภาพที่ครูออกแบบ: START ที่บ้านหลบภัยมุมซ้ายบน
 * ทางเดินคดเคี้ยวผ่านตลาด โรงเรียนซอมบี้ ห้องทดลองลับ แล้วขึ้นไปจบที่ Z-CURE CENTER มุมขวาบน
 * ซอมบี้ทุกตัวหน้าตาง่วง ๆ แก้มชมพู ไม่มีเลือด ไม่มีตาไขว้ เพราะเกมนี้ไม่ได้ให้ "ฆ่า" ใคร
 */

import { DOOR, SQUARE_INFO, ZONES, ZONE_IDS, squareKind, zoneOf } from './board'
import type { HeroKey } from './engine'

export const INK = '#23324A'
const SKIN = '#FFD9B8'
const HAIR = '#3A2A20'
const BLUSH = '#FF9DB0'
export const ZSKIN = '#A9DB8C'
const ZSKIN_D = '#7FBF67'
const O = 'stroke="' + INK + '" stroke-linejoin="round"'
const FONT = 'font-family="Mitr,Kanit,sans-serif"'

export type CharKey = HeroKey | 'zombie' | 'boss' | 'zombo'

export const CHAR_NAMES: Record<CharKey, string> = {
  scientist: 'มิ้นท์',
  doctor: 'ภู',
  scout: 'ต้น',
  dog: 'บิสกิต',
  zombie: 'ซอมบี้งัวเงีย',
  boss: 'ซอมบี้หัวหน้าห้อง',
  zombo: 'ดร.ซอมโบ',
}

/* ── หน้าตา ─────────────────────────────────────────────── */

function face(cx: number, cy: number): string {
  let s = ''
  s += '<ellipse cx="' + (cx - 4.4) + '" cy="' + cy + '" rx="1.9" ry="2.3" fill="' + INK + '"/><ellipse cx="' + (cx + 4.4) + '" cy="' + cy + '" rx="1.9" ry="2.3" fill="' + INK + '"/>'
  s += '<circle cx="' + (cx - 3.8) + '" cy="' + (cy - 0.8) + '" r=".7" fill="#fff"/><circle cx="' + (cx + 5) + '" cy="' + (cy - 0.8) + '" r=".7" fill="#fff"/>'
  s += '<ellipse cx="' + (cx - 7.2) + '" cy="' + (cy + 4) + '" rx="2.2" ry="1.25" fill="' + BLUSH + '" opacity=".85"/><ellipse cx="' + (cx + 7.2) + '" cy="' + (cy + 4) + '" rx="2.2" ry="1.25" fill="' + BLUSH + '" opacity=".85"/>'
  s += '<path d="M' + (cx - 2.6) + ' ' + (cy + 4.2) + ' Q' + cx + ' ' + (cy + 7) + ' ' + (cx + 2.6) + ' ' + (cy + 4.2) + '" fill="none" stroke="' + INK + '" stroke-width="1.1" stroke-linecap="round"/>'
  return s
}

/** หน้าซอมบี้งัวเงีย: ตาปรือ แก้มชมพู ปากเปิดนิด ๆ มีฟันซี่เดียว */
function zface(cx: number, cy: number): string {
  let s = ''
  for (const d of [-1, 1]) {
    const x = cx + d * 4.4
    s += '<ellipse cx="' + x + '" cy="' + cy + '" rx="2.1" ry="2.2" fill="#fff" ' + O + ' stroke-width=".7"/>'
    s += '<circle cx="' + x + '" cy="' + (cy + 0.6) + '" r="1.1" fill="' + INK + '"/>'
    s += '<path d="M' + (x - 2.3) + ' ' + (cy - 0.2) + ' Q' + x + ' ' + (cy - 1.4) + ' ' + (x + 2.3) + ' ' + (cy - 0.2) + ' L' + (x + 2.3) + ' ' + (cy - 2.4) + ' L' + (x - 2.3) + ' ' + (cy - 2.4) + ' Z" fill="' + ZSKIN_D + '"/>'
    s += '<path d="M' + (x - 2.3) + ' ' + (cy - 0.2) + ' Q' + x + ' ' + (cy - 1.4) + ' ' + (x + 2.3) + ' ' + (cy - 0.2) + '" fill="none" stroke="' + INK + '" stroke-width=".8" stroke-linecap="round"/>'
  }
  s += '<ellipse cx="' + (cx - 7.2) + '" cy="' + (cy + 4) + '" rx="2.1" ry="1.2" fill="' + BLUSH + '" opacity=".9"/><ellipse cx="' + (cx + 7.2) + '" cy="' + (cy + 4) + '" rx="2.1" ry="1.2" fill="' + BLUSH + '" opacity=".9"/>'
  s += '<ellipse cx="' + cx + '" cy="' + (cy + 5) + '" rx="2.3" ry="1.6" fill="#5A3D4A" ' + O + ' stroke-width=".7"/><rect x="' + (cx - 0.9) + '" y="' + (cy + 3.5) + '" width="1.8" height="1.4" rx=".3" fill="#fff"/>'
  return s
}

/** ตัวละครใน viewBox 0 0 40 48 (ชุดเดียวกับชุดพิมพ์ zombie-cure.html เพิ่ม ดร.ซอมโบ) */
export function charInner(k: CharKey): string {
  let s = ''
  if (k === 'doctor') {
    s += '<rect x="14" y="40" width="5" height="6.5" rx="2" fill="#35507A"/><rect x="21" y="40" width="5" height="6.5" rx="2" fill="#35507A"/>'
    s += '<path d="M12.6 29.5 L9.6 36.5" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/><circle cx="9.3" cy="37.2" r="2" fill="' + SKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<path d="M27.4 29.5 L33.5 23" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/><circle cx="34" cy="22.3" r="2.1" fill="' + SKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<rect x="32" y="12.5" width="5" height="7.5" rx="1.6" fill="#7CE08A" ' + O + ' stroke-width=".8"/><rect x="33.2" y="10.6" width="2.6" height="2.3" rx=".5" fill="#C69C6D" ' + O + ' stroke-width=".6"/>'
    s += '<path d="M11.5 26 L28.5 26 L31 43.5 L9 43.5 Z" fill="#fff" ' + O + ' stroke-width="1.2"/><path d="M16.5 26 L20 31 L23.5 26 Z" fill="#7FC4F5" ' + O + ' stroke-width=".7"/><path d="M20 31 V43" stroke="' + INK + '" stroke-width=".6"/>'
    s += '<path d="M16 26.5 Q13.5 33 17.5 36" fill="none" stroke="#6B7A90" stroke-width="1.1"/><circle cx="17.8" cy="36.4" r="1.6" fill="#B8C4D2" ' + O + ' stroke-width=".6"/>'
    s += '<path d="M24.2 33 h3 M25.7 31.5 v3" stroke="#E5484D" stroke-width="1.2" stroke-linecap="round"/>'
    s += '<circle cx="20" cy="16" r="10.6" fill="' + SKIN + '" ' + O + ' stroke-width="1.3"/>'
    s += '<path d="M9.4 15 Q8.8 4.5 20 4.5 Q31.2 4.5 30.6 15 Q27.5 9.5 20 10 Q12.5 9.5 9.4 15 Z" fill="' + HAIR + '" ' + O + ' stroke-width="1"/>'
    s += '<path d="M10 9.5 Q20 6.5 30 9.5" fill="none" stroke="#9AA6B8" stroke-width="1"/><circle cx="14.5" cy="8.3" r="2.8" fill="#E3EAF2" ' + O + ' stroke-width=".8"/><circle cx="14.5" cy="8.3" r="1.1" fill="#fff"/>'
    s += face(20, 17)
  } else if (k === 'scientist') {
    s += '<circle cx="31.5" cy="11" r="4.3" fill="' + HAIR + '" ' + O + ' stroke-width="1"/><path d="M33 13 Q37 18 33.5 22" fill="none" stroke="' + HAIR + '" stroke-width="3" stroke-linecap="round"/>'
    s += '<rect x="15" y="40" width="3.6" height="6.2" rx="1.6" fill="' + SKIN + '" ' + O + ' stroke-width=".7"/><rect x="21.4" y="40" width="3.6" height="6.2" rx="1.6" fill="' + SKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<path d="M12.6 29.5 L9.6 36.5" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/><circle cx="9.3" cy="37.2" r="2" fill="' + SKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<path d="M27.4 29.5 L33.2 24" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/><circle cx="33.8" cy="23.3" r="2.1" fill="' + SKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<g transform="rotate(18 35 16)"><rect x="33.2" y="9.5" width="3.6" height="11" rx="1.8" fill="#fff" ' + O + ' stroke-width=".8"/><rect x="33.6" y="14.5" width="2.8" height="5.6" rx="1.4" fill="#B57CF2"/></g>'
    s += '<path d="M11.5 26 L28.5 26 L31.5 42.5 L8.5 42.5 Z" fill="#fff" ' + O + ' stroke-width="1.2"/><path d="M16.5 26 L20 30.5 L23.5 26 Z" fill="#FF9EC7" ' + O + ' stroke-width=".7"/><path d="M20 30.5 V42" stroke="' + INK + '" stroke-width=".6"/>'
    s += '<rect x="23" y="33" width="4" height="3.4" rx=".6" fill="#DDE7F3" ' + O + ' stroke-width=".6"/>'
    s += '<circle cx="20" cy="16" r="10.6" fill="' + SKIN + '" ' + O + ' stroke-width="1.3"/>'
    s += '<path d="M9.2 16.5 Q8 4.5 20 4.5 Q32 4.5 30.8 16.5 Q28 10.5 20 11 Q12 10.5 9.2 16.5 Z" fill="' + HAIR + '" ' + O + ' stroke-width="1"/>'
    s += '<path d="M9.5 9.5 H30.5" stroke="#5B6B82" stroke-width="1.4"/><circle cx="15.5" cy="9.5" r="3" fill="#A8E6FF" ' + O + ' stroke-width=".9"/><circle cx="24.5" cy="9.5" r="3" fill="#A8E6FF" ' + O + ' stroke-width=".9"/><circle cx="14.6" cy="8.6" r=".8" fill="#fff"/><circle cx="23.6" cy="8.6" r=".8" fill="#fff"/>'
    s += face(20, 17.5)
  } else if (k === 'scout') {
    s += '<rect x="14" y="39" width="5" height="7.5" rx="2" fill="#B8925A"/><rect x="21" y="39" width="5" height="7.5" rx="2" fill="#B8925A"/>'
    s += '<path d="M12.6 29.5 L9.6 36.5" stroke="#5DAA5A" stroke-width="3.8" stroke-linecap="round"/><circle cx="9.3" cy="37.2" r="2" fill="' + SKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<path d="M34.5 20 L40 13 L40 26 Z" fill="#FFE27A" opacity=".85"/>'
    s += '<path d="M27.4 29.5 L33.2 24" stroke="#5DAA5A" stroke-width="3.8" stroke-linecap="round"/><rect x="31.5" y="18.5" width="4" height="7.5" rx="1.4" fill="#5B6B82" ' + O + ' stroke-width=".7" transform="rotate(-45 33.5 22)"/><circle cx="33.8" cy="23.6" r="2.1" fill="' + SKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<rect x="12" y="26" width="16" height="14" rx="5" fill="#5DAA5A" ' + O + ' stroke-width="1.2"/><path d="M14.5 26.5 L15.5 39.5 M25.5 26.5 L24.5 39.5" stroke="#F28C28" stroke-width="1.8"/><rect x="17.5" y="31" width="5" height="3.6" rx="1" fill="#F28C28" ' + O + ' stroke-width=".6"/>'
    s += '<circle cx="20" cy="16" r="10.6" fill="' + SKIN + '" ' + O + ' stroke-width="1.3"/>'
    s += '<path d="M10 14 Q9.5 11 11 9 L29 9 Q30.5 11 30 14 Z" fill="' + HAIR + '"/>'
    s += '<path d="M9.5 12.5 Q9.5 3.5 20 3.5 Q30.5 3.5 30.5 12.5 Z" fill="#F28C28" ' + O + ' stroke-width="1"/><path d="M24 12.5 Q31 11.5 36 13.5 Q31 15 24 14.2 Z" fill="#E07415" ' + O + ' stroke-width=".8"/><circle cx="20" cy="3.8" r="1.2" fill="#E07415"/>'
    s += face(20, 17.5)
  } else if (k === 'dog') {
    // บิสกิต: หมาชิบะสีส้ม หน้าขาว ใส่เสื้อกู้ภัย
    s += '<path d="M30 37 Q37 34 35.5 28" fill="none" stroke="#D9822B" stroke-width="2.6" stroke-linecap="round"/>'
    s += '<ellipse cx="15" cy="45" rx="3.4" ry="2" fill="#FFF3E4" ' + O + ' stroke-width=".8"/><ellipse cx="25" cy="45" rx="3.4" ry="2" fill="#FFF3E4" ' + O + ' stroke-width=".8"/>'
    s += '<ellipse cx="20" cy="36" rx="10.5" ry="9" fill="#E9993F" ' + O + ' stroke-width="1.2"/>'
    s += '<path d="M12 31 Q20 27 28 31 L27 40 Q20 43 13 40 Z" fill="#E5484D" ' + O + ' stroke-width=".9"/><path d="M18.5 35 h3 M20 33.5 v3" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>'
    s += '<path d="M10.5 12 L9 2.5 L17 8 Z" fill="#E9993F" ' + O + ' stroke-width="1"/><path d="M29.5 12 L31 2.5 L23 8 Z" fill="#E9993F" ' + O + ' stroke-width="1"/><path d="M11 9.5 L10.3 5 L14 7.8 Z M29 9.5 L29.7 5 L26 7.8 Z" fill="#FFD1A6"/>'
    s += '<circle cx="20" cy="17" r="10.6" fill="#E9993F" ' + O + ' stroke-width="1.3"/>'
    s += '<path d="M9.8 19 Q12 26.5 20 27 Q28 26.5 30.2 19 Q26 22 20 21.5 Q14 22 9.8 19 Z" fill="#FFF3E4"/>'
    s += '<ellipse cx="15.2" cy="13.4" rx="1.6" ry=".9" fill="#FFF3E4"/><ellipse cx="24.8" cy="13.4" rx="1.6" ry=".9" fill="#FFF3E4"/>'
    s += '<ellipse cx="20" cy="21.2" rx="1.8" ry="1.3" fill="' + INK + '"/>'
    s += '<ellipse cx="15.6" cy="16.4" rx="1.8" ry="2.1" fill="' + INK + '"/><ellipse cx="24.4" cy="16.4" rx="1.8" ry="2.1" fill="' + INK + '"/><circle cx="16.2" cy="15.6" r=".6" fill="#fff"/><circle cx="25" cy="15.6" r=".6" fill="#fff"/>'
    s += '<path d="M18.3 23.4 Q20 25 21.7 23.4" fill="none" stroke="' + INK + '" stroke-width=".9"/><path d="M19.3 24.2 Q20 27.4 20.7 24.2 Z" fill="#FF7F99"/>'
    s += '<ellipse cx="12" cy="21" rx="1.8" ry="1.1" fill="' + BLUSH + '" opacity=".85"/><ellipse cx="28" cy="21" rx="1.8" ry="1.1" fill="' + BLUSH + '" opacity=".85"/>'
  } else if (k === 'zombo') {
    // ดร.ซอมโบ: นักวิทยาศาสตร์ที่ติดไวรัส ผมขาวฟู แว่นกลม เสื้อกาวน์ ถือขวดยาทดลอง
    s += '<rect x="14" y="40" width="5" height="6.5" rx="2" fill="#5B6B82"/><rect x="21" y="40" width="5" height="6.5" rx="2" fill="#5B6B82"/>'
    s += '<path d="M12.6 29.5 L6 26" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/><circle cx="5.3" cy="25.6" r="2.2" fill="' + ZSKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<path d="M27.4 29.5 L33 24" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/>'
    s += '<path d="M31 14 L35 14 L35 18 L38.5 25 Q39 27.5 36.5 27.5 L29.5 27.5 Q27 27.5 27.5 25 L31 18 Z" fill="#fff" ' + O + ' stroke-width=".8"/><path d="M28.7 23 L37.3 23 L38.5 25 Q39 27.5 36.5 27.5 L29.5 27.5 Q27 27.5 27.5 25 Z" fill="#7CE08A"/><circle cx="34.5" cy="20" r=".8" fill="#7CE08A"/><circle cx="32.6" cy="12" r=".9" fill="#B6F0BE" ' + O + ' stroke-width=".4"/>'
    s += '<circle cx="33.6" cy="24.8" r="2.1" fill="' + ZSKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<path d="M11.5 26 L28.5 26 L31.5 43.5 L8.5 43.5 Z" fill="#fff" ' + O + ' stroke-width="1.2"/><path d="M16.5 26 L20 31 L23.5 26 Z" fill="#8FD17A" ' + O + ' stroke-width=".7"/><path d="M20 31 V43" stroke="' + INK + '" stroke-width=".6"/>'
    s += '<rect x="22.6" y="33" width="4.4" height="3.4" rx=".6" fill="#DDE7F3" ' + O + ' stroke-width=".6"/><path d="M13 36 l3 1" stroke="#8FD17A" stroke-width="1.4" stroke-linecap="round"/>'
    s += '<path d="M8.5 14 Q4 11.5 6.5 8 Q5 4.5 9.5 4.5 Q11 .5 15.5 2.5 Q20 -.5 24.5 2.5 Q29 .5 30.5 4.5 Q35 4.5 33.5 8 Q36 11.5 31.5 14 Z" fill="#F4F6FA" ' + O + ' stroke-width="1"/>'
    s += '<circle cx="20" cy="16.5" r="10.6" fill="' + ZSKIN + '" ' + O + ' stroke-width="1.3"/>'
    s += '<path d="M11 9.5 Q13 6 16 8.5 Q18 5.5 20 8 Q22 5.5 24 8.5 Q27 6 29 9.5" fill="#F4F6FA" ' + O + ' stroke-width=".8"/>'
    s += zface(20, 16.5)
    s += '<circle cx="15.6" cy="16.5" r="3.4" fill="#DFF6FF" fill-opacity=".35" ' + O + ' stroke-width="1"/><circle cx="24.4" cy="16.5" r="3.4" fill="#DFF6FF" fill-opacity=".35" ' + O + ' stroke-width="1"/><path d="M19 16.3 Q20 15.4 21 16.3" fill="none" stroke="' + INK + '" stroke-width="1"/>'
  } else {
    const boss = k === 'boss'
    if (boss) s += '<path d="M11 26 L5 45 Q20 41 35 45 L29 26 Z" fill="#8B4FC7" ' + O + ' stroke-width="1.2"/>'
    const shirt = boss ? '#E5484D' : '#8FB7E8'
    s += '<rect x="14" y="40" width="5" height="6.5" rx="2" fill="#7D8898"/><rect x="21" y="40" width="5" height="6.5" rx="2" fill="#7D8898"/>'
    s += '<path d="M12.6 29.5 L5 25" stroke="' + shirt + '" stroke-width="3.8" stroke-linecap="round"/><circle cx="4.3" cy="24.6" r="2.2" fill="' + ZSKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<path d="M27.4 29.5 L35 25" stroke="' + shirt + '" stroke-width="3.8" stroke-linecap="round"/><circle cx="35.7" cy="24.6" r="2.2" fill="' + ZSKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<path d="M12 26 L28 26 L28.5 38 L26 40.5 L23.5 38.5 L21 41 L18.5 38.5 L16 40.5 L13.5 38.5 L11.5 39.5 Z" fill="' + shirt + '" ' + O + ' stroke-width="1.1"/>'
    s += '<circle cx="20" cy="16.5" r="10.6" fill="' + ZSKIN + '" ' + O + ' stroke-width="1.3"/>'
    s += '<path d="M15 6.5 Q17 3 19 6 Q21 2.5 22.5 6 Q25 4 25.5 7.5" fill="none" stroke="#3E5F3A" stroke-width="1.6" stroke-linecap="round"/>'
    s += '<rect x="21.5" y="7.2" width="9" height="3" rx="1.2" fill="#fff" ' + O + ' stroke-width=".7" transform="rotate(28 26 8.7)"/>'
    s += zface(20, 16.5)
    if (boss) s += '<path d="M12.5 7.5 L14 1.5 L17.5 5.2 L20 .5 L22.5 5.2 L26 1.5 L27.5 7.5 Z" fill="#FFD233" ' + O + ' stroke-width=".9"/><circle cx="20" cy="4.4" r=".9" fill="#E5484D"/>'
  }
  return s
}

/** หัวซอมบี้จิ๋วสำหรับนับเป็นกลุ่ม ใน viewBox 0 0 20 20 */
export function zheadInner(): string {
  return (
    '<circle cx="10" cy="10.5" r="8.4" fill="' + ZSKIN + '" ' + O + ' stroke-width="1.1"/>' +
    '<path d="M6.5 3.8 Q8 1.8 9.5 3.6 Q11 1.4 12.3 3.8" fill="none" stroke="#3E5F3A" stroke-width="1.2" stroke-linecap="round"/>' +
    '<path d="M4.8 9.6 Q6.6 8.4 8.4 9.6 M11.6 9.6 Q13.4 8.4 15.2 9.6" fill="none" stroke="' + INK + '" stroke-width="1" stroke-linecap="round"/>' +
    '<ellipse cx="10" cy="13.6" rx="1.8" ry="1.3" fill="#5A3D4A"/>' +
    '<ellipse cx="4.6" cy="12.6" rx="1.5" ry=".9" fill="' + BLUSH + '"/><ellipse cx="15.4" cy="12.6" rx="1.5" ry=".9" fill="' + BLUSH + '"/>'
  )
}

/** หัวคนที่หายป่วยแล้ว (ซอมบี้ที่ได้วัคซีน) ใช้บอกว่ารักษาสำเร็จ */
export function curedHeadInner(): string {
  return (
    '<circle cx="10" cy="10.5" r="8.4" fill="' + SKIN + '" ' + O + ' stroke-width="1.1"/>' +
    '<path d="M2.4 9.5 Q2 1.5 10 1.8 Q18 1.5 17.6 9.5 Q15 5.5 10 6 Q5 5.5 2.4 9.5 Z" fill="' + HAIR + '"/>' +
    '<ellipse cx="7" cy="10.4" rx="1.1" ry="1.4" fill="' + INK + '"/><ellipse cx="13" cy="10.4" rx="1.1" ry="1.4" fill="' + INK + '"/>' +
    '<path d="M7.6 13.6 Q10 15.8 12.4 13.6" fill="none" stroke="' + INK + '" stroke-width="1" stroke-linecap="round"/>' +
    '<ellipse cx="4.6" cy="12.8" rx="1.5" ry=".9" fill="' + BLUSH + '"/><ellipse cx="15.4" cy="12.8" rx="1.5" ry=".9" fill="' + BLUSH + '"/>'
  )
}

/* ── กระดาน ─────────────────────────────────────────────── */

export const BOARD_VIEWBOX = '0 0 320 252'

/**
 * ตำแหน่งช่อง 0 (START) ถึง 36 (หน้าประตู Z-CURE CENTER)
 * ช่องห่างกันราว 22 หน่วยเท่ากันตลอดทาง เด็กจึงนับช่องตามนิ้วได้ไม่สับสน
 */
export const SQUARE_POSITIONS: Array<[number, number]> = [
  [22, 72],
  // เขต 1 · 1–7
  [46, 72], [68, 72], [90, 72], [112, 72], [134, 72], [156, 72], [178, 72],
  // เขต 2 · 8–14
  [199, 78], [212, 95], [206, 114], [186, 130], [164, 130], [142, 130], [120, 130],
  // เขต 3 · 15–21
  [98, 130], [76, 130], [54, 130], [34, 138], [24, 157], [28, 177], [46, 192],
  // เขต 4 · 22–28
  [68, 192], [90, 192], [112, 192], [134, 192], [156, 192], [178, 192], [200, 192],
  // เขต 5 · 29–35
  [222, 192], [244, 189], [264, 180], [280, 165], [290, 146], [294, 126], [294, 106],
  // หน้าประตู
  [291, 86],
]

/** ตำแหน่งตัวเดินของคนที่สร้าง Z-CURE สำเร็จแล้ว (ในตึก) */
export const CURE_POSITION: [number, number] = [278, 52]

const t = (x: number, y: number, text: string, size: number, fill: string, extra = '') =>
  '<text x="' + x + '" y="' + y + '" ' + FONT + ' font-size="' + size + '" fill="' + fill + '" ' + extra + '>' + text + '</text>'

const mini = (k: CharKey, x: number, y: number, w: number) =>
  '<svg x="' + x + '" y="' + y + '" width="' + w + '" height="' + w * 1.2 + '" viewBox="0 0 40 48">' + charInner(k) + '</svg>'

const zh = (x: number, y: number, w: number) =>
  '<svg x="' + x + '" y="' + y + '" width="' + w + '" height="' + w + '" viewBox="0 0 20 20">' + zheadInner() + '</svg>'

function tree(x: number, y: number, r = 7): string {
  return (
    '<rect x="' + (x - 1.2) + '" y="' + (y + r * 0.4) + '" width="2.4" height="' + r * 0.9 + '" rx="1" fill="#8A5A34"/>' +
    '<circle cx="' + (x - r * 0.5) + '" cy="' + (y + r * 0.15) + '" r="' + r * 0.7 + '" fill="#3F9A4B"/>' +
    '<circle cx="' + (x + r * 0.5) + '" cy="' + (y + r * 0.15) + '" r="' + r * 0.7 + '" fill="#3F9A4B"/>' +
    '<circle cx="' + x + '" cy="' + (y - r * 0.35) + '" r="' + r * 0.8 + '" fill="#4DB25A"/>' +
    '<circle cx="' + (x - r * 0.25) + '" cy="' + (y - r * 0.55) + '" r="' + r * 0.3 + '" fill="#7FD07F" opacity=".7"/>'
  )
}

function ruin(x: number, y: number, w: number, h: number): string {
  let s = '<path d="M' + x + ' ' + (y + h) + ' V' + (y + 4) + ' L' + (x + w * 0.3) + ' ' + y + ' L' + (x + w * 0.45) + ' ' + (y + 5) + ' L' + (x + w * 0.7) + ' ' + (y + 2) + ' L' + (x + w) + ' ' + (y + 6) + ' V' + (y + h) + ' Z" fill="#8C96A6" stroke="#5B6474" stroke-width=".7"/>'
  for (let r = 0; r < Math.floor((h - 8) / 7); r += 1) {
    for (let c = 0; c < Math.floor(w / 7); c += 1) {
      s += '<rect x="' + (x + 2.5 + c * 7) + '" y="' + (y + 8 + r * 7) + '" width="3.4" height="3.6" fill="' + ((r + c) % 3 === 0 ? '#3D4656' : '#DCE3EC') + '"/>'
    }
  }
  return s
}

function sign(cx: number, y: number, text: string, bg: string, w: number, size = 4.4): string {
  return (
    '<rect x="' + (cx - w / 2) + '" y="' + y + '" width="' + w + '" height="' + (size + 3.4) + '" rx="1.6" fill="' + bg + '" stroke="' + INK + '" stroke-width=".6"/>' +
    t(cx, y + size + 1.2, text, size, '#fff', 'text-anchor="middle" font-weight="700" letter-spacing=".2"')
  )
}

function badge(cx: number, cy: number, text: string, color: string): string {
  return (
    '<circle cx="' + cx + '" cy="' + cy + '" r="5.6" fill="' + color + '" stroke="#fff" stroke-width="1.2"/>' +
    t(cx, cy + 2, text, 5.2, '#fff', 'text-anchor="middle" font-weight="700"')
  )
}

function safeHouse(x: number, y: number): string {
  let s = '<rect x="' + (x + 4) + '" y="' + (y + 14) + '" width="40" height="22" fill="#F6E3B4" stroke="' + INK + '" stroke-width=".8"/>'
  s += '<path d="M' + x + ' ' + (y + 16) + ' L' + (x + 24) + ' ' + y + ' L' + (x + 48) + ' ' + (y + 16) + ' Z" fill="#D9483B" stroke="' + INK + '" stroke-width=".8"/>'
  s += '<path d="M' + (x + 6) + ' ' + (y + 13) + ' L' + (x + 24) + ' ' + (y + 2.5) + ' L' + (x + 42) + ' ' + (y + 13) + '" fill="none" stroke="#F07A5E" stroke-width="1.2"/>'
  s += '<rect x="' + (x + 19) + '" y="' + (y + 24) + '" width="9" height="12" rx="4.5" fill="#8A5A34" stroke="' + INK + '" stroke-width=".6"/>'
  s += '<rect x="' + (x + 8) + '" y="' + (y + 19) + '" width="7" height="6" fill="#9FD8F5" stroke="' + INK + '" stroke-width=".6"/><rect x="' + (x + 33) + '" y="' + (y + 19) + '" width="7" height="6" fill="#9FD8F5" stroke="' + INK + '" stroke-width=".6"/>'
  s += '<path d="M' + (x + 38) + ' ' + (y + 6) + ' V' + (y - 5) + '" stroke="' + INK + '" stroke-width=".7"/><path d="M' + (x + 38) + ' ' + (y - 5) + ' L' + (x + 45) + ' ' + (y - 3) + ' L' + (x + 38) + ' ' + (y - 1) + ' Z" fill="#FFD233" stroke="' + INK + '" stroke-width=".5"/>'
  s += '<rect x="' + (x + 44) + '" y="' + (y + 28) + '" width="8" height="8" fill="#B98A4E" stroke="' + INK + '" stroke-width=".6"/><path d="M' + (x + 44) + ' ' + (y + 28) + ' l8 8 M' + (x + 52) + ' ' + (y + 28) + ' l-8 8" stroke="#7A5530" stroke-width=".6"/>'
  return s
}

function market(x: number, y: number): string {
  let s = '<rect x="' + x + '" y="' + (y + 10) + '" width="74" height="26" fill="#C8553D" stroke="' + INK + '" stroke-width=".8"/>'
  s += '<rect x="' + (x + 3) + '" y="' + (y + 22) + '" width="68" height="14" fill="#FBEFD9" stroke="' + INK + '" stroke-width=".6"/>'
  for (let i = 0; i < 8; i += 1) {
    s += '<path d="M' + (x + i * 9.25) + ' ' + (y + 14) + ' h9.25 v5 q-4.6 3 -9.25 0 Z" fill="' + (i % 2 ? '#fff' : '#E5484D') + '" stroke="' + INK + '" stroke-width=".5"/>'
  }
  s += sign(x + 37, y, 'SUPPLY MARKET', '#B8312F', 60)
  for (let i = 0; i < 4; i += 1) {
    s += '<rect x="' + (x + 7 + i * 16) + '" y="' + (y + 27) + '" width="10" height="7" rx="1" fill="' + ['#FFB347', '#7CC96B', '#6FB7F0', '#F28CB1'][i] + '" stroke="' + INK + '" stroke-width=".5"/>'
  }
  return s
}

function school(x: number, y: number): string {
  let s = '<rect x="' + (x + 2) + '" y="' + (y + 14) + '" width="60" height="26" fill="#F3D9A4" stroke="' + INK + '" stroke-width=".8"/>'
  s += '<path d="M' + x + ' ' + (y + 15) + ' L' + (x + 8) + ' ' + (y + 6) + ' L' + (x + 56) + ' ' + (y + 6) + ' L' + (x + 64) + ' ' + (y + 15) + ' Z" fill="#C8453B" stroke="' + INK + '" stroke-width=".8"/>'
  s += '<rect x="' + (x + 26) + '" y="' + (y - 4) + '" width="12" height="12" fill="#F3D9A4" stroke="' + INK + '" stroke-width=".7"/><path d="M' + (x + 24) + ' ' + (y - 3) + ' L' + (x + 32) + ' ' + (y - 10) + ' L' + (x + 40) + ' ' + (y - 3) + ' Z" fill="#C8453B" stroke="' + INK + '" stroke-width=".7"/><circle cx="' + (x + 32) + '" cy="' + (y + 2) + '" r="2.4" fill="#FFD233" stroke="' + INK + '" stroke-width=".5"/>'
  for (let i = 0; i < 4; i += 1) {
    if (i === 2) continue
    s += '<rect x="' + (x + 7 + i * 14) + '" y="' + (y + 25) + '" width="8" height="7" fill="#9FD8F5" stroke="' + INK + '" stroke-width=".5"/>'
  }
  s += '<rect x="' + (x + 28) + '" y="' + (y + 28) + '" width="8" height="12" fill="#8A5A34" stroke="' + INK + '" stroke-width=".5"/>'
  s += sign(x + 32, y + 16, 'ZOMBIE SCHOOL', '#7A5530', 46, 3.8)
  return s
}

function lab(x: number, y: number): string {
  let s = '<rect x="' + x + '" y="' + (y + 10) + '" width="72" height="28" rx="3" fill="#EAF4FB" stroke="' + INK + '" stroke-width=".8"/>'
  s += '<rect x="' + (x - 2) + '" y="' + (y + 8) + '" width="76" height="5" rx="2" fill="#2B8BD9" stroke="' + INK + '" stroke-width=".6"/>'
  for (let i = 0; i < 5; i += 1) {
    if (i === 2) continue
    s += '<rect x="' + (x + 5 + i * 13.5) + '" y="' + (y + 19) + '" width="9" height="9" fill="#BFE6FA" stroke="' + INK + '" stroke-width=".5"/>'
  }
  s += '<rect x="' + (x + 31) + '" y="' + (y + 24) + '" width="10" height="14" fill="#9FC3DD" stroke="' + INK + '" stroke-width=".5"/><path d="M' + (x + 36) + ' ' + (y + 24) + ' V' + (y + 38) + '" stroke="' + INK + '" stroke-width=".5"/>'
  s += sign(x + 36, y - 1, 'SECRET LAB', '#1E5FB0', 44)
  s += '<path d="M' + (x + 64) + ' ' + (y + 8) + ' V' + (y - 4) + '" stroke="' + INK + '" stroke-width=".7"/><circle cx="' + (x + 64) + '" cy="' + (y - 5) + '" r="1.6" fill="#E5484D"/>'
  s += '<path d="M' + (x + 3) + ' ' + (y + 2) + ' h5 v4 l3.5 6 h-12 l3.5 -6 Z" fill="#fff" stroke="' + INK + '" stroke-width=".6"/><path d="M' + (x + 0.2) + ' ' + (y + 10) + ' l2 -3.2 h6.6 l2 3.2 Z" fill="#7CE08A"/>'
  return s
}

function cureCenter(x: number, y: number): string {
  // ขวดยายักษ์บนหลังคา แบบในภาพที่ครูออกแบบ
  let s = '<rect x="' + (x + 30) + '" y="' + (y - 1) + '" width="18" height="6" rx="2" fill="#5B6B82" stroke="' + INK + '" stroke-width=".7"/>'
  s += '<path d="M' + (x + 26) + ' ' + (y + 5) + ' h26 v6 q6 3 6 10 v10 h-38 v-10 q0 -7 6 -10 Z" fill="#DDF6FB" fill-opacity=".85" stroke="' + INK + '" stroke-width=".8"/>'
  s += '<path d="M' + (x + 20.6) + ' ' + (y + 19) + ' q0 -3 4 -5 h28.8 q4 2 4 5 v12 h-36.8 Z" fill="#35C6D9"/><ellipse cx="' + (x + 30) + '" cy="' + (y + 11) + '" rx="1.6" ry="3.6" fill="#fff" opacity=".8"/>'
  s += '<rect x="' + (x + 2) + '" y="' + (y + 29) + '" width="74" height="42" rx="7" fill="#E9F6F8" stroke="' + INK + '" stroke-width=".9"/>'
  s += '<rect x="' + (x + 2) + '" y="' + (y + 29) + '" width="74" height="9" rx="4" fill="#1E9AAE" stroke="' + INK + '" stroke-width=".7"/>'
  s += '<rect x="' + (x + 8) + '" y="' + (y + 41) + '" width="62" height="16" rx="3" fill="#1B6D9A" stroke="' + INK + '" stroke-width=".7"/>'
  s += '<path d="M' + (x + 13) + ' ' + (y + 45) + ' h4 v-2.5 h4 v2.5 h4 v4 h-4 v2.5 h-4 v-2.5 h-4 Z" fill="#fff"/>'
  s += t(x + 47, y + 48.5, 'Z-CURE', 6, '#fff', 'text-anchor="middle" font-weight="700"')
  s += t(x + 47, y + 54.5, 'CENTER', 4.2, '#BFEFFF', 'text-anchor="middle" font-weight="600" letter-spacing=".6"')
  s += '<rect x="' + (x + 30) + '" y="' + (y + 59) + '" width="18" height="12" rx="2" fill="#9FD8F5" stroke="' + INK + '" stroke-width=".6"/><path d="M' + (x + 39) + ' ' + (y + 59) + ' V' + (y + 71) + '" stroke="' + INK + '" stroke-width=".6"/>'
  s += '<rect x="' + (x + 7) + '" y="' + (y + 60) + '" width="8" height="7" fill="#BFE6FA" stroke="' + INK + '" stroke-width=".5"/><rect x="' + (x + 63) + '" y="' + (y + 60) + '" width="8" height="7" fill="#BFE6FA" stroke="' + INK + '" stroke-width=".5"/>'
  return s
}

export function boardArt(): string {
  let s = ''
  // พื้นหญ้าและเงาเนิน
  s += '<rect x="0" y="0" width="320" height="252" rx="10" fill="#8FCB74"/>'
  s += '<ellipse cx="80" cy="60" rx="90" ry="40" fill="#9ED483" opacity=".7"/><ellipse cx="190" cy="165" rx="110" ry="45" fill="#9ED483" opacity=".6"/><ellipse cx="300" cy="200" rx="50" ry="40" fill="#7DBE67" opacity=".6"/>'

  // หัวเกม
  s += t(6, 18, 'ZOMBIE', 15, '#7ED957', 'font-weight="800" stroke="' + INK + '" stroke-width="2.2" paint-order="stroke" letter-spacing=".4"')
  s += t(70, 18, '💉', 11, INK)
  s += t(8, 33, 'RESCUE', 13, '#FFB020', 'font-weight="800" stroke="' + INK + '" stroke-width="2" paint-order="stroke" letter-spacing=".4"')
  s += '<rect x="64" y="25" width="86" height="10" rx="3" fill="' + INK + '"/>' + t(107, 32.4, 'ภารกิจรอดชีวิต พิชิตไวรัสซอมบี้', 5, '#fff', 'text-anchor="middle" font-weight="600"')

  // เมืองร้างด้านบน
  s += ruin(152, 30, 22, 30) + ruin(176, 38, 16, 22) + ruin(198, 28, 20, 34) + ruin(222, 40, 14, 20)
  s += '<path d="M150 60 H236" stroke="#6B5A45" stroke-width="1"/>'
  for (let x = 152; x <= 234; x += 6) s += '<path d="M' + x + ' 60 V55" stroke="#6B5A45" stroke-width=".9"/>'
  s += t(160, 26, 'เมืองร้าง', 4.4, '#fff', 'font-weight="700" stroke="' + INK + '" stroke-width="1.4" paint-order="stroke"')

  // ต้นไม้ประดับ
  for (const [x, y, r] of [[8, 104, 6], [12, 120, 5], [100, 104, 6], [304, 190, 7], [312, 214, 5], [8, 200, 6], [120, 160, 5], [206, 160, 6], [236, 90, 5], [308, 100, 5], [214, 142, 5], [150, 46, 5], [244, 60, 5]] as Array<[number, number, number]>) {
    s += tree(x, y, r)
  }

  // ตึกของแต่ละเขต
  s += safeHouse(38, 83)
  s += market(112, 84)
  s += school(46, 145)
  s += lab(128, 148)
  s += cureCenter(238, 6)

  // แม่สูตรคูณของแต่ละเขต ติดไว้ที่ตึก (ชื่อเขตภาษาไทยอยู่ในแถบด้านล่าง)
  s += badge(27, 98, '×' + ZONES[1].table, ZONES[1].color)
  s += badge(184, 89, '×' + ZONES[2].table, ZONES[2].color)
  s += badge(108, 166, '×' + ZONES[3].table, ZONES[3].color)
  s += badge(192, 151, '×' + ZONES[4].table, ZONES[4].color)
  s += badge(241, 31, 'รวม', ZONES[5].color)

  // ดร.ซอมโบ ข้างทางขึ้น Z-CURE CENTER
  s += '<ellipse cx="243" cy="152" rx="20" ry="4" fill="#5E9A4F" opacity=".5"/>'
  s += mini('zombo', 226, 108, 34)
  s += '<rect x="226" y="100" width="17" height="7.4" rx="2" fill="#E0453A" stroke="#fff" stroke-width=".8"/>' + t(234.5, 105.8, 'BOSS', 5, '#fff', 'text-anchor="middle" font-weight="800"')
  s += t(244, 99, 'ดร.ซอมโบ', 4.8, '#fff', 'font-weight="700" stroke="' + INK + '" stroke-width="1.4" paint-order="stroke"')

  // ซอมบี้เดินเตร่ (น่ารัก ไม่น่ากลัว)
  s += mini('zombie', 190, 44, 11) + mini('zombie', 8, 128, 11) + mini('boss', 26, 196, 12) + mini('zombie', 214, 124, 10)
  s += zh(98, 150, 7) + zh(206, 166, 7) + zh(186, 203, 7) + zh(20, 54, 6)

  // ทางเดิน
  const road = SQUARE_POSITIONS.map(([x, y]) => x + ',' + y).join(' ')
  s += '<polyline points="' + road + '" fill="none" stroke="#B98A4E" stroke-width="15" stroke-linejoin="round" stroke-linecap="round"/>'
  s += '<polyline points="' + road + '" fill="none" stroke="#F7E7BE" stroke-width="12.4" stroke-linejoin="round" stroke-linecap="round"/>'

  // ช่อง
  for (let i = 1; i < DOOR; i += 1) {
    const [x, y] = SQUARE_POSITIONS[i]
    const kind = squareKind(i)
    const zone = ZONES[zoneOf(i)]
    if (kind === 'plain') {
      s += '<circle cx="' + x + '" cy="' + y + '" r="8" fill="#FFFBEF" stroke="' + zone.color + '" stroke-width="1.4"/>'
      s += t(x, y + 2.4, String(i), 6.6, INK, 'text-anchor="middle" font-weight="700"')
    } else if (kind !== 'start' && kind !== 'door') {
      const info = SQUARE_INFO[kind]
      s += '<circle cx="' + x + '" cy="' + y + '" r="8" fill="' + info.color + '" stroke="#fff" stroke-width="1.4"/>'
      s += '<circle cx="' + x + '" cy="' + y + '" r="8.9" fill="none" stroke="' + zone.color + '" stroke-width=".8"/>'
      s += t(x, y + 2.6, info.icon, 7.2, '#fff', 'text-anchor="middle"')
      s += '<circle cx="' + (x + 6.4) + '" cy="' + (y - 6.2) + '" r="3.1" fill="#fff" stroke="' + info.color + '" stroke-width=".6"/>'
      s += t(x + 6.4, y - 4.9, String(i), 3.6, INK, 'text-anchor="middle" font-weight="700"')
    }
  }

  // START และเส้นชัย
  const [sx, sy] = SQUARE_POSITIONS[0]
  s += '<circle cx="' + sx + '" cy="' + sy + '" r="11" fill="#E0453A" stroke="#fff" stroke-width="1.6"/>'
  s += t(sx, sy + 1.2, 'START', 5.4, '#fff', 'text-anchor="middle" font-weight="800"')
  s += t(sx, sy + 7.2, '⬆', 4.4, '#fff', 'text-anchor="middle"')
  const [dx, dy] = SQUARE_POSITIONS[DOOR]
  s += '<circle cx="' + dx + '" cy="' + dy + '" r="10" fill="#2E9E4F" stroke="#fff" stroke-width="1.6"/>'
  s += t(dx, dy - 0.4, '🏁', 7, '#fff', 'text-anchor="middle"')
  s += t(dx, dy + 6, 'เส้นชัย', 3.8, '#fff', 'text-anchor="middle" font-weight="700"')

  // แถบด้านล่าง: เขตกับแม่สูตรคูณ และสัญลักษณ์บนช่อง
  s += '<rect x="4" y="212" width="312" height="37" rx="6" fill="#FFF8E6" stroke="#C9A26A" stroke-width=".8"/>'
  let zx = 10
  for (const id of ZONE_IDS) {
    const info = ZONES[id]
    const label = info.icon + ' ' + info.name + ' ' + (info.table ? '×' + info.table : 'รวมทุกแม่')
    s += t(zx, 222, label, 4.3, info.color, 'font-weight="700"')
    zx += 8 + label.length * 2.55
  }
  const legend: Array<keyof typeof SQUARE_INFO> = ['item', 'event', 'zombie', 'rest', 'market']
  const notes: Record<keyof typeof SQUARE_INFO, string> = {
    item: 'ยา / อุปกรณ์',
    event: 'เหตุการณ์สุ่ม',
    zombie: 'ถูก = รักษา · ผิด = ❤️−1',
    rest: 'ฟื้น ❤️ · จุดเซฟ',
    market: 'ซื้อของด้วย 🥫',
  }
  legend.forEach((kind, i) => {
    const info = SQUARE_INFO[kind]
    const x = 16 + i * 61
    s += '<circle cx="' + x + '" cy="238" r="6" fill="' + info.color + '"/>' + t(x, 240.2, info.icon, 5.6, '#fff', 'text-anchor="middle"')
    s += t(x + 8.5, 237.4, info.name, 4.2, INK, 'font-weight="700"')
    s += t(x + 8.5, 243, notes[kind], 3.4, '#51607A')
  })
  return s
}
