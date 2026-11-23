import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/* Palettes ---------------------------------------------------------------- */

export interface Swatch { hex: string; name: string }

/** 18 sticker colours: pastels, brights, neutrals. */
export const stickerColors: Swatch[] = [
  { hex: '#B9A7F5', name: 'Lilac' },
  { hex: '#9CC7F7', name: 'Sky' },
  { hex: '#8FE0B9', name: 'Mint' },
  { hex: '#FFE07A', name: 'Butter' },
  { hex: '#FFB59A', name: 'Peach' },
  { hex: '#F7A8C8', name: 'Blush' },
  { hex: '#3158FF', name: 'Tagly blue' },
  { hex: '#1FB5D6', name: 'Lagoon' },
  { hex: '#2DBE6C', name: 'Grass' },
  { hex: '#F5C518', name: 'Sunflower' },
  { hex: '#F26A3D', name: 'Coral' },
  { hex: '#E8453C', name: 'Tomato' },
  { hex: '#E5487F', name: 'Hot pink' },
  { hex: '#7357E0', name: 'Violet' },
  { hex: '#8B5E3C', name: 'Cocoa' },
  { hex: '#7A8494', name: 'Pebble' },
  { hex: '#12161C', name: 'Ink' },
  { hex: '#FFFFFF', name: 'White' },
]

export const shellColors: Swatch[] = [
  { hex: '#F4F5F7', name: 'Cloud' },
  { hex: '#1E2433', name: 'Midnight' },
  { hex: '#3158FF', name: 'Tagly blue' },
  { hex: '#A9CBF5', name: 'Sky' },
  { hex: '#BFD8C9', name: 'Sage' },
  { hex: '#CFC6F5', name: 'Lilac' },
  { hex: '#F6C6B8', name: 'Peach' },
  { hex: '#FFE08A', name: 'Butter' },
  { hex: '#F26A3D', name: 'Coral' },
  { hex: '#5B6472', name: 'Graphite' },
]

export const strapColors: Swatch[] = [
  { hex: '#F26A3D', name: 'Coral' },
  { hex: '#12161C', name: 'Ink' },
  { hex: '#3158FF', name: 'Tagly blue' },
  { hex: '#2DBE6C', name: 'Grass' },
  { hex: '#E5487F', name: 'Hot pink' },
  { hex: '#F5C518', name: 'Sunflower' },
  { hex: '#B9A7F5', name: 'Lilac' },
]

export function colorName(hex: string, list: Swatch[] = [...stickerColors, ...shellColors]) {
  return list.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? 'Custom'
}

/* Designs ------------------------------------------------------------------ */

export type ArtKey =
  | 'drizzle' | 'sun' | 'rainbow' | 'comet' | 'heart' | 'smile' | 'orbit' | 'moon'
  | 'bloom' | 'leaf' | 'cherry' | 'bolt' | 'note'

export type SetKey = 'weather' | 'classic' | 'space' | 'garden' | 'charge' | 'music' | 'clear'

export const sets: { key: SetKey; name: string; blurb: string; tint: string }[] = [
  { key: 'weather', name: 'Weather set', blurb: 'For umbrellas and rainy-day things', tint: '#ECE8FD' },
  { key: 'classic', name: 'Classic set', blurb: 'Everyday icons for laptops', tint: '#FFF6D6' },
  { key: 'space', name: 'Space set', blurb: 'Planets for tablets', tint: '#FFE7DD' },
  { key: 'garden', name: 'Garden set', blurb: 'Flowers for pencil cases', tint: '#DFF6EA' },
  { key: 'charge', name: 'Charge set', blurb: 'For power banks and chargers', tint: '#E3EAFF' },
  { key: 'music', name: 'Music set', blurb: 'For headphones and earbuds', tint: '#FCE4EF' },
  { key: 'clear', name: 'Clear set', blurb: 'See-through, with a printed border', tint: '#EEF1F5' },
]

