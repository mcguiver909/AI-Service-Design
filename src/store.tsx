import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'

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
  keywords: string[]
  weather: boolean
  weatherKinds: WeatherKind[]
}

export interface PlaceSeen {
  place: string
  time: string // e.g. "14:52"
  distance?: string // e.g. "350 m"
  walk?: string // e.g. "about 5 min walking"
  note?: string // e.g. "nearby"
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

export interface CalEvent {
  id: string
  time: string
  title: string
  calendar: CalendarKey
  tags: string[]
}

export type CalendarKey = 'personal' | 'skku' | 'work'
export type Feedback = 'light+vibrate' | 'light' | 'vibrate' | 'off'

export interface Permissions {
  bluetooth: boolean
  notifications: boolean
  calendar: boolean
  location: boolean
}

export interface Place {
  id: string
  name: string
}

export interface AlertTypes {
  missing: boolean
  leftBehind: boolean
  listChanges: boolean
  found: boolean
  lowBattery: boolean
}

export interface State {
  onboarded: boolean
  permissions: Permissions
  keyring: { paired: boolean; battery: number; signal: 'Strong' | 'Good' | 'Weak'; feedback: Feedback }
  googleConnected: boolean
  calendars: Record<CalendarKey, boolean>
  weatherOn: boolean
  weather: { kind: WeatherKind | 'clear'; from: string; label: string }
  events: CalEvent[]
  items: Item[]
  todayAdded: string[]
  todayRemoved: string[]
  dismissedSuggestions: string[]
  morningCheck: string
  quietFrom: string
  quietTo: string
  alerts: AlertTypes
  places: Place[]
}

/* ------------------------------------------------------------------ */
/* Demo data                                                           */
/* ------------------------------------------------------------------ */

const noRule: ItemRule = { always: false, events: false, keywords: [], weather: false, weatherKinds: [] }

export const demoItems: Item[] = [
  {
    id: 'laptop', name: 'Laptop', icon: 'laptop', color: 'yellow', stickerId: 'TG-31C7', battery: 84,
    status: 'inBag', rule: { ...noRule, events: true, keywords: ['Study', 'Meeting'] },
  },
  {
    id: 'ipad', name: 'iPad', icon: 'tablet', color: 'peach', stickerId: 'TG-9A10', battery: 61,
    status: 'inBag', rule: { ...noRule, events: true, keywords: ['Lecture', 'Exam'] },
  },
  {
    id: 'pencil', name: 'Pencil case', icon: 'pencil', color: 'mint', stickerId: 'TG-4F2A', battery: 72,
    status: 'leftBehind',
    seen: { place: 'Library 2F', time: '14:52', distance: '350 m', walk: 'about 5 min walking', mapVariant: 0 },
    rule: { ...noRule, events: true, keywords: ['Lecture', 'Exam'] },
  },
  {
    id: 'umbrella', name: 'Umbrella', icon: 'umbrella', color: 'lavender', stickerId: 'TG-7E05', battery: 90,
    status: 'withYou',
    seen: { place: 'Home', time: '07:45', note: 'nearby', mapVariant: 1 },
    rule: { ...noRule, weather: true, weatherKinds: ['rain'] },
  },
  {
    id: 'earbuds', name: 'Earbuds', icon: 'earbuds', color: 'sky', stickerId: 'TG-2B88', battery: 12,
    status: 'lost', meshSearch: true,
    seen: { place: 'Hyehwa Station', time: '1 h ago', distance: '1.2 km', walk: 'about 15 min walking', mapVariant: 2 },
    rule: { ...noRule },
  },
]

export const demoEvents: CalEvent[] = [
  { id: 'e1', time: '09:00', title: 'Intelligent Vision', calendar: 'skku', tags: ['Lecture'] },
  { id: 'e2', time: '14:00', title: 'Library study', calendar: 'personal', tags: ['Study'] },
]

export const initialState: State = {
  onboarded: false,
  permissions: { bluetooth: true, notifications: true, calendar: false, location: false },
  keyring: { paired: false, battery: 92, signal: 'Strong', feedback: 'light+vibrate' },
  googleConnected: true,
  calendars: { personal: true, skku: true, work: false },
  weatherOn: true,
  weather: { kind: 'rain', from: '3 PM', label: 'Rain from 3 PM' },
  events: demoEvents,
  items: demoItems,
  todayAdded: [],
  todayRemoved: [],
  dismissedSuggestions: [],
  morningCheck: '07:30',
  quietFrom: '23:00',
  quietTo: '07:00',
  alerts: { missing: true, leftBehind: true, listChanges: true, found: true, lowBattery: false },
  places: [{ id: 'home', name: 'Home' }],
}

/** State used by "Explore the demo": fully set up. */
export const demoReadyState: State = {
  ...initialState,
  onboarded: true,
  permissions: { bluetooth: true, notifications: true, calendar: true, location: true },
  keyring: { ...initialState.keyring, paired: true },
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
        items: exists
          ? state.items.map((i) => (i.id === action.item.id ? action.item : i))
          : [...state.items, action.item],
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
      return { ...state, todayAdded, todayRemoved }
    }
    case 'dismissSuggestion':
      return { ...state, dismissedSuggestions: [...state.dismissedSuggestions, action.id] }
  }
}

