import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, ChevronLeft, Minus, Package, Plus, RotateCcw, ShoppingBag, Smartphone, Trash2, Truck } from 'lucide-react'
import {
  ENGRAVING_FEE, FREE_SHIPPING_FROM, SHIPPING_EXPRESS, ShopProvider, bodyColors, defaultKeyring, defaultSticker, inkColors,
  kitPacks, packSizes, products, shippingFor, unitPrice, useShop, won,
} from './shopStore'
import type { CartLine, DotMark, FrameStyle, KeyringDesign, ProductId, StickerDesign } from './shopStore'
import { KeyringArt, StickerArt, fabricStyle, fabrics } from './Previews'
import type { FabricKey } from './Previews'
import { LogoMark } from '../components/icons'
import './shop.css'

/* Presets shown on the home page ------------------------------------------- */

const presets: { name: string; sticker: StickerDesign; keyring: KeyringDesign }[] = [
  { name: 'Classic clear', sticker: defaultSticker, keyring: defaultKeyring },
  { name: 'Coral confetti', sticker: { shape: 'square', frame: 'confetti', frameColor: '#F26A3D', dot: 'star', dotColor: '#F26A3D', initials: '' }, keyring: { body: '#F6C6B8', ring: 'gold', engraving: '', font: 'sans' } },
  { name: 'Midnight dash', sticker: { shape: 'circle', frame: 'dashed', frameColor: '#FFFFFF', dot: 'initials', dotColor: '#12161C', initials: 'HJ' }, keyring: { body: '#12161C', ring: 'black', engraving: 'HYEJIN', font: 'mono' } },
  { name: 'Sage stripes', sticker: { shape: 'square', frame: 'stripes', frameColor: '#22A06B', dot: 'heart', dotColor: '#22A06B', initials: '' }, keyring: { body: '#BFD8C9', ring: 'silver', engraving: '', font: 'serif' } },
]

/* Layout --------------------------------------------------------------------- */

function ShopLayout({ children }: { children: ReactNode }) {
  const { count } = useShop()
  useEffect(() => { document.title = 'Tagly Shop · Design your own' }, [])
  return (
    <div className="shop">
      <header className="shop-header">
        <div className="shop-wrap shop-header-inner">
          <Link to="/shop" className="shop-logo"><LogoMark size={30} /> <b>Tagly</b><span>shop</span></Link>
          <nav className="shop-nav">
            <NavLink to="/shop/design/kit">Starter kit</NavLink>
            <NavLink to="/shop/design/stickers">Stickers</NavLink>
            <NavLink to="/shop/design/keyring">Keyring</NavLink>
          </nav>
          <div className="shop-header-actions">
            <Link to="/" className="shop-applink"><Smartphone size={16} /> Open app</Link>
            <Link to="/shop/cart" className="shop-cart" aria-label={`Cart, ${count} items`}>
              <ShoppingBag size={20} />
              {count > 0 && <span className="shop-cart-count">{count}</span>}
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="shop-footer">
        <div className="shop-wrap">
          <p><b>Tagly</b> · Never leave without it.</p>
          <p className="muted">Concept store for a student design project. Prices are proposals; orders are demonstrations and no payment is taken.</p>
        </div>
      </footer>
    </div>
  )
}

/* Home -------------------------------------------------------------------------- */

