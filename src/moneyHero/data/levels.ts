import type { NpcId, Skill, Visual } from '../engine/types'

/**
 * 13 ด่านของเมืองเงินทอง (ด่าน 0 คือด่านเริ่มต้น ด่าน 1–12 คือบทเรียน)
 * ทุกด่านมี 4 ขั้น: LEARN → PRACTICE → MISSION → BOSS
 */

export interface LearnSlide {
  npc: NpcId
  title: string
  lines: string[]
  visual?: Visual
}

export interface LevelDef {
  id: number
  name: string
  topic: string
  icon: string
  /** ชื่อมินิเกมหลักของด่าน */
  game: string
  /** คลาสบรรยากาศ */
  theme: string
  npc: NpcId
  skills: Skill[]
  /** ป้ายบนอาคารในแผนที่ */
  building: string
  learn: LearnSlide[]
}

export const LEVELS: LevelDef[] = [
  {
    id: 0,
    name: 'เริ่มต้น MONEY HERO',
    topic: 'รู้จักเมืองเงินทอง',
    icon: '🚩',
    game: 'ค่ายฝึกฮีโร่',
    theme: 'theme-start',
    npc: 'hero',
    skills: ['notes', 'count', 'compare'],
    building: '⛺',
    learn: [
      {
        npc: 'hero',
        title: 'สวัสดี! ฉันคือ MONEY HERO',
        lines: ['เมืองเงินทองต้องการฮีโร่!', 'เราจะเรียนเรื่อง "เงิน" ไปด้วยกัน 12 ด่าน', 'ผ่านครบแล้วจะได้ตรา MONEY MASTER ป.3'],
      },
      {
        npc: 'rabbit',
        title: 'เพื่อนร่วมทางของเรา',
        lines: ['🐰 กระต่ายนักนับเงิน ช่วยนับเงิน', '🦊 จิ้งจอกนักคิด ช่วยแก้โจทย์', '🐻 หมีเจ้าของร้าน ขายของให้เรา', '🦉 นกฮูกนักบัญชี สอนจดบัญชี'],
      },
      {
        npc: 'rabbit',
        title: 'เงินไทยมี 2 หน่วย',
        lines: ['หน่วยใหญ่คือ "บาท"', 'หน่วยเล็กคือ "สตางค์"', '100 สตางค์ = 1 บาท'],
        visual: { type: 'exchange', left: ['b1'], right: ['s50', 's50'] },
      },
      {
        npc: 'hero',
        title: 'ปุ่มช่วยเหลือ',
        lines: ['💡 ตัวช่วย: กดได้ 3 ครั้ง ยิ่งกดยิ่งช่วยมาก', '📖 เรียนรู้ใหม่: กลับไปอ่านบทเรียน', '🔄 ลองอีกครั้ง: ล้างคำตอบแล้วคิดใหม่', '🔈 ฟังโจทย์: ให้เกมอ่านโจทย์ให้ฟัง'],
      },
      {
        npc: 'hero',
        title: 'ทุกด่านมี 4 ขั้น',
        lines: ['1. เรียนรู้ก่อนเล่น', '2. ฝึกซ้อม (ยิงลูกโป่ง)', '3. ภารกิจในเมือง', '4. สู้บอส'],
        visual: { type: 'rules', items: ['ตอบผิดไม่เป็นไร เกมจะสอนวิธีคิดให้', 'ข้อที่ผิดจะได้ฝึกซ้ำอีกครั้ง'] },
      },
    ],
  },
  {
    id: 1,
    name: 'ธนาคารแห่งเมืองเงินทอง',
    topic: 'ธนบัตรและเงินเหรียญ',
    icon: '🏦',
    game: 'จับคู่เงิน · จ่ายเงินซื้อของ',
    theme: 'theme-bank',
    npc: 'rabbit',
    skills: ['notes'],
    building: '🏦',
    learn: [
      {
        npc: 'rabbit',
        title: 'เงินไทยมี 11 ชนิด',
        lines: ['แตะเงินแต่ละชิ้นเพื่อดูชื่อและค่าของมัน'],
        visual: { type: 'gallery' },
      },
      {
        npc: 'rabbit',
        title: 'เหรียญ มี 6 ชนิด',
        lines: ['เหรียญทำจากโลหะ ทรงกลม', 'เหรียญ 25 สตางค์ และ 50 สตางค์ มีค่าน้อยกว่า 1 บาท'],
        visual: { type: 'money', items: ['s25', 's50', 'b1', 'b2', 'b5', 'b10'] },
      },
      {
        npc: 'rabbit',
        title: 'ธนบัตร มี 5 ชนิด',
        lines: ['ธนบัตรเป็นกระดาษ สี่เหลี่ยม', 'แต่ละใบมีสีต่างกัน ช่วยให้จำง่าย'],
        visual: { type: 'money', items: ['b20', 'b50', 'b100', 'b500', 'b1000'] },
      },
      {
        npc: 'fox',
        title: 'ระวังสับสน!',
        lines: ['เหรียญ 50 สตางค์ ไม่เท่ากับ ธนบัตร 50 บาท', 'ดูทั้ง "ตัวเลข" และ "หน่วย" เสมอ'],
        visual: { type: 'money', items: ['s50', 'b50'] },
      },
    ],
  },
  {
    id: 2,
    name: 'ตลาดนับเงิน',
    topic: 'การบอกจำนวนเงินเป็นบาทและสตางค์',
    icon: '🛒',
    game: 'MONEY COUNT',
    theme: 'theme-market',
    npc: 'rabbit',
    skills: ['count'],
    building: '🏪',
    learn: [
      {
        npc: 'rabbit',
        title: 'นับเงินจากค่ามากไปน้อย',
        lines: ['1. เรียงเงินจากค่ามากไปค่าน้อย', '2. นับต่อไปเรื่อย ๆ', '3. นับบาทก่อน แล้วค่อยนับสตางค์'],
        visual: { type: 'money', items: ['b1000', 'b100', 'b20', 'b5', 's50'] },
      },
      {
        npc: 'rabbit',
        title: 'ลองนับด้วยกัน',
        lines: ['1,000 → 1,100 → 1,120 → 1,125 บาท', 'แล้วมีอีก 50 สตางค์', 'รวมเป็น 1,125 บาท 50 สตางค์'],
        visual: { type: 'big', text: '1,125 บาท 50 สตางค์' },
      },
      {
        npc: 'fox',
        title: 'สตางค์ครบ 100 ให้เป็น 1 บาท',
        lines: ['เหรียญ 50 สตางค์ 2 เหรียญ = 100 สตางค์', '100 สตางค์ = 1 บาท'],
        visual: { type: 'exchange', left: ['s50', 's50'], right: ['b1'] },
      },
    ],
  },
  {
    id: 3,
    name: 'ร้านเขียนราคา',
    topic: 'การเขียนจำนวนเงินแบบใช้จุด',
    icon: '🏷️',
    game: 'เครื่องเขียนราคา',
    theme: 'theme-price',
    npc: 'rabbit',
    skills: ['dot'],
    building: '🏷️',
    learn: [
      {
        npc: 'rabbit',
        title: 'จุดแบ่งบาทกับสตางค์',
        lines: ['หน้าจุด = บาท', 'หลังจุด = สตางค์', '25 บาท 50 สตางค์ = 25.50 บาท'],
        visual: { type: 'split', value: 2550 },
      },
      {
        npc: 'fox',
        title: 'หลังจุดต้องมี 2 หลักเสมอ',
        lines: ['8 บาท 25 สตางค์ = 8.25 บาท', '100 บาท = 100.00 บาท (ไม่มีสตางค์ เขียน 00)', 'ห้ามเขียน 25.5 ต้องเขียน 25.50'],
        visual: { type: 'split', value: 10000 },
      },
      {
        npc: 'rabbit',
        title: 'จำไว้นะ',
        lines: ['100 สตางค์ = 1 บาท', 'สตางค์มีได้ตั้งแต่ 00 ถึง 99'],
        visual: { type: 'rules', items: ['25 บาท 50 สตางค์ = 25.50 บาท', '100 บาท = 100.00 บาท', '8 บาท 25 สตางค์ = 8.25 บาท'] },
      },
    ],
  },
  {
    id: 4,
    name: 'หอคอยเปรียบเทียบ',
    topic: 'การเปรียบเทียบจำนวนเงิน',
    icon: '🗼',
    game: 'MONEY BATTLE',
    theme: 'theme-tower',
    npc: 'fox',
    skills: ['compare'],
    building: '🗼',
    learn: [
      {
        npc: 'fox',
        title: 'เครื่องหมายเปรียบเทียบ',
        lines: ['> มากกว่า', '< น้อยกว่า', '= เท่ากับ', 'ปากจระเข้ อ้าหาจำนวนที่มากกว่า 🐊'],
        visual: { type: 'rules', items: ['50 บาท > 20 บาท', '20 บาท < 50 บาท', '1 บาท = 100 สตางค์'] },
      },
      {
        npc: 'fox',
        title: 'กติกา 2 ขั้น',
        lines: ['ขั้นที่ 1 เทียบ "บาท" ก่อน', 'ขั้นที่ 2 ถ้าบาทเท่ากัน จึงเทียบ "สตางค์"'],
        visual: { type: 'pair', a: 34550, b: 51025 },
      },
      {
        npc: 'fox',
        title: 'บาทเท่ากัน ดูสตางค์',
        lines: ['120 บาท 75 สตางค์ กับ 120 บาท 50 สตางค์', 'บาทเท่ากัน → 75 สตางค์ มากกว่า 50 สตางค์', 'ดังนั้น 120.75 > 120.50'],
        visual: { type: 'pair', a: 12075, b: 12050 },
      },
    ],
  },
  {
    id: 5,
    name: 'สถานีแลกเหรียญ',
    topic: 'การแลกเงิน (1)',
    icon: '🔄',
    game: 'EXCHANGE STATION',
    theme: 'theme-station',
    npc: 'rabbit',
    skills: ['exchange'],
    building: '🚉',
    learn: [
      {
        npc: 'rabbit',
        title: 'แลกเงินต้องได้ค่าเท่าเดิม',
        lines: ['เงินก่อนแลก = เงินหลังแลก', 'เหรียญ 5 บาท 1 เหรียญ = เหรียญ 1 บาท 5 เหรียญ'],
        visual: { type: 'exchange', left: ['b5'], right: ['b1', 'b1', 'b1', 'b1', 'b1'] },
      },
      {
        npc: 'rabbit',
        title: 'แลกสตางค์',
        lines: ['เหรียญ 50 สตางค์ = เหรียญ 25 สตางค์ 2 เหรียญ', 'เหรียญ 1 บาท = เหรียญ 25 สตางค์ 4 เหรียญ'],
        visual: { type: 'exchange', left: ['s50'], right: ['s25', 's25'] },
      },
      {
        npc: 'bear',
        title: 'แลกธนบัตร',
        lines: ['ธนบัตร 100 บาท = ธนบัตร 20 บาท 5 ใบ', 'นับเพิ่มทีละ 20: 20, 40, 60, 80, 100'],
        visual: { type: 'exchange', left: ['b100'], right: ['b20', 'b20', 'b20', 'b20', 'b20'] },
      },
    ],
  },
  {
    id: 6,
    name: 'ธนาคารแลกเงิน',
    topic: 'การแลกเงิน (2) แสดงเงินได้หลายแบบ',
    icon: '💱',
    game: 'MONEY MAKER',
    theme: 'theme-bank',
    npc: 'rabbit',
    skills: ['exchange'],
    building: '🏛️',
    learn: [
      {
        npc: 'rabbit',
        title: '20 บาท แสดงได้หลายแบบ',
        lines: ['ธนบัตร 20 บาท', '10 + 10', '5 + 5 + 5 + 5', '10 + 5 + 2 + 2 + 1'],
        visual: { type: 'money', items: ['b10', 'b5', 'b2', 'b2', 'b1'] },
      },
      {
        npc: 'fox',
        title: 'เคล็ดลับหาแบบใหม่',
        lines: ['เริ่มจากเงินชิ้นใหญ่', 'แล้ว "แตก" ชิ้นใหญ่ให้เป็นชิ้นเล็ก', 'ทุกแบบต้องรวมได้เท่าเดิม'],
        visual: { type: 'exchange', left: ['b10', 'b10'], right: ['b10', 'b5', 'b5'] },
      },
    ],
  },
  {
    id: 7,
    name: 'ซูเปอร์มาร์เก็ตบวก–ลบ',
    topic: 'การบวกและการลบจำนวนเงิน',
    icon: '🛍️',
    game: 'SUPERMARKET',
    theme: 'theme-super',
    npc: 'bear',
    skills: ['addsub'],
    building: '🏬',
    learn: [
      {
        npc: 'bear',
        title: 'บวกเงิน: แยกบาทกับสตางค์',
        lines: ['บาทบวกบาท สตางค์บวกสตางค์', '65 บาท 50 สตางค์ + 87 บาท', '= 152 บาท 50 สตางค์'],
        visual: { type: 'calc', rows: [{ value: 6550 }, { value: 8700, op: '+' }], result: 15250 },
      },
      {
        npc: 'bear',
        title: 'สตางค์เกิน 100 ต้องทด',
        lines: ['75 สตางค์ + 50 สตางค์ = 125 สตางค์', '125 สตางค์ = 1 บาท 25 สตางค์', 'ทด 1 บาท ไปที่บาท'],
        visual: { type: 'calc', rows: [{ value: 2575 }, { value: 1050, op: '+' }], result: 3625 },
      },
      {
        npc: 'bear',
        title: 'ลบเงิน: สตางค์ไม่พอให้ยืม',
        lines: ['100 บาท − 35 บาท 50 สตางค์', 'ยืม 1 บาท = 100 สตางค์', 'ได้ 64 บาท 50 สตางค์'],
        visual: { type: 'calc', rows: [{ value: 10000 }, { value: 3550, op: '-' }], result: 6450 },
      },
    ],
  },
  {
    id: 8,
    name: 'โรงงานเงินคูณ–หาร',
    topic: 'การคูณและการหารจำนวนเงิน',
    icon: '🏭',
    game: 'FACTORY MONEY',
    theme: 'theme-factory',
    npc: 'bear',
    skills: ['muldiv'],
    building: '🏭',
    learn: [
      {
        npc: 'bear',
        title: 'คูณเงิน: ของราคาเท่ากันหลายชิ้น',
        lines: ['87 บาท 25 สตางค์ × 3', 'บาท: 87 × 3 = 261', 'สตางค์: 25 × 3 = 75', 'ได้ 261 บาท 75 สตางค์'],
        visual: { type: 'calc', rows: [{ value: 8725 }, { value: 3, op: '×', plain: true }], result: 26175 },
      },
      {
        npc: 'bear',
        title: 'หารเงิน: แบ่งเท่า ๆ กัน',
        lines: ['455 บาท ÷ 2', '455 ÷ 2 = 227 เหลือเศษ 1 บาท', '1 บาท = 100 สตางค์ ÷ 2 = 50 สตางค์', 'ได้คนละ 227 บาท 50 สตางค์'],
        visual: { type: 'calc', rows: [{ value: 45500 }, { value: 2, op: '÷', plain: true }], result: 22750 },
      },
      {
        npc: 'fox',
        title: 'ตรวจคำตอบด้วยการคูณ',
        lines: ['227 บาท 50 สตางค์ × 2 = 455 บาท ✔', 'หารแล้วคูณกลับ ต้องได้เท่าเดิม'],
      },
    ],
  },
  {
    id: 9,
    name: 'ร้านค้าปริศนา',
    topic: 'โจทย์ปัญหาบวก–ลบ',
    icon: '🧩',
    game: 'ไขปริศนาโจทย์',
    theme: 'theme-puzzle',
    npc: 'fox',
    skills: ['word'],
    building: '🎪',
    learn: [
      {
        npc: 'fox',
        title: 'แก้โจทย์ 4 ขั้น',
        lines: ['1. อ่านและทำความเข้าใจ', '2. วางแผน', '3. คำนวณ', '4. ตรวจสอบ'],
        visual: { type: 'rules', items: ['โจทย์บอกอะไร?', 'โจทย์ถามอะไร?', 'ต้องใช้วิธีใด?'] },
      },
      {
        npc: 'fox',
        title: 'บาร์โมเดล ช่วยให้เห็นภาพ',
        lines: ['รวมกัน → บวก', 'เหลือ / น้อยกว่า / มากกว่าเท่าไร → ลบ'],
        visual: {
          type: 'bar',
          mode: 'join',
          parts: [
            { label: 'ต้นกล้า', value: 4550 },
            { label: 'พลอย', value: 3000 },
          ],
          total: { label: 'รวม', unknown: true },
        },
      },
      {
        npc: 'fox',
        title: 'ตรวจคำตอบให้สมเหตุสมผล',
        lines: ['ซื้อของแล้ว เงินต้อง "น้อยลง"', 'ได้เงินเพิ่ม เงินต้อง "มากขึ้น"', 'ตรวจด้วยการคิดย้อนกลับ'],
      },
    ],
  },
  {
    id: 10,
    name: 'ศูนย์ภารกิจการเงิน',
    topic: 'โจทย์ปัญหาคูณ–หาร',
    icon: '🎯',
    game: 'เลือกวิธีคิด',
    theme: 'theme-mission',
    npc: 'fox',
    skills: ['word'],
    building: '🛰️',
    learn: [
      {
        npc: 'fox',
        title: 'เลือกวิธีก่อนคำนวณ',
        lines: ['➕ รวมกัน ได้เพิ่ม', '➖ เหลือ น้อยกว่า', '✖️ ของราคาเท่ากันหลายชิ้น', '➗ แบ่งเท่า ๆ กัน คนละ ชิ้นละ'],
      },
      {
        npc: 'bear',
        title: 'คูณ: ราคาต่อชิ้น × จำนวนชิ้น',
        lines: ['ไข่ฟองละ 5 บาท ซื้อ 6 ฟอง', '5 × 6 = 30 บาท'],
        visual: {
          type: 'bar',
          mode: 'equal',
          parts: [1, 2, 3, 4, 5, 6].map(() => ({ label: '5 บาท', value: 500 })),
          total: { label: 'ทั้งหมด', unknown: true },
          count: 6,
        },
      },
      {
        npc: 'bear',
        title: 'หาร: แบ่งเท่า ๆ กัน',
        lines: ['ค่าอาหาร 150 บาท เพื่อน 3 คนหารกัน', '150 ÷ 3 = 50 บาท ต่อคน'],
        visual: {
          type: 'bar',
          mode: 'equal',
          parts: [1, 2, 3].map(() => ({ label: '?', unknown: true })),
          total: { label: '150 บาท', value: 15000 },
          count: 3,
        },
      },
    ],
  },
  {
    id: 11,
    name: 'สมุดบัญชีแห่งเมืองเงินทอง',
    topic: 'บันทึกรายรับรายจ่าย',
    icon: '📒',
    game: 'MY MONEY BOOK',
    theme: 'theme-library',
    npc: 'owl',
    skills: ['ledger'],
    building: '📚',
    learn: [
      {
        npc: 'owl',
        title: 'รายรับ กับ รายจ่าย',
        lines: ['รายรับ = เงินที่ได้มา', 'รายจ่าย = เงินที่ใช้ไป', 'คงเหลือ = เดิม + รายรับ − รายจ่าย'],
      },
      {
        npc: 'owl',
        title: 'ตัวอย่างสมุดบัญชี',
        lines: ['มีเงิน 200 บาท ได้รับ 50 ซื้อขนม 25', 'ได้จากคุณแม่ 100 ซื้อสมุด 35'],
        visual: {
          type: 'ledger',
          showBalance: true,
          sheet: {
            owner: 'MONEY HERO',
            start: 20000,
            rows: [
              { day: 1, month: 'ตุลาคม', year: 2569, item: 'ได้รับเงิน', type: 'in', amount: 5000 },
              { day: 1, month: 'ตุลาคม', year: 2569, item: 'ซื้อขนม', type: 'out', amount: 2500 },
              { day: 2, month: 'ตุลาคม', year: 2569, item: 'ได้รับเงินจากคุณแม่', type: 'in', amount: 10000 },
              { day: 2, month: 'ตุลาคม', year: 2569, item: 'ซื้อสมุด', type: 'out', amount: 3500 },
            ],
          },
        },
      },
      {
        npc: 'owl',
        title: 'ทำไมต้องจดบัญชี?',
        lines: ['รู้ว่าเงินไปไหน', 'รู้ว่าเหลือเท่าไร', 'วางแผนเก็บเงินได้'],
      },
    ],
  },
  {
    id: 12,
    name: 'ศึกสุดท้าย MONEY MASTER',
    topic: 'ใช้ทุกทักษะใน 1 วัน',
    icon: '👑',
    game: 'หนึ่งวันในเมืองเงินทอง',
    theme: 'theme-final',
    npc: 'hero',
    skills: ['notes', 'count', 'dot', 'compare', 'exchange', 'addsub', 'muldiv', 'word', 'ledger'],
    building: '🏰',
    learn: [
      {
        npc: 'hero',
        title: 'ภารกิจสุดท้าย!',
        lines: ['ใช้ชีวิต 1 วันเต็มในเมืองเงินทอง', 'เดินทาง 🏦 → 🛒 → 🍱 → 📚 → 🏪 → 🏠'],
      },
      {
        npc: 'fox',
        title: 'ทวนทักษะทั้งหมด',
        lines: ['อ่านเงิน · นับเงิน · เขียนแบบจุด', 'เปรียบเทียบ · แลกเงิน', 'บวก · ลบ · คูณ · หาร', 'แก้โจทย์ · จดบัญชี'],
        visual: { type: 'rules', items: ['100 สตางค์ = 1 บาท', 'เทียบบาทก่อน แล้วค่อยเทียบสตางค์', 'ก่อนแลก = หลังแลก', 'คงเหลือ = เดิม + รับ − จ่าย'] },
      },
    ],
  },
]

export const TOTAL_LESSONS = 12

export function levelById(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id)
}
