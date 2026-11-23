/**
 * Die-cut generator for uploaded stickers. Runs entirely in the browser:
 * 1. find the subject (PNG alpha, or remove a plain background, or a fixed circle / square),
 * 2. fill holes so the cut is one clean outline,
 * 3. grow the outline by the border width (distance transform) and smooth it,
 * 4. composite: white border + image, and a separate cut-line layer.
 */

export type CutShape = 'shape' | 'circle' | 'square'

export interface DieCutOptions {
  cut: CutShape
  /** Border width as a fraction of the sticker size (0.02–0.08). */
  border: number
  /** For images without transparency: try to remove a plain background. */
  removeBg: boolean
}

export interface DieCutResult {
  photo: string
  cutline: string
  /** True when the image had its own transparency. */
  hasAlpha: boolean
  /** True when background removal found a subject (false = fell back to the rectangle). */
  foundSubject: boolean
}

const S = 480 // output size in px

export async function loadImage(file: File): Promise<HTMLImageElement> {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error('Please choose a PNG or JPEG image.')
  if (file.size > 15 * 1024 * 1024) throw new Error('That image is larger than 15 MB. Try a smaller one.')
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } catch {
    throw new Error('That file couldn’t be opened as an image.')
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
}

function canvas(w = S, h = S) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  return { c, ctx }
}

/** Euclidean-ish (chamfer 3-4) distance to the nearest mask pixel. */
function distanceToMask(mask: Uint8Array, w: number, h: number) {
  const INF = 1e9
  const d = new Float32Array(w * h)
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : INF
  const a = 1, b = Math.SQRT2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (d[i] === 0) continue
      let v = d[i]
      if (x > 0) v = Math.min(v, d[i - 1] + a)
      if (y > 0) {
        v = Math.min(v, d[i - w] + a)
        if (x > 0) v = Math.min(v, d[i - w - 1] + b)
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + b)
      }
      d[i] = v
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (d[i] === 0) continue
      let v = d[i]
      if (x < w - 1) v = Math.min(v, d[i + 1] + a)
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + a)
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + b)
        if (x > 0) v = Math.min(v, d[i + w - 1] + b)
      }
      d[i] = v
    }
  }
  return d
}

/** Everything not reachable from the canvas edge through empty pixels becomes part of the mask. */
function fillHoles(mask: Uint8Array, w: number, h: number) {
  const outside = new Uint8Array(w * h)
  const stack: number[] = []
  const push = (i: number) => { if (!mask[i] && !outside[i]) { outside[i] = 1; stack.push(i) } }
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
  while (stack.length) {
    const i = stack.pop()!
    const x = i % w, y = (i / w) | 0
    if (x > 0) push(i - 1)
    if (x < w - 1) push(i + 1)
    if (y > 0) push(i - w)
    if (y < h - 1) push(i + w)
  }
  for (let i = 0; i < mask.length; i++) mask[i] = outside[i] ? 0 : 1
}

/** Keep only the largest connected blob (drops specks left by background removal). */
function keepLargest(mask: Uint8Array, w: number, h: number) {
  const label = new Int32Array(w * h)
  let best = 0, bestSize = 0, next = 1
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || label[s]) continue
    const id = next++
    let size = 0
    const stack = [s]
    label[s] = id
    while (stack.length) {
      const i = stack.pop()!
      size++
      const x = i % w, y = (i / w) | 0
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]
      for (const j of nb) if (j >= 0 && mask[j] && !label[j]) { label[j] = id; stack.push(j) }
    }
    if (size > bestSize) { bestSize = size; best = id }
  }
  for (let i = 0; i < mask.length; i++) mask[i] = label[i] === best ? 1 : 0
  return bestSize
}

function maskToCanvas(mask: Uint8Array, color = [255, 255, 255]) {
  const { c, ctx } = canvas()
  const img = ctx.createImageData(S, S)
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue
    img.data[i * 4] = color[0]; img.data[i * 4 + 1] = color[1]; img.data[i * 4 + 2] = color[2]; img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c
}

