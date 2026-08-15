/**
 * ชิ้นส่วนอนิเมชันที่ใช้ร่วมกันทุกภาพ
 *
 * ใช้ SMIL (<animate>, <animateTransform>) ไม่ใช่ CSS
 * เพราะภาพเหล่านี้ถูกฝังด้วย dangerouslySetInnerHTML
 * ถ้าใช้ CSS จะต้องแนบ <style> เข้าไปทุกภาพและชื่อ keyframes จะชนกันทั้งหน้า
 * SMIL ผูกกับ element ของตัวเองอยู่แล้ว จึงไม่มีปัญหาชื่อชน
 *
 * ทุกฟังก์ชันครอบเนื้อหาด้วย <g> ของตัวเอง
 * จึงซ้อนกันได้ไม่จำกัด และ transform จะรวมกันเองตามลำดับที่ครอบ
 * เช่น bob(sway(x)) = ตัวส่ายไปมาพร้อมกับลอยขึ้นลง
 *
 * เรื่องจังหวะ: ตั้งใจให้ dur ของแต่ละชิ้นไม่ลงตัวหารกัน
 * (2.6 / 3.1 / 4.3 วินาที) เพื่อไม่ให้ทุกอย่างขยับพร้อมกันเป็นจังหวะเดียว
 * ซึ่งจะดูเหมือนเครื่องจักรมากกว่าสิ่งมีชีวิต
 */

/** หายใจ — ย่อขยายเบา ๆ รอบจุดยึด เป็นอนิเมชันที่ทำให้ "ดูมีชีวิต" ได้มากที่สุด */
export function breathe(
  inner: string,
  dur = 3.4,
  amount = 0.03,
  originX = 50,
  originY = 96,
  begin = 0,
): string {
  const up = (1 + amount).toFixed(3)
  const dn = (1 - amount * 0.4).toFixed(3)
  return `<g transform-origin="${originX} ${originY}">
    <animateTransform attributeName="transform" type="scale"
      values="1 1; ${dn} ${up}; 1 1" dur="${dur}s"
      begin="${begin}s" repeatCount="indefinite"
      calcMode="spline" keyTimes="0;0.5;1"
      keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    ${inner}
  </g>`
}

/** ลอยขึ้นลง ใช้กับของที่ควรดูไร้น้ำหนัก เช่น คริสตัลหรือตัวเลขเวทมนตร์ */
export function bob(inner: string, dur = 3.1, amount = 2, begin = 0): string {
  return `<g>
    <animateTransform attributeName="transform" type="translate"
      values="0 0; 0 ${-amount}; 0 0" dur="${dur}s"
      begin="${begin}s" repeatCount="indefinite"
      calcMode="spline" keyTimes="0;0.5;1"
      keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
    ${inner}
  </g>`
}

/** ส่ายซ้ายขวารอบจุดหมุน ใช้กับหัว หาง ปีก ผ้าคลุม */
export function sway(
  inner: string,
  dur = 4.3,
  deg = 3,
  ox = 50,
  oy = 60,
  begin = 0,
): string {
  return `<g>
    <animateTransform attributeName="transform" type="rotate"
      values="${-deg} ${ox} ${oy}; ${deg} ${ox} ${oy}; ${-deg} ${ox} ${oy}"
      dur="${dur}s" begin="${begin}s" repeatCount="indefinite"
      calcMode="spline" keyTimes="0;0.5;1"
      keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"/>
    ${inner}
  </g>`
}

/** หมุนรอบตัวเองต่อเนื่อง ใช้กับเหรียญ เฟือง เข็มทิศ */
export function spin(inner: string, dur = 6, ox = 50, oy = 50, begin = 0): string {
  return `<g>
    <animateTransform attributeName="transform" type="rotate"
      from="0 ${ox} ${oy}" to="360 ${ox} ${oy}"
      dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
    ${inner}
  </g>`
}

