/* eslint-disable no-unused-vars */
// 新規3,213件すべてに、既存イラストを流用しない新しいフラットシーンのSVGを生成する。
//
// - 600x400。既存と同じ配色・線幅。文字は入れない。
// - 意味のキーワードから約45のシーンを選び、乱数(idのハッシュ)で色・位置・小物を変える。
// - `--sample` を付けると代表的な語だけを /tmp/tecanki-scenes にPNGで書き出して目視確認できる。
import fs from 'node:fs'
import nodePath from 'node:path'
import { newVocabularyData } from '../src/content/vocabulary/new/data.ts'

const OUT_DIR = 'public/images/vocabulary/new'
const OUT_TS = 'src/content/vocabulary/new/illustrations.ts'
const SAMPLE = process.argv.includes('--sample')

const P = {
  line: '#2f4055',
  bg: '#fffaf1',
  ground: '#edf3ed',
  teal: '#238b83',
  tealS: '#dff4ef',
  blue: '#4e86c6',
  blueS: '#e1edfb',
  gold: '#d99a2b',
  goldS: '#fff0c5',
  green: '#4e986a',
  greenS: '#e1f3e5',
  coral: '#e86452',
  coralS: '#fde9e3',
  violet: '#816eb2',
  violetS: '#eee8fb',
  skin: '#f3c7a5',
  skin2: '#e8b08a',
  hair: '#3a2f2a',
  white: '#ffffff',
  wood: '#b08a62',
}

const round = (n) => Math.round(n * 10) / 10
const line = (x1, y1, x2, y2, color = P.line, w = 3) =>
  `<path d="M${round(x1)} ${round(y1)}L${round(x2)} ${round(y2)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`
const poly = (pts, fill, stroke = P.line, w = 3) =>
  `<polygon points="${pts.map((p) => p.map(round).join(',')).join(' ')}" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="${w}"` : ''} stroke-linejoin="round"/>`
const rect = (x, y, w, h, rx, fill, stroke = P.line, sw = 3) =>
  `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="${round(rx)}" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="${sw}"` : ''}/>`
const circ = (cx, cy, r, fill, stroke = P.line, sw = 3) =>
  `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="${sw}"` : ''}/>`
const path = (d, fill = 'none', stroke = P.line, sw = 3) =>
  `<path d="${d}" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="${sw}"` : ''} stroke-linecap="round" stroke-linejoin="round"/>`
const g = (t, content) => `<g transform="${t}">${content}</g>`

function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rngFor(text) {
  let s = hash(text) || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 10000) / 10000
  }
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length]
const near = (rng, v, spread) => v + (rng() - 0.5) * spread

// ---------- primitives ----------

const ground = () =>
  `<ellipse cx="300" cy="330" rx="245" ry="16" fill="${P.ground}"/>${line(70, 330, 530, 330, '#dfe8e2', 3)}`

const sun = (x = 80, y = 70, r = 24) => {
  let rays = ''
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4
    rays += line(x + Math.cos(a) * (r + 8), y + Math.sin(a) * (r + 8), x + Math.cos(a) * (r + 17), y + Math.sin(a) * (r + 17), P.gold, 3)
  }
  return circ(x, y, r, P.goldS, P.gold) + rays
}

const cloud = (x, y, s = 1, fill = P.white) =>
  g(`translate(${x} ${y}) scale(${s})`, `${circ(-24, 0, 17, fill, P.line, 2.5)}${circ(0, -9, 23, fill, P.line, 2.5)}${circ(24, 0, 17, fill, P.line, 2.5)}${rect(-38, -3, 76, 20, 10, fill, 'none', 0)}`)

const snow = (x, y, s = 1) =>
  g(`translate(${x} ${y}) scale(${s})`, `${line(-8, 0, 8, 0, P.blue, 2.5)}${line(0, -8, 0, 8, P.blue, 2.5)}${line(-6, -6, 6, 6, P.blue, 2.5)}${line(-6, 6, 6, -6, P.blue, 2.5)}`)

const rain = (x, y) => `${cloud(x, y, 1, '#eef2f4')}${line(x - 24, y + 22, x - 30, y + 44, P.blue, 3)}${line(x, y + 22, x - 6, y + 44, P.blue, 3)}${line(x + 24, y + 22, x + 18, y + 44, P.blue, 3)}`

const star = (x, y, r = 10, fill = P.gold) =>
  path(`M${x} ${y - r}l${r * 0.3} ${r * 0.65} ${r * 0.72} ${r * 0.1} -${r * 0.52} ${r * 0.5} ${r * 0.13} ${r * 0.72} -${r * 0.63} -${r * 0.34} -${r * 0.63} ${r * 0.34} ${r * 0.13} -${r * 0.72} -${r * 0.52} -${r * 0.5} ${r * 0.72} -${r * 0.1}z`, fill, fill, 0)

const heart = (x, y, s = 1, fill = P.coralS, stroke = P.coral) =>
  g(`translate(${x} ${y}) scale(${s})`, `<path d="M0 22C-26 6-30-14-16-20c7-3 13 0 16 6 3-6 9-9 16-6 14 6 10 26-16 42z" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>`)

const check = (x, y, color = P.green) => path(`M${x - 10} ${y}l7 8 15-18`, 'none', color, 4)

const cross = (x, y, color = P.coral) => `${line(x - 9, y - 9, x + 9, y + 9, color, 4)}${line(x + 9, y - 9, x - 9, y + 9, color, 4)}`

const arrow = (x1, y1, x2, y2, color = P.teal) => {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const len = 12
  return `${line(x1, y1, x2, y2, color, 4)}${line(x2, y2, x2 - Math.cos(a - 0.5) * len, y2 - Math.sin(a - 0.5) * len, color, 4)}${line(x2, y2, x2 - Math.cos(a + 0.5) * len, y2 - Math.sin(a + 0.5) * len, color, 4)}`
}

const bubble = (x, y, fill = P.white, w = 92, h = 56) =>
  `${rect(x, y, w, h, 16, fill)}${poly([[x + 18, y + h], [x + 34, y + h], [x + 20, y + h + 18]], fill)}${circ(x + 28, y + h / 2, 3.2, P.line, P.line, 0)}${circ(x + 46, y + h / 2, 3.2, P.line, P.line, 0)}${circ(x + 64, y + h / 2, 3.2, P.line, P.line, 0)}`

const clock = (x, y, r = 26) =>
  `${circ(x, y, r, P.white)}${circ(x, y, r - 4, P.white, 'none', 0)}${line(x, y, x, y - r + 9, P.line, 3)}${line(x, y, x + r - 13, y, P.line, 3)}${circ(x, y, 3, P.line, P.line, 0)}`

const calendar = (x, y, s = 1, accent = P.coral) =>
  g(`translate(${x} ${y}) scale(${s})`, `${rect(-34, -40, 68, 80, 10, P.white)}${rect(-34, -40, 68, 22, 10, accent)}${rect(-34, -30, 68, 12, 0, accent, 'none', 0)}${line(-20, -8, 20, -8, P.line, 2.5)}${line(-20, 6, 20, 6, P.line, 2.5)}${line(-20, 20, 20, 20, P.line, 2.5)}${line(-8, -18, -8, 30, P.line, 2.5)}${line(8, -18, 8, 30, P.line, 2.5)}`)

const book = (x, y, color = P.blue) =>
  g(`translate(${x} ${y})`, `${poly([[-30, -24], [0, -16], [0, 26], [-30, 18]], P.white)}${poly([[0, -16], [30, -24], [30, 18], [0, 26]], P.white)}${line(0, -16, 0, 26, P.line, 3)}${line(-24, -12, -6, -8, color, 3)}${line(6, -8, 24, -12, color, 3)}`)

const cup = (x, y, color = P.coral) =>
  g(`translate(${x} ${y})`, `${path('M-20 -28L-14 24Q0 32 14 24L20 -28Z', color)}${path('M20 -16q17 0 17 13t-17 13', 'none', P.line, 3)}${line(-22, -28, 22, -28, P.line, 3)}${path('M-8 -40q-8 -8 0 -16M8 -40q8 -8 0 -16', 'none', P.teal, 3)}`)

const bottle = (x, y, color = P.tealS, cap = P.teal) =>
  g(`translate(${x} ${y})`, `${rect(-13, -34, 26, 66, 8, color)}${rect(-7, -48, 14, 16, 4, cap)}${line(-13, -14, 13, -14, P.line, 2.5)}`)

const plate = (x, y) =>
  `<ellipse cx="${x}" cy="${y}" rx="62" ry="22" fill="${P.white}" stroke="${P.line}" stroke-width="3"/><ellipse cx="${x}" cy="${y - 4}" rx="42" ry="14" fill="${P.tealS}"/>${circ(x - 8, y - 7, 9, P.coralS)}${circ(x + 12, y - 4, 8, P.goldS)}`

