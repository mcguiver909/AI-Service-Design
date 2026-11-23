import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Link2, Link2Off, Plus, ScanLine, ShoppingBag, Trash2 } from 'lucide-react'
import { randomStickerId, stickerBattery, stickerItem, todayISO, useStore } from '../store'
import type { Sticker } from '../store'
import { ItemTile } from '../components/icons'
import { useStickerScan } from '../components/ItemForm'
import { Badge, Button, Card, Meter, PageHead, PulseRings, Screen, Sheet } from '../components/ui'

const skinColor: Record<string, string> = {
  Clear: 'clear', Comet: '#F5C518', Drizzle: '#B9A7F5', Bloom: '#2DBE6C', Note: '#F26A3D', Heart: '#F7A8C8', Bolt: '#3158FF', Moon: '#12161C', Sun: '#FFB000',
}
const skins = ['Clear', 'Clear', 'Comet', 'Drizzle', 'Bloom', 'Heart', 'Bolt']

/** A small picture of a sticker tag in its skin colour. */
export function StickerGlyph({ skin, size = 40 }: { skin: string; size?: number }) {
  const c = skinColor[skin] ?? 'clear'
  return (
    <span className={`st-glyph ${c === 'clear' ? 'clear' : ''}`} style={{ width: size, height: size, ...(c === 'clear' ? {} : { background: c }) }} aria-hidden>
      <i />
    </span>
  )
}

/** Stickers tab inside Items. */
export function StickersPanel() {
  const { state } = useStore()
  const nav = useNavigate()
  const attached = state.stickers.filter((s) => stickerItem(state, s.id))
  const free = state.stickers.filter((s) => !stickerItem(state, s.id))
  const row = (s: Sticker) => {
    const item = stickerItem(state, s.id)
    const batt = stickerBattery(state, s)
    return (
      <button key={s.id} type="button" className="st-row" onClick={() => nav(`/items/stickers/${s.id}`)}>
        <StickerGlyph skin={s.skin} />
        <span className="row-copy">
          <span className="row-title">{s.id}<small> · {s.skin}</small></span>
          <span className="row-sub st-on">
            {item ? <><ItemTile icon={item.icon} color={item.color} size={18} /> On {item.name}</> : 'Not attached yet'}
          </span>
        </span>
        <span className={`st-batt ${batt < 20 ? 'text-red' : ''}`}>{batt}%</span>
        <ChevronRight size={18} className="chev" />
      </button>
    )
  }
  return (
    <>
      <Card className="st-summary">
        <div className="st-counts">
          <span><b>{state.stickers.length}</b> stickers</span>
          <span><b>{attached.length}</b> on items</span>
          <span><b>{free.length}</b> ready to use</span>
        </div>
        <Button variant="blue" onClick={() => nav('/items/stickers/new')}><ScanLine size={18} /> Register stickers</Button>
      </Card>

      {attached.length > 0 && <h3 className="st-label">On your items</h3>}
      <div className="st-list">{attached.map(row)}</div>

      {free.length > 0 && <h3 className="st-label">Ready to use</h3>}
      <div className="st-list">{free.map(row)}</div>

      {state.stickers.length === 0 && (
        <Card className="empty-card">
          <h3>No stickers yet</h3>
          <p className="row-sub">Register the stickers from your pack, then press each one onto something you carry.</p>
        </Card>
      )}
      <button type="button" className="ghost-link" onClick={() => nav('/shop/design/stickers')}><ShoppingBag size={15} /> Get more stickers</button>
    </>
  )
}

/* Register ------------------------------------------------------------- */

export function RegisterStickers() {
  const { state, dispatch, toast } = useStore()
  const nav = useNavigate()
  const [round, setRound] = useState(0)
  const [found, setFound] = useState<Sticker[]>([])
  const scanning = round > found.length

  return (
    <Screen tabs>
      <PageHead back="/items/stickers" backLabel="Stickers" title="Register stickers"
        sub="Hold your phone near each sticker, one at a time. You can attach them to items now or later." />
      <div className="pair-stage small">
        {scanning ? <ScanOne key={round} onFound={(s) => setFound((f) => [...f, s])} /> : <PulseRings active={false} tone={found.length ? 'green' : 'blue'} />}
      </div>
      <p className="center lead">
        {scanning ? 'Looking for a sticker…' : found.length ? `${found.length} found` : 'Ready when you are'}
      </p>

      {found.length > 0 && (
        <div className="st-list">
          {found.map((s) => (
            <div key={s.id} className="st-row static">
              <StickerGlyph skin={s.skin} />
              <span className="row-copy"><span className="row-title">{s.id}<small> · {s.skin}</small></span><span className="row-sub">Battery full · new</span></span>
              <Badge tone="green">Found</Badge>
            </div>
          ))}
        </div>
      )}

      <Button variant={found.length ? 'outline' : 'blue'} disabled={scanning} onClick={() => setRound(found.length + 1)}>
        <ScanLine size={18} /> {found.length ? 'Scan another sticker' : 'Scan a sticker'}
      </Button>
      <Button disabled={!found.length || scanning} onClick={() => {
        dispatch({ type: 'registerStickers', stickers: found })
        toast({ title: `${found.length} sticker${found.length > 1 ? 's' : ''} registered`, body: 'Attach each one to an item in Stickers.', tone: 'success' })
        nav(found.length === 1 ? `/items/stickers/${found[0].id}` : '/items/stickers')
      }}>Done · register {found.length || ''}</Button>
      <p className="hint">{state.stickers.length} already registered on this account.</p>
    </Screen>
  )
}

