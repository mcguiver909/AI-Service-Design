import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CloudSun, Lock } from 'lucide-react'
import { CalendarScopeError, fetchProfile, googleConfigured, preloadGoogle, requestAccess } from '../google'
import { pullCalendar } from '../sync'
import { useStore } from '../store'
import { Button, LinkButton, Notice, PageHead, PulseRings, Screen } from '../components/ui'

export function Login() {
  const nav = useNavigate()
  const { state, signIn, startDemo, set, toast } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
        <li><span className="f-ico app"><CalendarDays size={18} /></span><div><b>Your timetable + Google Calendar</b><span>Packs for today’s classes and plans.</span></div></li>
        <li><span className="f-ico sun"><CloudSun size={18} /></span><div><b>Live weather</b><span>Rain later? Your umbrella joins the list.</span></div></li>
      </ul>

      <div className="bottom-actions">
        {error && <Notice>{error}</Notice>}
        {!googleConfigured && (
          <Notice tone="info">Google sign-in isn’t set up on this site yet. Add <b>VITE_GOOGLE_CLIENT_ID</b> to enable it. You can still try the demo.</Notice>
        )}
        <Button className="google-btn" disabled={!googleConfigured || busy} onClick={google}>
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
    </Screen>
  )
}
