import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, ExternalLink, Navigation, Radar } from 'lucide-react'
import { useStore } from '../store'
import type { Item } from '../store'
import { ItemTile } from '../components/icons'
import { MapView } from '../components/MapView'
import { Badge, Button, Card, LinkButton, PageHead, PulseRings, Screen, Sheet, StatusBadge } from '../components/ui'

function awayItems(items: Item[]) {
  return items.filter((i) => i.status === 'leftBehind' || i.status === 'lost')
}

export function Find() {
  const { id } = useParams()
  const { state, dispatch, toast } = useStore()
  const nav = useNavigate()
  const byId = state.items.find((i) => i.id === id && i.seen && i.status !== 'inBag')
  const away = awayItems(state.items)
  if (byId && !away.includes(byId)) away.unshift(byId)
  const selected = byId ?? away[0]
  const [confirmLost, setConfirmLost] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!searching || !selected) return
    const t = window.setTimeout(() => {
      setSearching(false)
      dispatch({ type: 'updateItem', id: selected.id, patch: { seen: { ...(selected.seen ?? { place: 'Hyehwa Station', mapVariant: 2 }), place: 'Hyehwa Station', time: 'just now', mapVariant: 2, distance: '1.2 km', walk: 'about 15 min walking' } } })
      toast({ push: true, title: `${selected.name} found`, body: 'Spotted by a nearby device at Hyehwa Station.' })
    }, 2200)
    return () => window.clearTimeout(t)
  }, [searching, selected, dispatch, toast])

  if (!state.permissions.location) {
    return (
      <Screen tabs>
        <PageHead title="Find" />
        <Card className="empty-card">
          <h3>Location is off</h3>
          <p className="row-sub">Without location, Tagly can’t show where an item was left. Turn it on to use the Find map.</p>
          <Button onClick={() => nav('/settings/privacy')}>Turn on location</Button>
        </Card>
      </Screen>
    )
  }

  if (!selected) {
    return (
      <Screen tabs>
        <PageHead title="Find" />
        <Card tone="green" className="empty-card">
          <h3><Check size={20} strokeWidth={3} /> Everything is with you</h3>
          <p className="row-sub">No item is left behind or lost. Items show up here when they lose touch with your keyring.</p>
        </Card>
      </Screen>
    )
  }

  const s = selected.seen
  const lost = selected.status === 'lost'

  return (
    <Screen tabs>
      <PageHead title="Find" />
      <div className="filters">
        {away.map((i) => (
          <button key={i.id} type="button" className={`filter ${i.id === selected.id ? 'on dark' : ''}`} onClick={() => nav(`/find/${i.id}`, { replace: true })}>
            {i.name} · {i.status === 'leftBehind' ? 'left behind' : i.status === 'lost' ? 'lost' : 'nearby'}
          </button>
        ))}
      </div>

      <MapView variant={s?.mapVariant ?? 0} label={s?.place} />

      <Card className={`find-card ${selected.status === 'leftBehind' ? 'warn-border' : ''}`}>
        <div className="fc-head">
          <ItemTile icon={selected.icon} color={selected.color} size={40} />
          <span className="row-copy">
            <span className="row-title">{selected.name} {lost ? 'marked as lost' : selected.status === 'leftBehind' ? 'left behind' : 'nearby'}</span>
            <span className="row-sub">
              {s?.place} · {s?.time}{s?.distance ? ` · ${s.distance} away` : s?.note ? ` · ${s.note}` : ''}
            </span>
          </span>
          <StatusBadge status={selected.status} />
        </div>
        <p className="fc-note">
          {lost
            ? selected.meshSearch
              ? 'Mesh search is on. A nearby Tagly user’s phone can update this location anonymously.'
              : 'Mesh search is off.'
            : selected.status === 'leftBehind'
              ? 'It lost connection while your keyring was moving away.'
              : 'This is the last connected location, not a live GPS position.'}
        </p>
        {lost ? (
          <>
            <Button variant="blue" disabled={searching} onClick={() => setSearching(true)}>
              {searching ? <><Radar size={18} className="spin" /> Searching nearby devices…</> : 'Search network now'}
            </Button>
            <div className="btn-pair">
              <Button variant="outline" onClick={() => nav(`/find/${selected.id}/directions`)}>Directions</Button>
              <Button variant="outline" onClick={() => {
                dispatch({ type: 'updateItem', id: selected.id, patch: { status: 'withYou', meshSearch: false } })
                toast({ title: `${selected.name} marked as found`, tone: 'success' })
              }}>Mark as found</Button>
            </div>
          </>
        ) : (
          <>
            <div className="btn-pair">
              <Button onClick={() => nav(`/find/${selected.id}/ring`)}>Ring it</Button>
              <Button variant="outline" onClick={() => nav(`/find/${selected.id}/directions`)}>Directions</Button>
            </div>
            <LinkButton className="text-red" onClick={() => setConfirmLost(true)}>Mark as lost</LinkButton>
          </>
        )}
      </Card>

      <Sheet open={confirmLost} onClose={() => setConfirmLost(false)} title="Mark as lost">
        <p className="eyebrow">{selected.name}</p>
        <h2 className="sheet-title">Mark as lost?</h2>
        <p className="lead">Tagly turns on mesh search and notifies you when a nearby device spots it. Lost status resets automatically when it reconnects.</p>
        <Button onClick={() => {
          dispatch({ type: 'updateItem', id: selected.id, patch: { status: 'lost', meshSearch: true } })
          setConfirmLost(false)
          toast({ title: 'Marked as lost', body: 'Network search is active.' })
        }}>Mark as lost</Button>
        <Button variant="light" onClick={() => setConfirmLost(false)}>Cancel</Button>
      </Sheet>
    </Screen>
  )
}

