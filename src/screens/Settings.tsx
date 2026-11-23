import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, House, LogOut, MapPin, Plus } from 'lucide-react'
import { greetName, previewCalendar, useStore } from '../store'
import type { AlertTypes, Feedback } from '../store'
import { LogoMark } from '../components/icons'
import {
  Badge, Button, Card, Group, GroupRow, PageHead, Screen, Sheet, Toggle,
} from '../components/ui'
import { KeyringRepairSheet } from './Items'
import { ConnectionsPanel, PermissionList } from './Onboarding'
import { CalendarScopeError, fetchProfile, googleConfigured, requestAccess, signOutGoogle } from '../google'
import { pullCalendar } from '../sync'

const feedbackLabel: Record<Feedback, string> = {
  'light+vibrate': 'Light + vibrate',
  light: 'Light only',
  vibrate: 'Vibrate only',
  off: 'Off',
}

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function Settings() {
  const { state } = useStore()
  const [repair, setRepair] = useState(false)
  const alertsOn = Object.values(state.alerts).filter(Boolean).length
  const calCount = state.calendars.filter((c) => c.selected).length
  return (
    <Screen tabs>
      <PageHead title="Settings" />

      <Group label="Account">
        <GroupRow to="/settings/account" title={
          <span className="acct">
            {state.user?.picture ? <img src={state.user.picture} alt="" referrerPolicy="no-referrer" /> : <LogoMark size={36} />}
            <span><b>{state.user?.name ?? 'Guest'}</b><small>{state.user?.demo ? 'Demo profile' : state.user?.email === 'local' ? 'This device only' : state.user?.preview ? 'Google · preview' : state.user?.email}</small></span>
          </span>
        } />
      </Group>

      <Group label="Tagly AI">
        <GroupRow title="Smart suggestions" value={state.ai.on ? 'On' : 'Off'} to="/settings/ai" />
        <GroupRow title="What Tagly learned" value={`${state.history.length} days`} to="/settings/ai" />
        <GroupRow title="Try departure detection" tone="link" to="/settings/ai/departure" />
      </Group>

      <Group label="Keyring">
        <GroupRow title="Status" value={state.keyring.paired
          ? <span className="text-green strong">● Connected · {state.keyring.battery}%</span>
          : <span className="text-muted">Not paired</span>} />
        <GroupRow title="Light and vibration" value={feedbackLabel[state.keyring.feedback]} to="/settings/keyring" />
        <GroupRow title="Re-pair keyring" tone="link" onClick={() => setRepair(true)} />
      </Group>

      <Group label="Schedule, calendar and weather">
        <GroupRow title="Weekly schedule" value={state.timetable.length ? `${state.timetable.length} schedule${state.timetable.length === 1 ? '' : 's'}` : 'Add schedules'} to="/settings/schedule" />
        <GroupRow title="Google Calendar" value={state.googleConnected ? `${calCount} calendar${calCount === 1 ? '' : 's'}` : 'Off'} to="/settings/connections" />
        <GroupRow title="Weather forecast" value={state.weatherOn ? 'On' : 'Off'} to="/settings/connections" />
      </Group>

      <Group label="Notifications">
        <GroupRow title="Morning check" value={fmtTime(state.morningCheck)} to="/settings/notifications" />
        <GroupRow title="Quiet hours" value={`${state.quietFrom} – ${state.quietTo}`} to="/settings/notifications" />
        <GroupRow title="Alert types" value={`${alertsOn} of 5 on`} to="/settings/notifications" />
        <GroupRow title="Preview notifications" tone="link" onClick={undefined} to="/settings/notification-demo" />
      </Group>

      <Group label="Places">
        {state.places.map((p) => (
          <GroupRow key={p.id} title={p.name} sub="No “left behind” alerts here" to="/settings/places" />
        ))}
        <GroupRow title="+ Add place" tone="link" to="/settings/places?add=1" />
      </Group>

      <Group label="Privacy">
        <GroupRow title="Permissions" value={state.permissions.location ? 'All set' : 'Location off'} to="/settings/privacy" />
        <GroupRow title="Delete my data" tone="danger" to="/settings/privacy?delete=1" />
      </Group>

      <Group label="Help">
        <GroupRow title="FAQ" to="/settings/help" />
        <GroupRow title="Send feedback" to="/settings/help?feedback=1" />
        <GroupRow title="Shop stickers and keyrings" sub="Design your own clear stickers" to="/shop" />
      </Group>

      <p className="version">Tagly 1.0 · prototype build</p>
      <KeyringRepairSheet open={repair} onClose={() => setRepair(false)} />
    </Screen>
  )
}

