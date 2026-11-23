import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, Check, ChevronLeft, ChevronRight, ImagePlus, Minus, Package, Plus, RotateCcw, ShoppingBag, Smartphone, Trash2, Truck, Upload,
} from 'lucide-react'
import {
  ENGRAVING_FEE, FREE_SHIPPING_FROM, PATTERN_FEE, SHIPPING_EXPRESS, STRAP_FEE, ShopProvider, art, artInfo, artOrder, byId, caseColors, caseInfo, casePrice, cases, finishes, patterns,
  baseSticker, basicPack, basicSticker, colorName, defaultHub, designLabel, fitPack, gallery, kitPacks, packSizes, products, sets, shellColors, shippingFor, signaturePack,
  stickerColors, strapColors, unitPrice, useShop, won,
} from './shopStore'
import type {
  CartLine, CaseChoice, CaseKey, CasePattern, DotMark, Finish, FrameStyle, HubDesign, ProductId, SetKey, StickerDesign, Swatch,
} from './shopStore'
import { CaseArt, HubArt, StickerArt, fabricStyle, fabrics } from './Previews'
import type { FabricKey, LedState } from './Previews'
import { LogoMark } from '../components/icons'
import { loadImage, makeDieCut } from './diecut'
import type { CutShape } from './diecut'
import './shop.css'

/* Shared bits ---------------------------------------------------------------------- */

function HubOrCase({ hub, led = 'green' }: { hub: HubDesign; led?: LedState }) {
  return hub.case ? <CaseArt c={hub.case} shell={hub.shell} led={led} /> : <HubArt d={hub} led={led} />
}

function Swatches({ colors, value, onChange, label, size = 34 }: { colors: Swatch[]; value: string | null; onChange: (hex: string) => void; label: string; size?: number }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {colors.map((c) => (
        <button key={c.hex} type="button" role="radio" aria-checked={value === c.hex} aria-label={c.name} title={c.name}
          className={value === c.hex ? 'on' : ''} style={{ background: c.hex, width: size, height: size }} onClick={() => onChange(c.hex)} />
      ))}
    </div>
  )
}

function Choice<T extends string>({ opts, value, onChange, label }: { opts: { key: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="choices" role="radiogroup" aria-label={label}>
      {opts.map((o) => (
        <button key={o.key} type="button" role="radio" aria-checked={value === o.key} className={value === o.key ? 'on' : ''} onClick={() => onChange(o.key)}>{o.label}</button>
      ))}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="dfield">
      <div className="dfield-head"><span>{label}</span>{hint && <small>{hint}</small>}</div>
      {children}
    </div>
  )
}

/** Horizontal shelf with arrow buttons (Apple-store style). */
function Shelf({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: 'smooth' })
  return (
    <section className="shelf">
      <div className="shop-wrap shelf-head">
        <h2><b>{title}</b> <span>{sub}</span></h2>
        <div className="shelf-arrows">
          <button type="button" aria-label="Scroll left" onClick={() => go(-1)}><ChevronLeft size={18} /></button>
          <button type="button" aria-label="Scroll right" onClick={() => go(1)}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="shelf-track" ref={ref}>
        <div className="shelf-inner">{children}</div>
      </div>
    </section>
  )
}

/* Layout ------------------------------------------------------------------------------- */

function ShopLayout({ children }: { children: ReactNode }) {
  const { count } = useShop()
  useEffect(() => { document.title = 'Tagly Store' }, [])
  return (
    <div className="shop">
      <header className="shop-header">
        <div className="shop-wrap shop-header-inner">
          <Link to="/shop" className="shop-logo"><LogoMark size={28} /> <b>Tagly</b></Link>
          <nav className="shop-nav">
            <NavLink to="/shop" end>Store</NavLink>
            <NavLink to="/shop/gallery">Gallery</NavLink>
            <NavLink to="/shop/design/kit">Starter kit</NavLink>
            <NavLink to="/shop/design/stickers">Sticker tags</NavLink>
            <NavLink to="/shop/design/hub">Hub</NavLink>
            <NavLink to="/shop/gallery?tab=cases">Cases</NavLink>
          </nav>
          <div className="shop-header-actions">
            <Link to="/" className="shop-applink"><Smartphone size={16} /> <span>Open app</span></Link>
            <Link to="/shop/cart" className="shop-cart" aria-label={`Bag, ${count} items`}>
              <ShoppingBag size={20} />
              {count > 0 && <span className="shop-cart-count">{count}</span>}
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="shop-footer">
        <div className="shop-wrap">
          <p><b>Tagly</b> · Your bag remembers what you forget.</p>
          <p className="muted">Concept store for a student design project. Prices are proposals; orders are demonstrations and no payment is taken.</p>
        </div>
      </footer>
    </div>
  )
}

/* Store home -------------------------------------------------------------------------------- */

const pinkHub: HubDesign = { ...defaultHub, shell: '#F6C6B8', strap: '#F26A3D' }
const midnightHub: HubDesign = { ...defaultHub, shell: '#1E2433', loop: 'black', strap: null, engraving: 'TAGLY' }

