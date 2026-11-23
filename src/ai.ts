/**
 * Tagly AI: what you need today, how likely you are to forget it, and where a lost item probably is.
 *
 * Two engines share one interface:
 *  - on-device: a small knowledge model (event concepts × item specs × weather) that runs in the browser,
 *    adjusted by the user's own feedback and four weeks of bag history.
 *  - Claude: when this site has /api/ai set up with an Anthropic key, the same inputs go to Claude,
 *    which reads free-form event titles in any language. Falls back to on-device on any error.
 */
import { useEffect, useMemo, useState } from 'react'
import { activeEvents, dayShort, packingList, todayISO } from './store'
import type { DayEvent, IconKey, Item, State } from './store'
import { hourLabel } from './weather'

/* ------------------------------------------------------------------ */
/* Knowledge: what things are, and what events need                    */
/* ------------------------------------------------------------------ */

interface Spec {
  key: string
  name: string
  icon: IconKey
  /** Matches an item the user already has, by name. */
  alias: RegExp
  /** Also match by icon (only for unambiguous things). */
  icons?: IconKey[]
}

const specs: Record<string, Spec> = {
  laptop: { key: 'laptop', name: 'Laptop', icon: 'laptop', alias: /laptop|macbook|notebook|gram|노트북/i, icons: ['laptop'] },
  charger: { key: 'charger', name: 'Charger', icon: 'charger', alias: /charger|power ?bank|cable|충전기|보조배터리/i, icons: ['charger'] },
  tablet: { key: 'tablet', name: 'Tablet', icon: 'tablet', alias: /ipad|tablet|태블릿|아이패드|galaxy tab/i, icons: ['tablet'] },
  pencil: { key: 'pencil', name: 'Pencil case', icon: 'pencil', alias: /pencil|필통|pen case/i, icons: ['pencil'] },
  book: { key: 'book', name: 'Textbook', icon: 'book', alias: /book|교재|책/i, icons: ['book'] },
  earbuds: { key: 'earbuds', name: 'Earbuds', icon: 'earbuds', alias: /earbud|airpod|buds|이어폰|에어팟|headphone|헤드폰/i, icons: ['earbuds', 'headphones'] },
  gym: { key: 'gym', name: 'Gym clothes', icon: 'shirt', alias: /gym|workout|sport|운동복|트레이닝/i },
  towel: { key: 'towel', name: 'Towel', icon: 'shirt', alias: /towel|수건/i },
  swimsuit: { key: 'swimsuit', name: 'Swimsuit', icon: 'shirt', alias: /swim|수영복/i },
  bottle: { key: 'bottle', name: 'Water bottle', icon: 'bottle', alias: /bottle|tumbler|water|텀블러|물병/i, icons: ['bottle'] },
  umbrella: { key: 'umbrella', name: 'Umbrella', icon: 'umbrella', alias: /umbrella|우산/i, icons: ['umbrella'] },
  sunglasses: { key: 'sunglasses', name: 'Sunglasses', icon: 'glasses', alias: /sunglass|선글라스/i },
  warm: { key: 'warm', name: 'Scarf and gloves', icon: 'shirt', alias: /scarf|glove|목도리|장갑|패딩|coat/i },
  idcard: { key: 'idcard', name: 'ID card', icon: 'idcard', alias: /passport|id card|student id|여권|신분증|학생증/i, icons: ['idcard'] },
  wallet: { key: 'wallet', name: 'Wallet', icon: 'wallet', alias: /wallet|지갑/i, icons: ['wallet'] },
  camera: { key: 'camera', name: 'Camera', icon: 'camera', alias: /camera|카메라/i, icons: ['camera'] },
  sheet: { key: 'sheet', name: 'Sheet music', icon: 'book', alias: /sheet music|score|악보/i },
}

export interface Concept { id: string; label: string; re: RegExp; items: string[]; base: number }

