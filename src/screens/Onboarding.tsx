import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Bluetooth, CalendarDays, Check, CloudSun, MapPin, RefreshCw } from 'lucide-react'
import { newId, randomStickerId, useStore } from '../store'
import type { Permissions } from '../store'
import { googleConfigured } from '../google'
import { useCalendarSync } from '../sync'
import { ItemForm, StickerCard, useStickerScan } from '../components/ItemForm'
import {
  Button, Checkbox, LinkButton, Notice, PageHead, PulseRings, Screen, SetupProgress, Sheet, Toggle,
} from '../components/ui'

/* 1 · Permissions ----------------------------------------------------- */

const permRows: { key: keyof Permissions; title: string; sub: string; Icon: typeof Bell }[] = [
  { key: 'bluetooth', title: 'Bluetooth', sub: 'Talk to your keyring and stickers. Needed for tracking.', Icon: Bluetooth },
  { key: 'notifications', title: 'Notifications', sub: 'Warn you when something is missing or left behind.', Icon: Bell },
  { key: 'calendar', title: 'Calendar', sub: 'Match items to your plans and meetings.', Icon: CalendarDays },
  { key: 'location', title: 'Location', sub: 'Local weather and where an item was left.', Icon: MapPin },
]

/** Ask the browser for the real permission where one exists; the rest are simulated. */
async function requestReal(key: keyof Permissions): Promise<boolean> {
  try {
    if (key === 'notifications' && 'Notification' in window) {
      const r = await Notification.requestPermission()
      return r !== 'denied'
    }
    if (key === 'location' && 'geolocation' in navigator) {
      return await new Promise((res) => navigator.geolocation.getCurrentPosition(() => res(true), () => res(false), { timeout: 10000 }))
    }
  } catch { /* fall through */ }
  return true
}

export function PermissionList({ compact = false }: { compact?: boolean }) {
  const { state, set } = useStore()
  const [declined, setDeclined] = useState<Partial<Record<keyof Permissions, boolean>>>({})
  const allow = async (key: keyof Permissions) => {
    const ok = await requestReal(key)
    set({ permissions: { ...state.permissions, [key]: ok }, ...(key === 'location' && ok ? { weather: { ...state.weather, updated: 0 } } : {}) })
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
              {compact ? (
                <Toggle label={title} checked={on} onChange={(v) => (v ? allow(key) : set({ permissions: { ...state.permissions, [key]: false } }))} />
              ) : on ? (
                <span className="allowed"><Check size={16} strokeWidth={2.6} /> Allowed</span>
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
        <Notice>Without location the Find map is off and weather uses Seoul. You can turn it on later in Settings.</Notice>
      )}
      {declined.notifications && !state.permissions.notifications && (
        <Notice>Notifications are blocked in your browser. Allow them from the site settings.</Notice>
      )}
    </>
  )
}

export function PermissionsStep() {
  const nav = useNavigate()
  const { state } = useStore()
  return (
    <Screen className="onboarding">
      <SetupProgress step={1} />
      {state.user && !state.user.demo && <p className="eyebrow">Welcome, {state.user.name.split(' ')[0]}</p>}
      <PageHead title="Allow a few things" sub="Each permission powers one feature. Decline any of them and Tagly still works, just with less." />
      <PermissionList />
      <div className="bottom-actions">
        <Button onClick={() => nav('/setup/pair')}>Continue</Button>
      </div>
    </Screen>
  )
}

/* 2 · Pair keyring --------------------------------------------------- */

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
      <SetupProgress step={2} back="/setup/permissions" />
      <PageHead title={phase === 'connected' ? 'Keyring connected' : 'Pair your keyring'}
        sub="Press and hold the top of the keyring until the light pulses blue, then keep it close to your phone." />
      <PairingPanel phase={phase} onConnect={connect} />
      <div className="bottom-actions">
        <Button disabled={phase !== 'connected'} onClick={() => nav('/setup/schedule')}>Continue</Button>
        <LinkButton onClick={() => setHelp(true)}>Trouble pairing?</LinkButton>
        {phase !== 'connected' && (
          <button type="button" className="ghost-link" onClick={() => nav('/setup/schedule')}>
            I don’t have a keyring yet · check items off by hand
          </button>
        )}
      </div>
      <PairingHelp open={help} onClose={() => setHelp(false)} onRetry={restart} />
    </Screen>
  )
}

/* 4 · First item ------------------------------------------------------- */