function ShopHome() {
  const sig = signaturePack()
  const setSkins = (k: SetKey) => gallery.filter((g) => g.set === k).slice(0, 3).map((g) => g.design)
  return (
    <>
      <section className="shop-wrap store-top">
        <h1 className="store-title">Store</h1>
        <div className="store-top-side">
          <p>Your bag remembers<br />what you forget.</p>
          <Link to="/shop/gallery" className="slink">Browse the design gallery <ArrowRight size={14} /></Link>
          <Link to="/" className="slink">Open the Tagly app <ArrowRight size={14} /></Link>
        </div>
      </section>

      <nav className="shop-wrap cat-row" aria-label="Categories">
        <Link to="/shop/design/kit" className="cat"><span className="cat-img duo"><span className="c1"><HubArt d={defaultHub} led="green" /></span><span className="c2 clear-chip"><StickerArt d={basicSticker} /></span></span><span>Starter kit</span></Link>
        <Link to="/shop/design/hub" className="cat"><span className="cat-img"><HubArt d={pinkHub} led="blue" /></span><span>Keyring hub</span></Link>
        <Link to="/shop/design/stickers" className="cat"><span className="cat-img trio">{sig.slice(2, 5).map((d, i) => <span key={i} className={`t${i}`}><StickerArt d={d} /></span>)}</span><span>Sticker tags</span></Link>
        <Link to="/shop/gallery?tab=cases" className="cat"><span className="cat-img case"><CaseArt c={{ key: 'bear', color: '#EDC6C4' }} /></span><span>Cases</span></Link>
        <Link to="/shop/gallery" className="cat"><span className="cat-img grid4">{[gallery[2], gallery[8], gallery[12], gallery[15]].map((g) => <span key={g.id}><StickerArt d={g.design} /></span>)}</span><span>Design gallery</span></Link>
        <Link to="/shop/gallery?set=clear" className="cat"><span className="cat-img dark"><StickerArt d={byId('clear-confetti')!.design} /></span><span>Clear stickers</span></Link>
      </nav>

      <Shelf title="The latest." sub="Fresh sets, softer cases.">
        <Link to="/shop/design/kit" className="tall-card dark" style={fabricStyle('navy')}>
          <p className="eyebrow">THE BASICS</p><h3>Starter kit</h3><p className="tc-price">{won(products.kit.basePrice)}</p>
          <div className="tc-art kit"><span className="k-hub"><HubArt d={defaultHub} led="green" /></span>{[0, 1, 2].map((i) => <span key={i} className={`k-s k-s${i}`}><StickerArt d={basicSticker} /></span>)}</div>
          <span className="tc-plus"><Plus size={18} /></span>
        </Link>
        <Link to="/shop/design/case?case=cloud" className="tall-card" style={{ background: '#E3EEF8' }}>
          <p className="eyebrow">NEW CASE</p><h3>Cloud</h3><p className="tc-price">{won(caseInfo('cloud').price)}</p>
          <div className="tc-art case"><CaseArt c={{ key: 'cloud', color: '#B8D1EA' }} /></div>
          <span className="tc-plus"><Plus size={18} /></span>
        </Link>
        <Link to="/shop/design/stickers?set=garden" className="tall-card" style={{ background: '#DDF5E8' }}>
          <p className="eyebrow">SET</p><h3>Garden set</h3><p className="tc-price">from {won(packSizes[0].price)}</p>
          <div className="tc-art stickers">{setSkins('garden').map((d, i) => <span key={i} className={`s${i}`}><StickerArt d={d} /></span>)}</div>
          <span className="tc-plus"><Plus size={18} /></span>
        </Link>
        <Link to="/shop/design/hub?shell=1E2433" className="tall-card dark" style={{ background: '#1B2130' }}>
          <p className="eyebrow">ENGRAVE IT</p><h3>Hub in Midnight</h3><p className="tc-price">{won(products.hub.basePrice)}</p>
          <div className="tc-art hub"><HubArt d={midnightHub} led="blue" /></div>
          <span className="tc-plus"><Plus size={18} /></span>
        </Link>
        <Link to="/shop/design/case?case=bunny" className="tall-card" style={{ background: '#F6E6E4' }}>
          <p className="eyebrow">NEW CASE</p><h3>Bunny ears</h3><p className="tc-price">{won(caseInfo('bunny').price)}</p>
          <div className="tc-art case"><CaseArt c={{ key: 'bunny', color: '#EDC6C4' }} /></div>
          <span className="tc-plus"><Plus size={18} /></span>
        </Link>
        <Link to="/shop/design/stickers?set=space" className="tall-card" style={{ background: '#FFE3D7' }}>
          <p className="eyebrow">SET</p><h3>Space set</h3><p className="tc-price">from {won(packSizes[0].price)}</p>
          <div className="tc-art stickers">{setSkins('space').map((d, i) => <span key={i} className={`s${i}`}><StickerArt d={d} /></span>)}</div>
          <span className="tc-plus"><Plus size={18} /></span>
        </Link>
      </Shelf>

      <Shelf title="Dress up your hub." sub="Cases slip on in seconds. The light still shines through.">
        {cases.map((c) => (
          <Link key={c.key} to={`/shop/design/case?case=${c.key}`} className="white-card">
            <div className="wc-art"><CaseArt c={{ key: c.key, color: c.colors[0].hex }} /></div>
            <div className="dots">{c.colors.map((s) => <i key={s.hex} style={{ background: s.hex }} title={s.name} />)}</div>
            {c.isNew && <p className="new">New</p>}
            <h3>{c.name}</h3>
            <p className="price">{won(c.price)}</p>
          </Link>
        ))}
      </Shelf>

      <Shelf title="Sticker sets." sub="Collect them. Swap the skin anytime, keep the tag.">
        {sets.map((s) => (
          <Link key={s.key} to={`/shop/gallery?set=${s.key}`} className="set-card" style={s.key === 'clear' ? fabricStyle('navy') : { background: s.tint }}>
            <div className="set-art">{gallery.filter((g) => g.set === s.key).slice(0, 3).map((g, i) => <span key={g.id} className={`s${i}`}><StickerArt d={g.design} /></span>)}</div>
            <h3>{s.name}</h3>
            <p>{s.blurb}</p>
          </Link>
        ))}
      </Shelf>

      <section className="shop-wrap shop-section how">
        <h2><b>How Tagly works.</b> <span className="muted">Three small things, one habit.</span></h2>
        <div className="how-grid">
          <div><span className="how-art"><StickerArt d={sig[0]} /></span><h3>Sticker tags</h3><p>Decorate your laptop, iPad and pencil case. Every sticker is also a tracker, with a paper-thin Bluetooth tag under a skin you can swap.</p></div>
          <div><span className="how-art"><HubArt d={defaultHub} led="red" /></span><h3>Keyring hub</h3><p>Lives on your bag, knows what’s inside, and glows red and buzzes when something is missing. Green means you’re ready.</p></div>
          <div><span className="how-art"><LogoMark size={64} /></span><h3>Context-aware app</h3><p>Your timetable, calendar and the forecast become today’s checklist. Lost items are found through a mesh network.</p></div>
        </div>
      </section>
    </>
  )
}