/* Ring ---------------------------------------------------------------- */

export function Ring() {
  const { id } = useParams()
  const { state, dispatch, toast } = useStore()
  const nav = useNavigate()
  const item = state.items.find((i) => i.id === id)
  const [found, setFound] = useState(false)

  useEffect(() => {
    if (found) return
    try { navigator.vibrate?.([200, 120, 200]) } catch { /* not supported */ }
  }, [found])

  if (!item) return <Screen><PageHead back title="Item not found" /></Screen>

  if (found) {
    return (
      <Screen>
        <PageHead eyebrow="Item found" title="Back together" />
        <Card tone="green" className="big-note">
          <h3><Check size={22} strokeWidth={3} /> {item.name} reconnected</h3>
          <p>Lost and left-behind status clears when the sticker reconnects to your keyring.</p>
        </Card>
        <div className="bottom-actions inline">
          <Button onClick={() => {
            dispatch({ type: 'updateItem', id: item.id, patch: { status: 'inBag', meshSearch: false } })
            toast({ title: `${item.name} is in your bag`, tone: 'success' })
            nav('/today')
          }}>Put {item.name.toLowerCase()} in bag</Button>
          <Button variant="light" onClick={() => nav('/find')}>Back to Find</Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen className="ring-screen">
      <PageHead back eyebrow="Nearby search" title="Listen for your item" />
      <div className="ring-stage">
        <PulseRings>
          <ItemTile icon={item.icon} color={item.color} size={64} />
        </PulseRings>
        <p className="ring-label">{item.name} is ringing…</p>
        <p className="row-sub center">Ringing works when the sticker is within Bluetooth range of your keyring or phone.</p>
      </div>
      <div className="bottom-actions inline">
        <Button onClick={() => {
          dispatch({ type: 'updateItem', id: item.id, patch: { status: 'withYou', meshSearch: false } })
          setFound(true)
        }}>I found it</Button>
        <Button variant="light" onClick={() => nav(-1)}>Stop ringing</Button>
      </div>
    </Screen>
  )
}

/* Directions --------------------------------------------------------- */

export function Directions() {
  const { id } = useParams()
  const { state } = useStore()
  const nav = useNavigate()
  const item = state.items.find((i) => i.id === id)
  if (!item?.seen) return <Screen><PageHead back title="No location yet" /></Screen>
  const s = item.seen
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.place + ' Seoul')}`
  return (
    <Screen>
      <PageHead back eyebrow="Route preview" title="Head back to your item" />
      <MapView variant={s.mapVariant} label={s.place} />
      <Card className="route-card">
        <span className="row-copy">
          <span className="row-title">{s.place}</span>
          <span className="row-sub">{s.distance ? `${s.distance} · ${s.walk}` : `Nearby · last connected ${s.time}`}</span>
        </span>
        <Badge tone="blue"><Navigation size={13} /> Route</Badge>
      </Card>
      <p className="hint">Illustrative route. “Open in Maps” opens your maps app at this last known location.</p>
      <div className="bottom-actions inline">
        <a className="btn btn-dark block" href={mapsUrl} target="_blank" rel="noreferrer">Open in Maps <ExternalLink size={16} /></a>
        <Button variant="light" onClick={() => nav(-1)}>Back</Button>
      </div>
    </Screen>
  )
}
