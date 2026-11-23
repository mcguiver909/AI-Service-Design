import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BatteryMedium, Link2, Plus, ScanLine, Sparkles } from 'lucide-react'
import { emptyRule, locationLine, newId, randomStickerId, stickerItem, useStore } from '../store'
import type { IconKey, ItemStatus } from '../store'
import { ItemTile, itemIcons } from '../components/icons'
import { draftFromItem, ItemForm, StickerCard, useStickerScan } from '../components/ItemForm'
import { MapView } from '../components/MapView'
import { RuleEditor } from '../components/RuleEditor'
import { Button, Card, Meter, PageHead, PulseRings, Row, Screen, Sheet, StatusBadge } from '../components/ui'
import { usePairing, PairingPanel } from './Onboarding'
import { StickerGlyph, StickersPanel } from './Stickers'

type Filter = 'all' | ItemStatus

export function Items({ tab = 'items' }: { tab?: 'items' | 'stickers' }) {
  const { state } = useStore()
  const nav = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const count = (s: ItemStatus) => state.items.filter((i) => i.status === s).length
  const filters: { key: Filter; label: string; n: number }[] = [
    { key: 'all', label: 'All', n: state.items.length },
    { key: 'inBag', label: 'In bag', n: count('inBag') },
    { key: 'withYou', label: 'With you', n: count('withYou') },
    { key: 'leftBehind', label: 'Left behind', n: count('leftBehind') },
    { key: 'lost', label: 'Lost', n: count('lost') },
  ]
  const shown = state.items.filter((i) => filter === 'all' || i.status === filter)

  return (
    <Screen tabs>
      <PageHead title="Items" action={tab === 'items'
        ? <Button small block={false} onClick={() => nav('/items/new')}><Plus size={17} /> Add item</Button>
        : <Button small block={false} onClick={() => nav('/items/stickers/new')}><ScanLine size={17} /> Register</Button>
      } />

      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'items'} className={tab === 'items' ? 'on' : ''} onClick={() => nav('/items')}>Items {state.items.length}</button>
        <button type="button" role="tab" aria-selected={tab === 'stickers'} className={tab === 'stickers' ? 'on' : ''} onClick={() => nav('/items/stickers')}>Stickers {state.stickers.length}</button>
      </div>

      {tab === 'stickers' ? <StickersPanel /> : <>

      <Card className="keyring-row" onClick={() => nav('/settings/keyring')}>
        <span className="ring-ico" />
        <span className="row-copy">
          <span className="row-title">Keyring</span>
          <span className="row-sub">{state.keyring.paired ? 'Connected · on your backpack' : 'Not paired · tap to pair'}</span>
        </span>
        {state.keyring.paired && <span className="batt"><BatteryMedium size={18} /> {state.keyring.battery}%</span>}
      </Card>

      <div className="filters" role="tablist">
        {filters.map((f) => (
          <button key={f.key} type="button" role="tab" aria-selected={filter === f.key}
            className={`filter ${filter === f.key ? 'on' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label} {f.n}
          </button>
        ))}
      </div>

      <div className="stack">
        {shown.map((item) => (
          <Row key={item.id} to={`/items/${item.id}`}
            className={item.status === 'leftBehind' ? 'row-warn' : ''}
            leading={<ItemTile icon={item.icon} color={item.color} />}
            title={item.name}
            sub={locationLine(item)}
            trailing={
              <span className="trail-stack">
                <StatusBadge status={item.status} />
                <small className={item.battery < 20 ? 'text-red' : ''}>
                  {item.stickerId ? <>{item.stickerId} · {item.battery}%{item.battery < 20 ? ' · replace soon' : ''}</> : 'No sticker'}
                </small>
              </span>
            }
          />
        ))}
        {shown.length === 0 && <p className="empty">No items here.</p>}
      </div>
      <button type="button" className="ghost-link" onClick={() => nav('/shop/design/stickers')}>Running low on stickers? Design a new pack</button>
      </>}
    </Screen>
  )
}

/* Item details ---------------------------------------------------------- */

export function ItemDetail() {
  const { id } = useParams()
  const { state, dispatch, toast } = useStore()
  const nav = useNavigate()
  const item = state.items.find((i) => i.id === id)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [repair, setRepair] = useState(false)

  if (!item) {
    return (
      <Screen tabs>
        <PageHead back="/items" backLabel="Items" title="Item not found" sub="It may have been removed." />
      </Screen>
    )
  }
  const away = item.status === 'leftBehind' || item.status === 'lost'

  return (
    <Screen tabs>
      <PageHead back="/items" backLabel="Items" title={
        <span className="detail-title">
          <ItemTile icon={item.icon} color={item.color} size={56} />
          <span>
            {item.name}
            <StatusBadge status={item.status} />
          </span>
        </span>
      } />

      <Card className="loc-card">
        {away && item.seen ? (
          <>
            <MapView variant={item.seen.mapVariant} compact showRoute={false} />
            <h3>{item.seen.place}</h3>
            <p className="row-sub">
              {item.status === 'lost' ? `Seen ${item.seen.time} · ${item.meshSearch ? 'mesh search on' : 'search off'}` : `Today, ${item.seen.time} · last connected to your keyring`}
            </p>
            <div className="btn-pair">
              <Button onClick={() => nav(`/find/${item.id}/ring`)}>Ring it</Button>
              <Button variant="outline" onClick={() => nav(`/find/${item.id}/directions`)}>Directions</Button>
            </div>
          </>
        ) : (
          <div className="inbag">
            <span className="row-copy">
              <span className="row-title">{item.status === 'inBag' ? 'In your backpack' : 'Near you, outside the bag'}</span>
              <span className="row-sub">Connected just now</span>
            </span>
            <Button variant="outline" small block={false} onClick={() => nav(`/find/${item.id}/ring`)}>Ring it</Button>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="card-title">When do I need this?</h3>
        <RuleEditor rule={item.rule} onChange={(rule) => dispatch({ type: 'updateItem', id: item.id, patch: { rule } })} />
        <p className="hint">These rules build the packing list on Today.</p>
      </Card>

      <Card>
        {item.stickerId ? (
          <button type="button" className="st-item" onClick={() => nav(`/items/stickers/${item.stickerId}`)}>
            <StickerGlyph skin={state.stickers.find((x) => x.id === item.stickerId)?.skin ?? 'Clear'} size={36} />
            <span className="row-copy"><span className="row-title">Sticker {item.stickerId}</span><span className="row-sub">{item.battery < 20 ? 'Battery low · replace soon' : 'Manage, move or swap this sticker'}</span></span>
            <span className="batt-line"><Meter value={item.battery} /> <b>{item.battery}%</b></span>
          </button>
        ) : (
          <div className="inbag">
            <span className="row-copy"><span className="row-title">No sticker</span><span className="row-sub">Not tracked until a sticker is attached</span></span>
            <Button variant="blue" small block={false} onClick={() => nav('/items/stickers')}><Link2 size={15} /> Attach</Button>
          </div>
        )}
        <div className="btn-trio">
          <Button variant="outline" onClick={() => setRepair(true)}>Re-pair</Button>
          <Button variant="outline" onClick={() => nav(`/items/${item.id}/edit`)}>Edit</Button>
          <Button variant="danger" onClick={() => setConfirmRemove(true)}>Remove</Button>
        </div>
      </Card>

      <Sheet open={confirmRemove} onClose={() => setConfirmRemove(false)} title="Remove item">
        <p className="eyebrow">{item.name}</p>
        <h2 className="sheet-title">Remove this item?</h2>
        <p className="lead">Removing the item disconnects its sticker and clears its packing rules.</p>
        <Button onClick={() => setConfirmRemove(false)}>Keep item</Button>
        <Button variant="danger" onClick={() => {
          dispatch({ type: 'removeItem', id: item.id })
          toast({ title: `${item.name} removed` })
          nav('/items')
        }}>Remove</Button>
      </Sheet>

      <RepairSheet open={repair} onClose={() => setRepair(false)} name={item.name}
        onDone={() => { dispatch({ type: 'updateItem', id: item.id, patch: { battery: Math.max(item.battery, 100) } }); toast({ title: 'Sticker re-paired', tone: 'success' }) }} />
    </Screen>
  )
}

function RepairSheet({ open, onClose, name, onDone }: { open: boolean; onClose: () => void; name: string; onDone: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Re-pair sticker">
      {open && <RepairBody name={name} onDone={() => { onDone(); onClose() }} />}
    </Sheet>
  )
}

function RepairBody({ name, onDone }: { name: string; onDone: () => void }) {
  const detected = useStickerScan(1500)
  return (
    <>
      <p className="eyebrow">Re-pair sticker</p>
      <h2 className="sheet-title">Hold your phone near the {name.toLowerCase()}</h2>
      <div className="pair-stage small"><PulseRings active={!detected} tone={detected ? 'green' : 'blue'} /></div>
      <StickerCard stickerId="TG-4F2A" detected={detected} />
      <Button disabled={!detected} onClick={onDone}>Done</Button>
    </>
  )
}

/* Add / edit ---------------------------------------------------------- */

export function AddItem() {
  const { dispatch, toast } = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const aiReason = params.get('ai')
  const presetIcon = (Object.keys(itemIcons) as IconKey[]).find((k) => k === params.get('icon'))
  const { state } = useStore()
  const free = state.stickers.filter((x) => !stickerItem(state, x.id))
  const [chosen, setChosen] = useState<string | null>(() => free.find((x) => x.id === params.get('sticker'))?.id ?? null)
  const scanned = useStickerScan()
  const [newSticker] = useState(randomStickerId)
  const stickerId = chosen ?? newSticker
  const detected = chosen ? true : scanned
  return (
    <Screen tabs>
      <PageHead back={aiReason ? '/today' : '/items'} backLabel={aiReason ? 'Today' : 'Items'} title="Add an item" sub="Peel a clear sticker, press it onto the item, then hold your phone near it." />
      {aiReason && <p className="ai-from"><Sparkles size={14} /> Suggested by Tagly AI · {aiReason}</p>}
      {free.length > 0 && (
        <div className="st-choose">
          <span className="field-label">Sticker</span>
          <div className="chips">
            <button type="button" className={`chip ${chosen === null ? 'on' : ''}`} onClick={() => setChosen(null)}><ScanLine size={14} /> Scan a new one</button>
            {free.map((x) => (
              <button key={x.id} type="button" className={`chip ${chosen === x.id ? 'on' : ''}`} onClick={() => setChosen(x.id)}>
                <StickerGlyph skin={x.skin} size={16} /> {x.id}
              </button>
            ))}
          </div>
        </div>
      )}
      <StickerCard stickerId={stickerId} detected={detected} />
      <ItemForm key={stickerId} detected={detected} submitLabel="Save item"
        initial={{ name: params.get('name') ?? '', icon: presetIcon ?? 'bottle', color: 'sky', stickerId, rule: aiReason ? { ...emptyRule } : { ...emptyRule, always: true } }}
        onSubmit={(d) => {
          const id = newId(d.name)
          const battery = state.stickers.find((x) => x.id === stickerId)?.battery ?? 100
          dispatch({ type: 'upsertItem', item: { id, name: d.name, icon: d.icon, color: d.color, rule: d.rule, stickerId, battery, status: 'withYou' } })
          if (aiReason) {
            dispatch({ type: 'aiAccept', itemId: id, reason: aiReason, keys: (params.get('keys') ?? '').split(',').filter(Boolean) })
            toast({ title: `${d.name} tagged and added to today`, body: aiReason, tone: 'success' })
            nav('/today')
            return
          }
          toast({ title: `${d.name} added`, body: d.rule.always ? 'Its Always rule adds it to your daily list.' : 'It will be suggested when its rule matches.', tone: 'success' })
          nav(`/items/${id}`)
        }} />
    </Screen>
  )
}

export function EditItem() {
  const { id } = useParams()
  const { state, dispatch, toast } = useStore()
  const nav = useNavigate()
  const item = state.items.find((i) => i.id === id)
  if (!item) return <Screen tabs><PageHead back="/items" backLabel="Items" title="Item not found" /></Screen>
  return (
    <Screen tabs>
      <PageHead back={`/items/${item.id}`} backLabel={item.name} title="Edit your item" />
      <ItemForm showRule={false} submitLabel="Save changes" initial={draftFromItem(item)}
        onSubmit={(d) => {
          dispatch({ type: 'updateItem', id: item.id, patch: { name: d.name, icon: d.icon, color: d.color } })
          toast({ title: 'Changes saved', tone: 'success' })
          nav(`/items/${item.id}`)
        }} />
    </Screen>
  )
}

/** Keyring re-pair sheet, reused from Settings. */
export function KeyringRepairSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Re-pair keyring">
      {open && <KeyringRepairBody onClose={onClose} />}
    </Sheet>
  )
}

function KeyringRepairBody({ onClose }: { onClose: () => void }) {
  const { state, set, toast } = useStore()
  const { phase, connect } = usePairing(true)
  return (
    <>
      <p className="eyebrow">Keyring</p>
      <h2 className="sheet-title">{phase === 'connected' ? 'Keyring connected' : 'Re-pair your keyring'}</h2>
      <PairingPanel phase={phase} onConnect={connect} />
      <Button disabled={phase !== 'connected'} onClick={() => {
        set({ keyring: { ...state.keyring, paired: true } })
        toast({ title: 'Keyring connected', tone: 'success' })
        onClose()
      }}>Done</Button>
    </>
  )
}