/* ------------------------------------------------------------------ */
/* Packing-list logic                                                  */
/* ------------------------------------------------------------------ */

export function activeEvents(state: State): CalEvent[] {
  if (!state.googleConnected) return []
  return state.events.filter((e) => state.calendars[e.calendar])
}

function matches(e: CalEvent, keyword: string) {
  const k = keyword.toLowerCase()
  return e.title.toLowerCase().includes(k) || e.tags.some((t) => t.toLowerCase() === k)
}

/** Why an item is automatically on today's list, or null. */
export function autoReason(state: State, item?: Item): string | null {
  if (!item) return null
  if (item.rule.always) return 'Every day'
  if (item.rule.events) {
    const ev = activeEvents(state).find((e) => item.rule.keywords.some((k) => matches(e, k)))
    if (ev) return `${ev.title} · ${ev.time}`
  }
  if (item.rule.weather && state.weatherOn && state.weather.kind !== 'clear' &&
      item.rule.weatherKinds.includes(state.weather.kind)) {
    return `Weather · ${state.weather.label.charAt(0).toLowerCase()}${state.weather.label.slice(1)}`
  }
  return null
}

export interface ListEntry {
  item: Item
  reason: string
  packed: boolean
}

export function packingList(state: State): ListEntry[] {
  const out: ListEntry[] = []
  for (const item of state.items) {
    if (state.todayRemoved.includes(item.id)) continue
    const auto = autoReason(state, item)
    const manual = state.todayAdded.includes(item.id)
    if (auto || manual) {
      out.push({ item, reason: auto ?? 'Added manually for today', packed: item.status === 'inBag' })
    }
  }
  return out
}

/** Suggested item for today (demo: earbuds on Tuesdays). */
export function suggestion(state: State): Item | null {
  const list = packingList(state)
  const cand = state.items.find(
    (i) => i.id === 'earbuds' && !list.some((e) => e.item.id === i.id) && !state.dismissedSuggestions.includes(i.id),
  )
  return cand ?? null
}

export function eventItems(state: State, e: CalEvent): string[] {
  return state.items.filter((i) => i.rule.events && i.rule.keywords.some((k) => matches(e, k))).map((i) => i.name)
}

export const statusLabel: Record<ItemStatus, string> = {
  inBag: 'In bag',
  withYou: 'With you',
  leftBehind: 'Left behind',
  lost: 'Lost',
}

export function locationLine(item: Item): string {
  switch (item.status) {
    case 'inBag':
      return 'In your backpack'
    case 'withYou':
      return 'Near you, outside the bag'
    case 'leftBehind':
      return item.seen ? `${item.seen.place} · ${item.seen.time}` : 'Left behind'
    case 'lost':
      return item.meshSearch ? `Mesh search on · seen ${item.seen?.time ?? 'recently'}` : 'Marked as lost'
  }
}

export function ruleSummary(rule: ItemRule): string {
  const parts: string[] = []
  if (rule.always) parts.push('Always')
  if (rule.events) parts.push(rule.keywords.length ? `Events: ${rule.keywords.join(', ')}` : 'For certain events')
  if (rule.weather) parts.push(rule.weatherKinds.length ? `Weather: ${rule.weatherKinds.join(', ')}` : 'For certain weather')
  return parts.length ? parts.join(' · ') : 'Only when added manually'
}

/* ------------------------------------------------------------------ */
/* Context, persistence, toasts                                        */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'tagly-state-v1'

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...initialState, ...(JSON.parse(raw) as Partial<State>) }
  } catch {
    /* storage unavailable */
  }
  return initialState
}

export interface Toast {
  id: number
  title: string
  body?: string
  tone?: 'default' | 'success' | 'danger'
  push?: boolean // styled like a push notification
  to?: string
}

interface Ctx {
  state: State
  dispatch: React.Dispatch<Action>
  set: (patch: Partial<State>) => void
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
}

const StoreContext = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), [])
  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = ++seq.current
      setToasts((ts) => [...ts.slice(-2), { ...t, id }])
      window.setTimeout(() => dismissToast(id), t.push ? 5000 : 2800)
    },
    [dismissToast],
  )
  const set = useCallback((patch: Partial<State>) => dispatch({ type: 'set', patch }), [])

  const value = useMemo(() => ({ state, dispatch, set, toasts, toast, dismissToast }), [state, set, toasts, toast, dismissToast])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}

export function newId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20) + '-' + Math.random().toString(36).slice(2, 6)
}

export function randomStickerId() {
  return 'TG-' + Math.random().toString(16).slice(2, 6).toUpperCase()
}