const box = (x, y, w = 64, h = 54, color = P.goldS) =>
  g(`translate(${x} ${y})`, `${rect(-w / 2, -h, w, h, 8, color)}${line(-w / 2, -h + 16, w / 2, -h + 16, P.line, 3)}${line(0, -h + 16, 0, 0, P.line, 3)}`)

const bag = (x, y, color = P.coralS) =>
  g(`translate(${x} ${y})`, `${path('M-28 0L-22 -48H22L28 0Z', color)}${path('M-10 -48q0 -22 10 -22t10 22', 'none', P.line, 3)}`)

const money = (x, y) =>
  g(`translate(${x} ${y})`, `${rect(-42, -52, 84, 34, 5, P.greenS, P.green)}${circ(0, -35, 10, P.goldS, P.gold)}${circ(-18, -6, 13, P.goldS, P.gold)}${circ(12, -2, 13, P.goldS, P.gold)}`)

const phone = (x, y, s = 1) =>
  g(`translate(${x} ${y}) scale(${s})`, `${rect(-18, -58, 36, 96, 8, P.white)}${rect(-12, -50, 24, 74, 4, P.blueS, 'none', 0)}${circ(0, -6, 13, P.tealS, 'none', 0)}${circ(0, 28, 4, P.line, P.line, 0)}`)

const laptop = (x, y) =>
  g(`translate(${x} ${y})`, `${rect(-48, -58, 96, 62, 6, P.white)}${rect(-40, -50, 80, 46, 3, P.blueS, 'none', 0)}${poly([[-60, 4], [60, 4], [70, 20], [-70, 20]], P.line)}`)

const car = (x, y, color = P.blueS) =>
  g(`translate(${x} ${y})`, `${path('M-66 0h132a10 10 0 0 0 10-10v-18q0-10-10-10h-18l-20-22h-56l-20 22h-8q-10 0-10 10v18a10 10 0 0 0 10 10z', color)}${circ(-38, 2, 13, P.white)}${circ(38, 2, 13, P.white)}${rect(-28, -44, 56, 18, 4, P.blueS, 'none', 0)}`)

const train = (x, y, color = P.blueS) =>
  g(`translate(${x} ${y})`, `${rect(-70, -70, 140, 70, 12, color)}${rect(-56, -56, 32, 24, 4, P.white)}${rect(-16, -56, 32, 24, 4, P.white)}${rect(24, -56, 32, 24, 4, P.white)}${circ(-40, 4, 12, P.white)}${circ(40, 4, 12, P.white)}${line(-80, 10, 80, 10, P.line, 3)}`)

const plane = (x, y, color = P.blueS) =>
  g(`translate(${x} ${y}) rotate(-10)`, `${path('M-74 0l46-12 28-36 12 4-12 36 38 8 14 16-16 6-34-12-26 18-10-4 10-22-40 8z', color)}${circ(20, -6, 5, P.white, 'none', 0)}`)

const house = (x, y) =>
  g(`translate(${x} ${y})`, `${rect(-58, -86, 116, 86, 4, P.white)}${poly([[-76, -86], [0, -154], [76, -86]], P.coralS)}${rect(-14, -50, 28, 50, 3, P.goldS)}${rect(-44, -72, 22, 22, 3, P.blueS)}${rect(22, -72, 22, 22, 3, P.blueS)}`)

const building = (x, y, h = 110, color = P.white) =>
  g(`translate(${x} ${y})`, `${rect(-52, -h, 104, h, 4, color)}${Array.from({ length: 3 }, (_, r) => Array.from({ length: 3 }, (_, c) => rect(-34 + c * 24, -h + 18 + r * 26, 16, 16, 2, P.blueS, 'none', 0)).join('')).join('')}${rect(-10, -22, 20, 22, 2, P.goldS)}`)

const tree = (x, y, color = P.green) =>
  g(`translate(${x} ${y})`, `${rect(-8, -44, 16, 44, 4, P.wood)}${circ(0, -62, 32, color)}${circ(-22, -44, 22, color)}${circ(22, -44, 22, color)}`)

const plant = (x, y) =>
  g(`translate(${x} ${y})`, `${poly([[-24, 0], [-18, -34], [18, -34], [24, 0]], P.goldS)}${path('M0 -34Q0 -70-20 -84', 'none', P.green, 4)}${path('M0 -34Q0 -74 20 -88', 'none', P.green, 4)}${path('M-20 -84q-16 8-8 22q14 0 16-16', P.greenS, P.green, 2.5)}${path('M20 -88q16 8 8 22q-14 0-16-16', P.greenS, P.green, 2.5)}`)

const flower = (x, y, color = P.coral) =>
  g(`translate(${x} ${y})`, `${line(0, 0, 0, -44, P.green, 3)}${line(0, -22, -14, -32, P.green, 3)}${line(0, -30, 14, -40, P.green, 3)}${circ(0, -50, 8, P.goldS, P.gold)}${[0, 1, 2, 3, 4].map((i) => { const a = (i * Math.PI * 2) / 5; return circ(Math.cos(a) * 13, -50 + Math.sin(a) * 13, 8, color) }).join('')}`)

const mountain = (x, y) =>
  `${poly([[x - 120, y], [x - 40, y - 110], [x + 20, y]], P.greenS)}${poly([[x - 20, y], [x + 70, y - 140], [x + 150, y]], P.tealS)}${poly([[x + 48, y - 112], [x + 70, y - 140], [x + 92, y - 112]], P.white)}`

const river = (x, y) =>
  `${path(`M${x - 150} ${y - 20}q40 -20 80 0t80 0t80 0t80 0`, 'none', P.blue, 6)}${path(`M${x - 120} ${y + 10}q40 -16 80 0t80 0t80 0`, 'none', P.blueS, 4)}`

const key = (x, y, color = P.gold) =>
  g(`translate(${x} ${y})`, `${circ(-18, 0, 12, 'none', color, 5)}${line(-6, 0, 26, 0, color, 5)}${line(14, 0, 14, 10, color, 5)}${line(24, 0, 24, 8, color, 5)}`)

const door = (x, y) =>
  g(`translate(${x} ${y})`, `${rect(-28, -74, 56, 74, 4, P.goldS)}${circ(16, -36, 4, P.line, P.line, 0)}${rect(-22, -66, 44, 22, 2, P.white, 'none', 0)}`)

const bed = (x, y) =>
  g(`translate(${x} ${y})`, `${rect(-90, -40, 180, 40, 6, P.white)}${rect(-90, -66, 180, 28, 10, P.blueS)}${rect(-80, -62, 52, 20, 8, P.white)}${rect(-20, -60, 96, 24, 10, P.tealS)}${line(-90, 0, -90, 16, P.line, 5)}${line(90, 0, 90, 16, P.line, 5)}`)

const chair = (x, y, color = P.wood) =>
  g(`translate(${x} ${y})`, `${rect(-24, -28, 48, 12, 4, color)}${rect(-24, -74, 10, 48, 4, color)}${line(-18, -16, -18, 6, P.line, 4)}${line(18, -16, 18, 6, P.line, 4)}`)

const table = (x, y) =>
  g(`translate(${x} ${y})`, `${rect(-80, -16, 160, 14, 4, P.wood)}${line(-64, -2, -64, 26, P.line, 4)}${line(64, -2, 64, 26, P.line, 4)}`)

const shirt = (x, y, color = P.tealS) =>
  g(`translate(${x} ${y})`, `<path d="M-34 -34l20-14 14 10 14-10 20 14-10 18-10-6v42h-48v-42l-10 6z" fill="${color}" stroke="${P.line}" stroke-width="3" stroke-linejoin="round"/>`)

const hat = (x, y, color = P.goldS) =>
  g(`translate(${x} ${y})`, `${path('M-36 0q36 12 72 0z', P.white)}${rect(-24, -34, 48, 34, 10, color)}${line(-36, 0, 36, 0, P.line, 3)}`)

const shoe = (x, y, color = P.blueS) =>
  g(`translate(${x} ${y})`, `${path('M-34 0v-18q0-8 10-8h10l8 8h20q10 0 10 10v8z', color)}${line(-34, 0, 24, 0, P.line, 3)}`)

const pan = (x, y) =>
  g(`translate(${x} ${y})`, `<ellipse cx="0" cy="0" rx="52" ry="18" fill="${P.blueS}" stroke="${P.line}" stroke-width="3"/>${line(50, 0, 86, -14, P.line, 6)}${path('M-18 -14q-8 -10 0 -20M0 -14q-8 -10 0 -20M18 -14q-8 -10 0 -20', 'none', P.teal, 3)}`)

const pot = (x, y) =>
  g(`translate(${x} ${y})`, `${rect(-42, -46, 84, 46, 8, P.tealS)}${rect(-48, -54, 96, 10, 5, P.teal)}${line(-42, -28, 42, -28, P.line, 2.5)}${path('M-16 -64q-8 -10 0 -20M16 -64q8 -10 0 -20', 'none', P.teal, 3)}`)

