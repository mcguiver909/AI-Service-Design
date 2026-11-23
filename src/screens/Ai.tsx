import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, Brain, CalendarClock, Footprints, MapPin, RotateCcw, Sparkles } from 'lucide-react'
import { packingList, todayISO, useStore } from '../store'
import { cloudAvailable, concepts, departureSignals, forgetRisk, fuse, habitPatterns, pct, todayTags } from '../ai'
import type { Signal } from '../ai'
import { ItemTile } from '../components/icons'
import { Badge, Button, Card, Group, GroupRow, PageHead, Screen, Toggle } from '../components/ui'

const steps = [
  { k: 'Predict', t: 'Reads event titles and the forecast and works out what you need. “Team meeting” → laptop and charger; rain at 3 PM → umbrella.', tag: 'Live' },
  { k: 'Prioritize', t: 'Learns which things you tend to leave behind, and on which days, from your bag history. Risky items are flagged first.', tag: 'Live' },
  { k: 'Detect', t: 'Fuses keyring motion, leaving a saved place and your next event to spot the moment you head out, so the reminder lands on time.', tag: 'Simulated' },
  { k: 'Locate', t: 'When an item drops out of range, ranks where it most likely is from where the signal dropped and where you spent the day.', tag: 'Live' },
  { k: 'Learn', t: 'Every “Add” and “Not today” tunes the next suggestion. Accept the same idea twice and it becomes an automatic rule.', tag: 'Live' },
]

export function AiSettings() {
  const { state, set, dispatch, toast } = useStore()
  const nav = useNavigate()
  const [cloud, setCloud] = useState<boolean | null>(null)
  useEffect(() => { cloudAvailable().then(setCloud) }, [])

  const learned = Object.entries(state.aiFeedback)
  const rules = state.items.flatMap((i) => i.rule.keywords.map((k) => ({ item: i, k })))
  const liked = learned.filter(([, f]) => f.yes >= 2)
  const disliked = learned.filter(([, f]) => f.no >= 1)
  const habits = habitPatterns(state)
  const label = (key: string) => {
    const [c, s] = key.split('|')
    const concept = concepts.find((x) => x.id === c)?.label ?? (c === 'rain' ? 'rainy days' : c === 'claude' ? 'Claude suggestions' : c)
    const item = state.items.find((i) => i.id === s)?.name ?? s.replace(/-/g, ' ')
    return { concept, item: item.charAt(0).toUpperCase() + item.slice(1) }
  }

  return (
    <Screen tabs>
      <PageHead back="/settings" backLabel="Settings" eyebrow="Tagly AI" title="Your packing brain"
        sub="Tagly AI reads your schedule, the forecast and your bag history to decide what you need, when to remind you, and where a lost item probably is." />

      <Group label="Settings">
        <div className="g-row">
          <span className="row-copy"><span className="row-title">Smart suggestions</span><span className="row-sub">Daily briefing and “you might need” items on Today</span></span>
          <Toggle label="Smart suggestions" checked={state.ai.on} onChange={(v) => set({ ai: { ...state.ai, on: v } })} />
        </div>
        <div className="g-row">
          <span className="row-copy">
            <span className="row-title">Use Claude</span>
            <span className="row-sub">
              {cloud === null ? 'Checking…' : cloud ? 'Connected. Understands any event title, in Korean or English.' : 'Not set up on this site, so the on-device model is used.'}
            </span>
          </span>
          <Toggle label="Use Claude" checked={state.ai.cloud} onChange={(v) => set({ ai: { ...state.ai, cloud: v } })} />
        </div>
      </Group>
      <p className="hint">With Claude on, event titles, item names and the forecast are sent to generate suggestions. Your account, location and bag history stay on this device.</p>

      <Group label="How it works">
        {steps.map((s) => (
          <div key={s.k} className="g-row ai-step">
            <span className="row-copy"><span className="row-title">{s.k}</span><span className="row-sub">{s.t}</span></span>
            <Badge tone={s.tag === 'Live' ? 'green' : 'gray'}>{s.tag}</Badge>
          </div>
        ))}
      </Group>

      <Group label={`What Tagly learned · ${state.history.length} days of history`}>
        {habits.map((h) => (
          <div key={h.item.id} className="g-row">
            <ItemTile icon={h.item.icon} color={h.item.color} size={34} />
            <span className="row-copy"><span className="row-title">{h.item.name}</span><span className="row-sub">{h.text}</span></span>
            <Badge tone="orange">{pct(h.rate)}</Badge>
          </div>
        ))}
        {liked.map(([k, f]) => {
          const l = label(k)
          return <GroupRow key={k} title={`${l.item} for ${l.concept}`} sub={`You added it ${f.yes} times`} value={<Badge tone="green">Learned</Badge>} />
        })}
        {disliked.map(([k, f]) => {
          const l = label(k)
          return <GroupRow key={k} title={`Less ${l.item.toLowerCase()} for ${l.concept}`} sub={`You said “not today” ${f.no} time${f.no === 1 ? '' : 's'}${f.no >= 2 && f.yes === 0 ? ' · won’t suggest it again' : ''}`} value={<Badge tone="gray">Tuned</Badge>} />
        })}
        {rules.length > 0 && <GroupRow title="Event rules" sub={rules.map((r) => `${r.item.name} ← “${r.k}”`).join(' · ')} />}
        {habits.length === 0 && liked.length === 0 && disliked.length === 0 && (
          <GroupRow title="Nothing yet" sub="Use Today for a few days. Tagly learns from what you add, skip and leave behind." />
        )}
      </Group>

      <Button variant="blue" onClick={() => nav('/settings/ai/departure')}><Footprints size={18} /> Try departure detection</Button>
      <Button variant="light" onClick={() => { dispatch({ type: 'aiResetLearning' }); toast({ title: 'Learning reset', body: 'Suggestion feedback cleared. Bag history is kept.' }) }}>
        <RotateCcw size={16} /> Reset suggestion learning
      </Button>
    </Screen>
  )
}