export const concepts: Concept[] = [
  { id: 'meeting', label: 'meetings', re: /meet|meeting|sync|1:1|interview|presentation|pitch|review|면담|회의|미팅|면접|발표|팀플/i, items: ['laptop', 'charger'], base: 0.84 },
  { id: 'study', label: 'study sessions', re: /study|library|exam|quiz|homework|assignment|paper|research|스터디|도서관|시험|과제|공부|논문/i, items: ['laptop', 'pencil', 'earbuds'], base: 0.8 },
  { id: 'class', label: 'classes', re: /class|lecture|course|seminar|\blab\b|tutorial|vision|수업|강의|세미나|실험/i, items: ['tablet', 'pencil', 'book'], base: 0.78 },
  { id: 'gym', label: 'workouts', re: /gym|workout|fitness|yoga|pilates|crossfit|\brun\b|running|climb|헬스|운동|요가|필라테스|러닝|클라이밍/i, items: ['gym', 'bottle', 'earbuds'], base: 0.86 },
  { id: 'swim', label: 'swimming', re: /swim|pool|수영/i, items: ['swimsuit', 'towel'], base: 0.9 },
  { id: 'trip', label: 'trips', re: /trip|travel|flight|airport|train|ktx|srt|출장|여행|공항|비행|기차/i, items: ['idcard', 'charger'], base: 0.88 },
  { id: 'outdoor', label: 'outings', re: /hike|hiking|picnic|camp|park|festival|등산|소풍|캠핑|공원|축제/i, items: ['bottle', 'charger', 'camera'], base: 0.76 },
  { id: 'lesson', label: 'lessons', re: /lesson|piano|guitar|violin|band|choir|rehearsal|레슨|피아노|기타|바이올린|합주/i, items: ['sheet'], base: 0.74 },
  { id: 'errand', label: 'appointments', re: /hospital|clinic|doctor|dentist|bank|pharmacy|병원|치과|은행|약국|구청|주민센터/i, items: ['idcard', 'wallet'], base: 0.82 },
  { id: 'social', label: 'plans with friends', re: /dinner|lunch|brunch|drinks|party|birthday|date|회식|저녁|점심|약속|파티|생일|데이트/i, items: ['wallet'], base: 0.7 },
  { id: 'photo', label: 'photo walks', re: /photo|shoot|exhibition|전시|촬영|출사/i, items: ['camera'], base: 0.8 },
]

export function conceptsFor(title: string) {
  return concepts.filter((c) => c.re.test(title))
}

/** Concept tags of today's schedule (used by the habit model). */
export function todayTags(state: State) {
  return [...new Set(activeEvents(state).flatMap((e) => conceptsFor(e.title).map((c) => c.id)))]
}

function findOwned(state: State, spec: Spec): Item | undefined {
  return state.items.find((i) => spec.alias.test(i.name)) ?? (spec.icons ? state.items.find((i) => spec.icons!.includes(i.icon)) : undefined)
}

/* ------------------------------------------------------------------ */
/* Suggestions                                                         */
/* ------------------------------------------------------------------ */

export interface Suggestion {
  key: string
  name: string
  icon: IconKey
  /** The user's own item, if they already have one. */
  itemId?: string
  reasons: string[]
  /** Feedback keys: `${concept}|${spec}`. */
  keys: string[]
  confidence: number
  /** The word in the event title that triggered it (for learning a rule). */
  keyword?: string
  conceptLabel?: string
}

export interface Brief {
  engine: 'device' | 'claude'
  text: string
  suggestions: Suggestion[]
}

function feedbackScore(state: State, keys: string[]) {
  let delta = 0
  let blocked = false
  for (const k of keys) {
    const f = state.aiFeedback[k]
    if (!f) continue
    delta += 0.06 * f.yes - 0.2 * f.no
    if (f.no >= 2 && f.yes === 0) blocked = true
  }
  return { delta, blocked }
}

function rainInfo(state: State) {
  const w = state.weather
  if (!state.weatherOn) return null
  const wet = w.hours?.find((h) => h.pop >= 50)
  if (wet) return { pop: Math.max(...w.hours!.map((h) => h.pop)), from: hourLabel(wet.h) }
  if (w.kind === 'rain') return { pop: 70, from: '' }
  return null
}

