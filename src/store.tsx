import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { HourCast } from './weather'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type IconKey =
  | 'laptop' | 'tablet' | 'pencil' | 'umbrella' | 'earbuds' | 'key'
  | 'bottle' | 'wallet' | 'glasses' | 'book' | 'headphones' | 'camera'
export type ColorKey = 'yellow' | 'peach' | 'mint' | 'lavender' | 'sky' | 'gray'
export type ItemStatus = 'inBag' | 'withYou' | 'leftBehind' | 'lost'
export type WeatherKind = 'rain' | 'cold' | 'sun'

export interface ItemRule {
  always: boolean
  events: boolean
  /** Timetable course ids this item is needed for. */
  courses: string[]
  /** Calendar event title keywords. */
  keywords: string[]
  weather: boolean
  weatherKinds: WeatherKind[]
}

export interface PlaceSeen {
  place: string
  time: string
  distance?: string
  walk?: string
  note?: string
  mapVariant: 0 | 1 | 2
}

export interface Item {
  id: string
  name: string
  icon: IconKey
  color: ColorKey
  stickerId: string
  battery: number
  status: ItemStatus
  seen?: PlaceSeen
  meshSearch?: boolean
  rule: ItemRule
}

/** A class in the user's weekly timetable. days: 0 = Sunday … 6 = Saturday. */
export interface Course {
  id: string
  name: string
  days: number[]
  start: string
  end: string
  place?: string
  color: ColorKey
}

export interface GCal { id: string; summary: string; color: string; primary: boolean; selected: boolean }
export interface GEvent { id: string; title: string; start: string; end: string; allDay: boolean; calendarId: string; location?: string }

/** One entry in today's schedule, from the timetable or Google Calendar. */
export interface DayEvent {
  id: string
  time: string
  end?: string
  title: string
  source: 'class' | 'google'
  courseId?: string
  color: string
  place?: string
  allDay?: boolean
}

export type Feedback = 'light+vibrate' | 'light' | 'vibrate' | 'off'

export interface Permissions {
  bluetooth: boolean
  notifications: boolean
  calendar: boolean
  location: boolean
}

export interface Place { id: string; name: string }

export interface AlertTypes {
  missing: boolean
  leftBehind: boolean
  listChanges: boolean
  found: boolean
  lowBattery: boolean
}

export interface User { email: string; name: string; picture?: string; demo?: boolean; preview?: boolean }

