import { useNavigate } from 'react-router-dom'
import {
  Check, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, MapPin, RefreshCw, Snowflake, Sparkles, Sun, Umbrella,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { activeEvents, eventItems, greetName, greeting, packingList, useStore } from '../store'
import { forgetRisk, pct } from '../ai'
import { AiCard } from '../components/AiCard'
import { codeGroup, codeText, hourLabel } from '../weather'
import type { CodeGroup } from '../weather'
import { useCalendarSync } from '../sync'
import { ItemTile } from '../components/icons'
import { Badge, Button, Card, PageHead, Row, Screen, Section, Toggle } from '../components/ui'

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

const groupIcon: Record<CodeGroup, (p: LucideProps) => React.ReactElement> = {
  sun: (p) => <Sun {...p} />,
  partly: (p) => <CloudSun {...p} />,
  cloud: (p) => <Cloud {...p} />,
  fog: (p) => <CloudFog {...p} />,
  rain: (p) => <CloudRain {...p} />,
  snow: (p) => <Snowflake {...p} />,
  storm: (p) => <CloudLightning {...p} />,
}

export function WeatherIcon({ code, size = 20 }: { code: number; size?: number }) {
  const I = groupIcon[codeGroup(code)]
  return <I size={size} strokeWidth={1.8} />
}

function WeatherCard() {
  const { state } = useStore()
  const w = state.weather
  const list = packingList(state)
  const weatherItems = list.filter((e) => e.reason.startsWith('Weather')).map((e) => e.item.name)
  if (!state.weatherOn) return null
  if (w.temp === undefined) {
    return (
      <Card tone="blue" className="weather-card loading">
        <span className="row-title">{w.label}</span>
      </Card>
    )
  }
  const updated = w.updated ? new Date(w.updated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null
  return (
    <Card tone="blue" className="weather-card">
      <div className="wx-now">
        <span className="wx-ico"><WeatherIcon code={w.code ?? 3} size={34} /></span>
        <span className="wx-temp">{w.temp}°</span>
        <span className="wx-meta">
          <b>{codeText(w.code ?? 3)}</b>
          <span>H {w.high}° · L {w.low}°</span>
          <small><MapPin size={11} /> {w.place}{updated ? ` · ${updated}` : ''}</small>
        </span>
      </div>
      {w.hours && w.hours.length > 0 && (
        <div className="wx-hours">
          {w.hours.map((h, i) => (
            <span key={h.h + '-' + i} className="wx-hour">
              <small>{i === 0 ? 'Now' : hourLabel(h.h).replace(' ', '')}</small>
              <WeatherIcon code={h.code} size={18} />
              <b>{h.temp}°</b>
              <em className={h.pop >= 50 ? 'wet' : ''}>{h.pop >= 20 ? `${h.pop}%` : ''}</em>
            </span>
          ))}
        </div>
      )}
      <div className="wx-rule">
        {w.kind === 'rain' ? <Umbrella size={16} /> : w.kind === 'cold' ? <Snowflake size={16} /> : <Sun size={16} />}
        <span>
          <b>{w.label}</b>
          {weatherItems.length > 0 ? ` · ${weatherItems.join(', ')} added to today’s list` : w.kind !== 'clear' ? ' · no item has a rule for this yet' : ''}
        </span>
      </div>
    </Card>
  )
}

function Schedule() {
  const { state } = useStore()
  const nav = useNavigate()
  const { sync, syncing, needsRefresh } = useCalendarSync()
  const events = activeEvents(state)
  const canSync = state.googleConnected && state.user && !state.user.demo && state.user.email !== 'local'
  return (
    <Card className="appointments">
      <div className="appt-head">
        <h3>Today’s schedule</h3>
        {canSync && (
          <button type="button" className="text-link small" onClick={() => sync(true)} disabled={syncing}>
            <RefreshCw size={13} className={syncing ? 'spin' : ''} /> {needsRefresh ? 'Refresh calendar' : 'Sync'}
          </button>
        )}
      </div>
      {events.map((e) => {
        const names = eventItems(state, e)
        return (
          <p key={e.id} className="appt">
            <i style={{ background: e.color }} />
            <time>{e.allDay ? 'All day' : e.time}</time>
            <span><b>{e.title}</b>{names.length > 0 && <> · {names.join(', ')}</>}</span>
          </p>
        )
      })}
      {events.length === 0 && (
        <p className="row-sub">
          Nothing scheduled today.{' '}
          {state.timetable.length === 0 && <button type="button" className="text-link small inline" onClick={() => nav('/settings/schedule')}>Add your weekly schedule</button>}
        </p>
      )}
      {needsRefresh && canSync && <p className="hint">Google sessions last an hour. Tap “Refresh calendar” to load new events.</p>}
    </Card>
  )
}

function RiskSub({ reason, risk }: { reason: string; risk: ReturnType<typeof forgetRisk> }) {
  return (
    <>
      {reason}
      {risk && risk.risk >= 0.35 && (
        <span className="risk-line"><Sparkles size={11} /> {risk.why} · {pct(risk.risk)} risk</span>
      )}
    </>
  )
}

export function Today() {
  const { state, dispatch, toast } = useStore()
  const nav = useNavigate()
  const list = packingList(state)
  const packed = list.filter((e) => e.packed).length
  const missing = list.length - packed
  const allPacked = list.length > 0 && missing === 0

  const keyringPill = !state.keyring.paired ? null : allPacked ? (
    <Badge tone="green" dot>All packed</Badge>
  ) : missing > 0 && state.keyring.feedback !== 'off' ? (
    <Badge tone="red" dot>Keyring buzzing</Badge>
  ) : null

  const pack = (id: string, name: string, inBag: boolean) => {
    dispatch({ type: 'updateItem', id, patch: { status: inBag ? 'inBag' : 'withYou' } })
    if (inBag) toast({ title: `${name} packed`, tone: 'success' })
  }

  return (
    <Screen tabs>
      <PageHead eyebrow={todayLabel()} title={<span className="greet">{greeting()}{greetName(state) ? <>,<br />{greetName(state)}</> : ''}</span>} action={keyringPill} />

      <Schedule />
      <WeatherCard />

      <Section title="Packing list" action={state.items.length > 0 ? <button type="button" className="text-link small" onClick={() => nav('/today/edit')}>Edit</button> : undefined}>
      {list.length > 0 && (
        <Card className={`progress-card ${allPacked ? 'tone-green' : ''}`}>
          <div className="pc-head">
            <p className="pc-count">{allPacked ? <>You’re ready to go</> : <><b>{packed}</b> of {list.length} packed</>}</p>
            {missing > 0 && <span className="text-red strong small">{missing} missing</span>}
          </div>
          <div className="segments">{list.map((e) => <span key={e.item.id} className={e.packed ? 'ok' : 'miss'} />)}</div>
          {allPacked && <p className="row-sub">{list.length} of {list.length} packed{state.keyring.paired ? ' · keyring light is steady green' : ''}.</p>}
        </Card>
      )}

        <div className="stack">
          {list.map(({ item, reason, packed: ok }) => (
            <Row key={item.id}
              className={!ok ? 'row-missing' : ''}
              leading={<ItemTile icon={item.icon} color={item.color} />}
              title={item.name}
              sub={<RiskSub reason={reason} risk={!ok && state.ai.on ? forgetRisk(state, item) : null} />}
              onClick={() => nav(`/items/${item.id}`)}
              trailing={ok ? (
                <button type="button" className="badge badge-green as-btn" onClick={(e) => { e.stopPropagation(); pack(item.id, item.name, false) }}
                  aria-label={`${item.name} is in your bag. Tap to unpack`}>
                  <Check size={13} strokeWidth={3} /> In bag
                </button>
              ) : item.status === 'withYou' ? (
                <Button small block={false} onClick={(e) => { e.stopPropagation(); pack(item.id, item.name, true) }}>Pack</Button>
              ) : (
                <Button small block={false} onClick={(e) => { e.stopPropagation(); nav(`/find/${item.id}`) }}>Find</Button>
              )}
            />
          ))}
          {list.length === 0 && state.items.length === 0 && (
            <Card className="empty-card">
              <h3>Add what you carry</h3>
              <p className="row-sub">Tag your laptop, keys or pencil case and tell Tagly when you need them.</p>
              <Button onClick={() => nav('/items/new')}>Add an item</Button>
            </Card>
          )}
          {list.length === 0 && state.items.length > 0 && (
            <Card className="empty-card">
              <h3>Nothing needed today</h3>
              <p className="row-sub">No class, event or weather rule matches today. Tap Edit to add something for today only.</p>
            </Card>
          )}
        </div>
        {!state.keyring.paired && list.some((e) => !e.packed) && (
          <p className="hint">No keyring paired, so tap <b>Pack</b> as you put each item in your bag.</p>
        )}
      </Section>

      <AiCard />
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