function evLabel(e: DayEvent) {
  return e.allDay ? `“${e.title}”` : `“${e.title}” at ${e.time}`
}

/** The on-device model. */
export function deviceBrief(state: State): Brief {
  const events = activeEvents(state)
  const onList = new Set(packingList(state).map((e) => e.item.id))
  const dismissed = state.aiToday.date === todayISO() ? state.aiToday.dismissed : []
  const acc = new Map<string, { spec: Spec; reasons: string[]; keys: string[]; base: number; keyword?: string; label?: string }>()
  const push = (specKey: string, reason: string, conceptId: string, base: number, keyword?: string, label?: string) => {
    const spec = specs[specKey]
    const cur = acc.get(specKey) ?? { spec, reasons: [], keys: [], base: 0 }
    if (!cur.reasons.includes(reason)) cur.reasons.push(reason)
    const k = `${conceptId}|${specKey}`
    if (!cur.keys.includes(k)) cur.keys.push(k)
    cur.base = Math.max(cur.base, base) + (cur.reasons.length > 1 ? 0.04 : 0)
    cur.keyword ??= keyword
    cur.label ??= label
    acc.set(specKey, cur)
  }

  for (const e of events) {
    for (const c of conceptsFor(e.title)) {
      const word = e.title.match(c.re)?.[0]
      for (const s of c.items) push(s, `For ${evLabel(e)}`, c.id, c.base, word, c.label)
    }
  }
  const rain = rainInfo(state)
  if (rain) push('umbrella', rain.from ? `Rain ${rain.pop}% from ${rain.from}` : 'Rain in the forecast', 'rain', 0.93)
  const w = state.weather
  if (state.weatherOn && w.low !== undefined && w.low <= 3) push('warm', `Low of ${w.low}° today`, 'cold', 0.8)
  if (state.weatherOn && w.high !== undefined && w.high >= 28) {
    push('bottle', `High of ${w.high}°`, 'heat', 0.8)
    push('sunglasses', `High of ${w.high}° and sunny`, 'heat', 0.7)
  }
  const timed = events.filter((e) => !e.allDay)
  if (timed.length >= 2) {
    const first = timed[0].time, last = timed[timed.length - 1].end ?? timed[timed.length - 1].time
    if (first <= '10:00' && last >= '19:30') push('charger', `Long day · out ${first}–${last}`, 'longday', 0.74)
  }

  const out: Suggestion[] = []
  for (const [key, a] of acc) {
    const owned = findOwned(state, a.spec)
    if (owned && onList.has(owned.id)) continue
    if (dismissed.includes(key)) continue
    const { delta, blocked } = feedbackScore(state, a.keys)
    if (blocked) continue
    const confidence = Math.max(0.3, Math.min(0.97, a.base + delta - (owned ? 0 : 0.06)))
    if (confidence < 0.5) continue
    out.push({
      key, name: owned?.name ?? a.spec.name, icon: owned?.icon ?? a.spec.icon, itemId: owned?.id,
      reasons: a.reasons, keys: a.keys, confidence, keyword: a.keyword, conceptLabel: a.label,
    })
  }
  out.sort((x, y) => Number(!!y.itemId) - Number(!!x.itemId) || y.confidence - x.confidence)
  const suggestions = out.slice(0, 4)
  return { engine: 'device', text: briefing(state, suggestions), suggestions }
}

function briefing(state: State, sugg: Suggestion[]) {
  const events = activeEvents(state)
  const parts: string[] = []
  const rain = rainInfo(state)
  const w = state.weather
  const wx = rain ? (rain.from ? `Rain from ${rain.from}` : 'Rain later') : state.weatherOn && w.temp !== undefined ? `${w.high ?? w.temp}° and dry` : ''
  const ev = events.length === 0 ? 'a free day' : events.length === 1 ? `“${events[0].title}”` : `${events.length} things on your schedule`
  parts.push(`${wx ? wx + ', ' : ''}${ev}.`.replace(/^./, (c) => c.toUpperCase()))
  if (sugg.length) parts.push(`I’d add ${sugg.length === 1 ? 'one thing' : `${sugg.length} things`} to your list.`)
  else parts.push('Your list already covers today.')
  const top = topRisk(state)
  if (top) parts.push(`Watch your ${top.item.name.toLowerCase()}: ${top.why.charAt(0).toLowerCase() + top.why.slice(1)}.`)
  return parts.join(' ')
}