export const artInfo: Record<ArtKey, { name: string; set: SetKey }> = {
  drizzle: { name: 'Drizzle', set: 'weather' },
  sun: { name: 'Sunny', set: 'weather' },
  rainbow: { name: 'Rainbow', set: 'weather' },
  comet: { name: 'Comet', set: 'classic' },
  heart: { name: 'Heart', set: 'classic' },
  smile: { name: 'Smile', set: 'classic' },
  orbit: { name: 'Orbit', set: 'space' },
  moon: { name: 'Crescent', set: 'space' },
  bloom: { name: 'Bloom', set: 'garden' },
  leaf: { name: 'Leaf', set: 'garden' },
  cherry: { name: 'Cherry', set: 'garden' },
  bolt: { name: 'Bolt', set: 'charge' },
  note: { name: 'Note', set: 'music' },
}
export const artOrder: ArtKey[] = ['drizzle', 'sun', 'rainbow', 'comet', 'heart', 'smile', 'orbit', 'moon', 'bloom', 'leaf', 'cherry', 'bolt', 'note']

export type FrameStyle = 'none' | 'solid' | 'dashed' | 'dots' | 'stripes' | 'checker' | 'confetti'
export type DotMark = 'logo' | 'heart' | 'star' | 'initials'

/** A sticker skin: either die-cut art or a clear sticker with a printed border. */
export interface StickerDesign {
  style: 'art' | 'clear'
  art: ArtKey
  color: string
  accent: string
  // clear style
  shape: 'square' | 'circle'
  frame: FrameStyle
  frameColor: string
  dot: DotMark
  dotColor: string
  initials: string
}

export const baseSticker: StickerDesign = {
  style: 'art', art: 'comet', color: '#F5C518', accent: '#FFFFFF',
  shape: 'square', frame: 'none', frameColor: '#3158FF', dot: 'logo', dotColor: '#3158FF', initials: '',
}

export function art(a: ArtKey, color: string, accent: string): StickerDesign {
  return { ...baseSticker, style: 'art', art: a, color, accent }
}
export function clear(partial: Partial<StickerDesign>): StickerDesign {
  return { ...baseSticker, style: 'clear', ...partial }
}

export type RingFinish = 'silver' | 'gold' | 'black'
export type EngraveFont = 'sans' | 'serif' | 'mono'

/** Keyring hub (Ø 38 mm pebble). */
export interface HubDesign {
  shell: string
  loop: RingFinish
  strap: string | null
  engraving: string
  font: EngraveFont
  finish?: Finish
  /** Optional slip-on case. */
  case: CaseChoice | null
}
export const defaultHub: HubDesign = { shell: '#F4F5F7', loop: 'silver', strap: null, engraving: '', font: 'sans', case: null }

/* Gallery ------------------------------------------------------------------ */

export interface GalleryDesign { id: string; name: string; set: SetKey; design: StickerDesign; isNew?: boolean }

export const gallery: GalleryDesign[] = [
  { id: 'drizzle-lilac', name: 'Drizzle', set: 'weather', design: art('drizzle', '#B9A7F5', '#3158FF') },
  { id: 'drizzle-sky', name: 'Drizzle · Sky', set: 'weather', design: art('drizzle', '#9CC7F7', '#7357E0') },
  { id: 'sunny', name: 'Sunny', set: 'weather', design: art('sun', '#F5C518', '#F26A3D') },
  { id: 'rainbow', name: 'Rainbow', set: 'weather', design: art('rainbow', '#E8453C', '#F5C518'), isNew: true },
  { id: 'comet', name: 'Comet', set: 'classic', design: art('comet', '#F5C518', '#FFFFFF') },
  { id: 'comet-ink', name: 'Comet · Night', set: 'classic', design: art('comet', '#12161C', '#F5C518') },
  { id: 'heart', name: 'Heart', set: 'classic', design: art('heart', '#E5487F', '#FFFFFF') },
  { id: 'heart-blush', name: 'Heart · Blush', set: 'classic', design: art('heart', '#F7A8C8', '#E5487F') },
  { id: 'smile', name: 'Smile', set: 'classic', design: art('smile', '#FFE07A', '#12161C'), isNew: true },
  { id: 'orbit', name: 'Orbit', set: 'space', design: art('orbit', '#F26A3D', '#12161C') },
  { id: 'orbit-violet', name: 'Orbit · Nebula', set: 'space', design: art('orbit', '#7357E0', '#F5C518') },
  { id: 'crescent', name: 'Crescent', set: 'space', design: art('moon', '#FFE07A', '#3158FF') },
  { id: 'bloom', name: 'Bloom', set: 'garden', design: art('bloom', '#2DBE6C', '#F5C518') },
  { id: 'bloom-blush', name: 'Bloom · Blush', set: 'garden', design: art('bloom', '#F7A8C8', '#F26A3D') },
  { id: 'leaf', name: 'Leaf', set: 'garden', design: art('leaf', '#2DBE6C', '#FFFFFF') },
  { id: 'cherry', name: 'Cherry', set: 'garden', design: art('cherry', '#E8453C', '#2DBE6C'), isNew: true },
  { id: 'bolt', name: 'Bolt', set: 'charge', design: art('bolt', '#3158FF', '#9CC7F7') },
  { id: 'bolt-sun', name: 'Bolt · Volt', set: 'charge', design: art('bolt', '#F5C518', '#12161C') },
  { id: 'note', name: 'Note', set: 'music', design: art('note', '#7357E0', '#F7A8C8') },
  { id: 'note-lagoon', name: 'Note · Lagoon', set: 'music', design: art('note', '#1FB5D6', '#12161C'), isNew: true },
  { id: 'clear-classic', name: 'Clear classic', set: 'clear', design: clear({}) },
  { id: 'clear-confetti', name: 'Clear confetti', set: 'clear', design: clear({ frame: 'confetti', frameColor: '#F26A3D', dot: 'star', dotColor: '#F26A3D' }) },
  { id: 'clear-dash', name: 'Clear dash', set: 'clear', design: clear({ shape: 'circle', frame: 'dashed', frameColor: '#FFFFFF', dot: 'initials', dotColor: '#12161C', initials: 'HJ' }) },
  { id: 'clear-stripes', name: 'Clear stripes', set: 'clear', design: clear({ frame: 'stripes', frameColor: '#2DBE6C', dot: 'heart', dotColor: '#2DBE6C' }) },
]