const envelope = (x, y, color = P.white) =>
  g(`translate(${x} ${y})`, `${rect(-38, -26, 76, 52, 6, color)}${path('M-38 -26L0 2 38 -26', 'none', P.line, 3)}`)

const magnifier = (x, y) =>
  g(`translate(${x} ${y})`, `${circ(-8, -8, 24, P.blueS)}${line(10, 10, 34, 34, P.line, 7)}`)

const wrench = (x, y) =>
  g(`translate(${x} ${y}) rotate(-30)`, `${path('M-6 -40a14 14 0 1 0 12 0v58h-12z', P.blueS)}`)

const hammer = (x, y) =>
  g(`translate(${x} ${y}) rotate(-20)`, `${rect(-8, -10, 16, 54, 4, P.wood)}${rect(-30, -34, 60, 26, 6, P.blueS)}`)

const ruler = (x, y) =>
  g(`translate(${x} ${y}) rotate(-8)`, `${rect(-70, -12, 140, 24, 4, P.goldS)}${Array.from({ length: 7 }, (_, i) => line(-58 + i * 20, -12, -58 + i * 20, i % 2 ? -2 : 2, P.line, 2.5)).join('')}`)

const scale = (x, y) =>
  g(`translate(${x} ${y})`, `${line(0, -60, 0, 0, P.line, 5)}${line(-60, -56, 60, -56, P.line, 4)}${circ(0, 0, 22, P.goldS, P.gold)}${line(-60, -56, -60, -34, P.line, 3)}${line(60, -56, 60, -34, P.line, 3)}${path('M-82 -34h44l-22 22z', P.white)}${path('M38 -34h44l-22 22z', P.white)}`)

const dumbbell = (x, y) =>
  g(`translate(${x} ${y})`, `${line(-40, 0, 40, 0, P.line, 6)}${rect(-56, -22, 16, 44, 4, P.blueS)}${rect(40, -22, 16, 44, 4, P.blueS)}${rect(-68, -14, 12, 28, 3, P.tealS)}${rect(56, -14, 12, 28, 3, P.tealS)}`)

const note = (x, y, color = P.violet) =>
  g(`translate(${x} ${y})`, `${circ(-14, 10, 9, color)}${line(-6, 8, -6, -34, color, 4)}${path('M-6 -34q16 4 18 18', 'none', color, 4)}`)

const brush = (x, y) =>
  g(`translate(${x} ${y}) rotate(-25)`, `${rect(-6, -50, 12, 50, 4, P.wood)}${rect(-12, 0, 24, 16, 4, P.goldS)}${path('M-10 16h20l-6 20h-8z', P.coral)}`)

const wifi = (x, y) =>
  g(`translate(${x} ${y})`, `${path('M-34 -10q34 -34 68 0', 'none', P.blue, 4)}${path('M-22 2q22 -22 44 0', 'none', P.blue, 4)}${path('M-10 14q10 -10 20 0', 'none', P.blue, 4)}${circ(0, 24, 4, P.blue, P.blue, 0)}`)

const bulb = (x, y) =>
  g(`translate(${x} ${y})`, `${circ(0, -10, 24, P.goldS, P.gold)}${rect(-9, 14, 18, 14, 3, P.white)}${line(-6, 20, 6, 20, P.line, 2)}${line(-6, 26, 6, 26, P.line, 2)}${line(-34, -10, -44, -10, P.gold, 3)}${line(34, -10, 44, -10, P.gold, 3)}${line(-24, -34, -31, -41, P.gold, 3)}${line(24, -34, 31, -41, P.gold, 3)}`)

const umbrella = (x, y, color = P.coral) =>
  g(`translate(${x} ${y})`, `${path('M-52 -10a52 52 0 0 1 104 0z', color)}${line(0, -10, 0, 40, P.line, 4)}${path('M0 40q-14 0-14-12', 'none', P.line, 4)}`)

const drop = (x, y, color = P.blueS) =>
  g(`translate(${x} ${y})`, `<path d="M0 -18C-14 0-12 14 0 14S14 0 0-18z" fill="${color}" stroke="${P.blue}" stroke-width="3"/>`)

const fire = (x, y, s = 1) =>
  g(`translate(${x} ${y}) scale(${s})`, `<path d="M0 -30C-14-12-18 0-14 10c3 9 12 12 18 6 8 6 15 2 16-6 2-12-8-24-20-40z" fill="${P.goldS}" stroke="${P.coral}" stroke-width="3"/><path d="M0 -10c-6 6-7 12-4 16 3 5 8 3 9-1 2-5-1-9-5-15z" fill="${P.coral}"/>`)

const smoke = (x, y) => `${path(`M${x} ${y}q-10 -12 0 -24t0 -24`, 'none', '#b8c4c8', 4)}${path(`M${x + 14} ${y + 4}q-10 -12 0 -24t0 -24`, 'none', '#cfd8db', 4)}`

const dog = (x, y) =>
  g(`translate(${x} ${y})`, `${path('M-30 0v-26q0-20 20-20h26q14 0 14 14v32', P.goldS)}${circ(34, -38, 16, P.goldS)}${poly([[-8, -48], [-2, -62], [4, -48]], P.wood)}${circ(30, -42, 2.4, P.line, P.line, 0)}${path('M44 -34q10 2 8 12', 'none', P.line, 3)}`)

const cat = (x, y) =>
  g(`translate(${x} ${y})`, `${path('M-28 0v-24q0-18 18-18h20q12 0 12 12v30', P.violetS)}${circ(30, -36, 14, P.violetS)}${poly([[18, -44], [22, -58], [30, -46]], P.violetS)}${poly([[34, -46], [42, -58], [44, -42]], P.violetS)}${path('M44 -30q14 -6 6 -18', 'none', P.line, 3)}`)

const fish = (x, y) =>
  g(`translate(${x} ${y})`, `<path d="M-34 0q24 -24 52 0q-28 24-52 0z" fill="${P.blueS}" stroke="${P.line}" stroke-width="3"/>${poly([[18, 0], [40, -14], [40, 14]], P.blueS)}${circ(-20, -4, 2.4, P.line, P.line, 0)}`)

const bird = (x, y) =>
  g(`translate(${x} ${y})`, `${circ(0, 0, 16, P.tealS)}${path('M14 0l18 8-18 6z', P.goldS, P.gold, 2.5)}${circ(6, -4, 2.2, P.line, P.line, 0)}${path('M-4 12v10M-14 6v14', 'none', P.line, 2.5)}`)

const bug = (x, y) =>
  g(`translate(${x} ${y})`, `${circ(0, 0, 16, P.coralS, P.coral)}${line(0, -16, 0, 16, P.line, 2.5)}${line(-20, -4, -30, -10, P.line, 3)}${line(-20, 6, -30, 10, P.line, 3)}${line(20, -4, 30, -10, P.line, 3)}${line(20, 6, 30, 10, P.line, 3)}${circ(-6, -4, 3, P.line, P.line, 0)}${circ(6, 4, 3, P.line, P.line, 0)}`)

const suitcase = (x, y) =>
  g(`translate(${x} ${y})`, `${rect(-40, -56, 80, 60, 8, P.coralS)}${line(-40, -26, 40, -26, P.line, 3)}${path('M-14 -56q0 -18 14 -18t14 18', 'none', P.line, 4)}${circ(-24, 6, 5, P.line)}${circ(24, 6, 5, P.line)}`)

const map = (x, y) =>
  g(`translate(${x} ${y})`, `${poly([[-46, -30], [-14, -22], [16, -32], [46, -24], [46, 24], [16, 16], [-14, 26], [-46, 18]], P.goldS)}${path('M-14 -22v48M16 -32v48', 'none', P.line, 2.5)}${circ(18, -6, 7, P.coralS, P.coral)}`)

const ticket = (x, y) =>
  g(`translate(${x} ${y})`, `${path('M-40 -22h80v44h-80z', P.tealS)}${circ(-40, 0, 8, P.bg)}${circ(40, 0, 8, P.bg)}${line(-14, -12, -14, 12, P.line, 2.5)}`)

const medkit = (x, y) =>
  g(`translate(${x} ${y})`, `${rect(-40, -46, 80, 46, 8, P.white)}${line(-12, -34, 12, -34, P.coral, 6)}${line(0, -46, 0, -22, P.coral, 6)}${path('M-16 -46v-10h32v10', 'none', P.line, 4)}`)

const thermometer = (x, y) =>
  g(`translate(${x} ${y}) rotate(18)`, `${rect(-6, -48, 12, 54, 6, P.white)}${circ(0, 14, 12, P.coral)}${line(0, -40, 0, 4, P.coral, 3)}`)

const pill = (x, y) =>
  g(`translate(${x} ${y}) rotate(-30)`, `${rect(-22, -10, 44, 20, 10, P.blueS)}${rect(-22, -10, 22, 20, 10, P.white)}`)

