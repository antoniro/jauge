// PROTOTYPE — throwaway. Paints an embossed "stacked paper" relief once to a canvas and returns it as an image URL.
function noise(seed: number) {
  const perm = new Uint8Array(512)
  let s = seed >>> 0
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [p[i], p[k]] = [p[k], p[i]] }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  const g = (h: number, x: number, y: number) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y)
  const f = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  return (x: number, y: number) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, fx = x - Math.floor(x), fy = y - Math.floor(y)
    const u = f(fx), v = f(fy)
    const a = g(perm[X + perm[Y]], fx, fy), b = g(perm[X + 1 + perm[Y]], fx - 1, fy)
    const c = g(perm[X + perm[Y + 1]], fx, fy - 1), d = g(perm[X + 1 + perm[Y + 1]], fx - 1, fy - 1)
    return a + u * (b - a) + v * (c - a + u * (a - b - c + d))
  }
}

export function paintRelief(w: number, h: number, dark: boolean, seed = 7): string {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const ctx = cv.getContext('2d'); if (!ctx) return ''
  const n = noise(seed), LEVELS = 9
  const lvl = new Int8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = n(x / 120, y / 120) + 0.35 * n(x / 52 + 9, y / 52 + 3) + (x / w - 0.5) * 0.5
    lvl[y * w + x] = Math.floor((v * 0.62 + 0.5) * LEVELS)
  }
  const img = ctx.createImageData(w, h)
  const base = dark ? [15, 17, 21] : [230, 232, 236]
  const hi = dark ? 16 : 20, lo = dark ? 9 : 34
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const L = lvl[y * w + x]
    let shade = (L - LEVELS / 2) * (dark ? 0.9 : 0.7)
    // light from the top-left: an edge that rises towards it catches light, one that drops casts a soft shadow
    for (let k = 1; k <= 7; k++) {
      const xx = x - k, yy = y - k
      if (xx < 0 || yy < 0) break
      const d = L - lvl[yy * w + xx]
      if (d > 0) { if (k <= 2) shade += hi / k; break }
      if (d < 0) { shade -= lo * (1 - (k - 1) / 7) * 0.55; break }
    }
    const i = (y * w + x) * 4
    img.data[i] = base[0] + shade; img.data[i + 1] = base[1] + shade; img.data[i + 2] = base[2] + shade * 1.05; img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return cv.toDataURL('image/png')
}
