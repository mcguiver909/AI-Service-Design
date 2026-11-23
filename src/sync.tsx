import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthExpiredError, fetchCalendars, fetchTodayEvents, googleConfigured, hasValidToken, requestAccess } from './google'
import { fetchForecast } from './weather'
import { previewCalendar, todayISO, useStore } from './store'
import type { GCal, State } from './store'

/** Merge a fresh calendar list with the user's existing on/off choices. */
export function mergeCalendars(prev: GCal[], fresh: { id: string; summary: string; color: string; primary: boolean }[]): GCal[] {
  return fresh.map((c) => {
    const old = prev.find((p) => p.id === c.id)
    return { ...c, selected: old ? old.selected : c.primary }
  })
}

/** Pull calendars + today's events. Assumes a valid token. */
export async function pullCalendar(state: State): Promise<Partial<State>> {
  const calendars = mergeCalendars(state.calendars, await fetchCalendars())
  const ids = calendars.filter((c) => c.selected).map((c) => c.id)
  const gevents = ids.length ? await fetchTodayEvents(ids) : []
  return { calendars, gevents, geventsDate: todayISO(), lastSync: Date.now(), googleConnected: true }
}

export function useCalendarSync() {
  const { state, set, toast } = useStore()
  const [syncing, setSyncing] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state

  /** interactive: may open Google's popup (call from a click). */
  const sync = useCallback(async (interactive: boolean) => {
    const s = stateRef.current
    if (!s.user || s.user.demo) return
    if (s.user.preview || !googleConfigured) {
      // Preview mode: sample calendar, keep the user's on/off choices.
      if (!interactive) return
      const sample = previewCalendar()
      const calendars = s.calendars.length ? s.calendars : sample.calendars
      set({ ...sample, calendars })
      toast({ title: 'Calendar synced', body: 'Sample calendar · preview mode', tone: 'success' })
      return
    }
    if (!hasValidToken(s.user.email)) {
      if (!interactive) return
      await requestAccess({ prompt: '', hint: s.user.email })
    }
    setSyncing(true)
    try {
      set(await pullCalendar(stateRef.current))
      if (interactive) toast({ title: 'Calendar synced', tone: 'success' })
    } catch (e) {
      if (interactive || !(e instanceof AuthExpiredError)) toast({ title: 'Couldn’t sync calendar', body: (e as Error).message, tone: 'danger' })
    } finally {
      setSyncing(false)
    }
  }, [set, toast])

  return { syncing, sync, needsRefresh: !!state.user && !state.user.demo && !state.user.preview && googleConfigured && state.googleConnected && !hasValidToken(state.user.email) }
}

/** Background refresh of weather + calendar while the app is open. */
export function SyncManager() {
  const { state, set } = useStore()
  const { sync } = useCalendarSync()
  const demo = !state.user || state.user.demo
  const weatherBusy = useRef(false)

  // Weather: on open, when the day changes, and every 30 minutes.
  useEffect(() => {
    if (demo || !state.onboarded || !state.weatherOn) return
    const stale = state.weather.date !== todayISO() || !state.weather.updated || Date.now() - state.weather.updated > 30 * 60_000
    if (!stale || weatherBusy.current) return
    weatherBusy.current = true
    fetchForecast(state.permissions.location)
      .then((f) => set({ weather: { ...f, date: todayISO(), live: true, updated: Date.now() } }))
      .catch(() => set({ weather: { ...state.weather, kind: 'clear', label: 'Weather unavailable right now', date: todayISO(), live: true, updated: Date.now() } }))
      .finally(() => { weatherBusy.current = false })
  }, [demo, state.onboarded, state.weatherOn, state.weather, state.permissions.location, set])

  // Calendar: silently when a token is still valid and data is from another day or >10 min old.
  useEffect(() => {
    if (demo || !state.onboarded || !state.googleConnected) return
    if (state.geventsDate === todayISO() && Date.now() - state.lastSync < 10 * 60_000) return
    sync(false)
  }, [demo, state.onboarded, state.googleConnected, state.geventsDate, state.lastSync, sync])

  // Re-check when the tab becomes visible again.
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') set({}) }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [set])

  return null
}

export async function refreshWeather(useLocation: boolean) {
  const f = await fetchForecast(useLocation)
  return { ...f, date: todayISO(), live: true, updated: Date.now() }
}