/* Keyring feedback ----------------------------------------------------- */

export function KeyringSettings() {
  const { state, set, toast } = useStore()
  const [repair, setRepair] = useState(false)
  const opts: Feedback[] = ['light+vibrate', 'light', 'vibrate', 'off']
  return (
    <Screen tabs>
      <PageHead back="/settings" backLabel="Settings" title="Your keyring" />
      <Card className="keyring-row">
        <span className="ring-ico" />
        <span className="row-copy">
          <span className="row-title">Tagly keyring</span>
          <span className="row-sub">{state.keyring.paired ? `Connected · battery ${state.keyring.battery}% · signal ${state.keyring.signal.toLowerCase()}` : 'Not paired'}</span>
        </span>
        {state.keyring.paired && <Badge tone="green" dot>Live</Badge>}
      </Card>

      <Group label="Light and vibration">
        {opts.map((o) => (
          <label key={o} className="g-row radio-row">
            <span className="row-title">{feedbackLabel[o]}</span>
            <input type="radio" name="fb" checked={state.keyring.feedback === o}
              onChange={() => { set({ keyring: { ...state.keyring, feedback: o } }); toast({ title: 'Feedback updated', body: feedbackLabel[o], tone: 'success' }) }} />
          </label>
        ))}
      </Group>

      <Group label="What the keyring does">
        <div className="legend-row"><span className="led green" /><span><b>All packed</b><small>Steady green when pressed</small></span></div>
        <div className="legend-row"><span className="led red" /><span><b>Item missing before leaving</b><small>Red light + sound / vibration</small></span></div>
        <div className="legend-row"><span className="led orange" /><span><b>Item left behind</b><small>Sound / vibration</small></span></div>
        <div className="legend-row"><span className="led gray" /><span><b>Low battery</b><small>Short, distinct signal</small></span></div>
      </Group>
      <p className="hint">List changes and found items are phone-only. The keyring stays quiet.</p>

      <Button onClick={() => setRepair(true)}>Re-pair keyring</Button>
      <KeyringRepairSheet open={repair} onClose={() => setRepair(false)} />
    </Screen>
  )
}

/* Connections ------------------------------------------------------- */

export function ConnectionsSettings() {
  return (
    <Screen tabs>
      <PageHead back="/settings" backLabel="Settings" title="Calendar and weather" sub="Tagly reads event titles and the forecast to build each morning’s packing list." />
      <ConnectionsPanel />
      <p className="hint">Prototype connection: sample events are used and no calendar data leaves this device.</p>
    </Screen>
  )
}

/* Notifications ----------------------------------------------------- */

const alertRows: { key: keyof AlertTypes; title: string; sub: string }[] = [
  { key: 'missing', title: 'Item missing', sub: 'Before you leave in the morning' },
  { key: 'leftBehind', title: 'Item left behind', sub: 'When an item drops out of range' },
  { key: 'listChanges', title: 'List changes', sub: 'New events or weather add an item' },
  { key: 'found', title: 'Item found', sub: 'A lost item reconnects or is spotted' },
  { key: 'lowBattery', title: 'Low battery', sub: 'A sticker or the keyring runs low' },
]

export function NotificationSettings() {
  const { state, set } = useStore()
  return (
    <Screen tabs>
      <PageHead back="/settings" backLabel="Settings" title="Your daily rhythm" />
      <Group label="Schedule">
        <label className="g-row">
          <span className="row-copy"><span className="row-title">Morning check</span><span className="row-sub">Tagly checks your bag at this time</span></span>
          <input type="time" className="time-input" value={state.morningCheck} onChange={(e) => set({ morningCheck: e.target.value })} />
        </label>
        <label className="g-row">
          <span className="row-copy"><span className="row-title">Quiet hours start</span><span className="row-sub">No sounds or vibration</span></span>
          <input type="time" className="time-input" value={state.quietFrom} onChange={(e) => set({ quietFrom: e.target.value })} />
        </label>
        <label className="g-row">
          <span className="row-copy"><span className="row-title">Quiet hours end</span></span>
          <input type="time" className="time-input" value={state.quietTo} onChange={(e) => set({ quietTo: e.target.value })} />
        </label>
      </Group>
      <Group label="Alert types">
        {alertRows.map((r) => (
          <div key={r.key} className="g-row">
            <span className="row-copy"><span className="row-title">{r.title}</span><span className="row-sub">{r.sub}</span></span>
            <Toggle label={r.title} checked={state.alerts[r.key]} onChange={(v) => set({ alerts: { ...state.alerts, [r.key]: v } })} />
          </div>
        ))}
      </Group>
      <p className="hint">Changes save automatically.</p>
    </Screen>
  )
}

