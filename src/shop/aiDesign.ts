/** "Describe a sticker" → three designs. Claude when /api/ai is set up, otherwise an on-device keyword model. */
import { art, artInfo, artOrder, stickerColors } from './shopStore'
import type { ArtKey, StickerDesign } from './shopStore'

export interface GenDesign { name: string; design: StickerDesign }

const artWords: [RegExp, ArtKey][] = [
  [/rain|drizzle|cloud|umbrella|비|구름|우산|장마/i, 'drizzle'],
  [/sun|sunny|summer|beach|해|햇살|여름|태양/i, 'sun'],
  [/rainbow|무지개/i, 'rainbow'],
  [/star|comet|shooting|wish|별|혜성|소원/i, 'comet'],
  [/heart|love|crush|하트|사랑|러브/i, 'heart'],
  [/smile|happy|cute|joy|웃|스마일|행복|귀여/i, 'smile'],
  [/planet|space|saturn|galaxy|rocket|우주|행성|토성|은하|로켓/i, 'orbit'],
  [/moon|night|sleep|dream|달|밤|꿈|잠/i, 'moon'],
  [/flower|bloom|spring|daisy|꽃|봄|데이지/i, 'bloom'],
  [/leaf|plant|forest|nature|tree|잎|식물|숲|자연|나무/i, 'leaf'],
  [/cherry|fruit|berry|sweet|체리|과일|딸기|달콤/i, 'cherry'],
  [/bolt|lightning|electric|charge|power|energy|번개|전기|충전|파워|에너지/i, 'bolt'],
  [/music|note|song|melody|headphone|band|음악|노래|음표|멜로디|밴드/i, 'note'],
]

const hex = (name: string) => stickerColors.find((c) => c.name === name)!.hex
const colorWords: [RegExp, string[]][] = [
  [/pink|blush|핑크|분홍/i, ['Blush', 'Hot pink']],
  [/purple|violet|lilac|lavender|보라|라벤더/i, ['Lilac', 'Violet']],
  [/sky|light blue|하늘/i, ['Sky', 'Lagoon']],
  [/blue|navy|파랑|파란|남색|블루/i, ['Tagly blue', 'Sky']],
  [/mint|민트/i, ['Mint', 'Lagoon']],
  [/green|초록|녹색|그린/i, ['Grass', 'Mint']],
  [/yellow|gold|노랑|노란|금색|옐로/i, ['Sunflower', 'Butter']],
  [/orange|coral|주황|오렌지|코랄/i, ['Coral', 'Peach']],
  [/peach|살구|피치/i, ['Peach', 'Coral']],
  [/red|빨강|빨간|레드/i, ['Tomato', 'Coral']],
  [/black|dark|ink|검정|검은|까만|블랙/i, ['Ink', 'Pebble']],
  [/white|흰|하얀|화이트/i, ['White', 'Pebble']],
  [/brown|choco|갈색|초코|브라운/i, ['Cocoa', 'Butter']],
  [/gr[ae]y|회색|그레이/i, ['Pebble', 'Ink']],
]
const pastel = ['Lilac', 'Sky', 'Mint', 'Butter', 'Peach', 'Blush']
const bright = ['Tagly blue', 'Lagoon', 'Grass', 'Sunflower', 'Coral', 'Hot pink', 'Violet']

/** A readable accent for a body colour. */
function accentFor(body: string, seed: number) {
  const pairs: Record<string, string[]> = {
    Lilac: ['Tagly blue', 'Violet'], Sky: ['Violet', 'Tagly blue'], Mint: ['Grass', 'Ink'], Butter: ['Coral', 'Ink'],
    Peach: ['Coral', 'Tomato'], Blush: ['Hot pink', 'Tomato'], 'Tagly blue': ['Sky', 'White'], Lagoon: ['Ink', 'White'],
    Grass: ['Sunflower', 'White'], Sunflower: ['Coral', 'Ink'], Coral: ['Butter', 'Ink'], Tomato: ['Grass', 'Butter'],
    'Hot pink': ['White', 'Butter'], Violet: ['Sunflower', 'Blush'], Cocoa: ['Butter', 'Peach'], Pebble: ['White', 'Ink'],
    Ink: ['Sunflower', 'Blush'], White: ['Tagly blue', 'Coral'],
  }
  const opts = pairs[body] ?? ['White', 'Ink']
  return hex(opts[seed % opts.length])
}

export function deviceDesigns(prompt: string): GenDesign[] {
  const arts = artWords.filter(([re]) => re.test(prompt)).map(([, a]) => a)
  let colors = colorWords.filter(([re]) => re.test(prompt)).flatMap(([, c]) => c)
  if (/pastel|soft|파스텔|연한|은은/i.test(prompt)) colors = [...colors, ...pastel]
  if (/neon|vivid|bright|bold|쨍|비비드|형광/i.test(prompt)) colors = [...colors, ...bright]
  const pickArts: ArtKey[] = arts.length ? arts : ['smile', 'heart', 'comet']
  const palette = [...new Set(colors.length ? colors : ['Lilac', 'Sunflower', 'Coral', 'Tagly blue'])]
  const out: GenDesign[] = []
  for (let i = 0; out.length < 3 && i < 9; i++) {
    const a = pickArts[i % pickArts.length]
    const body = palette[(i + Math.floor(i / pickArts.length)) % palette.length]
    const d = art(a, hex(body), accentFor(body, i))
    if (out.some((o) => o.design.art === d.art && o.design.color === d.color)) continue
    out.push({ name: `${artInfo[a].name} · ${body}`, design: d })
  }
  return out
}

export async function generateDesigns(prompt: string): Promise<{ engine: 'claude' | 'device'; designs: GenDesign[] }> {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'sticker', prompt, arts: artOrder, palette: stickerColors.map((c) => c.hex) }),
    })
    if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) {
      const data = (await res.json()) as { designs?: { art?: string; color?: string; accent?: string; name?: string }[] }
      const hexes = stickerColors.map((c) => c.hex.toUpperCase())
      const designs = (data.designs ?? [])
        .filter((d) => artOrder.includes(d.art as ArtKey) && hexes.includes((d.color ?? '').toUpperCase()) && hexes.includes((d.accent ?? '').toUpperCase()))
        .slice(0, 3)
        .map((d) => ({ name: d.name || artInfo[d.art as ArtKey].name, design: art(d.art as ArtKey, d.color!.toUpperCase(), d.accent!.toUpperCase()) }))
      if (designs.length) return { engine: 'claude', designs }
    }
  } catch { /* fall back */ }
  return { engine: 'device', designs: deviceDesigns(prompt) }
}