const sparkles = (x, y, color = P.gold) =>
  `${star(x, y, 8, color)}${star(x + 22, y - 12, 5, color)}${star(x - 18, y - 8, 5, color)}`

const confetti = (rng) => {
  const colors = [P.teal, P.gold, P.coral, P.blue, P.violet]
  let out = ''
  for (let i = 0; i < 18; i += 1) out += rect(near(rng, 300, 340), near(rng, 110, 140), 8, 8, 2, pick(rng, colors), 'none', 0)
  return out
}

const motion = (x, y) => `${line(x, y, x + 26, y, P.line, 3)}${line(x + 8, y - 10, x + 28, y - 10, P.line, 3)}${line(x + 4, y + 10, x + 24, y + 10, P.line, 3)}`

const pause = (x, y) => `${rect(x - 14, y - 18, 10, 36, 3, P.tealS)}${rect(x + 4, y - 18, 10, 36, 3, P.tealS)}`

const target = (x, y) =>
  g(`translate(${x} ${y})`, `${circ(0, 0, 44, P.white)}${circ(0, 0, 30, P.coralS)}${circ(0, 0, 16, P.coral)}${circ(0, 0, 5, P.white, 'none', 0)}`)

const trophy = (x, y) =>
  g(`translate(${x} ${y})`, `${path('M-26 -46h52v18q0 24-26 24t-26-24z', P.goldS, P.gold)}${path('M-26 -38h-12q0 18 14 18', 'none', P.gold, 5)}${path('M26 -38h12q0 18-14 18', 'none', P.gold, 5)}${rect(-6, -4, 12, 16, 3, P.gold)}${rect(-20, 12, 40, 10, 4, P.goldS, P.gold)}`)

const flag = (x, y, color = P.teal) => `${line(x, y, x, y - 90, P.line, 4)}${poly([[x, y - 90], [x + 46, y - 76], [x, y - 60]], color)}`

const ball = (x, y, color = P.white) =>
  `${circ(x, y, 24, color)}${path(`M${x - 24} ${y}h48M${x} ${y - 24}v48`, 'none', P.line, 2.5)}`

const racket = (x, y) =>
  g(`translate(${x} ${y}) rotate(-30)`, `<ellipse cx="0" cy="-16" rx="24" ry="30" fill="${P.white}" stroke="${P.line}" stroke-width="3"/>${line(0, 14, 0, 48, P.line, 6)}`)

const goal = (x, y) =>
  g(`translate(${x} ${y})`, `${rect(-60, -50, 120, 50, 4, 'none')}${Array.from({ length: 5 }, (_, i) => line(-48 + i * 24, -50, -48 + i * 24, 0, '#aebfc6', 1.5)).join('')}${Array.from({ length: 3 }, (_, i) => line(-60, -38 + i * 14, 60, -38 + i * 14, '#aebc c6'.replace(' ', ''), 1.5)).join('')}`)

const eye = (x, y) =>
  g(`translate(${x} ${y})`, `<path d="M-40 0q40 -38 80 0q-40 38-80 0z" fill="${P.white}" stroke="${P.line}" stroke-width="3"/>${circ(0, 0, 14, P.blueS)}${circ(0, 0, 7, P.line, P.line, 0)}`)

const handshake = (x, y) =>
  g(`translate(${x} ${y})`, `${path('M-40 -8l24 -16 20 10 20 -10 24 16', 'none', P.line, 6)}${rect(-12, -10, 24, 18, 6, P.goldS)}`)

// ---------- person ----------

function person(x, y, opts = {}) {
  const {
    shirt = P.teal,
    pants = P.blue,
    skin = P.skin,
    hair = P.hair,
    pose = 'stand',
    scale = 1,
    facing = 1,
    face = 'smile',
  } = opts
  const arms = {
    stand: [line(-15, -48, -26, -18, P.line, 6), line(15, -48, 26, -18, P.line, 6)],
    wave: [line(-15, -48, -26, -18, P.line, 6), line(15, -48, 30, -76, P.line, 6), circ(32, -82, 7, skin)],
    point: [line(-15, -48, -26, -18, P.line, 6), line(15, -48, 40, -42, P.line, 6)],
    carry: [line(-15, -48, -30, -34, P.line, 6), line(15, -48, 30, -34, P.line, 6)],
    think: [line(-15, -48, -26, -18, P.line, 6), line(15, -48, 8, -66, P.line, 6), circ(6, -68, 6, skin)],
    run: [line(-15, -48, -32, -66, P.line, 6), line(15, -48, 30, -22, P.line, 6)],
    shrug: [line(-15, -48, -34, -30, P.line, 6), line(15, -48, 34, -30, P.line, 6)],
    cry: [line(-15, -48, -12, -70, P.line, 6), line(15, -48, 12, -70, P.line, 6)],
    angry: [line(-15, -48, -6, -30, P.line, 6), line(15, -48, 6, -30, P.line, 6)],
    bow: [line(-15, -48, -20, -14, P.line, 6), line(15, -48, 20, -14, P.line, 6)],
    raise: [line(-15, -48, -30, -78, P.line, 6), line(15, -48, 30, -78, P.line, 6)],
  }
  const legs =
    pose === 'run'
      ? [line(-8, -6, -26, 4, pants, 9), line(8, -6, 26, 4, pants, 9)]
      : pose === 'sit'
        ? [line(-8, -10, 24, -6, pants, 9), line(-8, -10, 8, 6, pants, 9)]
        : [line(-8, -6, -9, 8, pants, 9), line(8, -6, 9, 8, pants, 9)]
  const parts = [`<g transform="translate(${round(x)} ${round(y)}) scale(${facing * scale} ${scale})">`]
  parts.push(...legs)
  parts.push(rect(-17, -58, 34, 46, 14, shirt))
  parts.push(...(arms[pose] ?? arms.stand))
  parts.push(line(0, -58, 0, -64, P.line, 5))
  const hy = pose === 'bow' ? -72 : -82
  parts.push(circ(0, hy, 21, skin))
  parts.push(path(`M-20 ${hy - 2}Q-17 ${hy - 28} 0 ${hy - 25}Q17 ${hy - 28} 20 ${hy - 2}`, hair, 'none', 0))
  const ey = hy - 2
  if (face === 'sad') {
    parts.push(line(-11, ey, -4, ey - 3, P.line, 3), line(4, ey - 3, 11, ey, P.line, 3))
    parts.push(path(`M-6 ${hy + 10}Q0 ${hy + 4} 6 ${hy + 10}`, 'none', P.line, 3))
  } else if (face === 'angry') {
    parts.push(line(-11, ey - 3, -4, ey, P.line, 3), line(4, ey, 11, ey - 3, P.line, 3))
    parts.push(line(-6, hy + 10, 6, hy + 10, P.line, 3))
  } else if (face === 'surprised') {
    parts.push(circ(-7, ey, 2.4, P.line, P.line, 0), circ(7, ey, 2.4, P.line, P.line, 0), circ(0, hy + 10, 4, 'none', P.line, 2))
  } else {
    parts.push(circ(-7, ey, 2.4, P.line, P.line, 0), circ(7, ey, 2.4, P.line, P.line, 0))
    parts.push(path(`M-7 ${hy + 8}Q0 ${hy + 14} 7 ${hy + 8}`, 'none', P.line, 3))
  }
  parts.push('</g>')
  return parts.join('')
}

// ---------- scenes ----------

const stage = ({ person: po = {}, objects = '', bubble: bub = '', extra = '', ground: gg = true, sun: ss = true, chair: ch = po.pose === 'sit' } = {}) =>
  `${gg ? ground() : ''}${ss ? sun(78, 70, 22) : ''}${extra}${ch ? chair(190, 318) : ''}${person(190, 318, po)}${objects}${bub}`