/* Notification preview (push + keyring) -------------------------------- */

const demoPushes = [
  { title: 'Umbrella isn’t in your bag', body: 'Rain from 3 PM. Grab it before you leave.', time: '7:58', kind: 'Item missing · opens Today', to: '/today', tone: 'red' },
  { title: 'Pencil case left behind', body: 'Library 2F · 14:52', time: '14:53', kind: 'Item left behind · opens Find', to: '/find/pencil', tone: 'red', actions: true },
  { title: 'New on today’s list: laptop', body: 'Added for “Group meeting” at 16:00.', time: '11:20', kind: 'List changed', to: '/today', tone: 'muted' },
  { title: 'Earbuds found', body: 'Spotted by a nearby device at Hyehwa Station.', time: '18:05', kind: 'Item found / reconnected', to: '/find/earbuds', tone: 'green' },
  { title: 'Earbuds sticker is low', body: '12% left. Replace the sticker soon.', time: '20:10', kind: 'Low battery', to: '/items/earbuds', tone: 'orange' },
]

export function NotificationDemo() {
  const { state, toast } = useStore()
  const nav = useNavigate()
  const sendSystem = (p: typeof demoPushes[number]) => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(p.title, { body: p.body, icon: '/icon-192.png' })
        return true
      }
    } catch { /* some browsers only allow notifications from a service worker */ }
    return false
  }
  return (
    <Screen tabs>
      <PageHead back="/settings" backLabel="Settings" eyebrow="Notifications and keyring feedback" title="A timely heads-up"
        sub="Tap a notification to open the screen it leads to. “Send” shows it as a banner in the app." />
      <div className="stack">
        {demoPushes.map((p) => (
          <div key={p.title} className="push-card">
            <button type="button" className="push-main" onClick={() => nav(p.to)}>
              <LogoMark size={38} />
              <span className="push-copy">
                <span className="push-top"><b>{p.title}</b><small>{p.time}</small></span>
                <span className="push-body">{p.body}</span>
                <span className={`push-kind text-${p.tone}`}>{p.kind}</span>
              </span>
            </button>
            <button type="button" className="text-link small send" onClick={() => {
              const sys = state.permissions.notifications && sendSystem(p)
              if (!sys) toast({ push: true, title: p.title, body: p.body, to: p.to })
            }}>Send</button>
          </div>
        ))}
      </div>
    </Screen>
  )
}

/* Places ---------------------------------------------------------------- */

export function PlacesSettings() {
  const { state, set, toast } = useStore()
  const [params] = useSearchParams()
  const [adding, setAdding] = useState(params.get('add') === '1')
  const [name, setName] = useState('')
  return (
    <Screen tabs>
      <PageHead back="/settings" backLabel="Settings" title="Your safe places" sub="Safe places silence left-behind alerts. Items can still appear as missing on your packing list." />
      <div className="stack">
        {state.places.map((p) => (
          <div key={p.id} className="row">
            <span className="perm-ico">{p.id === 'home' ? <House size={19} /> : <MapPin size={19} />}</span>
            <span className="row-copy"><span className="row-title">{p.name}</span><span className="row-sub">Left-behind alerts muted</span></span>
            {p.id !== 'home' && (
              <button type="button" className="text-link small text-red" onClick={() => set({ places: state.places.filter((x) => x.id !== p.id) })}>Remove</button>
            )}
          </div>
        ))}
      </div>
      <Button variant="blue" onClick={() => setAdding(true)}><Plus size={18} /> Add place</Button>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Add place">
        <p className="eyebrow">Places</p>
        <h2 className="sheet-title">Add a safe place</h2>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          set({ places: [...state.places, { id: 'p' + Date.now(), name: name.trim() }] })
          toast({ title: 'Place added', body: `${name.trim()} · alerts muted`, tone: 'success' })
          setName(''); setAdding(false)
        }}>
          <label className="field">
            <span className="field-label">Name</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Campus studio" />
          </label>
          <p className="hint">In the real app, Tagly uses your current location for this place.</p>
          <Button type="submit" disabled={!name.trim()}>Save place</Button>
        </form>
      </Sheet>
    </Screen>
  )
}

