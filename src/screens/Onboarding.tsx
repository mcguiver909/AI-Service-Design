import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Bluetooth, CalendarDays, Check, CloudSun, MapPin } from 'lucide-react'
import {
  demoReadyState, initialState, newId, randomStickerId, useStore,
} from '../store'
import type { CalendarKey, Permissions } from '../store'
import { ItemForm, StickerCard, useStickerScan } from '../components/ItemForm'
import {
  Button, Checkbox, LinkButton, Notice, PageHead, PulseRings, Screen, SetupProgress, Sheet, Toggle,
} from '../components/ui'

/* 1 · Welcome -------------------------------------------------------- */

export function Welcome() {
  const nav = useNavigate()
  const { dispatch } = useStore()
  return (
    <Screen className="onboarding">
      <SetupProgress step={1} />
      <div className="hero">
        <div className="hero-sticker"><span /></div>
        <div className="hero-ring"><PulseRings /></div>
        <div className="hero-phone">
          <span className="l1" /><span className="l2" /><span className="l3" />
        </div>
      </div>
      <PageHead title="Never leave without it." sub="Tagly checks your bag every morning and tells you what’s missing before you walk out the door." />
      <ul className="feature-list">
        <li><span className="f-ico sticker" /><div><b>Clear stickers</b><span>Stick one on each thing you carry.</span></div></li>
        <li><span className="f-ico ring" /><div><b>Keyring</b><span>Clip it to your bag. It sees what’s inside.</span></div></li>
        <li><span className="f-ico app"><CalendarDays size={18} /></span><div><b>App</b><span>Plans each day from your calendar and the weather.</span></div></li>
      </ul>
      <div className="bottom-actions">
        <Button onClick={() => { dispatch({ type: 'reset', state: { ...initialState } }); nav('/setup/permissions') }}>Get started</Button>
        <LinkButton onClick={() => { dispatch({ type: 'reset', state: demoReadyState }); nav('/today') }}>Explore the demo</LinkButton>
      </div>
    </Screen>
  )
}

/* 2 · Permissions ----------------------------------------------------- */

const permRows: { key: keyof Permissions; title: string; sub: string; Icon: typeof Bell }[] = [
  { key: 'bluetooth', title: 'Bluetooth', sub: 'Talk to your keyring and stickers. Needed for tracking.', Icon: Bluetooth },
  { key: 'notifications', title: 'Notifications', sub: 'Warn you when something is missing or left behind.', Icon: Bell },
  { key: 'calendar', title: 'Calendar', sub: 'Match items to your lectures and meetings.', Icon: CalendarDays },
  { key: 'location', title: 'Location', sub: 'Show where an item was left. Stay quiet at home.', Icon: MapPin },
]

/** Ask the browser for the real permission where one exists; the rest are simulated. */
async function requestReal(key: keyof Permissions): Promise<boolean> {
  try {
    if (key === 'notifications' && 'Notification' in window) {
      const r = await Notification.requestPermission()
      return r === 'granted' || r === 'default'
    }
    if (key === 'location' && 'geolocation' in navigator) {
      return await new Promise((res) => navigator.geolocation.getCurrentPosition(() => res(true), () => res(false), { timeout: 8000 }))
    }
  } catch {
    /* fall through to simulated */
  }
  return true
}

