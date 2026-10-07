import type { Landmark } from '../engine/pinch'

/**
 * ตัวตรวจจับมือด้วย MediaPipe Hand Landmarker (โหลดจาก CDN ตอนเปิดใช้ครั้งแรก)
 * ภาพจากกล้องประมวลผลในเครื่องเท่านั้น ไม่ส่งภาพไปที่ไหน
 * โหลดไม่ได้ (ออฟไลน์ / เครื่องเก่า) ก็ยังเล่นด้วยการแตะจอได้ตามปกติ
 */

/** แหล่งโหลดสำรองหลายที่ (ที่แรกโหลดไม่ได้ก็ลองที่ถัดไป) */
const SOURCES = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14',
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3',
  'https://unpkg.com/@mediapipe/tasks-vision@0.10.3',
]
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const LOAD_TIMEOUT = 25_000

export interface HandTracker {
  /**
   * ตรวจภาพเฟรมปัจจุบัน
   * คืน undefined = ยังเป็นเฟรมเดิม (ไม่ต้องทำอะไร) · null = ไม่เห็นมือ · จุดสำคัญ 21 จุดของมือแรก
   */
  detect(video: HTMLVideoElement, now: number): Landmark[] | null | undefined
}

interface Landmarker {
  detectForVideo(video: HTMLVideoElement, timestamp: number): { landmarks?: Landmark[][] }
}

interface VisionModule {
  FilesetResolver: { forVisionTasks(path: string): Promise<unknown> }
  HandLandmarker: { createFromOptions(files: unknown, options: unknown): Promise<Landmarker> }
}

let loading: Promise<HandTracker> | null = null

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

async function importVision(): Promise<{ vision: VisionModule; base: string }> {
  let lastError: unknown = null
  for (const base of SOURCES) {
    try {
      const mod = (await import(/* @vite-ignore */ `${base}/vision_bundle.mjs`)) as VisionModule & { default?: VisionModule }
      const vision = mod.HandLandmarker ? mod : mod.default
      if (vision?.HandLandmarker && vision.FilesetResolver) return { vision, base }
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('โหลดตัวตรวจจับมือไม่ได้')
}

async function create(): Promise<HandTracker> {
  const { vision, base } = await importVision()
  const files = await vision.FilesetResolver.forVisionTasks(`${base}/wasm`)
  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: MODEL, delegate },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
  let landmarker: Landmarker
  try {
    landmarker = await vision.HandLandmarker.createFromOptions(files, options('GPU'))
  } catch {
    // เครื่องที่ใช้ GPU ไม่ได้ ใช้ CPU แทน (ช้ากว่าเล็กน้อย)
    landmarker = await vision.HandLandmarker.createFromOptions(files, options('CPU'))
  }
  let lastFrame = -1
  let lastTime = 0
  return {
    detect(video, now) {
      if (video.readyState < 2 || video.videoWidth === 0) return undefined
      if (video.currentTime === lastFrame) return undefined
      lastFrame = video.currentTime
      // เวลาที่ส่งให้ MediaPipe ต้องเพิ่มขึ้นเสมอ
      lastTime = Math.max(lastTime + 1, Math.round(now))
      const result = landmarker.detectForVideo(video, lastTime)
      return result.landmarks?.[0] ?? null
    },
  }
}

/** โหลดครั้งเดียวแล้วใช้ซ้ำ (เข้าหน้า AR ใหม่ไม่ต้องโหลดอีก) */
export function loadHandTracker(): Promise<HandTracker> {
  if (!loading) {
    loading = withTimeout(create(), LOAD_TIMEOUT).catch((error: unknown) => {
      loading = null
      throw error
    })
  }
  return loading
}