export function makeDieCut(img: HTMLImageElement, opts: DieCutOptions): DieCutResult {
  const borderPx = Math.round(S * opts.border)
  const margin = borderPx + Math.round(S * 0.035) // keep room for the border + shadow
  const box = S - margin * 2

  // 1. Place the image
  const { c: src, ctx: sctx } = canvas()
  const mask = new Uint8Array(S * S)
  let hasAlpha = false
  let foundSubject = true

  if (opts.cut === 'shape') {
    const scale = Math.min(box / img.naturalWidth, box / img.naturalHeight)
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale)
    const x0 = Math.round((S - w) / 2), y0 = Math.round((S - h) / 2)
    sctx.drawImage(img, x0, y0, w, h)
    const data = sctx.getImageData(0, 0, S, S).data

    // transparency inside the image box?
    let transparent = 0, total = 0
    for (let y = y0; y < y0 + h; y += 3) for (let x = x0; x < x0 + w; x += 3) { total++; if (data[(y * S + x) * 4 + 3] < 200) transparent++ }
    hasAlpha = transparent / Math.max(total, 1) > 0.02

    if (hasAlpha) {
      for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 60 ? 1 : 0
    } else if (opts.removeBg) {
      // background colour = median-ish of the image's outer ring
      const ring: number[][] = []
      for (let x = x0; x < x0 + w; x += 2) { ring.push(px(data, x, y0)); ring.push(px(data, x, y0 + h - 1)) }
      for (let y = y0; y < y0 + h; y += 2) { ring.push(px(data, x0, y)); ring.push(px(data, x0 + w - 1, y)) }
      const bg = [0, 1, 2].map((k) => { const v = ring.map((r) => r[k]).sort((p, q) => p - q); return v[v.length >> 1] })
      const spread = ring.reduce((s, r) => s + dist(r, bg), 0) / ring.length
      const thr = Math.max(38, spread * 2.2)
      // flood from the image edge through background-coloured pixels
      const bgMask = new Uint8Array(S * S)
      const stack: number[] = []
      const tryPush = (x: number, y: number) => {
        if (x < x0 || y < y0 || x >= x0 + w || y >= y0 + h) return
        const i = y * S + x
        if (bgMask[i]) return
        if (dist(px(data, x, y), bg) > thr) return
        bgMask[i] = 1; stack.push(i)
      }
      for (let x = x0; x < x0 + w; x++) { tryPush(x, y0); tryPush(x, y0 + h - 1) }
      for (let y = y0; y < y0 + h; y++) { tryPush(x0, y); tryPush(x0 + w - 1, y) }
      while (stack.length) {
        const i = stack.pop()!
        const x = i % S, y = (i / S) | 0
        tryPush(x - 1, y); tryPush(x + 1, y); tryPush(x, y - 1); tryPush(x, y + 1)
      }
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = y * S + x; mask[i] = bgMask[i] ? 0 : 1 }
      const size = keepLargest(mask, S, S)
      // Didn't find a clear subject (busy photo): fall back to the full rectangle.
      if (size < w * h * 0.04 || size > w * h * 0.97) {
        foundSubject = false
        mask.fill(0)
        for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) mask[y * S + x] = 1
      }
    } else {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) mask[y * S + x] = 1
    }
    fillHoles(mask, S, S)
  } else {
    // circle / rounded square: cover-fit and crop
    const scale = Math.max(box / img.naturalWidth, box / img.naturalHeight)
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale
    sctx.save()
    sctx.beginPath()
    if (opts.cut === 'circle') sctx.arc(S / 2, S / 2, box / 2, 0, Math.PI * 2)
    else sctx.roundRect(margin, margin, box, box, box * 0.16)
    sctx.clip()
    sctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h)
    sctx.restore()
    const data = sctx.getImageData(0, 0, S, S).data
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 10 ? 1 : 0
  }

  // 2. Cut-out of the image itself
  if (opts.cut === 'shape') {
    const m = maskToCanvas(mask)
    sctx.globalCompositeOperation = 'destination-in'
    sctx.drawImage(m, 0, 0)
    sctx.globalCompositeOperation = 'source-over'
  }

  // 3. Grow by the border width, then smooth the outline
  const dmap = distanceToMask(mask, S, S)
  const grown = new Uint8Array(S * S)
  for (let i = 0; i < grown.length; i++) grown[i] = dmap[i] <= borderPx ? 1 : 0
  const { ctx: softCtx } = canvas()
  softCtx.filter = `blur(${Math.max(2, Math.round(borderPx / 3))}px)`
  softCtx.drawImage(maskToCanvas(grown), 0, 0)
  softCtx.filter = 'none'
  const sd = softCtx.getImageData(0, 0, S, S).data
  const cut = new Uint8Array(S * S)
  for (let i = 0; i < cut.length; i++) cut[i] = sd[i * 4 + 3] > 120 ? 1 : 0
  fillHoles(cut, S, S)

  // 4a. Sticker: white border + image
  const { c: out, ctx: octx } = canvas()
  octx.drawImage(maskToCanvas(cut), 0, 0)
  octx.drawImage(src, 0, 0)

  // 4b. Cut line: the outline of the grown shape
  const { c: line, ctx: lctx } = canvas()
  const ld = lctx.createImageData(S, S)
  for (let y = 1; y < S - 1; y++) {
    for (let x = 1; x < S - 1; x++) {
      const i = y * S + x
      if (!cut[i]) continue
      if (!cut[i - 1] || !cut[i + 1] || !cut[i - S] || !cut[i + S]) {
        for (const j of [i, i - 1, i + 1, i - S, i + S]) {
          ld.data[j * 4] = 229; ld.data[j * 4 + 1] = 72; ld.data[j * 4 + 2] = 127; ld.data[j * 4 + 3] = 255
        }
      }
    }
  }
  lctx.putImageData(ld, 0, 0)

  // WebP keeps transparency at a fraction of PNG size (falls back to PNG where unsupported)
  return { photo: out.toDataURL('image/webp', 0.9), cutline: line.toDataURL('image/png'), hasAlpha, foundSubject }
}

function px(d: Uint8ClampedArray, x: number, y: number) {
  const i = (y * S + x) * 4
  return [d[i], d[i + 1], d[i + 2]]
}
function dist(a: number[], b: number[]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
}