const SCENES = {
  decision: {
    alt: '二つの道の前で、どちらにするか考えている人。',
    draw: (rng) => stage({
      person: { pose: 'think', shirt: pick(rng, [P.teal, P.blue, P.violet]) },
      extra: `${poly([[320, 324], [402, 236], [484, 324]], P.blueS)}${poly([[320, 324], [402, 274], [484, 324]], P.goldS)}${line(402, 324, 402, 248, P.line, 3)}${check(462, 258, P.green)}${arrow(300, 300, 386, 262, P.green)}`,
    }),
  },
  break: {
    alt: 'いすに座ってカップを手に、時計を見ながら一休みしている人。',
    draw: (rng) => stage({
      person: { pose: 'sit', shirt: pick(rng, [P.teal, P.gold, P.blue]) },
      extra: `${cup(392, 300, P.coral)}${clock(492, 112, 26)}${pause(300, 112)}`,
    }),
  },
  fun: {
    alt: '両手を上げて喜び、紙吹雪が舞っている人。',
    draw: (rng) => stage({
      person: { pose: 'raise', shirt: pick(rng, [P.teal, P.coral, P.violet]) },
      extra: `${confetti(rng)}${heart(430, 190, 1.1)}${star(360, 120, 10)}`,
    }),
  },
  attention: {
    alt: '大きな目とスポットライトで、注意を向けている場面。',
    draw: (rng) => stage({
      person: { pose: 'point', shirt: pick(rng, [P.blue, P.teal]) },
      extra: `${eye(440, 170)}${path('M330 300L360 120h140L470 300z', P.goldS, 'none', 0)}${star(300, 110, 8)}`,
    }),
  },
  cold: {
    alt: '雪の中で腕をさすり、震えている人。',
    draw: (rng) => stage({
      person: { pose: 'cry', face: 'sad', shirt: pick(rng, [P.blue, P.violet]) },
      extra: `${rain(430, 90)}${snow(360, 180, 1.1)}${snow(500, 210, 0.9)}${snow(410, 250, 0.7)}`,
      sun: false,
    }),
  },
  hot: {
    alt: '太陽の下で汗をかき、水を欲しがっている人。',
    draw: (rng) => stage({
      person: { pose: 'shrug', face: 'sad', shirt: pick(rng, [P.gold, P.coral]) },
      extra: `${drop(430, 180, P.blueS)}${drop(470, 150, P.blueS)}${sun(460, 90, 28)}`,
      sun: false,
    }),
  },
  photo: {
    alt: 'カメラを構えて写真を撮っている人。',
    draw: (rng) => stage({
      person: { pose: 'carry', shirt: pick(rng, [P.teal, P.blue]) },
      extra: `${rect(360, 232, 90, 62, 8, P.white)}${circ(405, 263, 22, P.blueS)}${circ(405, 263, 12, P.line, 'none', 0)}${rect(374, 220, 24, 14, 3, P.goldS)}${star(470, 210, 9)}`,
    }),
  },
  travel: {
    alt: 'スーツケースと地図を持ち、飛行機で旅立つ人。',
    draw: (rng) => stage({
      person: { shirt: pick(rng, [P.teal, P.coral]) },
      extra: `${suitcase(400, 300)}${map(480, 250)}${plane(430, 110)}${cloud(150, 110, 0.9)}`,
    }),
  },
  eat: {
    alt: 'テーブルの前で食事をしている人。',
    draw: (rng) => stage({
      person: { pose: 'sit', shirt: pick(rng, [P.teal, P.gold]) },
      extra: `${table(400, 318)}${plate(400, 288)}${line(460, 270, 450, 240, P.line, 3)}${line(450, 240, 442, 250, P.line, 3)}${line(450, 240, 458, 250, P.line, 3)}`,
    }),
  },
  drink: {
    alt: 'カップとボトルを手に、飲み物を楽しんでいる人。',
    draw: (rng) => stage({
      person: { pose: 'carry', shirt: pick(rng, [P.teal, P.blue]) },
      extra: `${cup(402, 300, P.coral)}${bottle(470, 300)}`,
    }),
  },
  cook: {
    alt: 'フライパンと鍋を使って料理している人。',
    draw: (rng) => stage({
      person: { pose: 'carry', shirt: pick(rng, [P.coral, P.teal]) },
      extra: `${pan(390, 280)}${pot(480, 300)}${smoke(390, 200)}`,
    }),
  },
  shopping: {
    alt: '買い物袋を下げて店の前を歩く人。',
    draw: (rng) => stage({
      person: { shirt: pick(rng, [P.teal, P.gold]) },
      extra: `${bag(370, 318, P.coralS)}${bag(410, 318, P.tealS)}${building(490, 318, 110)}`,
    }),
  },
  money: {
    alt: 'お金とカードを手に、支払いをしている人。',
    draw: (rng) => stage({
      person: { pose: 'carry', shirt: pick(rng, [P.blue, P.green]) },
      extra: `${money(400, 300)}${rect(450, 250, 52, 34, 5, P.blueS)}${line(458, 262, 494, 262, P.line, 2.5)}`,
    }),
  },
  bank: {
    alt: '銀行の建物の前で、お金とカードを確認している人。',
    draw: (rng) => stage({
      person: { shirt: pick(rng, [P.blue, P.teal]) },
      extra: `${building(440, 318, 120)}${money(360, 300)}`,
    }),
  },
  home: {
    alt: '家の前に立ち、鍵を手にしている人。',
    draw: (rng) => stage({
      person: { shirt: pick(rng, [P.teal, P.coral]) },
      extra: `${house(440, 318)}${key(340, 280)}`,
    }),
  },
  clean: {
    alt: 'ほうきとバケツで掃除している人。',
    draw: (rng) => stage({
      person: { pose: 'point', shirt: pick(rng, [P.blue, P.teal]) },
      extra: `${line(370, 200, 410, 318, P.wood, 5)}${poly([[398, 318], [426, 318], [414, 290]], P.goldS)}${rect(450, 288, 44, 30, 5, P.blueS)}${sparkles(480, 240)}`,
    }),
  },
  laundry: {
    alt: '洗濯機と服を前に、洗濯をしている人。',
    draw: (rng) => stage({
      person: { shirt: pick(rng, [P.teal, P.violet]) },
      extra: `${rect(370, 240, 90, 78, 10, P.white)}${circ(415, 280, 24, P.blueS)}${shirt(500, 300, P.coralS)}`,
    }),
  },
  school: {
    alt: '机と本を前に、学校で勉強している人。',
    draw: (rng) => stage({
      person: { pose: 'sit', shirt: pick(rng, [P.blue, P.teal]) },
      extra: `${table(400, 318)}${book(400, 288, P.teal)}${rect(460, 220, 70, 54, 4, P.greenS)}`,
    }),
  },
  work: {
    alt: 'ノートパソコンに向かって仕事をしている人。',
    draw: (rng) => stage({
      person: { pose: 'sit', shirt: pick(rng, [P.blue, P.violet]) },
      extra: `${table(400, 318)}${laptop(400, 288)}${clock(500, 120, 22)}`,
    }),
  },
  meeting: {
    alt: 'テーブルをはさんで二人が会議をしている場面。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${table(300, 318)}${person(210, 318, { shirt: pick(rng, [P.teal, P.blue]) })}${person(390, 318, { shirt: pick(rng, [P.gold, P.coral]), facing: -1 })}${bubble(180, 120)}${bubble(400, 130, P.goldS)}`,
  },
  phone: {
    alt: '電話を耳に当てて話している人。',
    draw: (rng) => stage({
      person: { pose: 'think', shirt: pick(rng, [P.teal, P.blue]) },
      extra: `${phone(390, 260, 0.9)}${path('M330 200q30 -30 60 0', 'none', P.teal, 3)}${path('M310 180q50 -50 100 0', 'none', P.tealS, 3)}`,
    }),
  },
  message: {
    alt: '封筒とスマートフォンを使って連絡している人。',
    draw: (rng) => stage({
      person: { shirt: pick(rng, [P.blue, P.teal]) },
      extra: `${envelope(380, 250)}${phone(460, 270, 0.85)}${bubble(300, 120, P.white, 80, 48)}`,
    }),
  },
  health: {
    alt: 'ベッドで休み、体温計と薬をそばに置いている人。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${bed(320, 318)}${person(330, 286, { pose: 'sit', shirt: pick(rng, [P.blue, P.teal]), face: 'sad' })}${thermometer(470, 280)}${medkit(520, 300)}`,
  },
  doctor: {
    alt: '医者が患者のそばで診察している場面。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${person(180, 318, { shirt: P.white })}${person(390, 318, { shirt: P.teal, facing: -1 })}${medkit(300, 300)}${circ(390, 240, 14, P.white)}${line(384, 240, 396, 240, P.coral, 4)}${line(390, 234, 390, 246, P.coral, 4)}`,
  },
  happy: {
    alt: '笑顔で両手を上げ、ハートと太陽に包まれている人。',
    draw: (rng) => stage({
      person: { pose: 'raise', face: 'smile', shirt: pick(rng, [P.coral, P.gold, P.teal]) },
      extra: `${heart(420, 200, 1.2)}${sun(500, 110, 24)}${sparkles(330, 140)}`,
      sun: false,
    }),
  },
  sad: {
    alt: '雨雲の下で、涙を流している人。',
    draw: (rng) => stage({
      person: { pose: 'cry', face: 'sad', shirt: pick(rng, [P.blue, P.violet]) },
      extra: `${rain(440, 90)}${drop(214, 250, P.blueS)}`,
      sun: false,
    }),
  },
  angry: {
    alt: '腕を組んで怒り、頭から湯気が立っている人。',
    draw: (rng) => stage({
      person: { pose: 'angry', face: 'angry', shirt: pick(rng, [P.coral, P.violet]) },
      extra: `${smoke(170, 200)}${line(150, 250, 130, 230, P.coral, 4)}${line(200, 240, 220, 220, P.coral, 4)}`,
      sun: false,
    }),
  },
  greet: {
    alt: '二人が出会って手を振り、あいさつしている場面。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${person(200, 318, { pose: 'wave', shirt: pick(rng, [P.teal, P.blue]) })}${person(390, 318, { pose: 'wave', shirt: pick(rng, [P.gold, P.coral]), facing: -1 })}${bubble(250, 110, P.white, 100, 52)}`,
  },
  invite: {
    alt: '招待状とカレンダーを手に、人を誘っている場面。',
    draw: (rng) => stage({
      person: { pose: 'point', shirt: pick(rng, [P.teal, P.gold]) },
      extra: `${envelope(390, 260, P.goldS)}${calendar(480, 270, 0.8, P.teal)}`,
    }),
  },
  refuse: {
    alt: '手のひらを前に出して、断っている人。',
    draw: (rng) => stage({
      person: { pose: 'shrug', face: 'angry', shirt: pick(rng, [P.blue, P.violet]) },
      extra: `${cross(390, 220, P.coral)}${path('M330 300l40 -60', 'none', P.coral, 6)}`,
    }),
  },
  agree: {
    alt: '二人がうなずき、チェックで同意を示している場面。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${person(200, 318, { shirt: pick(rng, [P.teal, P.blue]) })}${person(390, 318, { shirt: pick(rng, [P.green, P.teal]), facing: -1 })}${check(300, 180, P.green)}${bubble(250, 100, P.greenS, 90, 48)}`,
  },
  promise: {
    alt: '二人が握手して約束し、星が光っている場面。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${person(200, 318, { pose: 'carry', shirt: pick(rng, [P.teal, P.blue]) })}${person(360, 318, { pose: 'carry', shirt: pick(rng, [P.gold, P.coral]), facing: -1 })}${handshake(280, 260)}${star(280, 180, 12)}`,
  },
  apologize: {
    alt: '頭を下げて謝り、吹き出しで気持ちを伝えている人。',
    draw: (rng) => stage({
      person: { pose: 'bow', face: 'sad', shirt: pick(rng, [P.blue, P.violet]) },
      extra: `${bubble(280, 140, P.white, 96, 52)}`,
    }),
  },
  wait: {
    alt: '時計を見ながら、列に並んで待っている人。',
    draw: (rng) => stage({
      person: { shirt: pick(rng, [P.teal, P.blue]) },
      extra: `${clock(470, 120, 28)}${circ(360, 300, 14, P.goldS)}${circ(400, 300, 14, P.tealS)}${circ(440, 300, 14, P.coralS)}`,
    }),
  },
  start: {
    alt: '旗を立て、前へ進む矢印が示されている場面。',
    draw: (rng) => stage({
      person: { pose: 'point', shirt: pick(rng, [P.teal, P.gold]) },
      extra: `${flag(470, 318, P.teal)}${arrow(300, 290, 430, 220, P.green)}`,
    }),
  },
  finish: {
    alt: 'ゴールの旗の前で、達成して立っている人。',
    draw: (rng) => stage({
      person: { pose: 'raise', shirt: pick(rng, [P.teal, P.blue]) },
      extra: `${flag(470, 318, P.coral)}${check(410, 220, P.green)}${confetti(rng)}`,
    }),
  },
  help: {
    alt: '箱を運ぶ人に手を貸している場面。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${person(180, 318, { pose: 'carry', shirt: pick(rng, [P.teal, P.blue]) })}${person(370, 318, { pose: 'carry', shirt: pick(rng, [P.gold, P.coral]), facing: -1 })}${box(280, 280, 64, 50, P.goldS)}`,
  },
  search: {
    alt: '虫めがねを持って、何かを探している人。',
    draw: (rng) => stage({
      person: { pose: 'think', shirt: pick(rng, [P.blue, P.teal]) },
      extra: `${magnifier(430, 210)}${star(480, 150, 6)}`,
    }),
  },
  win: {
    alt: 'トロフィーを掲げ、紙吹雪の中で喜ぶ人。',
    draw: (rng) => stage({
      person: { pose: 'raise', face: 'smile', shirt: pick(rng, [P.gold, P.teal]) },
      extra: `${trophy(400, 280)}${confetti(rng)}`,
    }),
  },
  lose: {
    alt: 'うつむいて、崩れた箱のそばに立つ人。',
    draw: (rng) => stage({
      person: { pose: 'shrug', face: 'sad', shirt: pick(rng, [P.blue, P.violet]) },
      extra: `${rect(380, 300, 30, 18, 3, P.goldS)}${rect(420, 306, 28, 12, 3, P.goldS)}${cross(470, 210, P.coral)}`,
    }),
  },
  practice: {
    alt: '的に向かって矢を放ち、練習している人。',
    draw: (rng) => stage({
      person: { pose: 'point', shirt: pick(rng, [P.teal, P.blue]) },
      extra: `${target(450, 190)}${arrow(300, 260, 430, 200, P.green)}`,
    }),
  },
  learn: {
    alt: '本を開き、電球が光って何かを理解した人。',
    draw: (rng) => stage({
      person: { pose: 'sit', shirt: pick(rng, [P.blue, P.teal]) },
      extra: `${table(400, 318)}${book(400, 288, P.coral)}${bulb(480, 170)}`,
    }),
  },
  teach: {
    alt: '黒板の前で説明し、指し示している人。',
    draw: (rng) => stage({
      person: { pose: 'point', shirt: pick(rng, [P.teal, P.blue]) },
      extra: `${rect(330, 120, 200, 120, 8, P.greenS)}${line(350, 160, 510, 160, P.white, 6)}${line(350, 190, 470, 190, P.white, 6)}${line(350, 220, 490, 220, P.white, 6)}`,
    }),
  },
  move: {
    alt: '道を歩き、前へ進む矢印が示されている人。',
    draw: (rng) => stage({
      person: { pose: 'stand', shirt: pick(rng, [P.teal, P.blue]) },
      extra: `${path('M330 318q60 -40 120 0t120 0', 'none', P.blueS, 10)}${arrow(360, 260, 480, 260, P.green)}${motion(140, 300)}`,
    }),
  },
  run: {
    alt: '腕を振って勢いよく走っている人。',
    draw: (rng) => stage({
      person: { pose: 'run', shirt: pick(rng, [P.coral, P.teal]) },
      extra: `${motion(120, 290)}${motion(110, 320)}`,
    }),
  },
  drive: {
    alt: '車に乗って運転している人。',
    draw: (rng) => stage({
      person: { pose: 'sit', shirt: pick(rng, [P.blue, P.teal]) },
      extra: `${car(420, 318, pick(rng, [P.blueS, P.coralS, P.tealS]))}`,
      chair: false,
    }),
  },
  fly: {
    alt: '飛行機と雲のそばで、空へ飛び立つ場面。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${cloud(150, 120, 1)}${cloud(460, 90, 0.8)}${plane(380, 210)}${person(180, 318, { pose: 'wave', shirt: pick(rng, [P.teal, P.blue]) })}`,
  },
  swim: {
    alt: '波の中を泳いでいる人。',
    draw: (rng) => `${path('M40 300q60 -30 120 0t120 0t120 0t120 0', 'none', P.blue, 6)}${path('M40 330q60 -30 120 0t120 0t120 0t120 0', 'none', P.blueS, 6)}${person(300, 290, { pose: 'shrug', shirt: pick(rng, [P.teal, P.gold]) })}${drop(430, 180, P.blueS)}`,
  },
  sport: {
    alt: 'ボールとゴールを前に、スポーツをしている人。',
    draw: (rng) => stage({
      person: { pose: 'point', shirt: pick(rng, [P.teal, P.coral]) },
      extra: `${ball(420, 280, pick(rng, [P.white, P.goldS]))}${goal(480, 300)}`,
    }),
  },
  music: {
    alt: '音符が流れる中で、歌や演奏をしている人。',
    draw: (rng) => stage({
      person: { pose: 'raise', shirt: pick(rng, [P.violet, P.teal]) },
      extra: `${note(400, 180)}${note(460, 140, P.teal)}${note(520, 200, P.gold)}`,
    }),
  },
  art: {
    alt: 'イーゼルと筆を使って絵を描いている人。',
    draw: (rng) => stage({
      person: { pose: 'point', shirt: pick(rng, [P.violet, P.coral]) },
      extra: `${line(400, 318, 420, 200, P.wood, 5)}${line(480, 318, 460, 200, P.wood, 5)}${rect(390, 200, 100, 76, 4, P.white)}${brush(360, 250)}${flower(450, 270, P.coral)}`,
    }),
  },
  tech: {
    alt: 'ノートパソコンとWi-Fiの中で、作業している人。',
    draw: (rng) => stage({
      person: { pose: 'sit', shirt: pick(rng, [P.blue, P.teal]) },
      extra: `${table(400, 318)}${laptop(400, 288)}${wifi(500, 160)}`,
    }),
  },
  time: {
    alt: '時計とカレンダーが並び、時間の流れを示す場面。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${clock(260, 180, 52)}${calendar(430, 220, 1.2, P.teal)}${arrow(320, 180, 370, 180, P.gold)}`,
  },
  weather: {
    alt: '太陽と雲、雨や雪が空に広がる場面。',
    draw: (rng) => `${ground()}${sun(120, 110, 30)}${cloud(320, 100, 1.2)}${rain(430, 120)}${snow(500, 170, 1)}${snow(360, 210, 0.8)}`,
  },
  nature: {
    alt: '山と川、木が広がる自然の風景。',
    draw: (rng) => `${ground()}${sun(100, 80, 26)}${mountain(280, 330)}${tree(120, 330, P.green)}${tree(470, 330, P.teal)}${river(300, 300)}${cloud(430, 90, 0.8)}`,
  },
  animal: {
    alt: '犬や猫、鳥や魚などの動物が集まる場面。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${dog(180, 320)}${cat(330, 320)}${bird(440, 180)}${fish(500, 300)}`,
  },
  plant: {
    alt: '植木鉢の植物と花、じょうろが並ぶ場面。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${plant(250, 320)}${plant(360, 320)}${flower(450, 320, P.coral)}${flower(500, 320, P.violet)}`,
  },
  body: {
    alt: '人の体の一部に注目している場面。',
    draw: (rng) => `${ground()}${person(280, 318, { shirt: pick(rng, [P.teal, P.blue]) })}${circ(330, 240, 22, 'none', P.coral, 4)}${arrow(420, 180, 350, 230, P.coral)}`,
  },
  clothing: {
    alt: '服と帽子、靴が並ぶ場面。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${shirt(240, 260, P.tealS)}${hat(360, 250, P.goldS)}${shoe(460, 300, P.blueS)}${shoe(520, 300, P.blueS)}`,
  },
  tool: {
    alt: '工具を使って修理している人。',
    draw: (rng) => stage({
      person: { pose: 'point', shirt: pick(rng, [P.blue, P.gold]) },
      extra: `${wrench(400, 260)}${hammer(470, 260)}${box(420, 318, 70, 40, P.wood)}`,
    }),
  },
  measure: {
    alt: 'ものさしと天秤で測っている場面。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${ruler(280, 240)}${scale(430, 300)}${person(150, 318, { pose: 'point', shirt: pick(rng, [P.teal, P.blue]) })}`,
  },
  sleep: {
    alt: 'ベッドで眠り、月と星が輝いている場面。',
    draw: (rng) => `${ground()}${bed(320, 318)}${person(330, 286, { pose: 'sit', shirt: pick(rng, [P.blue, P.violet]), face: 'smile' })}${circ(480, 100, 26, P.goldS, P.gold)}${star(530, 140, 7)}${star(450, 150, 5)}`,
  },
  worry: {
    alt: '頭の上に暗い雲が浮かび、心配している人。',
    draw: (rng) => stage({
      person: { pose: 'think', face: 'sad', shirt: pick(rng, [P.blue, P.violet]) },
      extra: `${rain(410, 90)}${path('M360 200q10 -16 20 0q10 -16 20 0', 'none', P.blue, 4)}`,
      sun: false,
    }),
  },
  surprise: {
    alt: '目を丸くして驚き、星が飛び出している人。',
    draw: (rng) => stage({
      person: { pose: 'raise', face: 'surprised', shirt: pick(rng, [P.gold, P.coral]) },
      extra: `${sparkles(400, 160)}${star(470, 110, 10)}`,
    }),
  },
  love: {
    alt: '二人の間に大きなハートが浮かんでいる場面。',
    draw: (rng) => `${ground()}${sun(78, 70, 22)}${person(180, 318, { shirt: pick(rng, [P.coral, P.teal]) })}${person(380, 318, { shirt: pick(rng, [P.gold, P.violet]), facing: -1 })}${heart(280, 200, 1.5)}`,
  },
  generic: {
    alt: 'カードと矢印で、ことばの意味を表した場面。',
    draw: (rng) => stage({
      person: { pose: 'think', shirt: pick(rng, [P.teal, P.blue, P.violet]) },
      extra: `${rect(360, 210, 110, 90, 12, P.white)}${rect(376, 230, 78, 14, 7, P.tealS)}${rect(376, 256, 60, 12, 6, P.goldS)}${arrow(300, 300, 360, 270, P.green)}`,
    }),
  },
}