/** The five signature skins from the concept sheet. */
export const signatureIds = ['drizzle-lilac', 'comet', 'orbit', 'bloom', 'bolt']
export function byId(id: string) { return gallery.find((g) => g.id === id) }
export const signaturePack = () => signatureIds.map((id) => byId(id)!.design)

export function designLabel(d: StickerDesign) {
  if (d.style === 'clear') return `Clear · ${d.frame === 'none' ? 'no border' : d.frame}`
  return `${artInfo[d.art].name} · ${colorName(d.color, stickerColors)}`
}

/* Hub cases (slip-on covers, like an earbuds case) ------------------------- */

export type CaseKey = 'silicone' | 'bear' | 'bunny' | 'cat' | 'cloud' | 'heart' | 'clear' | 'leather'

export interface CaseInfo {
  key: CaseKey
  name: string
  price: number
  blurb: string
  colors: Swatch[]
  isNew?: boolean
}

/** Soft, muted colours (matte silicone). */
const P = {
  chalk: { hex: '#F1EFEA', name: 'Chalk' },
  sand: { hex: '#E3D5C3', name: 'Sand' },
  clay: { hex: '#D8A58E', name: 'Clay' },
  blush: { hex: '#EDC6C4', name: 'Blush' },
  lavender: { hex: '#CDC7E6', name: 'Lavender' },
  sky: { hex: '#B8D1EA', name: 'Sky' },
  sage: { hex: '#C2D2BF', name: 'Sage' },
  butter: { hex: '#F1E0A3', name: 'Butter' },
  midnight: { hex: '#2D3240', name: 'Midnight' },
  graphite: { hex: '#5D636E', name: 'Graphite' },
}

export const cases: CaseInfo[] = [
  { key: 'silicone', name: 'Silicone case', price: 12000, blurb: 'Soft-touch silicone with a matching loop. The essential.',
    colors: [P.chalk, P.sand, P.clay, P.blush, P.lavender, P.sky, P.sage, P.butter, P.midnight, P.graphite] },
  { key: 'bear', name: 'Bear ears', price: 14000, blurb: 'Two round ears, nothing more.',
    colors: [P.sand, P.clay, P.blush, P.midnight, P.chalk] },
  { key: 'bunny', name: 'Bunny ears', price: 14000, blurb: 'Tall ears that fold flat in your bag.',
    colors: [P.chalk, P.blush, P.lavender, P.sky] , isNew: true },
  { key: 'cat', name: 'Cat ears', price: 14000, blurb: 'Pointed ears with a soft finish.',
    colors: [P.graphite, P.midnight, P.butter, P.chalk] },
  { key: 'cloud', name: 'Cloud', price: 14000, blurb: 'A soft cloud that glows when it’s time to go.',
    colors: [P.sky, P.chalk, P.lavender, P.blush], isNew: true },
  { key: 'heart', name: 'Heart', price: 14000, blurb: 'A puffy silicone heart with a light inside.',
    colors: [P.blush, P.clay, P.lavender, P.chalk] },
  { key: 'clear', name: 'Clear case', price: 12000, blurb: 'Crystal clear with a frosted edge. Shows off your hub colour.',
    colors: [{ hex: '#FFFFFF', name: 'Clear' }, { hex: '#E8EEF6', name: 'Frost' }] },
  { key: 'leather', name: 'Leather loop', price: 18000, blurb: 'Vegan leather with stitched edges and a metal ring.',
    colors: [{ hex: '#8A5A3B', name: 'Saddle' }, { hex: '#2B2B2E', name: 'Black' }, { hex: '#6E7B5E', name: 'Olive' }, { hex: '#B9A58C', name: 'Taupe' }] },
]
export function caseInfo(k: CaseKey) { return cases.find((c) => c.key === k)! }