export interface State {
  user: User | null
  onboarded: boolean
  permissions: Permissions
  keyring: { paired: boolean; battery: number; signal: 'Strong' | 'Good' | 'Weak'; feedback: Feedback }
  googleConnected: boolean
  calendars: GCal[]
  gevents: GEvent[]
  geventsDate: string
  lastSync: number
  timetable: Course[]
  weatherOn: boolean
  weather: {
    kind: WeatherKind | 'clear'; label: string; date: string; live: boolean
    place?: string; temp?: number; code?: number; high?: number; low?: number; hours?: HourCast[]; updated?: number
  }
  items: Item[]
  todayAdded: string[]
  todayRemoved: string[]
  todayDate: string
  dismissedSuggestions: string[]
  morningCheck: string
  quietFrom: string
  quietTo: string
  alerts: AlertTypes
  places: Place[]
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* ------------------------------------------------------------------ */
/* Initial + demo data                                                 */
/* ------------------------------------------------------------------ */

export const emptyRule: ItemRule = { always: false, events: false, courses: [], keywords: [], weather: false, weatherKinds: [] }

/** Fresh account: nothing but defaults. */
export function newAccountState(user: User | null): State {
  return {
    user,
    onboarded: false,
    permissions: { bluetooth: false, notifications: false, calendar: !!user && !user.demo, location: false },
    keyring: { paired: false, battery: 92, signal: 'Strong', feedback: 'light+vibrate' },
    googleConnected: !!user && !user.demo,
    calendars: [],
    gevents: [],
    geventsDate: '',
    lastSync: 0,
    timetable: [],
    weatherOn: true,
    weather: { kind: 'clear', label: 'Checking the forecast…', date: '', live: true },
    items: [],
    todayAdded: [],
    todayRemoved: [],
    todayDate: todayISO(),
    dismissedSuggestions: [],
    morningCheck: '07:30',
    quietFrom: '23:00',
    quietTo: '07:00',
    alerts: { missing: true, leftBehind: true, listChanges: true, found: true, lowBattery: false },
    places: [{ id: 'home', name: 'Home' }],
  }
}

export const signedOutState: State = newAccountState(null)

const demoCourseId = 'c-iv'

/** Sample Google calendars + today's events, used when real Google sign-in isn't configured (preview mode). */
export function previewCalendar(): Pick<State, 'calendars' | 'gevents' | 'geventsDate' | 'lastSync' | 'googleConnected'> {
  return {
    googleConnected: true,
    calendars: [
      { id: 'primary', summary: 'My calendar', color: '#3158FF', primary: true, selected: true },
      { id: 'club', summary: 'Study club', color: '#1FA36B', primary: false, selected: true },
      { id: 'holidays', summary: 'Holidays in South Korea', color: '#F26A3D', primary: false, selected: false },
    ],
    gevents: [
      { id: 'p1', title: 'Group meeting', start: '16:00', end: '17:00', allDay: false, calendarId: 'primary', location: 'Library 2F' },
      { id: 'p2', title: 'Paper study', start: '18:00', end: '19:30', allDay: false, calendarId: 'club' },
      { id: 'p3', title: 'Gym', start: '20:00', end: '21:00', allDay: false, calendarId: 'primary' },
    ],
    geventsDate: todayISO(),
    lastSync: Date.now(),
  }
}

/** "Explore the demo": the sample day from the design (Intelligent Vision + Library study, rain from 3 PM). */
export function demoState(): State {
  const today = new Date().getDay()
  const base = newAccountState({ email: 'demo', name: 'Tagly explorer', demo: true })
  return {
    ...base,
    onboarded: true,
    permissions: { bluetooth: true, notifications: true, calendar: true, location: true },
    keyring: { ...base.keyring, paired: true },
    googleConnected: true,
    calendars: [
      { id: 'personal', summary: 'Personal', color: '#3158FF', primary: true, selected: true },
      { id: 'work', summary: 'Work', color: '#F26A3D', primary: false, selected: false },
    ],
    gevents: [
      { id: 'g1', title: 'Library study', start: '14:00', end: '16:00', allDay: false, calendarId: 'personal' },
      { id: 'g2', title: 'Team sync', start: '18:00', end: '19:00', allDay: false, calendarId: 'work' },
    ],
    geventsDate: todayISO(),
    lastSync: Date.now(),
    timetable: [
      { id: demoCourseId, name: 'Intelligent Vision', days: [today], start: '09:00', end: '10:15', place: 'Engineering 2, 21352', color: 'sky' },
      { id: 'c-nlp', name: 'Culture Content & NLP', days: [(today + 1) % 7, (today + 3) % 7], start: '13:30', end: '14:45', place: 'Hoam Hall 50310', color: 'lavender' },
    ],
    weather: {
      kind: 'rain', label: 'Rain from 3 PM', date: todayISO(), live: false, place: 'Seoul · sample', temp: 12, code: 3, high: 14, low: 8,
      hours: [9, 10, 11, 12, 13, 14, 15, 16].map((h) => ({ h, temp: h < 13 ? 10 + (h - 9) : 14 - Math.max(0, h - 14), pop: h >= 15 ? 80 : h >= 13 ? 40 : 10, code: h >= 15 ? 61 : h >= 13 ? 3 : 2 })),
    },
    items: [
      { id: 'laptop', name: 'Laptop', icon: 'laptop', color: 'yellow', stickerId: 'TG-31C7', battery: 84, status: 'inBag',
        rule: { ...emptyRule, events: true, keywords: ['Study', 'Meeting'] } },
      { id: 'ipad', name: 'iPad', icon: 'tablet', color: 'peach', stickerId: 'TG-9A10', battery: 61, status: 'inBag',
        rule: { ...emptyRule, events: true, courses: [demoCourseId, 'c-nlp'] } },
      { id: 'pencil', name: 'Pencil case', icon: 'pencil', color: 'mint', stickerId: 'TG-4F2A', battery: 72, status: 'leftBehind',
        seen: { place: 'Library 2F', time: '14:52', distance: '350 m', walk: 'about 5 min walking', mapVariant: 0 },
        rule: { ...emptyRule, events: true, courses: [demoCourseId] } },
      { id: 'umbrella', name: 'Umbrella', icon: 'umbrella', color: 'lavender', stickerId: 'TG-7E05', battery: 90, status: 'withYou',
        seen: { place: 'Home', time: '07:45', note: 'nearby', mapVariant: 1 },
        rule: { ...emptyRule, weather: true, weatherKinds: ['rain'] } },
      { id: 'earbuds', name: 'Earbuds', icon: 'earbuds', color: 'sky', stickerId: 'TG-2B88', battery: 12, status: 'lost', meshSearch: true,
        seen: { place: 'Hyehwa Station', time: '1 h ago', distance: '1.2 km', walk: 'about 15 min walking', mapVariant: 2 },
        rule: { ...emptyRule } },
    ],
  }
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

type Action =
  | { type: 'set'; patch: Partial<State> }
  | { type: 'reset'; state: State }
  | { type: 'upsertItem'; item: Item }
  | { type: 'updateItem'; id: string; patch: Partial<Item> }
  | { type: 'removeItem'; id: string }
  | { type: 'toggleToday'; id: string; include: boolean }
  | { type: 'dismissSuggestion'; id: string }
  | { type: 'upsertCourse'; course: Course }
  | { type: 'removeCourse'; id: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set':
      return { ...state, ...action.patch }
    case 'reset':
      return action.state
    case 'upsertItem': {
      const exists = state.items.some((i) => i.id === action.item.id)
      return {
        ...state,
        items: exists ? state.items.map((i) => (i.id === action.item.id ? action.item : i)) : [...state.items, action.item],
      }
    }
    case 'updateItem':
      return { ...state, items: state.items.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)) }
    case 'removeItem':
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.id),
        todayAdded: state.todayAdded.filter((x) => x !== action.id),
        todayRemoved: state.todayRemoved.filter((x) => x !== action.id),
      }
    case 'toggleToday': {
      const { id, include } = action
      const todayAdded = state.todayAdded.filter((x) => x !== id)
      const todayRemoved = state.todayRemoved.filter((x) => x !== id)
      const auto = autoReason(state, state.items.find((i) => i.id === id)) !== null
      if (include && !auto) todayAdded.push(id)
      if (!include && auto) todayRemoved.push(id)
      return { ...state, todayAdded, todayRemoved, todayDate: todayISO() }
    }
    case 'dismissSuggestion':
      return { ...state, dismissedSuggestions: [...state.dismissedSuggestions, action.id] }
    case 'upsertCourse': {
      const exists = state.timetable.some((c) => c.id === action.course.id)
      return {
        ...state,
        timetable: exists ? state.timetable.map((c) => (c.id === action.course.id ? action.course : c)) : [...state.timetable, action.course],
      }
    }
    case 'removeCourse':
      return {
        ...state,
        timetable: state.timetable.filter((c) => c.id !== action.id),
        items: state.items.map((i) => ({ ...i, rule: { ...i.rule, courses: i.rule.courses.filter((c) => c !== action.id) } })),
      }
  }
}

