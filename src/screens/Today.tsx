import { useNavigate } from 'react-router-dom'
import { CloudRain, Snowflake, Sun, X } from 'lucide-react'
import { activeEvents, eventItems, packingList, suggestion, useStore } from '../store'
import { ItemTile } from '../components/icons'
import { Badge, Button, Card, PageHead, Row, Screen, Section, StatusBadge, Toggle } from '../components/ui'

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

const weatherIcon = { rain: CloudRain, cold: Snowflake, sun: Sun, clear: Sun }

export function Today() {
  const { state, dispatch, toast } = useStore()
  const nav = useNavigate()
  const list = packingList(state)
  const packed = list.filter((e) => e.packed).length
  const missing = list.length - packed
  const allPacked = list.length > 0 && missing === 0
  const sugg = suggestion(state)
  const events = activeEvents(state)
  const weatherItems = list.filter((e) => e.reason.startsWith('Weather'))
  const WIcon = weatherIcon[state.weather.kind]

  const keyringPill = !state.keyring.paired ? (
    <Badge tone="gray">Keyring not paired</Badge>
  ) : allPacked ? (
    <Badge tone="green" dot>All packed</Badge>
  ) : missing > 0 && state.keyring.feedback !== 'off' ? (
    <Badge tone="red" dot>Keyring buzzing</Badge>
  ) : null

  return (
    <Screen tabs>
      <PageHead eyebrow={todayLabel()} title="Today" action={keyringPill} />

      <Card className={`progress-card ${allPacked ? 'tone-green' : ''}`}>
        <div className="pc-head">
          <p className="pc-count">
            {allPacked ? <>You’re ready to go</> : <><b>{packed}</b> of {list.length} packed</>}
          </p>
          {missing > 0 && <span className="text-red strong small">{missing} missing</span>}
        </div>
        {list.length > 0 ? (
          <div className="segments">
            {list.map((e) => <span key={e.item.id} className={e.packed ? 'ok' : 'miss'} />)}
          </div>
        ) : (
          <p className="row-sub">Nothing on today’s list yet. Add items or set rules in Items.</p>
        )}
        {allPacked && <p className="row-sub">{list.length} of {list.length} packed · keyring light is steady green.</p>}
      </Card>

      {state.weatherOn && state.weather.kind !== 'clear' && (
        <Card tone="blue" className="weather-card">
          <span className="w-ico"><WIcon size={22} /></span>
          <span className="row-copy">
            <span className="row-title">{state.weather.label}</span>
            <span className="row-sub">
              {weatherItems.length ? `${weatherItems.map((e) => e.item.name).join(', ')} added to today’s list` : 'No weather rules match today'}
            </span>
          </span>
        </Card>
      )}

      {events.length > 0 && (
        <Card className="appointments">
          <h3>Today’s appointments</h3>
          {events.map((e) => {
            const names = eventItems(state, e)
            return (
              <p key={e.id}>
                <time>{e.time}</time> <b>{e.title}</b>
                {names.length > 0 && <span> · {names.join(', ')}</span>}
              </p>
            )
          })}
        </Card>
      )}

      <Section title="Packing list" action={<button type="button" className="text-link small" onClick={() => nav('/today/edit')}>Edit</button>}>
        <div className="stack">
          {list.map(({ item, reason, packed: ok }) => (
            <Row key={item.id}
              className={!ok ? 'row-missing' : ''}
              leading={<ItemTile icon={item.icon} color={item.color} />}
              title={item.name}
              sub={reason}
              onClick={() => nav(`/items/${item.id}`)}
              trailing={ok ? <StatusBadge status="inBag" /> : (
                <Button small block={false} onClick={() => nav(`/find/${item.id}`)}>Find</Button>
              )}
            />
          ))}
          {sugg && (
            <div className="row suggestion">
              <ItemTile icon={sugg.icon} color={sugg.color} />
              <span className="row-copy">
                <span className="row-title">{sugg.name}?</span>
                <span className="row-sub">Suggested · you often take them on {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}s</span>
              </span>
              <Button variant="blue" small block={false} onClick={() => {
                dispatch({ type: 'toggleToday', id: sugg.id, include: true })
                toast({ title: `${sugg.name} added`, body: 'Added manually for today.' })
              }}>Add</Button>
              <button type="button" className="icon-btn" aria-label="Dismiss suggestion" onClick={() => dispatch({ type: 'dismissSuggestion', id: sugg.id })}>
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      </Section>
    </Screen>
  )
}

/** "Pack your way": include or exclude any item for today only. */
export function EditPackingList() {
  const { state, dispatch } = useStore()
  const nav = useNavigate()
  const list = packingList(state)
  const on = new Set(list.map((e) => e.item.id))
  return (
    <Screen>
      <PageHead back="/today" eyebrow="Today" title="Pack your way" sub="Choose what goes on today’s list. Changes apply to today only; item rules stay the same." />
      <div className="stack">
        {state.items.map((item) => {
          const entry = list.find((e) => e.item.id === item.id)
          return (
            <Row key={item.id}
              leading={<ItemTile icon={item.icon} color={item.color} />}
              title={item.name}
              sub={entry ? entry.reason : 'Not on today’s list'}
              trailing={<Toggle label={`Include ${item.name} today`} checked={on.has(item.id)}
                onChange={(v) => dispatch({ type: 'toggleToday', id: item.id, include: v })} />}
            />
          )
        })}
      </div>
      <div className="bottom-actions">
        <Button onClick={() => nav('/today')}>Done</Button>
      </div>
    </Screen>
  )
}
