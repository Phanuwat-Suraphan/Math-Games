/**
 * ข้อความสำหรับอ่านโจทย์ออกเสียง (🔊 ฟังโจทย์)
 *
 * ทำไมต้องมี
 *
 * เด็ก ป.2 หลายคนยังอ่านหนังสือไม่คล่อง แต่คิดเลขได้ ถ้าต้องรอเพื่อนหรือครูอ่านให้ ก็เล่นเองไม่ได้
 * ปุ่มฟังโจทย์ใช้เสียงอ่านภาษาไทยของเครื่อง (Web Speech) ไฟล์นี้แปลงโจทย์เป็นประโยคที่อ่านออกเสียงได้
 * เพราะเสียงอ่านไม่รู้จักเครื่องหมาย × = □ และมักข้ามไปเฉย ๆ
 *
 * กฎที่ห้ามแก้
 * · ข้อความที่อ่านต้องไม่บอกคำตอบ (เหมือนข้อความโจทย์) ยกเว้น revealSpeech ที่ใช้ตอนเฉลย
 * · ตัวเลขปล่อยเป็นเลขอารบิก เสียงอ่านภาษาไทยอ่านเป็นคำเองได้ถูกต้อง
 */

import type { Question } from './questions'

/** แปลงเครื่องหมายคณิตเป็นคำอ่าน */
export function mathSpeech(text: string): string {
  return text
    .replace(/□/g, ' ช่องว่าง ')
    .replace(/×/g, ' คูณ ')
    .replace(/÷/g, ' หาร ')
    .replace(/\+/g, ' บวก ')
    .replace(/=\s*\?/g, ' เท่ากับเท่าไร ')
    .replace(/=/g, ' เท่ากับ ')
    .replace(/\?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** ประโยคอ่านโจทย์หนึ่งข้อของเกมกระดานหรือโหมดฝึก */
export function questionSpeech(q: Question): string {
  const v = q.visual
  // ข้อหาร: ข้อตรง ๆ อ่านนิพจน์ ข้อโจทย์ปัญหาอ่านเรื่อง (โจทย์ปัญหามีตัวเลขครบในเรื่องแล้ว)
  if (q.key === 'div-story') return mathSpeech(q.text)
  if (q.key === 'div-expr') return `${q.product} หาร ${q.each} เท่ากับเท่าไร`
  if (v.kind === 'expr') {
    return mathSpeech(v.text) + (q.ask === 'missing' ? ' ช่องว่างคือเลขอะไร' : '')
  }
  if (v.kind === 'add') {
    const sum = Array.from({ length: v.times }, () => v.addend).join(' + ')
    return `${mathSpeech(sum)} ${mathSpeech(q.text)}`.trim()
  }
  return mathSpeech(q.text)
}

/** อ่านโจทย์แบบสั้น (โหมดทั้งห้องและซอมบี้บุก) */
export const factSpeech = (groups: number, each: number): string => `${groups} คูณ ${each} เท่ากับเท่าไร`

/** อ่านเฉลย */
export const revealSpeech = (groups: number, each: number): string => `${groups} คูณ ${each} เท่ากับ ${groups * each}`