/* Gallery ------------------------------------------------------------------------------- */

function GalleryGrid({ setFilter, color, onPick, compact = false, selectedId, onUpload }: {
  setFilter: SetKey | 'all'; color: string | null; onPick: (id: string) => void; compact?: boolean; selectedId?: string; onUpload?: () => void
}) {
  const list = gallery.filter((g) => (setFilter === 'all' || g.set === setFilter) && (!color || g.design.color === color || g.design.frameColor === color && g.set === 'clear'))
  return (
    <div className={`gal-grid ${compact ? 'compact' : ''}`}>
      {onUpload && setFilter === 'all' && !color && (
        <button type="button" className="gal-card upload" onClick={onUpload}>
          <span className="gal-img"><ImagePlus size={compact ? 26 : 40} strokeWidth={1.6} /><b>{compact ? 'Upload' : 'Upload your own'}</b></span>
          <span className="gal-name">{compact ? 'Your image' : 'Your image'}</span>
          {!compact && <span className="gal-set">PNG or JPEG · cut line made for you</span>}
        </button>
      )}
      {list.map((g) => {
        const tint = sets.find((s) => s.key === g.set)!.tint
        return (
          <button key={g.id} type="button" className={`gal-card ${selectedId === g.id ? 'on' : ''}`} onClick={() => onPick(g.id)}>
            <span className="gal-img" style={g.set === 'clear' ? fabricStyle('navy') : { background: tint }}>
              <StickerArt d={g.design} showAntenna={!compact} />
              {g.isNew && !compact && <em>New</em>}
            </span>
            <span className="gal-name">{g.name}</span>
            {!compact && <span className="gal-set">{sets.find((s) => s.key === g.set)!.name}</span>}
          </button>
        )
      })}
      {list.length === 0 && <p className="muted">No designs in this colour yet. Pick another colour or customise one.</p>}
    </div>
  )
}

function SetChips({ value, onChange }: { value: SetKey | 'all'; onChange: (v: SetKey | 'all') => void }) {
  return (
    <div className="chip-row" role="tablist" aria-label="Sets">
      <button type="button" role="tab" aria-selected={value === 'all'} className={value === 'all' ? 'on' : ''} onClick={() => onChange('all')}>All</button>
      {sets.map((s) => (
        <button key={s.key} type="button" role="tab" aria-selected={value === s.key} className={value === s.key ? 'on' : ''} onClick={() => onChange(s.key)}>{s.name.replace(' set', '')}</button>
      ))}
    </div>
  )
}

