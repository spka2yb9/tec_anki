// TecAnki のPWAアイコン(PNG)を依存なしで生成する。
//  navy の角丸背景に、白い単語カードと teal の見出し・gold のチェックを描く。
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = 'public/icons'

function crcTable() {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
}
const CRC_TABLE = crcTable()

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function png(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const rowBytes = width * 4 + 1
  const raw = Buffer.alloc(rowBytes * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * rowBytes] = 0
    rgba.copy(raw, y * rowBytes + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

function make(size) {
  const buf = Buffer.alloc(size * size * 4)
  const px = (x, y, [r, g, b, a = 255]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    // 単純なオーバー合成
    const alpha = a / 255
    buf[i] = Math.round(r * alpha + buf[i] * (1 - alpha))
    buf[i + 1] = Math.round(g * alpha + buf[i + 1] * (1 - alpha))
    buf[i + 2] = Math.round(b * alpha + buf[i + 2] * (1 - alpha))
    buf[i + 3] = 255
  }
  const roundRect = (x0, y0, x1, y1, radius, color) => {
    for (let y = Math.floor(y0); y < y1; y += 1) {
      for (let x = Math.floor(x0); x < x1; x += 1) {
        const dx = x < x0 + radius ? x0 + radius - x : x > x1 - radius ? x - (x1 - radius) : 0
        const dy = y < y0 + radius ? y0 + radius - y : y > y1 - radius ? y - (y1 - radius) : 0
        if (dx * dx + dy * dy <= radius * radius) px(x, y, color)
      }
    }
  }
  const line = (x0, y0, x1, y1, width, color) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps
      const cx = Math.round(x0 + (x1 - x0) * t)
      const cy = Math.round(y0 + (y1 - y0) * t)
      for (let ox = -width; ox <= width; ox += 1) {
        for (let oy = -width; oy <= width; oy += 1) {
          if (ox * ox + oy * oy <= width * width) px(cx + ox, cy + oy, color)
        }
      }
    }
  }

  const NAVY = [0x17, 0x3f, 0x5f]
  const WHITE = [0xff, 0xff, 0xff]
  const TEAL = [0x23, 0x8b, 0x83]
  const GOLD = [0xd9, 0x9a, 0x2b]
  const INK = [0xc9, 0xd7, 0xdd]

  roundRect(0, 0, size, size, size * 0.16, NAVY)
  const m = size * 0.2
  const card = [m, m * 1.08, size - m, size - m * 1.08]
  roundRect(card[0], card[1], card[2], card[3], size * 0.06, WHITE)
  // teal の見出し帯
  roundRect(card[0], card[1], card[2], card[1] + size * 0.115, size * 0.06, TEAL)
  // カード内の文字行
  const lx = card[0] + size * 0.08
  const lw = size * 0.32
  for (let i = 0; i < 3; i += 1) {
    const ly = card[1] + size * 0.22 + i * size * 0.13
    roundRect(lx, ly, lx + lw * (i === 2 ? 0.7 : 1), ly + size * 0.045, size * 0.022, INK)
  }
  // gold のチェック
  const cx = card[2] - size * 0.16
  const cy = card[3] - size * 0.17
  for (let y = -size * 0.085; y <= size * 0.085; y += 1) {
    for (let x = -size * 0.085; x <= size * 0.085; x += 1) {
      if (x * x + y * y <= (size * 0.085) ** 2) px(Math.round(cx + x), Math.round(cy + y), GOLD)
    }
  }
  line(cx - size * 0.032, cy + size * 0.002, cx - size * 0.006, cy + size * 0.03, Math.max(2, size * 0.011), WHITE)
  line(cx - size * 0.006, cy + size * 0.03, cx + size * 0.04, cy - size * 0.032, Math.max(2, size * 0.011), WHITE)

  return png(size, size, buf)
}

mkdirSync(OUT, { recursive: true })
for (const size of [192, 512]) writeFileSync(`${OUT}/icon-${size}.png`, make(size))
writeFileSync(`${OUT}/apple-touch-icon.png`, make(180))
// maskable 用は余白を広めに取った同じ絵
writeFileSync(`${OUT}/maskable-512.png`, make(512))
console.log('icons written')
