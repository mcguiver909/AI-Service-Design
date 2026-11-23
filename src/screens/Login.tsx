import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CloudSun, Lock } from 'lucide-react'
import { CalendarScopeError, fetchProfile, googleConfigured, preloadGoogle, requestAccess } from '../google'
import { pullCalendar } from '../sync'
import { previewCalendar, useStore } from '../store'
import { Button, LinkButton, Notice, PageHead, PulseRings, Screen, Sheet } from '../components/ui'

export function Login() {
  const nav = useNavigate()
  const { state, signIn, startDemo, set, toast } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [name, setName] = useState('')

  const previewSignIn = () => {
    const display = name.trim() || 'Tagly user'
    const slug = display.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '.').replace(/^\.|\.$/g, '') || 'user'
    const s = signIn({ email: `${slug}@preview.tagly`, name: display, preview: true })
    set({ ...previewCalendar(), permissions: { ...s.permissions, calendar: true } })
    setPreviewOpen(false)
    nav(s.onboarded ? '/today' : '/setup/permissions')
  }

  useEffect(() => { preloadGoogle() }, [])
  useEffect(() => {
    if (state.user && state.onboarded) nav('/today', { replace: true })
  }, [state.user, state.onboarded, nav])

  const google = async () => {
    setError('')
    setBusy(true)
    let calendarOk = true
    try {
      try {
        await requestAccess({ prompt: 'select_account' })
      } catch (e) {
        if (e instanceof CalendarScopeError) calendarOk = false
        else throw e
      }
      const profile = await fetchProfile()
      const s = signIn({ email: profile.email, name: profile.name, picture: profile.picture })
      if (calendarOk) {
        try { set(await pullCalendar(s)) } catch { /* the Today screen offers Sync */ }
      } else {
        set({ googleConnected: false })
        toast({ title: 'Signed in without calendar', body: 'You can connect your calendar later in Settings.' })
      }
      nav(s.onboarded ? '/today' : '/setup/permissions')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen className="onboarding login">
      <div className="hero">
        <div className="hero-sticker"><span /></div>
        <div className="hero-ring"><PulseRings /></div>
        <div className="hero-phone"><span className="l1" /><span className="l2" /><span className="l3" /></div>
      </div>
      <PageHead title="Never leave without it." sub="Tagly checks your bag every morning and tells you what’s missing before you walk out the door." />
      <ul className="feature-list compact">
        <li><span className="f-ico app"><CalendarDays size={18} /></span><div><b>Your schedule + Google Calendar</b><span>Packs for whatever today holds.</span></div></li>
        <li><span className="f-ico sun"><CloudSun size={18} /></span><div><b>Live weather</b><span>Rain later? Your umbrella joins the list.</span></div></li>
      </ul>

      <div className="bottom-actions">
        {error && <Notice>{error}</Notice>}
        <Button className="google-btn" disabled={busy} onClick={googleConfigured ? google : () => setPreviewOpen(true)}>
          <span className="g-mark" aria-hidden="true">G</span>
          {busy ? 'Signing in…' : 'Continue with Google'}
        </Button>
        <p className="fine-print"><Lock size={12} /> New here? This creates your Tagly account. Tagly only reads event titles and times from your calendar.</p>
        <LinkButton onClick={() => { startDemo(); nav('/today') }}>Explore the demo</LinkButton>
        <button type="button" className="ghost-link" onClick={() => nav('/shop')}>Need stickers? Design yours in the shop</button>
        <button type="button" className="ghost-link" onClick={() => {
          signIn({ email: 'local', name: 'You' })
          set({ googleConnected: false, permissions: { bluetooth: false, notifications: false, calendar: false, location: false } })
          nav('/setup/permissions')
        }}>Continue without Google · this device only</button>
      </div>

      <Sheet open={previewOpen} onClose={() => setPreviewOpen(false)} title="Preview sign-in">
        <p className="eyebrow">Preview</p>
        <h2 className="sheet-title">Sign in with Google</h2>
        <p className="lead">
          In this preview, Google sign-in uses a sample account with a sample calendar, so you can see exactly how
          your schedule and events turn into a packing list. Nothing is sent to Google.
        </p>
        <div className="preview-cal">
          <p className="mini-label">Calendars that will sync</p>
          {previewCalendar().calendars.filter((c) => c.selected).map((c) => (
            <p key={c.id}><i style={{ background: c.color }} /> {c.summary}</p>
          ))}
          <p className="hint">Read-only · event titles and times</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); previewSignIn() }}>
          <label className="field">
            <span className="field-label">Your name</span>
            <input autoFocus value={name} maxLength={30} placeholder="e.g. Hyejin" onChange={(e) => setName(e.target.value)} />
          </label>
          <Button type="submit">Continue</Button>
        </form>
      </Sheet>
    </Screen>
  )
}
