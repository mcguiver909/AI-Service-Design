import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/* Designs ----------------------------------------------------------- */

export type StickerShape = 'square' | 'circle'
export type FrameStyle = 'none' | 'solid' | 'dashed' | 'dots' | 'stripes' | 'checker' | 'confetti'
export type DotMark = 'logo' | 'heart' | 'star' | 'initials'

export interface StickerDesign {
  shape: StickerShape
  frame: FrameStyle
  frameColor: string
  dot: DotMark
  dotColor: string
  initials: string
}

export type RingFinish = 'silver' | 'gold' | 'black'
export type EngraveFont = 'sans' | 'serif' | 'mono'

export interface KeyringDesign {
  body: string
  ring: RingFinish
  engraving: string
  font: EngraveFont
}

export const defaultSticker: StickerDesign = {
  shape: 'square', frame: 'none', frameColor: '#3158FF', dot: 'logo', dotColor: '#3158FF', initials: '',
}
export const defaultKeyring: KeyringDesign = { body: '#F4F1EA', ring: 'silver', engraving: '', font: 'sans' }

export const inkColors = [
  { hex: '#3158FF', name: 'Tagly blue' },
  { hex: '#12161C', name: 'Ink black' },
  { hex: '#F26A3D', name: 'Coral' },
  { hex: '#22A06B', name: 'Mint' },
  { hex: '#7357E0', name: 'Violet' },
  { hex: '#E8B100', name: 'Sunflower' },
  { hex: '#E5487F', name: 'Pink' },
  { hex: '#FFFFFF', name: 'White' },
]

export const bodyColors = [
  { hex: '#F4F1EA', name: 'Oat' },
  { hex: '#12161C', name: 'Midnight' },
  { hex: '#3158FF', name: 'Tagly blue' },
  { hex: '#BFD8C9', name: 'Sage' },
  { hex: '#F6C6B8', name: 'Peach' },
  { hex: '#CFC6F5', name: 'Lilac' },
  { hex: '#FFD66B', name: 'Butter' },
  { hex: '#8B95A7', name: 'Slate' },
]

/* Catalog --------------------------------------------------------------- */

export type ProductId = 'kit' | 'stickers' | 'keyring'

export interface Product {
  id: ProductId
  name: string
  tagline: string
  includes: string[]
  basePrice: number
}

export const products: Record<ProductId, Product> = {
  kit: {
    id: 'kit', name: 'Starter kit', tagline: 'Keyring + clear stickers. Everything to start.',
    includes: ['1 Tagly keyring (USB-C)', 'Clear tracking stickers', 'App access, no subscription'], basePrice: 49000,
  },
  stickers: {
    id: 'stickers', name: 'Clear sticker pack', tagline: 'See-through stickers for everything you carry.',
    includes: ['40 × 40 mm clear stickers', 'Battery-free, recharge from Wi-Fi', 'Repositionable adhesive'], basePrice: 19000,
  },
  keyring: {
    id: 'keyring', name: 'Tagly keyring', tagline: 'The bridge between your bag and your phone.',
    includes: ['Pin-shaped status LED', 'Find / ring button', 'USB-C, about 3 weeks per charge'], basePrice: 35000,
  },
}

export const packSizes: { n: number; price: number; label: string }[] = [
  { n: 3, price: 12900, label: '3 stickers' },
  { n: 5, price: 19000, label: '5 stickers' },
  { n: 10, price: 32000, label: '10 stickers' },
]

/** Kit: base includes 5 stickers; 10 adds the price difference. */
export const kitPacks = [
  { n: 5, price: 49000, label: 'Keyring + 5 stickers' },
  { n: 10, price: 59000, label: 'Keyring + 10 stickers' },
]

export const ENGRAVING_FEE = 3000
export const FREE_SHIPPING_FROM = 50000
export const SHIPPING_STANDARD = 3000
export const SHIPPING_EXPRESS = 5000

export interface CartLine {
  id: string
  product: ProductId
  qty: number
  pack?: number
  sticker?: StickerDesign
  keyring?: KeyringDesign
  unitPrice: number
}

export function unitPrice(product: ProductId, pack: number | undefined, keyring?: KeyringDesign) {
  let p = products[product].basePrice
  if (product === 'stickers') p = packSizes.find((x) => x.n === pack)?.price ?? p
  if (product === 'kit') p = kitPacks.find((x) => x.n === pack)?.price ?? p
  if (keyring && keyring.engraving.trim() && product !== 'stickers') p += ENGRAVING_FEE
  return p
}

export function won(n: number) {
  return `₩${n.toLocaleString('ko-KR')}`
}

export function shippingFor(subtotal: number, method: 'standard' | 'express') {
  if (method === 'express') return SHIPPING_EXPRESS
  return subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_STANDARD
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

/* Cart context ------------------------------------------------------------ */

interface ShopCtx {
  cart: CartLine[]
  count: number
  subtotal: number
  add: (line: Omit<CartLine, 'id'>) => void
  setQty: (id: string, qty: number) => void
  remove: (id: string) => void
  clear: () => void
  orders: Order[]
  placeOrder: (o: Omit<Order, 'id' | 'createdAt'>) => Order
}

const Ctx = createContext<ShopCtx | null>(null)
const CART_KEY = 'tagly-shop-cart'
const ORDERS_KEY = 'tagly-shop-orders'

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

  const add = useCallback((line: Omit<CartLine, 'id'>) => {
    setCart((c) => [...c, { ...line, id: Math.random().toString(36).slice(2, 9) }])
  }, [])
  const setQty = useCallback((id: string, qty: number) => {
    setCart((c) => c.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(9, qty)) } : l)))
  }, [])
  const remove = useCallback((id: string) => setCart((c) => c.filter((l) => l.id !== id)), [])
  const clear = useCallback(() => setCart([]), [])
  const placeOrder = useCallback((o: Omit<Order, 'id' | 'createdAt'>) => {
    const order: Order = { ...o, id: 'TG' + Date.now().toString(36).toUpperCase().slice(-6), createdAt: Date.now() }
    setOrders((os) => [order, ...os].slice(0, 20))
    setCart([])
    return order
  }, [])

  const value = useMemo(() => {
    const count = cart.reduce((n, l) => n + l.qty, 0)
    const subtotal = cart.reduce((n, l) => n + l.qty * l.unitPrice, 0)
    return { cart, count, subtotal, add, setQty, remove, clear, orders, placeOrder }
  }, [cart, orders, add, setQty, remove, clear, placeOrder])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useShop() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useShop outside ShopProvider')
  return c
}