const EXTRA_RULES = [
  ['travel', '荷物 切符 片道 指定席 地下鉄 標識 搭乗 観光 空港'],
  ['drink', 'エスプレッソ ラテ ココア スムージー ミルクセーキ ソーダ 紅茶'],
  ['cook', '焦げ 焼き色 冷凍 温め 炒め 煮る 味付け 下ごしらえ'],
  ['sleep', '眠 寝ぼけ 睡眠 昼寝 ベッド'],
  ['eat', 'サンド 卵 野菜 添え ハム パン 米 肉 魚'],
  ['money', '領収 ぼったくり 利益 返金 割引 会計 支払 請求'],
  ['shopping', '領収 返品 試着 レジ 店員 売り場'],
  ['sport', 'ゴール シュート 得点 試合 練習 競技'],
  ['home', 'アパート シーツ 椅子 引き出し 冷凍庫 家具 引っ越し 台所'],
  ['laundry', 'シーツ タオル 洗濯物 干す'],
  ['work', '客 応対 接客 コピー フォルダ 書類 残業 給料'],
  ['music', 'ヒット 曲 演奏 コンサート 歌詞 リズム'],
  ['time', '将来 常に 未来 過去 現在 毎日 今週 来月 締め切り'],
  ['help', '助言 手伝 助け 支援 協力'],
  ['worry', '怖 恐怖 心配 不安 緊張'],
  ['sad', '希望 失望 落胆 涙'],
  ['message', 'メモ 伝言 手紙 封筒 返信'],
  ['greet', 'ありがとう お礼 感謝 こんにちは さようなら よろしく'],
  ['plant', '野菜 育て 庭 花 草木'],
  ['clean', '排水 掃除 片付け きれい'],
  ['school', 'クラブ 部活 授業 試験 宿題 先生'],
  ['happy', '喜 嬉 幸 笑'],
  ['angry', 'うるさ 怒 腹立'],
  ['tool', '画びょう 道具 工具 修理 接着'],
  ['photo', '写真 撮影 カメラ'],
  ['doctor', '診察 処方 点滴 手術 看護'],
  ['health', '体調 病気 症状 具合 薬'],
  ['drive', 'タイヤ 運転 道路 駐車'],
  ['animal', '動物 犬 猫 鳥 魚 虫'],
  ['nature', '山 川 海 森 自然 風景'],
  ['weather', '天気 雨 雪 晴 嵐'],
  ['fun', '楽 遊 娯楽'],
  ['love', '愛 恋 好き 心'],
  ['surprise', '驚 びっくり 突然'],
]