/* ------------------------------------------------------------------ */
/* Today's schedule + packing list                                     */
/* ------------------------------------------------------------------ */

const courseColors: Record<ColorKey, string> = {
  yellow: '#D9A400', peach: '#E2643A', mint: '#1FA36B', lavender: '#7357E0', sky: '#3158FF', gray: '#6B7486',
}
export function courseColor(c: ColorKey) { return courseColors[c] }

export function activeEvents(state: State, date = new Date()): DayEvent[] {
  const wd = date.getDay()
  const classes: DayEvent[] = state.timetable
    .filter((c) => c.days.includes(wd))
    .map((c) => ({ id: `class:${c.id}`, time: c.start, end: c.end, title: c.name, source: 'class', courseId: c.id, color: courseColor(c.color), place: c.place }))
  const selected = new Set(state.calendars.filter((c) => c.selected).map((c) => c.id))
  const google: DayEvent[] = state.googleConnected && state.geventsDate === todayISO(date)
    ? state.gevents.filter((e) => selected.has(e.calendarId)).map((e) => ({
      id: `g:${e.id}`, time: e.start, end: e.end, title: e.title, source: 'google', allDay: e.allDay, place: e.location,
      color: state.calendars.find((c) => c.id === e.calendarId)?.color ?? '#3158FF',
    }))
    : []
  return [...classes, ...google].sort((a, b) => (a.allDay === b.allDay ? a.time.localeCompare(b.time) : a.allDay ? -1 : 1))
}