/* Privacy --------------------------------------------------------------- */

export function PrivacySettings() {
  const { deleteAccountData, toast } = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [confirm, setConfirm] = useState(params.get('delete') === '1')
  return (
    <Screen tabs>
      <PageHead back="/settings" backLabel="Settings" title="Your data, your choice"
        sub="Calendar titles are used to match packing rules. Location supports last-seen places and search." />
      <PermissionList compact />
      <Button variant="danger" onClick={() => setConfirm(true)}>Delete my data</Button>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Delete data">
        <p className="eyebrow">Privacy</p>
        <h2 className="sheet-title">Delete your data?</h2>
        <p className="lead">This removes your items, timetable, rules, places and history from this device and signs you out. It can’t be undone. Your Google Calendar itself is never changed.</p>
        <Button onClick={() => setConfirm(false)}>Cancel</Button>
        <Button variant="danger" onClick={() => {
          signOutGoogle()
          deleteAccountData()
          toast({ title: 'Your data was deleted' })
          nav('/login')
        }}>Delete everything</Button>
      </Sheet>
    </Screen>
  )
}

/* Help -------------------------------------------------------------------- */

const faqs = [
  { q: 'How does tracking work?', a: 'Your keyring detects nearby stickers over Bluetooth. When a sticker drops out of range, the app saves where that happened so you can head back.' },
  { q: 'What if I decline a permission?', a: 'You can still manage items and your packing list. Only the features that need that permission become unavailable.' },
  { q: 'How is the packing list made?', a: 'Every morning Tagly combines each item’s rules (always, event keywords, weather) with your calendar and the forecast.' },
  { q: 'What is mesh search?', a: 'When an item is marked lost, nearby Tagly phones can anonymously report where they saw its sticker.' },
  { q: 'How long do sticker batteries last?', a: 'About a year. Tagly warns you when one drops below 20%.' },
]

export function HelpSettings() {
  const { toast } = useStore()
  const [params] = useSearchParams()
  const [open, setOpen] = useState<number | null>(0)
  const [fb, setFb] = useState(params.get('feedback') === '1')
  const [msg, setMsg] = useState('')
  return (
    <Screen tabs>
      <PageHead back="/settings" backLabel="Settings" title="Here to help" />
      <div className="group-body faq">
        {faqs.map((f, i) => (
          <div key={f.q} className={`faq-item ${open === i ? 'open' : ''}`}>
            <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <span>{f.q}</span><ChevronDown size={18} />
            </button>
            {open === i && <p>{f.a}</p>}
          </div>
        ))}
      </div>
      <Button variant="light" onClick={() => setFb(true)}>Send feedback</Button>
      <Sheet open={fb} onClose={() => setFb(false)} title="Send feedback">
        <p className="eyebrow">Help</p>
        <h2 className="sheet-title">Tell us what to improve</h2>
        <label className="field">
          <span className="field-label">Your feedback</span>
          <textarea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="What worked, what didn’t?" />
        </label>
        <Button disabled={!msg.trim()} onClick={() => {
          try {
            const prev = JSON.parse(localStorage.getItem('tagly-feedback') ?? '[]') as string[]
            localStorage.setItem('tagly-feedback', JSON.stringify([...prev, msg.trim()]))
          } catch { /* ignore */ }
          setMsg(''); setFb(false)
          toast({ title: 'Thanks for your feedback', tone: 'success' })
        }}>Send</Button>
      </Sheet>
    </Screen>
  )
}

/* Account ------------------------------------------------------------- */