const RULES = [
  ['decision', 'decide decision choose choice determine select 決断 決定 選ぶ 選択'],
  ['break', 'break rest pause relax 休憩 休息 一息 休む'],
  ['fun', 'fun enjoy happy good time 楽しい 楽しむ 遊ぶ 嬉しい'],
  ['attention', 'attention notice focus careful 注意 気をつ 集中'],
  ['cold', 'cold freeze freezing 寒い 冷たい 凍える'],
  ['hot', 'hot boil boiling heat 暑い 熱い 沸騰'],
  ['photo', 'photo picture camera photograph 写真 撮影'],
  ['travel', 'travel trip journey holiday vacation tour 旅行 観光 旅'],
  ['cook', 'cook bake fry recipe kitchen 料理 焼く 茹でる 炒める 台所 作る'],
  ['eat', 'eat breakfast lunch dinner meal food hungry 食事 朝食 昼食 夕食 食べる 空腹'],
  ['drink', 'drink coffee tea juice 飲む コーヒー お茶 水分'],
  ['shopping', 'shop shopping buy store market 買う 買い物 店 市場'],
  ['money', 'money pay price cost expensive cheap お金 払う 値段 高い 安い'],
  ['bank', 'bank account cash card 銀行 口座 現金 カード'],
  ['clean', 'clean wash sweep tidy 掃除 洗う 片付'],
  ['home', 'home house room live 家 部屋 住む 住宅'],
  ['laundry', 'laundry clothes wash dry 洗濯 服 干す'],
  ['learn', 'learn study remember 覚える 学ぶ 習う 暗記'],
  ['school', 'school study learn class homework 学校 勉強 授業 宿題'],
  ['work', 'work job office business 仕事 働く 会社 勤務'],
  ['meeting', 'meeting discuss appointment 会議 打ち合わせ 相談 面接'],
  ['phone', 'phone call telephone 電話 かける'],
  ['message', 'message email mail text メール 連絡 メッセージ 送る'],
  ['health', 'health sick ill pain 病気 体調 痛い 具合'],
  ['doctor', 'doctor hospital medicine nurse 病院 医者 薬 看護'],
  ['happy', 'happy glad smile joy 嬉しい 幸せ 笑う 喜ぶ'],
  ['sad', 'sad cry tears lonely 悲しい 泣く 涙 寂しい'],
  ['angry', 'angry mad upset 怒る 腹が立つ いらいら'],
  ['greet', 'hello hi greet welcome 挨拶 こんにちは ようこそ 会う'],
  ['invite', 'invite invitation 招待 誘う'],
  ['refuse', 'refuse decline reject 断る 拒否 遠慮'],
  ['agree', 'agree accept okay 同意 賛成 承知 受け入れる'],
  ['promise', 'promise swear 約束 誓う'],
  ['apologize', 'sorry apologize 謝る ごめん 申し訳'],
  ['wait', 'wait queue line 待つ 並ぶ 行列'],
  ['start', 'start begin first 始める 最初 開始'],
  ['finish', 'finish end last 終わる 最後 終了'],
  ['help', 'help assist support 助ける 手伝う 支援'],
  ['search', 'find look for search 探す 見つける 捜す'],
  ['win', 'win first place best 勝つ 一位 優勝'],
  ['lose', 'lose miss fail 負ける 失う 失敗 逃す'],
  ['practice', 'practice try train 練習 試す 訓練'],
  ['teach', 'teach explain 教える 説明'],
  ['move', 'go come walk move 行く 来る 歩く 移動'],
  ['run', 'run hurry rush 走る 急ぐ'],
  ['drive', 'drive car taxi 運転 車 タクシー'],
  ['fly', 'fly flight plane 飛ぶ 飛行機 空港'],
  ['swim', 'swim sea pool 泳ぐ 海 プール'],
  ['sport', 'sport game play ball スポーツ 試合 ボール 運動'],
  ['music', 'music song sing instrument 音楽 歌 楽器 歌う'],
  ['art', 'art draw paint picture 絵 描く 芸術 塗る'],
  ['tech', 'computer internet online app ネット オンライン パソコン スマホ'],
  ['time', 'time hour day week month year 時間 時 日 週 月 年 午前 午後 朝 昼 夜 夕方 週末 今日 明日 昨日'],
  ['weather', 'weather rain snow sun wind 天気 雨 雪 晴れ 風'],
  ['nature', 'nature mountain river sea tree 自然 山 川 海 木'],
  ['animal', 'animal dog cat bird fish 動物 犬 猫 鳥 魚'],
  ['plant', 'plant flower garden 植物 花 庭 草'],
  ['body', 'body head hand foot eye 体 頭 手 足 目'],
  ['clothing', 'clothes wear shirt shoes 服 着る 靴 帽子'],
  ['tool', 'tool fix repair build 道具 直す 修理 作る'],
  ['measure', 'measure size weight length 測る 重さ 長さ サイズ'],
  ['sleep', 'sleep bed nap tired 寝る 眠い 疲れる ベッド'],
  ['worry', 'worry anxious nervous 心配 不安 緊張'],
  ['surprise', 'surprise shocked amazing 驚く びっくり すごい'],
  ['love', 'love like heart 愛 好き 恋 心'],
]