function eventMatches(item: Item, e: DayEvent) {
  if (!item.rule.events) return false
  if (e.courseId && item.rule.courses.includes(e.courseId)) return true
  const title = e.title.toLowerCase()
  return item.rule.keywords.some((k) => k.trim() && title.includes(k.trim().toLowerCase()))
}

function weatherPhrase(label: string) {
  return label.charAt(0).toLowerCase() + label.slice(1)
}

/** Why an item is automatically on today's list, or null. */
export function autoReason(state: State, item?: Item): string | null {
  if (!item) return null
  if (item.rule.always) return 'Every day'
  if (item.rule.events) {
    const ev = activeEvents(state).find((e) => eventMatches(item, e))
    if (ev) return ev.allDay ? ev.title : `${ev.title} · ${ev.time}`
  }
  if (item.rule.weather && state.weatherOn && state.weather.kind !== 'clear' && item.rule.weatherKinds.includes(state.weather.kind)) {
    return `Weather · ${weatherPhrase(state.weather.label)}`
  }
  return null
}

export interface ListEntry { item: Item; reason: string; packed: boolean }

function todayManual(state: State) {
  const fresh = state.todayDate === todayISO()
  return { added: fresh ? state.todayAdded : [], removed: fresh ? state.todayRemoved : [] }
}

export function packingList(state: State): ListEntry[] {
  const { added, removed } = todayManual(state)
  const out: ListEntry[] = []
  for (const item of state.items) {
    if (removed.includes(item.id)) continue
    const auto = autoReason(state, item)
    if (auto || added.includes(item.id)) {
      out.push({ item, reason: auto ?? 'Added manually for today', packed: item.status === 'inBag' })
    }
  }
  return out
}

/** Demo-only suggestion (earbuds "you often take them"). */
export function suggestion(state: State): Item | null {
  if (!state.user?.demo) return null
  const list = packingList(state)
  return state.items.find((i) => i.id === 'earbuds' && !list.some((e) => e.item.id === i.id) && !state.dismissedSuggestions.includes(i.id)) ?? null
}

export function eventItems(state: State, e: DayEvent): string[] {
  return state.items.filter((i) => eventMatches(i, e)).map((i) => i.name)
}

export function locationLine(item: Item): string {
  switch (item.status) {
    case 'inBag': return 'In your backpack'
    case 'withYou': return 'Near you, outside the bag'
    case 'leftBehind': return item.seen ? `${item.seen.place} · ${item.seen.time}` : 'Left behind'
    case 'lost': return item.meshSearch ? `Mesh search on · seen ${item.seen?.time ?? 'recently'}` : 'Marked as lost'
  }
}