export type Finish = 'matte' | 'gloss' | 'metal'
export type CasePattern = 'solid' | 'dots' | 'stripes' | 'checker' | 'gingham' | 'hearts'

export interface CaseChoice {
  key: CaseKey
  color: string
  finish?: Finish
  pattern?: CasePattern
  patternColor?: string
}

/** Every case can take any of these colours. */
export const caseColors: Swatch[] = [
  P.chalk, P.sand, P.clay, P.blush, P.lavender, P.sky, P.sage, P.butter, P.midnight, P.graphite,
  { hex: '#FFFFFF', name: 'White' }, { hex: '#16171B', name: 'Black' },
  { hex: '#3158FF', name: 'Tagly blue' }, { hex: '#F26A3D', name: 'Coral' }, { hex: '#E5487F', name: 'Hot pink' }, { hex: '#2DBE6C', name: 'Grass' },
  { hex: '#D9B45A', name: 'Gold' }, { hex: '#C9CED6', name: 'Silver' }, { hex: '#E3B3A1', name: 'Rose gold' }, { hex: '#E8D7B5', name: 'Champagne' },
]
export const finishes: { key: Finish; label: string; fee: number }[] = [
  { key: 'matte', label: 'Matte', fee: 0 },
  { key: 'gloss', label: 'Glossy', fee: 0 },
  { key: 'metal', label: 'Metallic', fee: 3000 },
]
export const patterns: { key: CasePattern; label: string }[] = [
  { key: 'solid', label: 'Solid' }, { key: 'dots', label: 'Polka dots' }, { key: 'stripes', label: 'Stripes' },
  { key: 'checker', label: 'Checker' }, { key: 'gingham', label: 'Gingham' }, { key: 'hearts', label: 'Hearts' },
]
export const PATTERN_FEE = 2000
export function casePrice(c: CaseChoice) {
  return caseInfo(c.key).price + (c.finish === 'metal' ? 3000 : 0) + (c.pattern && c.pattern !== 'solid' ? PATTERN_FEE : 0)
}

/* Catalog ----------------------------------------------------------------- */

export type ProductId = 'kit' | 'stickers' | 'hub' | 'case'

export const products: Record<ProductId, { id: ProductId; name: string; tagline: string; includes: string[]; basePrice: number }> = {
  kit: {
    id: 'kit', name: 'Starter kit', tagline: 'The basics: a plain hub and clear sticker tags. Decorate later, or now.',
    includes: ['Tagly keyring hub (Ø 38 mm, USB-C)', 'Clear sticker tags, skins sold separately', 'App access, no subscription'], basePrice: 49000,
  },
  stickers: {
    id: 'stickers', name: 'Sticker tags', tagline: 'Stickers that happen to be trackers.',
    includes: ['Die-cut skins you can swap anytime', 'Paper-thin Bluetooth tag underneath', 'Peels off without residue'], basePrice: 19000,
  },
  hub: {
    id: 'hub', name: 'Keyring hub', tagline: 'The hub that lives on your bag.',
    includes: ['LED ring: green when packed, red when not', 'Haptics that buzz before you walk away', 'USB-C, about 3 weeks per charge'], basePrice: 35000,
  },
  case: {
    id: 'case', name: 'Hub case', tagline: 'Dress up your hub. Slips on in seconds.',
    includes: ['Fits the Ø 38 mm hub', 'Window keeps the LED and button usable', 'Swivel clasp included'], basePrice: 12000,
  },
}