/** เต้นเป็นจังหวะหัวใจ — ขยายเร็วแล้วยุบช้า ต่างจากหายใจที่สมมาตร */
export function heartbeat(inner: string, dur = 1.6, ox = 50, oy = 50): string {
  return `<g>
    <animateTransform attributeName="transform" type="scale"
      values="1;1.14;1;1.07;1" keyTimes="0;0.12;0.28;0.4;1"
      dur="${dur}s" repeatCount="indefinite"
      transform-origin="${ox} ${oy}"/>
    ${inner}
  </g>`
}

/** สว่างวูบวาบ ใช้กับไฟ เวทมนตร์ ดาว */
export function flicker(
  inner: string,
  dur = 2.2,
  low = 0.45,
  high = 1,
  begin = 0,
): string {
  return `<g opacity="${high}">
    <animate attributeName="opacity"
      values="${high};${low};${high};${(low + high) / 2};${high}"
      keyTimes="0;0.25;0.5;0.72;1"
      dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
    ${inner}
  </g>`
}

/** ไหลไปทางเดียวแล้ววาร์ปกลับ ใช้กับเมฆ สายน้ำ ดาวตก */
export function drift(
  inner: string,
  dur = 18,
  distance = 30,
  begin = 0,
  dy = 0,
): string {
  return `<g>
    <animateTransform attributeName="transform" type="translate"
      from="0 0" to="${distance} ${dy}"
      dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
    ${inner}
  </g>`
}

/** เด้งขึ้นลงแบบมีน้ำหนัก — ลงเร็ว ขึ้นช้า เหมือนของที่ตกแล้วกระเด้ง */
export function hop(inner: string, dur = 2.4, height = 4, begin = 0): string {
  return `<g>
    <animateTransform attributeName="transform" type="translate"
      values="0 0; 0 ${-height}; 0 0; 0 0"
      dur="${dur}s" begin="${begin}s" repeatCount="indefinite"
      calcMode="spline" keyTimes="0;0.35;0.6;1"
      keySplines="0.25 0.6 0.4 1; 0.5 0 0.9 0.5; 0 0 1 1"/>
    ${inner}
  </g>`
}

/**
 * แสงวิ่งผ่านผิว ใช้ทำประกายบนโลหะหรือแก้ว
 * ต้องใส่ clipPath เองถ้าไม่อยากให้แสงล้นออกนอกวัตถุ
 */
export function shine(
  x: number,
  y: number,
  w: number,
  h: number,
  travel: number,
  dur = 3.8,
  begin = 0,
): string {
  return `<g opacity=".55">
    <animateTransform attributeName="transform" type="translate"
      values="0 0; ${travel} 0; ${travel} 0"
      keyTimes="0;0.35;1"
      dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"
      transform="skewX(-20)"/>
  </g>`
}

/**
 * อนุภาคลอยขึ้นแล้วจางหาย ใช้กับประกายเวทมนตร์ ฟองอากาศ หิ่งห้อย
 * คืนค่าเป็นวงกลมหนึ่งวงพร้อมอนิเมชันของตัวเอง
 */
export function mote(
  cx: number,
  cy: number,
  r: number,
  color: string,
  dur = 4,
  rise = 18,
  begin = 0,
): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="0">
    <animate attributeName="cy" values="${cy};${cy - rise}"
      dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;.85;0"
      keyTimes="0;0.3;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
    <animate attributeName="r" values="${r};${r * 0.3}"
      dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
  </circle>`
}

/** ชุดอนุภาคหลายเม็ด กระจายจังหวะให้ไม่ลอยพร้อมกัน */
export function motes(
  seeds: ReadonlyArray<readonly [number, number, number]>,
  color: string,
  dur = 4,
  rise = 18,
): string {
  return seeds
    .map(([cx, cy, r], i) => mote(cx, cy, r, color, dur + i * 0.37, rise, i * 0.8))
    .join('')
}
