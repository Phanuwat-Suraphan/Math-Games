import type { Stage } from '../types/stage'

/**
 * เส้นทางของด่านตามชนิดกิจกรรม
 *
 * อยู่ที่ไฟล์เดียวเพราะมีหลายหน้าที่ต้องพาเด็กเข้าด่าน
 * (หน้ารายละเอียดด่าน แผนที่เส้นทาง และหน้าผลลัพธ์ที่มีปุ่มไปด่านถัดไป)
 * ถ้าแยกกันคิดเอง จะมีหน้าที่พาไปผิดชนิดกิจกรรม
 */
export function stageRoute(worldId: string, stage: Stage): string {
  // ด่านบอสเป็นการต่อสู้เสมอ แม้ข้อมูลด่านจะไม่ได้ระบุไว้
  const activity = stage.activity ?? (stage.isBoss ? 'battle' : 'quiz')

  if (activity === 'battle') return `/battle/${worldId}/${stage.id}`
  if (activity === 'puzzle') return `/puzzle/${worldId}/${stage.id}`
  return `/play/${worldId}/${stage.id}`
}