function ShopHome() {
  const [fabric, setFabric] = useState<FabricKey>('navy')
  return (
    <>
      <section className="shop-hero">
        <div className="shop-wrap hero-grid">
          <div className="hero-copy">
            <p className="kicker">Clear stickers · smart keyring</p>
            <h1>Make it yours.<br />Never leave it behind.</h1>
            <p className="lede">Design see-through tracking stickers and a keyring that match your bag. Tagly checks what’s inside every morning and tells you what’s missing.</p>
            <div className="hero-cta">
              <Link to="/shop/design/kit" className="sbtn sbtn-dark">Design your kit <ArrowRight size={18} /></Link>
              <Link to="/shop/design/stickers" className="sbtn sbtn-light">Just stickers</Link>
            </div>
            <ul className="hero-points">
              <li><Check size={16} /> Battery-free stickers, recharge from Wi-Fi</li>
              <li><Check size={16} /> Free shipping from {won(FREE_SHIPPING_FROM)}</li>
              <li><Check size={16} /> Works with the Tagly app, no subscription</li>
            </ul>
          </div>
          <div className="hero-stage" style={fabricStyle(fabric)}>
            <div className="sh-sticker s1"><StickerArt d={presets[1].sticker} /></div>
            <div className="sh-sticker s2"><StickerArt d={presets[2].sticker} /></div>
            <div className="sh-sticker s3"><StickerArt d={defaultSticker} /></div>
            <div className="sh-keyring"><KeyringArt d={presets[0].keyring} /></div>
            <div className="fabric-picker" role="group" aria-label="Bag fabric">
              {fabrics.map((f) => (
                <button key={f.key} type="button" aria-label={f.name} aria-pressed={fabric === f.key}
                  className={fabric === f.key ? 'on' : ''} style={{ background: f.a }} onClick={() => setFabric(f.key)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="shop-wrap shop-section">
        <h2>Pick a starting point</h2>
        <p className="muted">Every product is fully customisable. Start from scratch or from a ready-made look.</p>
        <div className="product-grid">
          {(['kit', 'stickers', 'keyring'] as ProductId[]).map((id) => {
            const p = products[id]
            return (
              <Link key={id} to={`/shop/design/${id}`} className="product-card">
                <div className="product-media" style={fabricStyle(id === 'keyring' ? 'sand' : id === 'kit' ? 'navy' : 'olive')}>
                  {id !== 'keyring' && <div className="pm-sticker"><StickerArt d={id === 'kit' ? defaultSticker : presets[3].sticker} /></div>}
                  {id !== 'stickers' && <div className="pm-keyring"><KeyringArt d={id === 'kit' ? defaultKeyring : presets[2].keyring} /></div>}
                </div>
                <div className="product-info">
                  <h3>{p.name}</h3>
                  <p className="muted">{p.tagline}</p>
                  <p className="price">{id === 'stickers' ? `from ${won(packSizes[0].price)}` : won(p.basePrice)}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="shop-wrap shop-section">
        <h2>Looks to start from</h2>
        <div className="preset-grid">
          {presets.map((pr, i) => (
            <Link key={pr.name} to={`/shop/design/kit?preset=${i}`} className="preset-card">
              <div className="preset-media" style={fabricStyle(fabrics[i % fabrics.length].key)}>
                <div className="pr-sticker"><StickerArt d={pr.sticker} /></div>
                <div className="pr-keyring"><KeyringArt d={pr.keyring} /></div>
              </div>
              <span>{pr.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="shop-wrap shop-section how">
        <h2>How a clear sticker works</h2>
        <div className="how-grid">
          <div><span className="how-n">1</span><h3>Harvest</h3><p>A fine mesh antenna, almost invisible, collects energy from the Wi-Fi around you.</p></div>
          <div><span className="how-n">2</span><h3>Beacon</h3><p>When it has enough, the sticker sends a short Bluetooth signal to your keyring or phone.</p></div>
          <div><span className="how-n">3</span><h3>Check</h3><p>Every morning the app matches what’s in your bag to your timetable, calendar and the weather.</p></div>
        </div>
        <p className="muted small">Your design is printed only on the outer border and the center dot, so the antenna keeps working. The dot covers the tiny chip.</p>
      </section>
    </>
  )
}

/* Designer ------------------------------------------------------------------------ */

const frameOpts: { key: FrameStyle; label: string }[] = [
  { key: 'none', label: 'Clear' }, { key: 'solid', label: 'Line' }, { key: 'dashed', label: 'Dashed' }, { key: 'dots', label: 'Dots' },
  { key: 'stripes', label: 'Stripes' }, { key: 'checker', label: 'Checker' }, { key: 'confetti', label: 'Confetti' },
]
const dotOpts: { key: DotMark; label: string }[] = [
  { key: 'logo', label: 'Tagly t' }, { key: 'heart', label: 'Heart' }, { key: 'star', label: 'Star' }, { key: 'initials', label: 'Initials' },
]

function Swatches({ colors, value, onChange, label }: { colors: { hex: string; name: string }[]; value: string; onChange: (hex: string) => void; label: string }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {colors.map((c) => (
        <button key={c.hex} type="button" role="radio" aria-checked={value === c.hex} aria-label={c.name} title={c.name}
          className={value === c.hex ? 'on' : ''} style={{ background: c.hex }} onClick={() => onChange(c.hex)} />
      ))}
    </div>
  )
}

function Choice<T extends string>({ opts, value, onChange, label }: { opts: { key: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="choices" role="radiogroup" aria-label={label}>
      {opts.map((o) => (
        <button key={o.key} type="button" role="radio" aria-checked={value === o.key} className={value === o.key ? 'on' : ''} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="dfield">
      <div className="dfield-head"><span>{label}</span>{hint && <small>{hint}</small>}</div>
      {children}
    </div>
  )
}

function StickerControls({ d, set }: { d: StickerDesign; set: (d: StickerDesign) => void }) {
  return (
    <>
      <Field label="Shape" hint="40 × 40 mm">
        <Choice label="Shape" value={d.shape} onChange={(shape) => set({ ...d, shape })} opts={[{ key: 'square', label: 'Rounded square' }, { key: 'circle', label: 'Circle' }]} />
      </Field>
      <Field label="Border print" hint="Printed on the outer 4 mm">
        <Choice label="Border print" value={d.frame} onChange={(frame) => set({ ...d, frame })} opts={frameOpts} />
      </Field>
      {d.frame !== 'none' && (
        <Field label="Border colour">
          <Swatches label="Border colour" colors={inkColors} value={d.frameColor} onChange={(frameColor) => set({ ...d, frameColor })} />
        </Field>
      )}
      <Field label="Center dot" hint="Covers the chip">
        <Choice label="Center dot" value={d.dot} onChange={(dot) => set({ ...d, dot })} opts={dotOpts} />
      </Field>
      {d.dot === 'initials' && (
        <Field label="Initials" hint="Up to 3 letters">
          <input className="dinput" value={d.initials} maxLength={3} placeholder="AB"
            onChange={(e) => set({ ...d, initials: e.target.value.replace(/[^a-zA-Z0-9가-힣]/g, '') })} />
        </Field>
      )}
      <Field label="Dot colour">
        <Swatches label="Dot colour" colors={inkColors} value={d.dotColor} onChange={(dotColor) => set({ ...d, dotColor })} />
      </Field>
    </>
  )
}

function KeyringControls({ d, set }: { d: KeyringDesign; set: (d: KeyringDesign) => void }) {
  return (
    <>
      <Field label="Body colour" hint="Matte finish">
        <Swatches label="Body colour" colors={bodyColors} value={d.body} onChange={(body) => set({ ...d, body })} />
      </Field>
      <Field label="Ring">
        <Choice label="Ring" value={d.ring} onChange={(ring) => set({ ...d, ring })} opts={[{ key: 'silver', label: 'Silver' }, { key: 'gold', label: 'Gold' }, { key: 'black', label: 'Black' }]} />
      </Field>
      <Field label="Engraving" hint={`Up to 10 characters · +${won(ENGRAVING_FEE)}`}>
        <input className="dinput" value={d.engraving} maxLength={10} placeholder="Your name"
          onChange={(e) => set({ ...d, engraving: e.target.value.replace(/[^a-zA-Z0-9 .&-]/g, '') })} />
      </Field>
      {d.engraving.trim() && (
        <Field label="Engraving style">
          <Choice label="Engraving style" value={d.font} onChange={(font) => set({ ...d, font })} opts={[{ key: 'sans', label: 'Modern' }, { key: 'serif', label: 'Classic' }, { key: 'mono', label: 'Mono' }]} />
        </Field>
      )}
    </>
  )
}

function Designer() {
  const { product } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { add } = useShop()
  const pid = (['kit', 'stickers', 'keyring'].includes(product ?? '') ? product : null) as ProductId | null
  const preset = presets[Number(params.get('preset'))] ?? presets[0]
  const [sticker, setSticker] = useState<StickerDesign>(preset.sticker)
  const [keyring, setKeyring] = useState<KeyringDesign>(preset.keyring)
  const [pack, setPack] = useState(5)
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState<'sticker' | 'keyring'>('sticker')
  const [fabric, setFabric] = useState<FabricKey>('navy')
  const [added, setAdded] = useState(false)

  useEffect(() => { setTab(pid === 'keyring' ? 'keyring' : 'sticker'); setPack(pid === 'stickers' ? 5 : 5); setAdded(false) }, [pid])
  if (!pid) return <Navigate to="/shop" replace />

  const p = products[pid]
  const hasSticker = pid !== 'keyring'
  const hasKeyring = pid !== 'stickers'
  const price = unitPrice(pid, hasSticker ? pack : undefined, hasKeyring ? keyring : undefined)
  const packs = pid === 'kit' ? kitPacks : pid === 'stickers' ? packSizes : []
  const showSticker = hasSticker && (!hasKeyring || tab === 'sticker')

  return (
    <div className="shop-wrap designer">
      <Link to="/shop" className="crumb"><ChevronLeft size={16} /> Shop</Link>
      <div className="designer-grid">
        <div className="designer-stage-col">
          <div className="designer-stage" style={fabricStyle(fabric)}>
            {hasSticker && (
              <div className={`ds-sticker ${showSticker ? 'focus' : 'dim'} ${hasKeyring ? 'with-keyring' : ''}`} onClick={() => hasKeyring && setTab('sticker')}>
                <StickerArt d={sticker} />
              </div>
            )}
            {hasKeyring && (
              <div className={`ds-keyring ${!showSticker ? 'focus' : 'dim'} ${hasSticker ? 'with-sticker' : ''}`} onClick={() => hasSticker && setTab('keyring')}>
                <KeyringArt d={keyring} />
              </div>
            )}
            <div className="fabric-picker" role="group" aria-label="Preview on bag fabric">
              {fabrics.map((f) => (
                <button key={f.key} type="button" aria-label={f.name} aria-pressed={fabric === f.key}
                  className={fabric === f.key ? 'on' : ''} style={{ background: f.a }} onClick={() => setFabric(f.key)} />
              ))}
            </div>
          </div>
          <p className="muted small center">Preview on {fabrics.find((f) => f.key === fabric)?.name.toLowerCase()}. The clear film lets your bag show through.</p>
        </div>

        <div className="designer-panel">
          <p className="kicker">{hasSticker && hasKeyring ? 'Design both' : 'Design yours'}</p>
          <h1>{p.name}</h1>
          <p className="muted">{p.tagline}</p>
          <p className="designer-price">{won(price)}</p>

          {hasSticker && hasKeyring && (
            <div className="dtabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'sticker'} className={tab === 'sticker' ? 'on' : ''} onClick={() => setTab('sticker')}>Stickers</button>
              <button type="button" role="tab" aria-selected={tab === 'keyring'} className={tab === 'keyring' ? 'on' : ''} onClick={() => setTab('keyring')}>Keyring</button>
            </div>
          )}

          <div className="dcontrols">
            {showSticker ? <StickerControls d={sticker} set={setSticker} /> : <KeyringControls d={keyring} set={setKeyring} />}
          </div>

          {packs.length > 0 && (
            <Field label="Pack">
              <div className="packs">
                {packs.map((pk) => (
                  <button key={pk.n} type="button" className={pack === pk.n ? 'on' : ''} onClick={() => setPack(pk.n)} aria-pressed={pack === pk.n}>
                    <b>{pk.label}</b><span>{won(pk.price)}</span>
                  </button>
                ))}
              </div>
            </Field>
          )}

          <div className="buy-row">
            <div className="qty" aria-label="Quantity">
              <button type="button" aria-label="Decrease" onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={16} /></button>
              <span>{qty}</span>
              <button type="button" aria-label="Increase" onClick={() => setQty(Math.min(9, qty + 1))}><Plus size={16} /></button>
            </div>
            <button type="button" className="sbtn sbtn-dark grow" onClick={() => {
              add({ product: pid, qty, pack: hasSticker ? pack : undefined, sticker: hasSticker ? sticker : undefined, keyring: hasKeyring ? keyring : undefined, unitPrice: price })
              setAdded(true)
            }}>
              <ShoppingBag size={18} /> Add to cart · {won(price * qty)}
            </button>
          </div>
          {added && (
            <div className="added-note" role="status">
              <Check size={16} /> Added to your cart.
              <button type="button" className="slink" onClick={() => nav('/shop/cart')}>View cart</button>
            </div>
          )}

          <ul className="includes">
            {p.includes.map((t) => <li key={t}><Check size={15} /> {t}</li>)}
            {hasSticker && <li><Check size={15} /> Prints stay on the border so the antenna keeps working</li>}
          </ul>
          <button type="button" className="slink reset" onClick={() => { setSticker(defaultSticker); setKeyring(defaultKeyring) }}>
            <RotateCcw size={14} /> Reset design
          </button>
        </div>
      </div>
    </div>
  )
}

/* Cart ---------------------------------------------------------------------------- */

function LineThumb({ l }: { l: CartLine }) {
  return (
    <div className="line-thumb" style={fabricStyle('navy')}>
      {l.sticker && <div className={l.keyring ? 'lt-sticker small' : 'lt-sticker'}><StickerArt d={l.sticker} showAntenna={false} /></div>}
      {l.keyring && <div className={l.sticker ? 'lt-keyring small' : 'lt-keyring'}><KeyringArt d={l.keyring} /></div>}
    </div>
  )
}

function lineSummary(l: CartLine) {
  const parts: string[] = []
  if (l.pack) parts.push(`${l.pack} stickers`)
  if (l.sticker) {
    const s = l.sticker
    parts.push(`${s.shape === 'circle' ? 'Circle' : 'Square'} · ${frameOpts.find((f) => f.key === s.frame)?.label.toLowerCase()} border · ${s.dot === 'initials' ? `“${(s.initials || 'AB').toUpperCase()}”` : dotOpts.find((d) => d.key === s.dot)?.label.toLowerCase()} dot`)
  }
  if (l.keyring) {
    const k = l.keyring
    parts.push(`${bodyColors.find((c) => c.hex === k.body)?.name ?? 'Custom'} keyring · ${k.ring} ring${k.engraving.trim() ? ` · “${k.engraving.toUpperCase()}”` : ''}`)
  }
  return parts
}

function Cart() {
  const { cart, subtotal, setQty, remove } = useShop()
  const nav = useNavigate()
  const shipping = cart.length ? shippingFor(subtotal, 'standard') : 0
  const toFree = FREE_SHIPPING_FROM - subtotal
  return (
    <div className="shop-wrap shop-section narrow">
      <h1>Your cart</h1>
      {cart.length === 0 ? (
        <div className="empty-cart">
          <Package size={36} />
          <p>Your cart is empty.</p>
          <Link to="/shop/design/kit" className="sbtn sbtn-dark">Design your kit</Link>
        </div>
      ) : (
        <div className="cart-grid">
          <ul className="cart-lines">
            {cart.map((l) => (
              <li key={l.id} className="cart-line">
                <LineThumb l={l} />
                <div className="cl-info">
                  <b>{products[l.product].name}</b>
                  {lineSummary(l).map((t) => <span key={t} className="muted small">{t}</span>)}
                  <div className="cl-actions">
                    <div className="qty small" aria-label="Quantity">
                      <button type="button" aria-label="Decrease" onClick={() => setQty(l.id, l.qty - 1)}><Minus size={14} /></button>
                      <span>{l.qty}</span>
                      <button type="button" aria-label="Increase" onClick={() => setQty(l.id, l.qty + 1)}><Plus size={14} /></button>
                    </div>
                    <button type="button" className="slink danger" onClick={() => remove(l.id)}><Trash2 size={14} /> Remove</button>
                  </div>
                </div>
                <b className="cl-price">{won(l.unitPrice * l.qty)}</b>
              </li>
            ))}
          </ul>
          <aside className="summary">
            <h2>Summary</h2>
            <div className="sum-row"><span>Subtotal</span><b>{won(subtotal)}</b></div>
            <div className="sum-row"><span>Shipping</span><b>{shipping === 0 ? 'Free' : won(shipping)}</b></div>
            {toFree > 0 && <p className="ship-hint"><Truck size={15} /> Add {won(toFree)} more for free shipping.</p>}
            <div className="sum-row total"><span>Total</span><b>{won(subtotal + shipping)}</b></div>
            <button type="button" className="sbtn sbtn-dark block" onClick={() => nav('/shop/checkout')}>Checkout <ArrowRight size={18} /></button>
            <Link to="/shop" className="slink center-block">Keep shopping</Link>
          </aside>
        </div>
      )}
    </div>
  )
}

/* Checkout ------------------------------------------------------------------------ */

function Checkout() {
  const { cart, subtotal, placeOrder } = useShop()
  const nav = useNavigate()
  const [method, setMethod] = useState<'standard' | 'express'>('standard')
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', detail: '' })
  const [tried, setTried] = useState(false)
  const placed = useRef(false)
  const shipping = shippingFor(subtotal, method)
  const errors = useMemo(() => ({
    name: !form.name.trim() ? 'Enter your name.' : '',
    email: !/^\S+@\S+\.\S+$/.test(form.email) ? 'Enter a valid email.' : '',
    address: form.address.trim().length < 6 ? 'Enter your delivery address.' : '',
  }), [form])
  const valid = !errors.name && !errors.email && !errors.address

  if (cart.length === 0) return placed.current ? null : <Navigate to="/shop/cart" replace />

  const input = (key: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => {
    const err = tried ? (errors as Record<string, string>)[key] : ''
    return (
      <label className="cfield">
        <span>{label}</span>
        <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} aria-invalid={!!err} {...props} />
        {err && <small className="err">{err}</small>}
      </label>
    )
  }

  return (
    <div className="shop-wrap shop-section narrow">
      <Link to="/shop/cart" className="crumb"><ChevronLeft size={16} /> Cart</Link>
      <h1>Checkout</h1>
      <form className="cart-grid" onSubmit={(e) => {
        e.preventDefault(); setTried(true)
        if (!valid) return
        placed.current = true
        const order = placeOrder({
          lines: cart, subtotal, shipping, total: subtotal + shipping, method,
          name: form.name.trim(), email: form.email.trim(), address: `${form.address.trim()} ${form.detail.trim()}`.trim(),
        })
        nav(`/shop/order/${order.id}`)
      }}>
        <div className="checkout-form">
          <h2>Delivery</h2>
          {input('name', 'Full name', { autoComplete: 'name' })}
          <div className="cfield-row">
            {input('email', 'Email', { type: 'email', autoComplete: 'email' })}
            {input('phone', 'Phone (optional)', { type: 'tel', autoComplete: 'tel' })}
          </div>
          {input('address', 'Address', { autoComplete: 'street-address', placeholder: 'e.g. 25-2 Sungkyunkwan-ro, Jongno-gu, Seoul' })}
          {input('detail', 'Apartment, room (optional)')}

          <h2>Shipping</h2>
          <div className="ship-opts">
            <label className={method === 'standard' ? 'on' : ''}>
              <input type="radio" name="ship" checked={method === 'standard'} onChange={() => setMethod('standard')} />
              <span><b>Standard</b><small>2–3 business days</small></span>
              <b>{shippingFor(subtotal, 'standard') === 0 ? 'Free' : won(shippingFor(subtotal, 'standard'))}</b>
            </label>
            <label className={method === 'express' ? 'on' : ''}>
              <input type="radio" name="ship" checked={method === 'express'} onChange={() => setMethod('express')} />
              <span><b>Express</b><small>Next business day</small></span>
              <b>{won(SHIPPING_EXPRESS)}</b>
            </label>
          </div>

          <h2>Payment</h2>
          <div className="demo-pay">
            <b>Demo checkout</b>
            <p>This is a concept store for a class project. No payment details are collected and nothing is charged. Placing the order shows the confirmation flow.</p>
          </div>
        </div>
        <aside className="summary">
          <h2>Order</h2>
          {cart.map((l) => (
            <div key={l.id} className="mini-line">
              <LineThumb l={l} />
              <span><b>{products[l.product].name}</b><small className="muted">× {l.qty}</small></span>
              <b>{won(l.unitPrice * l.qty)}</b>
            </div>
          ))}
          <div className="sum-row"><span>Subtotal</span><b>{won(subtotal)}</b></div>
          <div className="sum-row"><span>Shipping</span><b>{shipping === 0 ? 'Free' : won(shipping)}</b></div>
          <div className="sum-row total"><span>Total</span><b>{won(subtotal + shipping)}</b></div>
          {tried && !valid && <p className="err">Please fill in the highlighted fields.</p>}
          <button type="submit" className="sbtn sbtn-dark block">Place order (demo)</button>
        </aside>
      </form>
    </div>
  )
}

/* Confirmation ---------------------------------------------------------------- */

function OrderDone() {
  const { id } = useParams()
  const { orders } = useShop()
  const order = orders.find((o) => o.id === id)
  if (!order) return <Navigate to="/shop" replace />
  const eta = new Date(order.createdAt)
  let days = order.method === 'express' ? 1 : 3
  while (days > 0) { eta.setDate(eta.getDate() + 1); if (eta.getDay() !== 0 && eta.getDay() !== 6) days-- }
  return (
    <div className="shop-wrap shop-section narrow done">
      <span className="done-check"><Check size={30} strokeWidth={3} /></span>
      <h1>Thanks, {order.name.split(' ')[0]}!</h1>
      <p className="muted">Order <b>{order.id}</b> is in. We’d print your designs and ship them by <b>{eta.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</b>.</p>
      <p className="muted small">Demo order: nothing was charged and no email was sent.</p>
      <div className="done-lines">
        {order.lines.map((l) => (
          <div key={l.id} className="mini-line">
            <LineThumb l={l} />
            <span><b>{products[l.product].name}</b><small className="muted">{lineSummary(l).join(' · ')}</small></span>
            <b>× {l.qty}</b>
          </div>
        ))}
        <div className="sum-row total"><span>Total</span><b>{won(order.total)}</b></div>
      </div>
      <div className="done-next">
        <h2>While you wait</h2>
        <p className="muted">Set up the app now: add your timetable and items, and your stickers will pair in seconds when they arrive.</p>
        <div className="hero-cta center">
          <Link to="/" className="sbtn sbtn-dark"><Smartphone size={18} /> Open the Tagly app</Link>
          <Link to="/shop" className="sbtn sbtn-light">Back to shop</Link>
        </div>
      </div>
    </div>
  )
}

/* Entry ----------------------------------------------------------------------- */

export default function ShopApp() {
  return (
    <ShopProvider>
      <ShopLayout>
        <Routes>
          <Route index element={<ShopHome />} />
          <Route path="design/:product" element={<Designer />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order/:id" element={<OrderDone />} />
          <Route path="*" element={<Navigate to="/shop" replace />} />
        </Routes>
      </ShopLayout>
    </ShopProvider>
  )
}