export function PermissionList({ compact = false }: { compact?: boolean }) {
  const { state, set } = useStore()
  const [declined, setDeclined] = useState<Partial<Record<keyof Permissions, boolean>>>({})
  const allow = async (key: keyof Permissions) => {
    const ok = await requestReal(key)
    set({ permissions: { ...state.permissions, [key]: ok } })
    if (!ok) setDeclined({ ...declined, [key]: true })
  }
  return (
    <>
      <div className="stack">
        {permRows.map(({ key, title, sub, Icon }) => {
          const on = state.permissions[key]
          return (
            <div key={key} className="card perm">
              <span className="perm-ico"><Icon size={19} /></span>
              <span className="row-copy">
                <span className="row-title">{title}</span>
                <span className="row-sub">{sub}</span>
              </span>
              {on ? (
                compact ? (
                  <Toggle label={title} checked onChange={() => set({ permissions: { ...state.permissions, [key]: false } })} />
                ) : (
                  <span className="allowed"><Check size={16} strokeWidth={2.6} /> Allowed</span>
                )
              ) : compact ? (
                <Toggle label={title} checked={false} onChange={() => allow(key)} />
              ) : (
                <span className="perm-actions">
                  <Button variant="outline" small block={false} onClick={() => allow(key)}>Allow</Button>
                  {key === 'location' && !declined[key] && (
                    <button type="button" className="not-now" onClick={() => setDeclined({ ...declined, [key]: true })}>Not now</button>
                  )}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {!state.permissions.location && (
        <Notice>Without location the Find map is off. You can turn it on later in Settings.</Notice>
      )}
      {declined.notifications && !state.permissions.notifications && (
        <Notice>Notifications are blocked in your browser. You can allow them from the site settings.</Notice>
      )}
    </>
  )
}

export function PermissionsStep() {
  const nav = useNavigate()
  return (
    <Screen className="onboarding">
      <SetupProgress step={2} back="/welcome" />
      <PageHead title="Allow a few things" sub="Each permission powers one feature. Decline any of them and Tagly still works, just with less." />
      <PermissionList />
      <div className="bottom-actions">
        <Button onClick={() => nav('/setup/pair')}>Continue</Button>
      </div>
    </Screen>
  )
}

/* 3 · Pair keyring --------------------------------------------------- */

type PairPhase = 'searching' | 'found' | 'connecting' | 'connected'

export function usePairing(start = true) {
  const [phase, setPhase] = useState<PairPhase>(start ? 'searching' : 'connected')
  useEffect(() => {
    if (phase === 'searching') {
      const t = window.setTimeout(() => setPhase('found'), 1600)
      return () => window.clearTimeout(t)
    }
    if (phase === 'connecting') {
      const t = window.setTimeout(() => setPhase('connected'), 1100)
      return () => window.clearTimeout(t)
    }
  }, [phase])
  return { phase, connect: () => setPhase('connecting'), restart: () => setPhase('searching') }
}

export function PairingPanel({ phase, onConnect }: { phase: PairPhase; onConnect: () => void }) {
  const { state } = useStore()
  return (
    <>
      <div className="pair-stage">
        <PulseRings tone={phase === 'connected' ? 'green' : 'blue'} active={phase !== 'connected'} />
      </div>
      <div className="card keyring-card">
        <div className="kc-head">
          <b>Tagly keyring</b>
          {phase === 'connected' ? (
            <span className="badge badge-green"><i />Connected</span>
          ) : phase === 'found' ? (
            <Button variant="blue" small block={false} onClick={onConnect}>Connect</Button>
          ) : (
            <span className="badge badge-gray">{phase === 'connecting' ? 'Connecting…' : 'Searching…'}</span>
          )}
        </div>
        {phase === 'connected' ? (
          <>
            <div className="kc-line"><span>Battery</span><b>{state.keyring.battery}%</b></div>
            <span className="meter big"><span className="meter-fill fill-green" style={{ width: `${state.keyring.battery}%` }} /></span>
            <div className="kc-line"><span>Signal</span><b>{state.keyring.signal}</b></div>
          </>
        ) : (
          <p className="row-sub">{phase === 'found' ? 'Nearby device found' : 'Keep the keyring close to your phone'}</p>
        )}
      </div>
    </>
  )
}

export function PairingHelp({ open, onClose, onRetry }: { open: boolean; onClose: () => void; onRetry: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Pairing help">
      <p className="eyebrow">Pairing help</p>
      <h2 className="sheet-title">Let’s get connected</h2>
      <ol className="steps">
        <li>Charge your keyring.</li>
        <li>Turn on Bluetooth on your phone.</li>
        <li>Hold the top until its light pulses blue.</li>
        <li>Keep the keyring near your phone.</li>
      </ol>
      <Button onClick={() => { onClose(); onRetry() }}>Try again</Button>
    </Sheet>
  )
}

export function PairStep() {
  const nav = useNavigate()
  const { state, set } = useStore()
  const { phase, connect, restart } = usePairing(!state.keyring.paired)
  const [help, setHelp] = useState(false)
  useEffect(() => {
    if (phase === 'connected' && !state.keyring.paired) set({ keyring: { ...state.keyring, paired: true } })
  }, [phase, state.keyring, set])
  return (
    <Screen className="onboarding">
      <SetupProgress step={3} back="/setup/permissions" />
      <PageHead title={phase === 'connected' ? 'Keyring connected' : 'Pair your keyring'}
        sub="Press and hold the top of the keyring until the light pulses blue, then keep it close to your phone." />
      <PairingPanel phase={phase} onConnect={connect} />
      <div className="bottom-actions">
        <Button disabled={phase !== 'connected'} onClick={() => nav('/setup/item')}>Continue</Button>
        <LinkButton onClick={() => setHelp(true)}>Trouble pairing?</LinkButton>
      </div>
      <PairingHelp open={help} onClose={() => setHelp(false)} onRetry={restart} />
    </Screen>
  )
}

/* 4 · First item ------------------------------------------------------- */

export function FirstItemStep() {
  const nav = useNavigate()
  const { dispatch, toast } = useStore()
  const detected = useStickerScan()
  const [stickerId] = useState('TG-4F2A')
  return (
    <Screen className="onboarding">
      <SetupProgress step={4} back="/setup/pair" />
      <PageHead title="Add your first item" sub="Peel a clear sticker, press it onto the item, then hold your phone near it." />
      <StickerCard stickerId={stickerId} detected={detected} />
      <ItemForm
        detected={detected}
        submitLabel="Save item"
        initial={{ name: 'Laptop', icon: 'laptop', color: 'mint', stickerId, rule: { always: true, events: false, keywords: [], weather: false, weatherKinds: [] } }}
        onSubmit={(d) => {
          dispatch({
            type: 'upsertItem',
            item: { id: newId(d.name), name: d.name, icon: d.icon, color: d.color, rule: d.rule, stickerId: d.stickerId || randomStickerId(), battery: 100, status: 'inBag' },
          })
          toast({ title: `${d.name} saved`, tone: 'success' })
          nav('/setup/connect')
        }}
      />
      <p className="hint center">Add more items later in the Items tab.</p>
    </Screen>
  )
}

/* 5 · Connect your day ----------------------------------------------- */

const calendarRows: { key: CalendarKey; label: string; color: string }[] = [
  { key: 'personal', label: 'Personal', color: '#3158FF' },
  { key: 'skku', label: 'SKKU classes', color: '#1FA36B' },
  { key: 'work', label: 'Work', color: '#F26A3D' },
]

export function ConnectionsPanel() {
  const { state, set } = useStore()
  return (
    <div className="stack">
      <div className="card">
        <div className="conn-head">
          <span className="perm-ico"><CalendarDays size={19} /></span>
          <span className="row-copy">
            <span className="row-title">Google Calendar</span>
            <span className={`row-sub ${state.googleConnected ? 'text-green strong' : ''}`}>{state.googleConnected ? 'Connected' : 'Not connected'}</span>
          </span>
          <Button variant={state.googleConnected ? 'ghost' : 'outline'} small block={false}
            onClick={() => set({ googleConnected: !state.googleConnected, permissions: { ...state.permissions, calendar: true } })}>
            {state.googleConnected ? 'Disconnect' : 'Connect'}
          </Button>
        </div>
        {state.googleConnected && (
          <>
            <p className="mini-label">Use these calendars</p>
            {calendarRows.map((c) => (
              <label key={c.key} className="cal-row">
                <Checkbox label={c.label} checked={state.calendars[c.key]}
                  onChange={(v) => set({ calendars: { ...state.calendars, [c.key]: v } })} />
                <span>{c.label}</span>
                <i style={{ background: c.color }} />
              </label>
            ))}
          </>
        )}
      </div>
      <div className="card">
        <div className="conn-head">
          <span className="perm-ico"><CloudSun size={19} /></span>
          <span className="row-copy">
            <span className="row-title">Weather forecast</span>
            <span className="row-sub">Uses your approximate area</span>
          </span>
          <Toggle label="Weather forecast" checked={state.weatherOn} onChange={(v) => set({ weatherOn: v })} />
        </div>
        <p className="rule-hint">Rain → umbrella · Cold → gloves · Sun → sunglasses. Set your own rules per item later.</p>
      </div>
    </div>
  )
}

export function ConnectStep() {
  const nav = useNavigate()
  const { set, toast } = useStore()
  const finish = () => {
    set({ onboarded: true })
    toast({ title: 'You’re all set', body: 'Here’s today’s packing list.', tone: 'success' })
    nav('/today')
  }
  return (
    <Screen className="onboarding">
      <SetupProgress step={5} back="/setup/item" />
      <PageHead title="Connect your day" sub="Tagly reads event titles and the forecast to build each morning’s packing list." />
      <ConnectionsPanel />
      <div className="bottom-actions">
        <Button onClick={finish}>Finish setup</Button>
        <LinkButton onClick={finish}>Skip for now · set up later in Settings</LinkButton>
      </div>
    </Screen>
  )
}