function ScanOne({ onFound }: { onFound: (s: Sticker) => void }) {
  const detected = useStickerScan(1200)
  useEffect(() => {
    if (detected) onFound({ id: randomStickerId(), battery: 100, addedAt: todayISO(), skin: skins[Math.floor(Math.random() * skins.length)] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detected])
  return <PulseRings active tone="blue" />
}

/* Detail --------------------------------------------------------------- */

export function StickerDetail() {
  const { id } = useParams()
  const { state, dispatch, toast } = useStore()
  const nav = useNavigate()
  const [picking, setPicking] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const st = state.stickers.find((s) => s.id === id)
  if (!st) return <Screen tabs><PageHead back="/items/stickers" backLabel="Stickers" title="Sticker not found" /></Screen>
  const item = stickerItem(state, st.id)
  const batt = stickerBattery(state, st)

  return (
    <Screen tabs>
      <PageHead back="/items/stickers" backLabel="Stickers" title={
        <span className="detail-title"><StickerGlyph skin={st.skin} size={56} /><span>{st.id}<Badge tone={item ? 'blue' : 'gray'}>{item ? 'Attached' : 'Free'}</Badge></span></span>
      } />

      <Card>
        <h3 className="card-title">Attached to</h3>
        {item ? (
          <button type="button" className="st-item" onClick={() => nav(`/items/${item.id}`)}>
            <ItemTile icon={item.icon} color={item.color} />
            <span className="row-copy"><span className="row-title">{item.name}</span><span className="row-sub">Tracked by this sticker</span></span>
            <ChevronRight size={18} className="chev" />
          </button>
        ) : (
          <p className="row-sub">Not on anything yet. Press it onto an item, then attach it here.</p>
        )}
        <div className="btn-pair">
          <Button variant={item ? 'outline' : 'blue'} onClick={() => setPicking(true)}><Link2 size={16} /> {item ? 'Move' : 'Attach to item'}</Button>
          {item && <Button variant="outline" onClick={() => { dispatch({ type: 'attachSticker', stickerId: st.id, itemId: null }); toast({ title: `Detached from ${item.name}`, body: `${item.name} isn’t tracked until it gets a sticker.` }) }}><Link2Off size={16} /> Detach</Button>}
        </div>
      </Card>

      <Card>
        <div className="kc-line"><b>Battery</b><span className="batt-line"><Meter value={batt} /> <b>{batt}%</b></span></div>
        <p className="row-sub">Skin: {st.skin} · registered {st.addedAt}{batt < 20 ? ' · replace soon' : ''}</p>
      </Card>

      <Button variant="danger" onClick={() => setConfirmRemove(true)}><Trash2 size={16} /> Remove sticker</Button>

      <Sheet open={picking} onClose={() => setPicking(false)} title="Attach to an item">
        <p className="eyebrow">{st.id}</p>
        <h2 className="sheet-title">Which item is it on?</h2>
        <div className="st-pick">
          {state.items.filter((i) => i.id !== item?.id).map((i) => (
            <button key={i.id} type="button" className="st-item" onClick={() => {
              dispatch({ type: 'attachSticker', stickerId: st.id, itemId: i.id })
              toast({ title: `Sticker attached to ${i.name}`, body: i.stickerId ? `Its old sticker ${i.stickerId} is now free.` : undefined, tone: 'success' })
              setPicking(false)
            }}>
              <ItemTile icon={i.icon} color={i.color} size={36} />
              <span className="row-copy"><span className="row-title">{i.name}</span><span className="row-sub">{i.stickerId ? `Has ${i.stickerId} · will swap` : 'No sticker'}</span></span>
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => nav(`/items/new?sticker=${st.id}`)}><Plus size={16} /> New item with this sticker</Button>
      </Sheet>

      <Sheet open={confirmRemove} onClose={() => setConfirmRemove(false)} title="Remove sticker">
        <p className="eyebrow">{st.id}</p>
        <h2 className="sheet-title">Remove this sticker?</h2>
        <p className="lead">{item ? `${item.name} won’t be tracked until it gets another sticker.` : 'It will disappear from your sticker list.'}</p>
        <Button onClick={() => setConfirmRemove(false)}>Keep sticker</Button>
        <Button variant="danger" onClick={() => { dispatch({ type: 'removeSticker', id: st.id }); toast({ title: `${st.id} removed` }); nav('/items/stickers') }}>Remove</Button>
      </Sheet>
    </Screen>
  )
}