/* Departure detection demo ---------------------------------------------- */

const sigIcon: Record<string, React.ReactElement> = {
  motion: <Footprints size={18} />,
  place: <MapPin size={18} />,
  schedule: <CalendarClock size={18} />,
}

export function DepartureDemo() {
  const { state, dispatch, toast } = useStore()
  const nav = useNavigate()
  const [phase, setPhase] = useState<'idle' | 'sensing' | 'done'>('idle')
  const [shown, setShown] = useState(0)
  const [signals, setSignals] = useState<Signal[]>([])

  useEffect(() => {
    if (phase !== 'sensing') return
    if (shown >= signals.length) {
      const t = window.setTimeout(() => setPhase('done'), 700)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setShown((n) => n + 1), 750)
    return () => window.clearTimeout(t)
  }, [phase, shown, signals.length])

  const list = packingList(state)
  const missing = list.filter((e) => !e.packed)
    .map((e) => ({ e, r: forgetRisk(state, e.item) }))
    .sort((a, b) => (b.r?.risk ?? 0) - (a.r?.risk ?? 0))

  useEffect(() => {
    if (phase !== 'done') return
    const date = todayISO()
    dispatch({ type: 'logDay', log: { date, wd: new Date().getDay(), rain: state.weather.kind === 'rain', tags: todayTags(state), needed: list.map((e) => e.item.id), forgot: missing.map((m) => m.e.item.id) } })
    if (missing.length) {
      const top = missing[0]
      toast({ push: true, title: `${top.e.item.name} isn’t in your bag`, body: `${top.e.reason}${top.r && top.r.risk >= 0.35 ? ` · ${top.r.why.charAt(0).toLowerCase() + top.r.why.slice(1)}` : ''}`, to: '/today' })
      try { navigator.vibrate?.([200, 120, 200]) } catch { /* not supported */ }
    } else {
      toast({ push: true, title: 'All packed', body: 'Your keyring glows green. Have a good day.', tone: 'success' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const p = fuse(signals.slice(0, shown))
  const start = () => { setSignals(departureSignals(state)); setShown(0); setPhase('sensing') }

  return (
    <Screen tabs>
      <PageHead back="/settings/ai" backLabel="Tagly AI" eyebrow="Detect" title="The moment you leave"
        sub="Tagly reminds you as you head out, not an hour before. On the real keyring this runs on its motion sensor; here it’s simulated." />

      <Card className="dep-card">
        {phase === 'idle' && (
          <div className="dep-idle">
            <Brain size={34} strokeWidth={1.6} />
            <p>Three signals vote on whether you’re leaving. When they agree, Tagly checks your bag.</p>
          </div>
        )}
        {phase !== 'idle' && (
          <>
            {signals.map((s, i) => (
              <div key={s.id} className={`dep-sig ${i < shown ? 'on' : ''}`}>
                <span className="dep-ico">{sigIcon[s.id]}</span>
                <span className="row-copy"><span className="row-title">{s.label}</span><span className="row-sub">{i < shown ? s.detail : 'Listening…'}</span></span>
                <span className="dep-score">{i < shown ? pct(s.score) : ''}</span>
              </div>
            ))}
            <div className="dep-total">
              <span>Leaving now</span>
              <span className="ai-conf big"><span className="track"><i style={{ width: shown ? pct(p) : '0%' }} /></span></span>
              <b>{shown ? pct(p) : '—'}</b>
            </div>
          </>
        )}
      </Card>

      {phase === 'done' && (
        <Card className={missing.length ? 'dep-result warn' : 'dep-result ok'}>
          <h3><BellRing size={18} /> {missing.length ? `Keyring buzzing · ${missing.length} missing` : 'All packed · keyring glows green'}</h3>
          {missing.map(({ e, r }) => (
            <div key={e.item.id} className="dep-miss">
              <ItemTile icon={e.item.icon} color={e.item.color} size={34} />
              <span className="row-copy">
                <span className="row-title">{e.item.name}</span>
                <span className="row-sub">{e.reason}{r && r.risk >= 0.35 ? <> · <Sparkles size={11} /> {r.why}</> : null}</span>
              </span>
              {r && <Badge tone={r.risk >= 0.5 ? 'red' : 'orange'}>{pct(r.risk)}</Badge>}
            </div>
          ))}
          <p className="hint">Sorted by how likely you are to forget each one. Today was added to your bag history, so tomorrow’s guesses get better.</p>
        </Card>
      )}

      {phase === 'done' ? (
        <div className="btn-pair">
          <Button onClick={() => nav('/today')}>Open Today</Button>
          <Button variant="outline" onClick={start}>Run again</Button>
        </div>
      ) : (
        <Button variant="blue" disabled={phase === 'sensing'} onClick={start}>
          <Footprints size={18} /> {phase === 'sensing' ? 'Sensing…' : 'Simulate leaving home'}
        </Button>
      )}
    </Screen>
  )
}