export function AccountSettings() {
  const { state, signIn, signOut, set, toast } = useStore()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [nickOpen, setNickOpen] = useState(false)
  const [nick, setNick] = useState('')
  const u = state.user
  const google = !!u && !u.demo && u.email !== 'local'

  const connectGoogle = async () => {
    if (!googleConfigured) {
      // Preview mode: keep this device's data and attach the sample calendar.
      const { user: _u, ...carry } = state
      void _u
      const display = u && !u.demo && u.email !== 'local' ? u.name : 'Tagly user'
      const s = signIn({ email: `${display.toLowerCase().replace(/[^a-z0-9]+/g, '.') || 'user'}@preview.tagly`, name: display, preview: true }, u?.demo ? undefined : carry)
      set({ ...previewCalendar(), permissions: { ...s.permissions, calendar: true } })
      toast({ title: 'Signed in (preview)', body: 'Sample calendar connected.', tone: 'success' })
      nav(s.onboarded ? '/today' : '/setup/permissions')
      return
    }
    setBusy(true)
    try {
      let calOk = true
      try { await requestAccess({ prompt: 'select_account' }) } catch (e) { if (e instanceof CalendarScopeError) calOk = false; else throw e }
      const p = await fetchProfile()
      // Bring this device's data into the Google account if that account is new.
      const { user: _u, ...carry } = state
      void _u
      const s = signIn({ email: p.email, name: p.name, picture: p.picture }, u?.demo ? undefined : carry)
      if (calOk) set(await pullCalendar(s)); else set({ googleConnected: false })
      toast({ title: `Signed in as ${p.email}`, tone: 'success' })
      nav(s.onboarded ? '/today' : '/setup/permissions')
    } catch (e) {
      toast({ title: 'Sign-in failed', body: (e as Error).message, tone: 'danger' })
    } finally { setBusy(false) }
  }

  return (
    <Screen tabs>
      <PageHead back="/settings" backLabel="Settings" title="Your account" />
      <Card className="keyring-row">
        {u?.picture ? <img className="avatar" src={u.picture} alt="" referrerPolicy="no-referrer" /> : <LogoMark size={44} />}
        <span className="row-copy">
          <span className="row-title">{u?.name ?? 'Guest'}</span>
          <span className="row-sub">{u?.demo ? 'Demo profile · sample data' : u?.preview ? 'Google account · preview with a sample calendar' : google ? `Google account · ${u?.email}` : 'This device only · no sign-in'}</span>
        </span>
      </Card>
      {u && (
        <Group>
          <GroupRow title="Nickname" sub="Used in “Good morning, …” on Today" value={greetName(state) || 'Not set'}
            onClick={() => { setNick(greetName(state)); setNickOpen(true) }} />
        </Group>
      )}
      <Sheet open={nickOpen} onClose={() => setNickOpen(false)} title="Nickname">
        <h2 className="sheet-title">What should Tagly call you?</h2>
        <form className="stack" onSubmit={(e) => {
          e.preventDefault()
          if (!u) return
          set({ user: { ...u, nickname: nick.trim() } })
          toast({ title: nick.trim() ? `Hi, ${nick.trim()}!` : 'Nickname cleared', tone: 'success' })
          setNickOpen(false)
        }}>
          <label className="field">
            <span className="field-label">Nickname</span>
            <input value={nick} maxLength={20} autoFocus placeholder="e.g. Hyejin" onChange={(e) => setNick(e.target.value)} />
          </label>
          <Button type="submit">Save</Button>
        </form>
      </Sheet>
      {google ? (
        <p className="hint">{u?.preview
          ? 'Preview mode: Google Calendar sync is shown with sample events. It switches to your real calendar once the site is connected to Google.'
          : 'Your items, schedule and settings are saved for this account in this browser. Calendar access is read-only.'}</p>
      ) : (
        <>
          <p className="hint">{u?.demo ? 'Sign in to start your own Tagly with your timetable and calendar.' : 'Sign in with Google to use your calendar. What you set up here comes with you.'}</p>
          <Button disabled={busy} onClick={connectGoogle}>{busy ? 'Signing in…' : 'Continue with Google'}</Button>
        </>
      )}
      <Button variant="light" onClick={() => { signOutGoogle(); signOut(); nav('/login') }}><LogOut size={17} /> {u?.demo ? 'Leave demo' : 'Sign out'}</Button>
    </Screen>
  )
}
