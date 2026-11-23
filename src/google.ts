/**
 * Google sign-in + Calendar (read-only) using Google Identity Services (token model).
 * Runs fully in the browser; no backend. Needs VITE_GOOGLE_CLIENT_ID at build time.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { google?: any }
}

export const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || ''
export const googleConfigured = CLIENT_ID.length > 0

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ')

const TOKEN_KEY = 'tagly-google-token'

interface StoredToken { access_token: string; expires_at: number; email?: string }

let token: StoredToken | null = (() => {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as StoredToken) : null
  } catch {
    return null
  }
})()

function saveToken(t: StoredToken | null) {
  token = t
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t))
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch { /* ignore */ }
}

export function hasValidToken(email?: string) {
  return !!token && token.expires_at - Date.now() > 60_000 && (!email || !token.email || token.email === email)
}

let gisPromise: Promise<void> | null = null
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => { gisPromise = null; reject(new Error('Could not load Google sign-in. Check your connection.')) }
    document.head.appendChild(s)
  })
  return gisPromise
}

/** Preload the GIS script so the popup opens straight from the click. */
export function preloadGoogle() {
  if (googleConfigured) loadGis().catch(() => {})
}

/**
 * Opens Google's consent/account popup and resolves with an access token.
 * Must be called from a user gesture (click) so the popup isn't blocked.
 */
export async function requestAccess(opts: { prompt?: '' | 'consent' | 'select_account'; hint?: string } = {}): Promise<string> {
  if (!googleConfigured) throw new Error('Google sign-in isn’t set up for this site yet.')
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      include_granted_scopes: true,
      hint: opts.hint,
      callback: (resp: any) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error))
        const granted = window.google.accounts.oauth2.hasGrantedAllScopes(resp, 'https://www.googleapis.com/auth/calendar.readonly')
        saveToken({ access_token: resp.access_token, expires_at: Date.now() + Number(resp.expires_in ?? 3600) * 1000, email: opts.hint })
        if (!granted) return reject(new CalendarScopeError())
        resolve(resp.access_token)
      },
      error_callback: (err: any) => {
        reject(new Error(err?.type === 'popup_closed' ? 'Sign-in was closed before finishing.' : err?.message || 'Google sign-in failed.'))
      },
    })
    client.requestAccessToken({ prompt: opts.prompt ?? '' })
  })
}

export class CalendarScopeError extends Error {
  constructor() { super('Calendar access wasn’t granted. Tick “See your calendars” to sync your events.') }
}

async function api<T>(url: string): Promise<T> {
  if (!token) throw new AuthExpiredError()
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } })
  if (res.status === 401) { saveToken(null); throw new AuthExpiredError() }
  if (!res.ok) throw new Error(`Google API error ${res.status}`)
  return res.json() as Promise<T>
}

export class AuthExpiredError extends Error {
  constructor() { super('Your Google session expired. Tap Sync to refresh.') }
}

export interface GoogleProfile { email: string; name: string; picture?: string }

export async function fetchProfile(): Promise<GoogleProfile> {
  const p = await api<{ email: string; name?: string; given_name?: string; picture?: string }>('https://www.googleapis.com/oauth2/v3/userinfo')
  if (token) saveToken({ ...token, email: p.email })
  return { email: p.email, name: p.name || p.given_name || p.email.split('@')[0], picture: p.picture }
}

export interface RemoteCalendar { id: string; summary: string; color: string; primary: boolean }

export async function fetchCalendars(): Promise<RemoteCalendar[]> {
  const data = await api<{ items?: any[] }>('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&maxResults=50')
  return (data.items ?? [])
    .filter((c) => !c.hidden)
    .map((c) => ({ id: c.id, summary: c.summaryOverride || c.summary, color: c.backgroundColor || '#3158FF', primary: !!c.primary }))
}

export interface RemoteEvent { id: string; title: string; start: string; end: string; allDay: boolean; calendarId: string; location?: string }

function hhmm(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Today's events (local day) for the given calendars. */
export async function fetchTodayEvents(calendarIds: string[]): Promise<RemoteEvent[]> {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(start); end.setDate(end.getDate() + 1)
  const qs = new URLSearchParams({
    timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '50',
  })
  const lists = await Promise.all(calendarIds.map(async (cid) => {
    const data = await api<{ items?: any[] }>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cid)}/events?${qs}`)
    return (data.items ?? [])
      .filter((e) => e.status !== 'cancelled')
      .map((e): RemoteEvent => ({
        id: `${cid}:${e.id}`,
        title: e.summary || '(No title)',
        start: e.start?.dateTime ? hhmm(e.start.dateTime) : '00:00',
        end: e.end?.dateTime ? hhmm(e.end.dateTime) : '23:59',
        allDay: !e.start?.dateTime,
        calendarId: cid,
        location: e.location,
      }))
  }))
  return lists.flat().sort((a, b) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1))
}

export function signOutGoogle() {
  try {
    if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token.access_token, () => {})
  } catch { /* ignore */ }
  saveToken(null)
}