export const packSizes = [
  { n: 3, price: 12900, label: '3 tags' },
  { n: 5, price: 19000, label: '5 tags' },
  { n: 10, price: 32000, label: '10 tags' },
]
export const kitPacks = [
  { n: 5, price: 49000, label: 'Hub + 5 tags' },
  { n: 10, price: 59000, label: 'Hub + 10 tags' },
]

export const ENGRAVING_FEE = 3000
export const STRAP_FEE = 4000
export const FREE_SHIPPING_FROM = 50000
export const SHIPPING_STANDARD = 3000
export const SHIPPING_EXPRESS = 5000

export function unitPrice(product: ProductId, pack: number | undefined, hub?: HubDesign) {
  if (product === 'case') return hub?.case ? casePrice(hub.case) : products.case.basePrice
  let p = products[product].basePrice
  if (product === 'stickers') p = packSizes.find((x) => x.n === pack)?.price ?? p
  if (product === 'kit') p = kitPacks.find((x) => x.n === pack)?.price ?? p
  if (hub && product !== 'stickers') {
    if (hub.engraving.trim()) p += ENGRAVING_FEE
    if (hub.strap) p += STRAP_FEE
    if (hub.case) p += casePrice(hub.case)
    if (hub.finish === 'metal') p += 3000
  }
  return p
}

export function won(n: number) { return `₩${n.toLocaleString('ko-KR')}` }

export function shippingFor(subtotal: number, method: 'standard' | 'express') {
  if (method === 'express') return SHIPPING_EXPRESS
  return subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_STANDARD
}

/** The plain starter sticker: clear, no border, just the Tagly dot. */
export const basicSticker: StickerDesign = clear({})
export const basicPack = (n: number) => Array.from({ length: n }, () => basicSticker)

/** Resize a pack, keeping existing designs and filling new slots from `filler`. */
export function fitPack(list: StickerDesign[], n: number, filler: StickerDesign[] = signaturePack()) {
  return Array.from({ length: n }, (_, i) => list[i] ?? filler[i % filler.length])
}

/* Cart -------------------------------------------------------------------- */

export interface CartLine {
  id: string
  product: ProductId
  qty: number
  pack?: number
  stickers?: StickerDesign[]
  hub?: HubDesign
  unitPrice: number
}

export interface Order {
  id: string
  lines: CartLine[]
  subtotal: number
  shipping: number
  total: number
  method: 'standard' | 'express'
  name: string
  email: string
  address: string
  createdAt: number
}

interface ShopCtx {
  cart: CartLine[]
  count: number
  subtotal: number
  add: (line: Omit<CartLine, 'id'>) => void
  setQty: (id: string, qty: number) => void
  remove: (id: string) => void
  orders: Order[]
  placeOrder: (o: Omit<Order, 'id' | 'createdAt'>) => Order
}

const Ctx = createContext<ShopCtx | null>(null)
const CART_KEY = 'tagly-shop-cart-v2'
const ORDERS_KEY = 'tagly-shop-orders-v2'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(() => read(CART_KEY, []))
  const [orders, setOrders] = useState<Order[]>(() => read(ORDERS_KEY, []))
  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch { /* ignore */ } }, [cart])
  useEffect(() => { try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)) } catch { /* ignore */ } }, [orders])

  const add = useCallback((line: Omit<CartLine, 'id'>) => setCart((c) => [...c, { ...line, id: Math.random().toString(36).slice(2, 9) }]), [])
  const setQty = useCallback((id: string, qty: number) => setCart((c) => c.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(9, qty)) } : l))), [])
  const remove = useCallback((id: string) => setCart((c) => c.filter((l) => l.id !== id)), [])
  const placeOrder = useCallback((o: Omit<Order, 'id' | 'createdAt'>) => {
    const order: Order = { ...o, id: 'TG' + Date.now().toString(36).toUpperCase().slice(-6), createdAt: Date.now() }
    setOrders((os) => [order, ...os].slice(0, 20))
    setCart([])
    return order
  }, [])

  const value = useMemo(() => ({
    cart, orders, add, setQty, remove, placeOrder,
    count: cart.reduce((n, l) => n + l.qty, 0),
    subtotal: cart.reduce((n, l) => n + l.qty * l.unitPrice, 0),
  }), [cart, orders, add, setQty, remove, placeOrder])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useShop() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useShop outside ShopProvider')
  return c
}