const ALL_RULES = [...RULES, ...EXTRA_RULES]

function chooseScene(entry) {
  const text = `${entry.word} ${entry.meaningsJa.join(' ')}`.toLowerCase()
  let best = { scene: 'generic', score: 0 }
  for (const [scene, words] of ALL_RULES) {
    const keys = words.split(' ')
    let score = 0
    for (const key of keys) {
      // 英語は単語境界で一致させる("weather" が "eat" に誤一致しないように)。
      const matched = /^[a-z' ]+$/.test(key) ? new RegExp(`\\b${key}\\b`).test(text) : text.includes(key)
      if (matched) score += key.length > 1 ? 2 : 1
    }
    if (score > best.score) best = { scene, score }
  }
  if (best.score > 0) return best.scene
  if (entry.partOfSpeech === '句動詞') return 'move'
  return 'generic'
}

function badge(pos) {
  const map = {
    表現: [P.teal, '<path d="M-11 -7h22a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5h-9l-8 6v-6h-5a5 5 0 0 1-5-5v-6a5 5 0 0 1 5-5z" fill="#fff"/>'],
    句動詞: [P.blue, '<path d="M-9 0a9 9 0 1 1 3 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M-9 -5v5h5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'],
    慣用句: [P.gold, '<path d="M0 -11l3.2 6.8 7.4 1-5.4 5.2 1.3 7.4L0 5.9l-6.5 3.5 1.3-7.4L-10.6 -3.2l7.4-1z" fill="#fff"/>'],
  }
  const found = map[pos]
  const color = found?.[0] ?? P.teal
  const icon = found?.[1] ?? '<path d="M0 -9l9 9-9 9-9-9z" fill="#fff"/>'
  return `<g transform="translate(548 52)"><circle r="22" fill="${color}"/>${icon}</g>`
}

function render(entry) {
  const rng = rngFor(entry.id)
  const sceneId = chooseScene(entry)
  const scene = SCENES[sceneId] ?? SCENES.generic
  const body = scene.draw(rng, entry)
  const aria = `「${entry.word}」を表すシーン。${scene.alt}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400" role="img" aria-label="${aria.replace(/"/g, '&quot;')}">
  <rect width="600" height="400" fill="${P.bg}"/>
  ${body}
  <rect x="7" y="7" width="586" height="386" rx="20" fill="none" stroke="${P.line}" stroke-width="3" opacity="0.10"/>
  ${badge(entry.partOfSpeech)}
</svg>
`
  return { svg, aria, sceneId }
}

if (SAMPLE) {
  const ids = [
    'make-a-decision',
    'take-a-break',
    'have-fun',
    'pay-attention',
    'catch-a-cold',
    'take-a-photo',
    'go-on-a-trip',
    'have-breakfast',
    'drink-coffee',
    'cook-dinner',
    'go-shopping',
    'pay-the-bill',
    'clean-the-room',
    'go-to-school',
    'attend-a-meeting',
    'answer-the-phone',
    'send-a-message',
    'see-a-doctor',
    'feel-happy',
    'feel-sad',
    'get-angry',
    'say-hello',
    'say-sorry',
    'wait-in-line',
    'win-a-game',
    'lose-a-game',
    'practice-the-piano',
    'learn-by-heart',
    'teach-a-class',
    'walk-the-dog',
    'drive-a-car',
    'fly-first-class',
    'swim-in-the-sea',
    'play-soccer',
    'listen-to-music',
    'draw-a-picture',
    'order-online',
    'in-the-morning',
    'nice-weather',
    'climb-a-mountain',
    'feed-the-cat',
    'water-the-plants',
    'have-a-nap',
    'feel-under-the-weather',
  ]
  const { Resvg } = await import('@resvg/resvg-js')
  const dir = '/tmp/tecanki-scenes'
  fs.mkdirSync(dir, { recursive: true })
  const byId = new Map(newVocabularyData.map((entry) => [entry.id, entry]))
  for (const id of ids) {
    const entry = byId.get(id)
    if (!entry) {
      console.log('missing', id)
      continue
    }
    const { svg, sceneId } = render(entry)
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 420 } }).render().asPng()
    fs.writeFileSync(nodePath.join(dir, `${sceneId}--${id}.png`), png)
    console.log('sample', id, '->', sceneId)
  }
  process.exit(0)
}

fs.mkdirSync(OUT_DIR, { recursive: true })
const mapping = {}
const sceneCounts = {}
for (const entry of newVocabularyData) {
  const { svg, aria, sceneId } = render(entry)
  fs.writeFileSync(nodePath.join(OUT_DIR, `${entry.id}.svg`), svg)
  mapping[entry.id] = {
    src: `images/vocabulary/new/${entry.id}.svg`,
    alt: aria,
    caption: `「${entry.word}」＝${entry.meaningsJa.join('、')}。${entry.exampleTranslationJa}`,
  }
  sceneCounts[sceneId] = (sceneCounts[sceneId] ?? 0) + 1
}

const body = `// 自動生成ファイル。編集せず \`node scripts/build-new-illustrations.mjs\` を実行する。
// 既存イラストを流用せず、意味に合わせた新しいフラットシーンを生成している。

export type NewVocabularyIllustration = {
  src: string
  alt: string
  caption: string
}

export const newVocabularyIllustrations: Readonly<Record<string, NewVocabularyIllustration>> = ${JSON.stringify(mapping, null, 2)}
`
fs.writeFileSync(OUT_TS, body)
console.log('entries:', newVocabularyData.length, 'files:', Object.keys(mapping).length)
console.log('scenes:', sceneCounts)