/* ------------------------------------------------------------------ */
/* Accounts + persistence                                              */
/* ------------------------------------------------------------------ */

const CURRENT_KEY = 'tagly-current-account'
const stateKey = (account: string) => `tagly-state-v2:${account}`

function readState(account: string): State | null {
  try {
    const raw = localStorage.getItem(stateKey(account))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<State>
    const base = newAccountState(parsed.user ?? null)
    const merged = { ...base, ...parsed }
    merged.items = (merged.items ?? []).map((i) => ({ ...i, rule: { ...emptyRule, ...i.rule } }))
    return merged
  } catch {
    return null
  }
}

function writeState(state: State) {
  if (!state.user) return
  try { localStorage.setItem(stateKey(state.user.email), JSON.stringify(state)) } catch { /* ignore */ }
}

function boot(): State {
  try {
    const acct = localStorage.getItem(CURRENT_KEY)
    if (acct) {
      const s = readState(acct)
      if (s) {
        // Demo data is always "today".
        if (s.user?.demo) return { ...s, geventsDate: todayISO(), weather: { ...s.weather, date: todayISO() } }
        if (s.user?.preview && s.googleConnected) return { ...s, geventsDate: todayISO() }
        return s
      }
    }
  } catch { /* ignore */ }
  return signedOutState
}

export interface Toast {
  id: number
  title: string
  body?: string
  tone?: 'default' | 'success' | 'danger'
  push?: boolean
  to?: string
}

interface Ctx {
  state: State
  dispatch: React.Dispatch<Action>
  set: (patch: Partial<State>) => void
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
  /** Switch to an account; carries over `carry` if the account has no saved data yet. */
  signIn: (user: User, carry?: Partial<State>) => State
  signOut: () => void
  startDemo: () => void
  deleteAccountData: () => void
}

const StoreContext = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, boot)
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  useEffect(() => { writeState(state) }, [state])

  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), [])
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++seq.current
    setToasts((ts) => [...ts.slice(-2), { ...t, id }])
    window.setTimeout(() => dismissToast(id), t.push ? 5000 : 2800)
  }, [dismissToast])
  const set = useCallback((patch: Partial<State>) => dispatch({ type: 'set', patch }), [])

  const signIn = useCallback((user: User, carry?: Partial<State>) => {
    const saved = readState(user.email)
    const next: State = saved
      ? { ...saved, user: { ...saved.user, ...user }, googleConnected: true, permissions: { ...saved.permissions, calendar: true } }
      : { ...newAccountState(user), ...(carry ?? {}), user, googleConnected: true }
    try { localStorage.setItem(CURRENT_KEY, user.email) } catch { /* ignore */ }
    dispatch({ type: 'reset', state: next })
    return next
  }, [])

  const signOut = useCallback(() => {
    try { localStorage.removeItem(CURRENT_KEY) } catch { /* ignore */ }
    dispatch({ type: 'reset', state: signedOutState })
  }, [])

  const startDemo = useCallback(() => {
    const s = demoState()
    try { localStorage.setItem(CURRENT_KEY, 'demo') } catch { /* ignore */ }
    dispatch({ type: 'reset', state: s })
  }, [])

  const deleteAccountData = useCallback(() => {
    try {
      if (state.user) localStorage.removeItem(stateKey(state.user.email))
      localStorage.removeItem(CURRENT_KEY)
    } catch { /* ignore */ }
    dispatch({ type: 'reset', state: signedOutState })
  }, [state.user])

  const value = useMemo(
    () => ({ state, dispatch, set, toasts, toast, dismissToast, signIn, signOut, startDemo, deleteAccountData }),
    [state, set, toasts, toast, dismissToast, signIn, signOut, startDemo, deleteAccountData],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}

export function newId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) + '-' + Math.random().toString(36).slice(2, 6)
}

export function randomStickerId() {
  return 'TG-' + Math.random().toString(16).slice(2, 6).toUpperCase()
}