export function FirstItemStep() {
  const nav = useNavigate()
  const { state, dispatch, toast } = useStore()
  const detected = useStickerScan()
  const [stickerId] = useState(randomStickerId)
  const firstCourse = state.timetable[0]
  return (
    <Screen className="onboarding">
      <SetupProgress step={4} back="/setup/schedule" />
      <PageHead title="Add your first item" sub="Peel a clear sticker, press it onto the item, then hold your phone near it." />
      <StickerCard stickerId={stickerId} detected={detected} />
      <ItemForm
        detected={detected}
        submitLabel="Save item"
        initial={{
          name: 'Laptop', icon: 'laptop', color: 'mint', stickerId,
          rule: firstCourse
            ? { always: false, events: true, courses: state.timetable.map((c) => c.id), keywords: [], weather: false, weatherKinds: [] }
            : { always: true, events: false, courses: [], keywords: [], weather: false, weatherKinds: [] },
        }}
        onSubmit={(d) => {
          dispatch({
            type: 'upsertItem',
            item: { id: newId(d.name), name: d.name, icon: d.icon, color: d.color, rule: d.rule, stickerId: d.stickerId, battery: 100, status: 'withYou' },
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

export function ConnectionsPanel() {
  const { state, set } = useStore()
  const { sync, syncing } = useCalendarSync()
  const demo = !!state.user?.demo
  const local = state.user?.email === 'local'
  const lastSync = state.lastSync ? new Date(state.lastSync).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null
  return (
    <div className="stack">
      <div className="card">
        <div className="conn-head">
          <span className="perm-ico"><CalendarDays size={19} /></span>
          <span className="row-copy">
            <span className="row-title">Google Calendar</span>
            <span className={`row-sub ${state.googleConnected ? 'text-green strong' : ''}`}>
              {state.googleConnected
                ? demo ? 'Connected · sample calendars' : state.user?.preview || !googleConfigured ? 'Connected · sample calendar (preview)' : `Connected${state.user ? ' · ' + state.user.email : ''}`
                : 'Not connected'}
            </span>
          </span>
          {!demo && (!local || !googleConfigured) && (
            state.googleConnected ? (
              <Button variant="ghost" small block={false} disabled={syncing} onClick={() => sync(true)}>
                <RefreshCw size={15} className={syncing ? 'spin' : ''} /> Sync
              </Button>
            ) : (
              <Button variant="outline" small block={false} disabled={syncing}
                onClick={async () => { set({ googleConnected: true }); await sync(true) }}>Connect</Button>
            )
          )}
        </div>
        {local && googleConfigured && <p className="row-sub">Sign in with Google (Settings → Account) to use your calendar. Your timetable works without it.</p>}
        {state.googleConnected && state.calendars.length > 0 && (
          <>
            <p className="mini-label">Use these calendars</p>
            {state.calendars.map((c) => (
              <label key={c.id} className="cal-row">
                <Checkbox label={c.summary} checked={c.selected}
                  onChange={(v) => {
                    set({ calendars: state.calendars.map((x) => (x.id === c.id ? { ...x, selected: v } : x)), lastSync: 0 })
                  }} />
                <span>{c.summary}{c.primary && <small className="text-muted"> · main</small>}</span>
                <i style={{ background: c.color }} />
              </label>
            ))}
            {lastSync && !demo && <p className="hint">Last synced {lastSync}. {state.user?.preview || !googleConfigured ? 'Preview mode: sample events. Real Google Calendar sync turns on when the site is connected to Google.' : 'Today’s events refresh automatically while the app is open.'}</p>}
          </>
        )}
        {state.googleConnected && !demo && state.calendars.length === 0 && (
          <p className="row-sub">Tap Sync to load your calendars.</p>
        )}
      </div>
      <div className="card">
        <div className="conn-head">
          <span className="perm-ico"><CloudSun size={19} /></span>
          <span className="row-copy">
            <span className="row-title">Weather forecast</span>
            <span className="row-sub">{state.permissions.location ? 'Uses your approximate location' : 'Uses Seoul · allow location for your area'}</span>
          </span>
          <Toggle label="Weather forecast" checked={state.weatherOn} onChange={(v) => set({ weatherOn: v, weather: { ...state.weather, updated: 0 } })} />
        </div>
        <p className="rule-hint">Rain → umbrella · Cold → gloves · Sun → sunglasses. Set your own rules per item.</p>
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
      </div>
    </Screen>
  )
}