function Gallery() {
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const tab = params.get('tab') === 'cases' ? 'cases' : 'skins'
  const setFilter = (params.get('set') as SetKey | null) ?? 'all'
  const [color, setColor] = useState<string | null>(null)
  const usedColors = stickerColors.filter((c) => gallery.some((g) => g.design.color === c.hex))
  return (
    <div className="shop-wrap shop-section">
      <h1 className="page-title"><b>Design gallery.</b> <span>Pick a look, then make it yours.</span></h1>
      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'skins'} className={tab === 'skins' ? 'on' : ''} onClick={() => setParams({})}>Sticker skins</button>
        <button type="button" role="tab" aria-selected={tab === 'cases'} className={tab === 'cases' ? 'on' : ''} onClick={() => setParams({ tab: 'cases' })}>Hub cases</button>
      </div>

      {tab === 'skins' ? (
        <>
          <div className="gal-filters">
            <SetChips value={setFilter} onChange={(v) => setParams(v === 'all' ? {} : { set: v })} />
            <div className="color-filter">
              <button type="button" className={`any ${color === null ? 'on' : ''}`} onClick={() => setColor(null)}>Any colour</button>
              <Swatches label="Filter by colour" colors={usedColors} value={color} onChange={(c) => setColor(color === c ? null : c)} size={24} />
            </div>
          </div>
          {setFilter !== 'all' && (
            <div className="set-banner" style={setFilter === 'clear' ? fabricStyle('navy') : { background: sets.find((s) => s.key === setFilter)!.tint }}>
              <div>
                <h2>{sets.find((s) => s.key === setFilter)!.name}</h2>
                <p>{sets.find((s) => s.key === setFilter)!.blurb}</p>
              </div>
              <Link to={`/shop/design/stickers?set=${setFilter}`} className="sbtn sbtn-dark">Get the whole set <ArrowRight size={16} /></Link>
            </div>
          )}
          <GalleryGrid setFilter={setFilter} color={color} onPick={(id) => nav(`/shop/design/stickers?design=${id}`)} onUpload={() => nav('/shop/design/stickers?upload=1')} />
        </>
      ) : (
        <div className="case-grid">
          {cases.map((c) => (
            <Link key={c.key} to={`/shop/design/case?case=${c.key}`} className="white-card big">
              <div className="wc-art"><CaseArt c={{ key: c.key, color: c.colors[0].hex }} /></div>
              <div className="dots">{c.colors.map((s) => <i key={s.hex} style={{ background: s.hex }} title={s.name} />)}</div>
              {c.isNew && <p className="new">New</p>}
              <h3>{c.name}</h3>
              <p className="muted small">{c.blurb}</p>
              <p className="price">{won(c.price)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/* Designer ---------------------------------------------------------------------------------- */

const frameOpts: { key: FrameStyle; label: string }[] = [
  { key: 'none', label: 'Clear' }, { key: 'solid', label: 'Line' }, { key: 'dashed', label: 'Dashed' }, { key: 'dots', label: 'Dots' },
  { key: 'stripes', label: 'Stripes' }, { key: 'checker', label: 'Checker' }, { key: 'confetti', label: 'Confetti' },
]
const dotOpts: { key: DotMark; label: string }[] = [
  { key: 'logo', label: 'Tagly t' }, { key: 'heart', label: 'Heart' }, { key: 'star', label: 'Star' }, { key: 'initials', label: 'Initials' },
]

const borderOpts = [{ key: 'thin', label: 'Thin', v: 0.028 }, { key: 'regular', label: 'Regular', v: 0.045 }, { key: 'thick', label: 'Thick', v: 0.068 }] as const

function PhotoUploader({ d, set }: { d: StickerDesign; set: (d: StickerDesign) => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [cut, setCut] = useState<CutShape>(d.cut ?? 'shape')
  const [border, setBorder] = useState<'thin' | 'regular' | 'thick'>('regular')
  const [removeBg, setRemoveBg] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState<{ hasAlpha: boolean; foundSubject: boolean } | null>(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const run = (image: HTMLImageElement, c: CutShape, b: typeof border, r: boolean) => {
    setBusy(true)
    setError('')
    window.setTimeout(() => {
      try {
        const res = makeDieCut(image, { cut: c, border: borderOpts.find((o) => o.key === b)!.v, removeBg: r })
        set({ ...d, style: 'photo', photo: res.photo, cutline: res.cutline, cut: c })
        setInfo({ hasAlpha: res.hasAlpha, foundSubject: res.foundSubject })
      } catch (e) {
        setError((e as Error).message || 'Something went wrong making the cut line.')
      } finally {
        setBusy(false)
      }
    }, 30)
  }
  const onFile = async (file?: File | null) => {
    if (!file) return
    try {
      const image = await loadImage(file)
      setImg(image)
      run(image, cut, border, removeBg)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      <div className={`dropzone ${drag ? 'drag' : ''} ${d.photo ? 'has' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]) }}>
        {d.photo ? (
          <span className="dz-thumb"><StickerArt d={d} showCut /></span>
        ) : (
          <Upload size={28} strokeWidth={1.6} />
        )}
        <span className="dz-copy">
          <b>{busy ? 'Making your cut line…' : d.photo ? 'Your sticker is ready' : 'Upload a PNG or JPEG'}</b>
          <span>{d.photo ? 'Pink line = where it will be cut.' : 'Drag it here, or choose a file. A transparent PNG gives the cleanest cut.'}</span>
        </span>
        <button type="button" className="sbtn sbtn-light small-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
          {d.photo ? 'Replace' : 'Choose file'}
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      {error && <p className="err">{error}</p>}
      {info && !info.foundSubject && cut === 'shape' && (
        <p className="note-warn">We couldn’t find a clear subject on a plain background, so the cut follows the photo’s edge. Try a PNG with a transparent background, or choose Circle.</p>
      )}
      <Field label="Cut line" hint={!img && d.photo ? 'Upload again to change the cut' : undefined}>
        <Choice label="Cut line" value={cut} onChange={(c: CutShape) => { setCut(c); if (img) run(img, c, border, removeBg) }}
          opts={[{ key: 'shape', label: 'Follow the shape' }, { key: 'circle', label: 'Circle' }, { key: 'square', label: 'Rounded square' }]} />
      </Field>
      <Field label="White border">
        <Choice label="White border" value={border} onChange={(b: typeof border) => { setBorder(b); if (img) run(img, cut, b, removeBg) }}
          opts={borderOpts.map((o) => ({ key: o.key, label: o.label }))} />
      </Field>
      {cut === 'shape' && !(info?.hasAlpha) && (
        <label className="check-row">
          <input type="checkbox" checked={removeBg} onChange={(e) => { setRemoveBg(e.target.checked); if (img) run(img, cut, border, e.target.checked) }} />
          <span>Remove a plain background (for JPEG photos)</span>
        </label>
      )}
      <p className="muted small">Your image stays in this browser to make the preview. Use artwork you own or have permission to print.</p>
    </>
  )
}

function SkinEditor({ d, set }: { d: StickerDesign; set: (d: StickerDesign) => void }) {
  return (
    <>
      <Field label="Style">
        <Choice label="Style" value={d.style} onChange={(style) => set({ ...d, style })}
          opts={[{ key: 'art', label: 'Die-cut art' }, { key: 'photo', label: 'Your image' }, { key: 'clear', label: 'Clear sticker' }]} />
      </Field>
      {d.style === 'photo' ? <PhotoUploader d={d} set={set} /> : d.style === 'art' ? (
        <>
          <Field label="Artwork" hint={`${artInfo[d.art].name} · ${sets.find((s) => s.key === artInfo[d.art].set)!.name}`}>
            <div className="art-picker">
              {artOrder.map((k) => (
                <button key={k} type="button" aria-label={artInfo[k].name} aria-pressed={d.art === k} className={d.art === k ? 'on' : ''}
                  onClick={() => set({ ...d, art: k })}><StickerArt d={art(k, d.color, d.accent)} /></button>
              ))}
            </div>
          </Field>
          <Field label="Main colour" hint={colorName(d.color, stickerColors)}>
            <Swatches label="Main colour" colors={stickerColors} value={d.color} onChange={(color) => set({ ...d, color })} size={30} />
          </Field>
          <Field label="Accent colour" hint={colorName(d.accent, stickerColors)}>
            <Swatches label="Accent colour" colors={stickerColors} value={d.accent} onChange={(accent) => set({ ...d, accent })} size={30} />
          </Field>
        </>
      ) : (
        <>
          <Field label="Shape" hint="40 × 40 mm">
            <Choice label="Shape" value={d.shape} onChange={(shape) => set({ ...d, shape })} opts={[{ key: 'square', label: 'Rounded square' }, { key: 'circle', label: 'Circle' }]} />
          </Field>
          <Field label="Border print" hint="Outer 4 mm only">
            <Choice label="Border print" value={d.frame} onChange={(frame) => set({ ...d, frame })} opts={frameOpts} />
          </Field>
          {d.frame !== 'none' && (
            <Field label="Border colour"><Swatches label="Border colour" colors={stickerColors} value={d.frameColor} onChange={(frameColor) => set({ ...d, frameColor })} size={30} /></Field>
          )}
          <Field label="Center dot" hint="Covers the chip">
            <Choice label="Center dot" value={d.dot} onChange={(dot) => set({ ...d, dot })} opts={dotOpts} />
          </Field>
          {d.dot === 'initials' && (
            <Field label="Initials" hint="Up to 3 letters">
              <input className="dinput" value={d.initials} maxLength={3} placeholder="AB" onChange={(e) => set({ ...d, initials: e.target.value.replace(/[^a-zA-Z0-9가-힣]/g, '') })} />
            </Field>
          )}
          <Field label="Dot colour"><Swatches label="Dot colour" colors={stickerColors} value={d.dotColor} onChange={(dotColor) => set({ ...d, dotColor })} size={30} /></Field>
        </>
      )}
    </>
  )
}

function PackEditor({ pack, setPack, sel, setSel, initialMode = 'gallery' }: {
  pack: StickerDesign[]; setPack: (p: StickerDesign[]) => void; sel: number; setSel: (i: number) => void; initialMode?: 'gallery' | 'custom'
}) {
  const [mode, setMode] = useState<'gallery' | 'custom'>(initialMode)
  const [setFilter, setSetFilter] = useState<SetKey | 'all'>('all')
  const cur = pack[sel]
  const setCur = (d: StickerDesign) => setPack(pack.map((x, i) => (i === sel ? d : x)))
  return (
    <>
      <Field label={`Your pack · ${pack.length} tags`} hint="Tap a tag to change it">
        <div className="slots">
          {pack.map((d, i) => (
            <button key={i} type="button" className={`slot ${i === sel ? 'on' : ''}`} onClick={() => setSel(i)} aria-label={`Tag ${i + 1}: ${designLabel(d)}`}
              style={d.style === 'clear' ? fabricStyle('navy') : undefined}>
              <StickerArt d={d} showAntenna={false} />
              <small>{i + 1}</small>
            </button>
          ))}
        </div>
        <div className="slot-actions">
          <span className="muted small">Tag {sel + 1}: {designLabel(cur)}</span>
          <button type="button" className="slink" onClick={() => setPack(pack.map(() => cur))}>Use on all tags</button>
        </div>
      </Field>

      <div className="seg small" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'gallery'} className={mode === 'gallery' ? 'on' : ''} onClick={() => setMode('gallery')}>Choose from gallery</button>
        <button type="button" role="tab" aria-selected={mode === 'custom'} className={mode === 'custom' ? 'on' : ''} onClick={() => setMode('custom')}>Customise</button>
      </div>

      {mode === 'gallery' ? (
        <div className="picker-window">
          <SetChips value={setFilter} onChange={setSetFilter} />
          <GalleryGrid compact setFilter={setFilter} color={null}
            onUpload={() => { setCur({ ...baseSticker, style: 'photo' }); setMode('custom') }}
            selectedId={gallery.find((g) => JSON.stringify(g.design) === JSON.stringify(cur))?.id}
            onPick={(id) => {
              setCur(byId(id)!.design)
              if (sel < pack.length - 1) setSel(sel + 1)
            }} />
          {setFilter !== 'all' && (
            <button type="button" className="slink" onClick={() => {
              const skins = gallery.filter((g) => g.set === setFilter).map((g) => g.design)
              setPack(pack.map((_, i) => skins[i % skins.length]))
            }}>Fill the pack with the {sets.find((s) => s.key === setFilter)!.name}</button>
          )}
        </div>
      ) : (
        <div className="dcontrols"><SkinEditor key={sel} d={cur} set={setCur} /></div>
      )}
    </>
  )
}

function HubEditor({ hub, set }: { hub: HubDesign; set: (h: HubDesign) => void }) {
  return (
    <>
      <Field label="Shell colour" hint={colorName(hub.shell, hubColors)}>
        <Swatches label="Shell colour" colors={hubColors} value={hub.shell} onChange={(shell) => set({ ...hub, shell })} size={30} />
      </Field>
      <Field label="Finish" hint={hub.finish === 'metal' ? '+₩3,000' : undefined}>
        <Choice label="Finish" value={hub.finish ?? 'matte'} onChange={(finish: Finish) => set({ ...hub, finish })}
          opts={finishes.map((f) => ({ key: f.key, label: f.fee ? `${f.label} +${won(f.fee)}` : f.label }))} />
      </Field>
      <Field label="Key ring">
        <Choice label="Key ring" value={hub.loop} onChange={(loop) => set({ ...hub, loop })} opts={[{ key: 'silver', label: 'Silver' }, { key: 'gold', label: 'Gold' }, { key: 'black', label: 'Black' }]} />
      </Field>
      <Field label="Strap" hint={`+${won(STRAP_FEE)}`}>
        <div className="strap-row">
          <button type="button" className={`any ${hub.strap === null ? 'on' : ''}`} onClick={() => set({ ...hub, strap: null })}>None</button>
          <Swatches label="Strap colour" colors={strapColors} value={hub.strap} onChange={(strap) => set({ ...hub, strap })} size={30} />
        </div>
      </Field>
      <Field label="Engraving" hint={`On the side · +${won(ENGRAVING_FEE)}`}>
        <input className="dinput" value={hub.engraving} maxLength={10} placeholder="Your name"
          onChange={(e) => set({ ...hub, engraving: e.target.value.replace(/[^a-zA-Z0-9 .&-]/g, '') })} />
      </Field>
      {hub.engraving.trim() && (
        <Field label="Engraving style">
          <Choice label="Engraving style" value={hub.font} onChange={(font) => set({ ...hub, font })} opts={[{ key: 'sans', label: 'Modern' }, { key: 'serif', label: 'Classic' }, { key: 'mono', label: 'Mono' }]} />
        </Field>
      )}
    </>
  )
}

const quickLooks: { label: string; c: Omit<CaseChoice, 'key'> }[] = [
  { label: 'Glossy white', c: { color: '#FFFFFF', finish: 'gloss', pattern: 'solid' } },
  { label: 'Gold', c: { color: '#D9B45A', finish: 'metal', pattern: 'solid' } },
  { label: 'Black & white dots', c: { color: '#16171B', finish: 'gloss', pattern: 'dots', patternColor: '#FFFFFF' } },
  { label: 'Blush hearts', c: { color: '#EDC6C4', finish: 'matte', pattern: 'hearts', patternColor: '#FFFFFF' } },
  { label: 'Sky gingham', c: { color: '#FFFFFF', finish: 'matte', pattern: 'gingham', patternColor: '#B8D1EA' } },
  { label: 'Midnight stripes', c: { color: '#2D3240', finish: 'matte', pattern: 'stripes', patternColor: '#E3D5C3' } },
]

function CaseEditor({ value, set, allowNone }: { value: CaseChoice | null; set: (c: CaseChoice | null) => void; allowNone: boolean }) {
  const info = value ? caseInfo(value.key) : null
  const plain = value?.key === 'leather' || value?.key === 'clear'
  const colors = plain && info ? info.colors : caseColors
  return (
    <>
      <Field label="Case" hint={value ? `${info!.name} · ${won(casePrice(value))}` : 'Optional'}>
        <div className="case-picker">
          {allowNone && (
            <button type="button" className={`case-opt none ${value === null ? 'on' : ''}`} onClick={() => set(null)}><span>No case</span></button>
          )}
          {cases.map((c) => (
            <button key={c.key} type="button" aria-label={c.name} aria-pressed={value?.key === c.key} className={`case-opt ${value?.key === c.key ? 'on' : ''}`}
              onClick={() => {
                const isPlain = c.key === 'leather' || c.key === 'clear'
                set(isPlain ? { key: c.key, color: c.colors[0].hex } : { ...(value ?? {}), key: c.key, color: value && !['leather', 'clear'].includes(value.key) ? value.color : c.colors[0].hex })
              }}>
              <CaseArt c={value && value.key === c.key ? value : { key: c.key, color: c.colors[0].hex }} />
            </button>
          ))}
        </div>
      </Field>
      {info && value && (
        <>
          <p className="muted small">{info.blurb}</p>
          {!plain && (
            <Field label="Quick looks">
              <div className="choices">
                {quickLooks.map((q) => (
                  <button key={q.label} type="button" onClick={() => set({ key: value.key, ...q.c })}>{q.label}</button>
                ))}
              </div>
            </Field>
          )}
          <Field label="Colour" hint={colorName(value.color, colors)}>
            <Swatches label="Case colour" colors={colors} value={value.color} onChange={(color) => set({ ...value, color })} size={30} />
          </Field>
          {!plain && (
            <>
              <Field label="Finish">
                <Choice label="Finish" value={value.finish ?? 'matte'} onChange={(finish: Finish) => set({ ...value, finish })}
                  opts={finishes.map((f) => ({ key: f.key, label: f.fee ? `${f.label} +${won(f.fee)}` : f.label }))} />
              </Field>
              <Field label="Pattern" hint={value.pattern && value.pattern !== 'solid' ? `+${won(PATTERN_FEE)}` : undefined}>
                <Choice label="Pattern" value={value.pattern ?? 'solid'} onChange={(pattern: CasePattern) => set({ ...value, pattern })} opts={patterns} />
              </Field>
              {value.pattern && value.pattern !== 'solid' && (
                <Field label="Pattern colour" hint={colorName(value.patternColor ?? '#FFFFFF', caseColors)}>
                  <Swatches label="Pattern colour" colors={caseColors} value={value.patternColor ?? null} onChange={(patternColor) => set({ ...value, patternColor })} size={30} />
                </Field>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}

const hubColors: Swatch[] = [...shellColors, { hex: '#FFFFFF', name: 'White' }, { hex: '#16171B', name: 'Black' },
  { hex: '#D9B45A', name: 'Gold' }, { hex: '#C9CED6', name: 'Silver' }, { hex: '#E3B3A1', name: 'Rose gold' }]

const ledOpts: { key: LedState; label: string }[] = [{ key: 'green', label: 'All packed' }, { key: 'red', label: 'Missing' }, { key: 'blue', label: 'Pairing' }]

function Designer() {
  const { product } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { add } = useShop()
  const pid = (['kit', 'stickers', 'hub', 'case'].includes(product ?? '') ? product : null) as ProductId | null

  const initial = useMemo(() => {
    const designId = params.get('design')
    const setKey = params.get('set') as SetKey | null
    const caseKey = params.get('case') as CaseKey | null
    const shell = params.get('shell')
    let pack = pid === 'kit' && !designId && !setKey ? basicPack(5) : signaturePack()
    if (setKey) { const skins = gallery.filter((g) => g.set === setKey).map((g) => g.design); if (skins.length) pack = pack.map((_, i) => skins[i % skins.length]) }
    if (designId && byId(designId)) pack = [byId(designId)!.design, ...pack.slice(1)]
    if (params.get('upload') === '1') pack = [{ ...baseSticker, style: 'photo' as const }, ...pack.slice(1)]
    const hub: HubDesign = {
      ...defaultHub,
      shell: shell && /^[0-9A-Fa-f]{6}$/.test(shell) ? `#${shell.toUpperCase()}` : defaultHub.shell,
      case: caseKey && cases.some((c) => c.key === caseKey) ? { key: caseKey, color: caseInfo(caseKey).colors[0].hex } : null,
    }
    if (pid === 'case' && !hub.case) hub.case = { key: 'silicone', color: caseInfo('silicone').colors[0].hex }
    return { pack, hub }
  }, [params, pid])

  const [packN, setPackN] = useState(5)
  const [pack, setPack] = useState<StickerDesign[]>(initial.pack)
  const [sel, setSel] = useState(0)
  const [hub, setHub] = useState<HubDesign>(initial.hub)
  const [tab, setTab] = useState<'tags' | 'hub' | 'case'>('tags')
  const [led, setLed] = useState<LedState>('green')
  const [fabric, setFabric] = useState<FabricKey>(pid === 'kit' ? 'navy' : 'studio')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [showCut, setShowCut] = useState(true)
  const uploadMode = params.get('upload') === '1'

  useEffect(() => {
    setPack(fitPack(initial.pack, 5)); setPackN(5); setSel(0); setHub(initial.hub); setAdded(false)
    setFabric(pid === 'kit' ? 'navy' : 'studio')
    setTab(pid === 'hub' ? 'hub' : pid === 'case' ? 'case' : 'tags')
  }, [initial, pid])

  if (!pid) return <Navigate to="/shop" replace />

  const hasTags = pid === 'kit' || pid === 'stickers'
  const hasHub = pid === 'kit' || pid === 'hub'
  const tabs: { key: 'tags' | 'hub' | 'case'; label: string }[] = []
  if (hasTags) tabs.push({ key: 'tags', label: 'Sticker tags' })
  if (hasHub) tabs.push({ key: 'hub', label: 'Hub' })
  if (pid !== 'stickers') tabs.push({ key: 'case', label: 'Case' })
  const packs = pid === 'kit' ? kitPacks : pid === 'stickers' ? packSizes : []
  const price = unitPrice(pid, hasTags ? packN : undefined, pid === 'stickers' ? undefined : hub)
  const p = products[pid]
  const title = pid === 'case' && hub.case ? `${caseInfo(hub.case.key).name} case` : p.name
  const showHubStage = pid !== 'stickers'
  const focusTags = hasTags && tab === 'tags'

  const filler = pid === 'kit' ? basicPack(1) : signaturePack()
  const changePack = (n: number) => { setPackN(n); setPack(fitPack(pack, n, filler)); setSel(Math.min(sel, n - 1)) }

  return (
    <div className="shop-wrap designer">
      <Link to="/shop" className="crumb"><ChevronLeft size={16} /> Store</Link>
      <div className="designer-grid">
        <div className="designer-stage-col">
          <div className="designer-stage" style={fabricStyle(fabric)}>
            {hasTags && (
              <div className={`stage-tags ${showHubStage ? (focusTags ? 'focus' : 'dim') : 'solo'}`} onClick={() => showHubStage && setTab('tags')}>
                <span className="big"><StickerArt d={pack[sel]} showCut={showCut} /></span>
                {pack.filter((_, i) => i !== sel).slice(0, 4).map((d, i) => <span key={i} className={`mini m${i}`}><StickerArt d={d} showAntenna={false} /></span>)}
              </div>
            )}
            {showHubStage && (
              <div className={`stage-hub ${hasTags ? (focusTags ? 'dim' : 'focus') : 'solo'} ${hub.case ? 'is-case' : ''}`} onClick={() => hasTags && setTab('hub')}>
                <HubOrCase hub={hub} led={led} />
              </div>
            )}
            <div className="fabric-picker" role="group" aria-label="Background">
              {fabrics.map((f) => (
                <button key={f.key} type="button" aria-label={f.name} aria-pressed={fabric === f.key}
                  className={fabric === f.key ? 'on' : ''} style={{ background: f.a }} onClick={() => setFabric(f.key)} />
              ))}
            </div>
          </div>
          {hasTags && pack[sel]?.style === 'photo' && pack[sel]?.photo && (
            <div className="led-row">
              <button type="button" className={showCut ? 'on' : ''} aria-pressed={showCut} onClick={() => setShowCut(!showCut)}>
                <i style={{ background: '#E5487F' }} /> Show cut line
              </button>
            </div>
          )}
          {showHubStage && (
            <div className="led-row" role="radiogroup" aria-label="Preview the light">
              <span className="muted small">Preview the light:</span>
              {ledOpts.map((o) => (
                <button key={o.key} type="button" role="radio" aria-checked={led === o.key} className={led === o.key ? 'on' : ''} onClick={() => setLed(o.key)}>
                  <i className={`led-${o.key}`} /> {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="designer-panel">
          <p className="kicker">{pid === 'kit' ? 'The basics' : 'Make it yours'}</p>
          <h1>{title}</h1>
          <p className="muted">{p.tagline}</p>
          <p className="designer-price">{won(price)}</p>

          {packs.length > 0 && (
            <Field label="Pack">
              <div className="packs">
                {packs.map((pk) => (
                  <button key={pk.n} type="button" className={packN === pk.n ? 'on' : ''} onClick={() => changePack(pk.n)} aria-pressed={packN === pk.n}>
                    <b>{pk.label}</b><span>{won(pk.price)}</span>
                  </button>
                ))}
              </div>
            </Field>
          )}

          {tabs.length > 1 && (
            <div className="dtabs" role="tablist" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
              {tabs.map((t) => (
                <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
              ))}
            </div>
          )}

          <div className="dcontrols">
            {tab === 'tags' && hasTags && <PackEditor key={uploadMode ? 'up' : 'pk'} pack={pack} setPack={setPack} sel={sel} setSel={setSel} initialMode={uploadMode ? 'custom' : 'gallery'} />}
            {tab === 'hub' && hasHub && <HubEditor hub={hub} set={setHub} />}
            {tab === 'case' && <CaseEditor value={hub.case} set={(c) => setHub({ ...hub, case: c })} allowNone={pid !== 'case'} />}
          </div>

          <div className="buy-row">
            <div className="qty" aria-label="Quantity">
              <button type="button" aria-label="Decrease" onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={16} /></button>
              <span>{qty}</span>
              <button type="button" aria-label="Increase" onClick={() => setQty(Math.min(9, qty + 1))}><Plus size={16} /></button>
            </div>
            <button type="button" className="sbtn sbtn-dark grow" onClick={() => {
              add({
                product: pid, qty, pack: hasTags ? packN : undefined, stickers: hasTags ? pack : undefined,
                hub: pid === 'stickers' ? undefined : hub, unitPrice: price,
              })
              setAdded(true)
            }}>
              <ShoppingBag size={18} /> Add to bag · {won(price * qty)}
            </button>
          </div>
          {added && (
            <div className="added-note" role="status">
              <Check size={16} /> Added to your bag.
              <button type="button" className="slink" onClick={() => nav('/shop/cart')}>View bag</button>
            </div>
          )}

          <ul className="includes">
            {p.includes.map((t) => <li key={t}><Check size={15} /> {t}</li>)}
          </ul>
          <button type="button" className="slink reset" onClick={() => { setPack(pid === 'kit' ? basicPack(packN) : fitPack(signaturePack(), packN)); setHub(pid === 'case' ? initial.hub : defaultHub); setSel(0) }}>
            <RotateCcw size={14} /> {pid === 'kit' ? 'Back to the basic kit' : 'Reset design'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* Bag ---------------------------------------------------------------------------------- */

function LineThumb({ l }: { l: CartLine }) {
  const first = l.stickers?.[0]
  const showHub = l.product !== 'stickers' && l.hub
  return (
    <div className="line-thumb" style={fabricStyle('studio')}>
      {first && <div className={showHub ? 'lt-sticker small' : 'lt-sticker'}><StickerArt d={first} showAntenna={false} /></div>}
      {showHub && <div className={first ? 'lt-hub small' : 'lt-hub'}><HubOrCase hub={l.hub!} /></div>}
    </div>
  )
}

function lineSummary(l: CartLine) {
  const parts: string[] = []
  if (l.stickers) {
    const names = Array.from(new Set(l.stickers.map(designLabel)))
    parts.push(`${l.stickers.length} tags: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3} more` : ''}`)
  }
  if (l.hub && (l.product === 'kit' || l.product === 'hub')) {
    const h = l.hub
    parts.push(`${colorName(h.shell, hubColors)}${h.finish && h.finish !== 'matte' ? ` ${h.finish === 'gloss' ? 'glossy' : 'metallic'}` : ''} hub · ${h.loop} ring${h.strap ? ` · ${colorName(h.strap, strapColors)} strap` : ''}${h.engraving.trim() ? ` · “${h.engraving.toUpperCase()}”` : ''}`)
  }
  if (l.hub?.case) {
    const c = caseInfo(l.hub.case.key)
    const cc = l.hub.case
    const fin = cc.finish && cc.finish !== 'matte' ? ` ${cc.finish === 'gloss' ? 'glossy' : 'metallic'}` : ''
    const pat = cc.pattern && cc.pattern !== 'solid' ? ` · ${patterns.find((x) => x.key === cc.pattern)!.label.toLowerCase()}` : ''
    parts.push(`${c.name} case · ${colorName(cc.color, [...caseColors, ...c.colors])}${fin}${pat}`)
  }
  return parts
}

function lineName(l: CartLine) {
  if (l.product === 'case' && l.hub?.case) return `${caseInfo(l.hub.case.key).name} case`
  return products[l.product].name
}

function Cart() {
  const { cart, subtotal, setQty, remove } = useShop()
  const nav = useNavigate()
  const shipping = cart.length ? shippingFor(subtotal, 'standard') : 0
  const toFree = FREE_SHIPPING_FROM - subtotal
  return (
    <div className="shop-wrap shop-section narrow">
      <h1 className="page-title"><b>Your bag.</b></h1>
      {cart.length === 0 ? (
        <div className="empty-cart">
          <Package size={36} />
          <p>Your bag is empty.</p>
          <Link to="/shop/design/kit" className="sbtn sbtn-dark">Design your kit</Link>
        </div>
      ) : (
        <div className="cart-grid">
          <ul className="cart-lines">
            {cart.map((l) => (
              <li key={l.id} className="cart-line">
                <LineThumb l={l} />
                <div className="cl-info">
                  <b>{lineName(l)}</b>
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
            <button type="button" className="sbtn sbtn-dark block" onClick={() => nav('/shop/checkout')}>Check out <ArrowRight size={18} /></button>
            <Link to="/shop" className="slink center-block">Keep shopping</Link>
          </aside>
        </div>
      )}
    </div>
  )
}

/* Checkout ------------------------------------------------------------------------------------ */

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
      <Link to="/shop/cart" className="crumb"><ChevronLeft size={16} /> Bag</Link>
      <h1 className="page-title"><b>Check out.</b></h1>
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
              <span><b>{lineName(l)}</b><small className="muted">× {l.qty}</small></span>
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

/* Confirmation ------------------------------------------------------------------------------- */

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
            <span><b>{lineName(l)}</b><small className="muted">{lineSummary(l).join(' · ')}</small></span>
            <b>× {l.qty}</b>
          </div>
        ))}
        <div className="sum-row total"><span>Total</span><b>{won(order.total)}</b></div>
      </div>
      <div className="done-next">
        <h2>While you wait</h2>
        <p className="muted">Set up the app now: add your timetable and items, and your tags will pair in seconds when they arrive.</p>
        <div className="hero-cta center">
          <Link to="/" className="sbtn sbtn-dark"><Smartphone size={18} /> Open the Tagly app</Link>
          <Link to="/shop" className="sbtn sbtn-light">Back to store</Link>
        </div>
      </div>
    </div>
  )
}

/* Entry ------------------------------------------------------------------------------------- */

export default function ShopApp() {
  return (
    <ShopProvider>
      <ShopLayout>
        <Routes>
          <Route index element={<ShopHome />} />
          <Route path="gallery" element={<Gallery />} />
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