/* ------------------------------------------------------------------ */
/* Claude                                                              */
/* ------------------------------------------------------------------ */

const iconKeys: IconKey[] = ['laptop', 'tablet', 'pencil', 'umbrella', 'earbuds', 'key', 'bottle', 'wallet', 'glasses', 'book', 'headphones', 'camera', 'charger', 'shirt', 'idcard']

interface CloudResult { briefing?: string; suggestions?: { name?: string; itemId?: string | null; icon?: string; reason?: string; confidence?: number }[] }

export async function cloudBrief(state: State, signal?: AbortSignal): Promise<Brief | null> {
  const events = activeEvents(state)
  const onList = new Set(packingList(state).map((e) => e.item.id))
  const w = state.weather
  const body = {
    task: 'pack',
    date: todayISO(),
    weekday: dayShort[new Date().getDay()],
    events: events.map((e) => ({ time: e.allDay ? 'all day' : `${e.time}${e.end ? '–' + e.end : ''}`, title: e.title, place: e.place ?? null })),
    weather: state.weatherOn ? { summary: w.label, now: w.temp ?? null, high: w.high ?? null, low: w.low ?? null, hours: (w.hours ?? []).map((h) => ({ hour: h.h, rainChance: h.pop, temp: h.temp })) } : null,
    items: state.items.map((i) => ({ id: i.id, name: i.name, alreadyOnList: onList.has(i.id) })),
    icons: iconKeys,
    disliked: Object.entries(state.aiFeedback).filter(([, f]) => f.no >= 2 && f.yes === 0).map(([k]) => k.split('|')[1]),
  }
  try {
    const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null
    const data = (await res.json()) as CloudResult
    if (!Array.isArray(data.suggestions)) return null
    const dismissed = state.aiToday.date === todayISO() ? state.aiToday.dismissed : []
    const suggestions: Suggestion[] = []
    for (const s of data.suggestions.slice(0, 5)) {
      if (!s?.name || !s.reason) continue
      const item = s.itemId ? state.items.find((i) => i.id === s.itemId) : state.items.find((i) => i.name.toLowerCase() === s.name!.toLowerCase())
      if (item && onList.has(item.id)) continue
      const key = item?.id ?? s.name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-')
      if (dismissed.includes(key)) continue
      const keys = [`claude|${key}`]
      if (feedbackScore(state, keys).blocked) continue
      const icon = (iconKeys as string[]).includes(s.icon ?? '') ? (s.icon as IconKey) : item?.icon ?? 'bottle'
      suggestions.push({ key, name: item?.name ?? s.name, icon: item?.icon ?? icon, itemId: item?.id, reasons: [s.reason], keys, confidence: Math.max(0.3, Math.min(0.98, s.confidence ?? 0.8)) })
    }
    return { engine: 'claude', text: data.briefing ?? briefing(state, suggestions), suggestions: suggestions.slice(0, 4) }
  } catch {
    return null
  }
}

/** Is Claude set up on this site? Cached for the session. */
let cloudKnown: boolean | null = null
export async function cloudAvailable() {
  if (cloudKnown !== null) return cloudKnown
  try {
    const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'ping' }) })
    const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null
    cloudKnown = !!(res.ok && data?.ok)
  } catch { cloudKnown = false }
  return cloudKnown
}

/** Today's brief: on-device right away, upgraded to Claude when available. */
export function useBrief(state: State): { brief: Brief; thinking: boolean } {
  const local = useMemo(() => deviceBrief(state), [state])
  const [cloud, setCloud] = useState<{ sig: string; brief: Brief } | null>(null)
  const [thinking, setThinking] = useState(false)
  const sig = JSON.stringify([todayISO(), activeEvents(state).map((e) => e.title + e.time), state.weather.label, state.weather.high, state.items.map((i) => i.id + i.name),
    packingList(state).map((e) => e.item.id), state.aiToday, state.aiFeedback])
  const want = state.ai.on && state.ai.cloud
  useEffect(() => {
    if (!want) return
    const ctl = new AbortController()
    let live = true
    ;(async () => {
      if (!(await cloudAvailable())) return
      const cacheKey = 'tagly-ai-brief:' + sig
      try {
        const hit = sessionStorage.getItem(cacheKey)
        if (hit) { if (live) setCloud({ sig, brief: JSON.parse(hit) }); return }
      } catch { /* ignore */ }
      if (live) setThinking(true)
      const b = await cloudBrief(state, ctl.signal)
      if (!live) return
      setThinking(false)
      if (b) { setCloud({ sig, brief: b }); try { sessionStorage.setItem(cacheKey, JSON.stringify(b)) } catch { /* ignore */ } }
    })()
    return () => { live = false; ctl.abort(); setThinking(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, want])
  return { brief: want && cloud?.sig === sig ? cloud.brief : local, thinking }
}

/* ------------------------------------------------------------------ */
/* Habits: how likely you are to forget something today                */
/* ------------------------------------------------------------------ */

export interface Risk { item: Item; risk: number; why: string }

const dayLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function forgetRisk(state: State, item: Item): Risk | null {
  const logs = state.history.filter((h) => h.needed.includes(item.id))
  if (logs.length < 3) return null
  const f = logs.filter((h) => h.forgot.includes(item.id)).length
  const r0 = (f + 0.5) / (logs.length + 2)
  const wd = new Date().getDay()
  const rainToday = !!rainInfo(state)
  const tags = todayTags(state)
  const ctx: { r: number; why: string; n: number }[] = [
    { r: r0, n: logs.length, why: `Left behind ${f} of the last ${logs.length} times you needed it` },
  ]
  const same = logs.filter((h) => h.wd === wd)
  if (same.length >= 2) {
    const fs = same.filter((h) => h.forgot.includes(item.id)).length
    ctx.push({ r: (fs + 2 * r0) / (same.length + 2), n: same.length, why: `Left behind on ${fs} of your last ${same.length} ${dayLong[wd]}s` })
  }
  if (rainToday) {
    const wet = logs.filter((h) => h.rain)
    if (wet.length >= 2) {
      const fr = wet.filter((h) => h.forgot.includes(item.id)).length
      ctx.push({ r: (fr + 2 * r0) / (wet.length + 2), n: wet.length, why: `Left behind on ${fr} of ${wet.length} rainy days` })
    }
  }
  for (const t of tags) {
    const withTag = logs.filter((h) => h.tags.includes(t))
    if (withTag.length >= 2) {
      const ft = withTag.filter((h) => h.forgot.includes(item.id)).length
      const label = concepts.find((c) => c.id === t)?.label ?? t
      ctx.push({ r: (ft + 2 * r0) / (withTag.length + 2), n: withTag.length, why: `Left behind on ${ft} of ${withTag.length} days with ${label}` })
    }
  }
  const best = ctx.reduce((a, b) => (b.r > a.r ? b : a))
  return { item, risk: best.r, why: best.why }
}

/** Risk for each item on today's list, highest first (only meaningful ones). */
export function listRisks(state: State, min = 0.35): Risk[] {
  return packingList(state)
    .map((e) => forgetRisk(state, e.item))
    .filter((r): r is Risk => !!r && r.risk >= min)
    .sort((a, b) => b.risk - a.risk)
}

export function topRisk(state: State) {
  return listRisks(state, 0.45).find((r) => r.item.status !== 'inBag') ?? listRisks(state, 0.45)[0] ?? null
}

/** Readable patterns from history, for "What Tagly learned". */
export function habitPatterns(state: State) {
  const out: { item: Item; text: string; rate: number }[] = []
  for (const item of state.items) {
    const logs = state.history.filter((h) => h.needed.includes(item.id))
    if (logs.length < 3) continue
    let best: { text: string; rate: number } | null = null
    for (let wd = 0; wd < 7; wd++) {
      const d = logs.filter((h) => h.wd === wd)
      const f = d.filter((h) => h.forgot.includes(item.id)).length
      if (d.length >= 3 && f >= 2 && (!best || f / d.length > best.rate)) best = { text: `Often left behind on ${dayLong[wd]}s (${f} of ${d.length})`, rate: f / d.length }
    }
    const wet = logs.filter((h) => h.rain)
    const fw = wet.filter((h) => h.forgot.includes(item.id)).length
    if (wet.length >= 2 && fw >= 2 && (!best || fw / wet.length > best.rate)) best = { text: `Often left behind on rainy days (${fw} of ${wet.length})`, rate: fw / wet.length }
    if (best) out.push({ item, ...best })
  }
  return out.sort((a, b) => b.rate - a.rate)
}

/* ------------------------------------------------------------------ */
/* Where a left-behind item probably is                                */
/* ------------------------------------------------------------------ */

export interface PlaceGuess { place: string; p: number; why: string }

export function likelyPlaces(state: State, item: Item): PlaceGuess[] {
  const s = item.seen
  if (!s) return []
  const raw: { place: string; w: number; why: string }[] = []
  raw.push({
    place: s.place,
    w: item.status === 'lost' ? 0.55 : 0.7,
    why: item.status === 'leftBehind' ? `Signal dropped here at ${s.time} as you walked away` : `Last connection here · ${s.time}`,
  })
  const before = activeEvents(state)
    .filter((e) => e.place && e.place !== s.place && (!/^\d\d:\d\d$/.test(s.time) || e.time <= s.time))
    .reverse()
  before.slice(0, 2).forEach((e, i) => raw.push({ place: e.place!, w: i === 0 ? 0.18 : 0.08, why: `You were here for ${e.title}${e.end ? ` (${e.time}–${e.end})` : ` at ${e.time}`}` }))
  if (s.place !== 'Home' && state.places.some((p) => p.name === 'Home')) raw.push({ place: 'Home', w: 0.06, why: 'Maybe it never left home this morning' })
  const sum = raw.reduce((a, b) => a + b.w, 0)
  return raw.map((r) => ({ place: r.place, p: r.w / sum, why: r.why }))
}

/* ------------------------------------------------------------------ */
/* Departure detection (simulated sensor fusion)                       */
/* ------------------------------------------------------------------ */

export interface Signal { id: string; label: string; detail: string; score: number }

export function departureSignals(state: State, now = new Date()): Signal[] {
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const next = activeEvents(state).find((e) => !e.allDay && e.time >= hhmm)
  let sched = 'Around your usual leaving time'
  if (next) {
    const [h, m] = next.time.split(':').map(Number)
    const mins = h * 60 + m - (now.getHours() * 60 + now.getMinutes())
    sched = mins <= 90 ? `${next.title} starts in ${mins} min` : `${next.title} at ${next.time}`
  }
  return [
    { id: 'motion', label: 'Keyring motion', detail: 'Walking · steady steps for 40 s', score: 0.92 },
    { id: 'place', label: 'Location', detail: 'Left the Home zone', score: 0.86 },
    { id: 'schedule', label: 'Schedule', detail: sched, score: next ? 0.74 : 0.6 },
  ]
}

/** Logistic fusion of the signals → probability you're leaving now. */
export function fuse(signals: Signal[]) {
  const z = -4.2 + signals.reduce((a, s) => a + s.score * (s.id === 'motion' ? 3.4 : s.id === 'place' ? 3.0 : 2.2), 0)
  return 1 / (1 + Math.exp(-z))
}

export function pct(p: number) {
  return `${Math.round(p * 100)}%`
}
