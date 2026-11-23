import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Plus } from 'lucide-react'
import { courseColor, dayShort, newId, useStore } from '../store'
import type { ColorKey, Course } from '../store'
import { colorOrder, colors } from '../components/icons'
import { Button, PageHead, Screen, SetupProgress, Sheet } from '../components/ui'

const weekOrder = [1, 2, 3, 4, 5, 6, 0]

function toMin(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m }

export function daysLabel(days: number[]) {
  const sorted = weekOrder.filter((d) => days.includes(d))
  if (sorted.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays'
  return sorted.map((d) => dayShort[d]).join(' · ')
}

/** Week grid with class blocks. */
function WeekGrid({ courses, onPick }: { courses: Course[]; onPick: (c: Course) => void }) {
  const showWeekend = courses.some((c) => c.days.includes(0) || c.days.includes(6))
  const days = showWeekend ? weekOrder : weekOrder.slice(0, 5)
  const mins = courses.flatMap((c) => [toMin(c.start), toMin(c.end)])
  const from = Math.min(9 * 60, ...mins.filter((_, i) => i % 2 === 0)) - 30
  const to = Math.max(18 * 60, ...mins.filter((_, i) => i % 2 === 1)) + 30
  const startH = Math.floor(from / 60)
  const endH = Math.ceil(to / 60)
  const span = (endH - startH) * 60
  const today = new Date().getDay()
  const pxPerMin = 0.62
  return (
    <div className="week">
      <div className="week-head" style={{ gridTemplateColumns: `28px repeat(${days.length}, 1fr)` }}>
        <span />
        {days.map((d) => <span key={d} className={d === today ? 'today' : ''}>{dayShort[d]}</span>)}
      </div>
      <div className="week-body" style={{ gridTemplateColumns: `28px repeat(${days.length}, 1fr)`, height: span * pxPerMin }}>
        <div className="week-hours">
          {Array.from({ length: endH - startH }, (_, i) => (
            <span key={i} style={{ top: i * 60 * pxPerMin }}>{startH + i}</span>
          ))}
        </div>
        {days.map((d) => (
          <div key={d} className={`week-col ${d === today ? 'today' : ''}`}>
            {Array.from({ length: endH - startH }, (_, i) => <i key={i} style={{ top: i * 60 * pxPerMin }} />)}
            {courses.filter((c) => c.days.includes(d)).map((c) => (
              <button key={c.id} type="button" className="week-block"
                style={{
                  top: (toMin(c.start) - startH * 60) * pxPerMin,
                  height: Math.max(22, (toMin(c.end) - toMin(c.start)) * pxPerMin),
                  background: colors[c.color].bg, color: colors[c.color].fg, borderLeftColor: courseColor(c.color),
                }}
                onClick={() => onPick(c)} title={`${c.name} ${c.start}–${c.end}`}>
                <b>{c.name}</b>
                <small>{c.start}</small>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const blankCourse = (): Course => ({ id: '', name: '', days: [], start: '09:00', end: '10:15', place: '', color: 'sky' })

function CourseSheet({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const { dispatch, toast } = useStore()
  const [c, setC] = useState<Course>(course ?? blankCourse())
  const [tried, setTried] = useState(false)
  const timeOk = toMin(c.end) > toMin(c.start)
  const ok = c.name.trim() && c.days.length > 0 && timeOk
  const editing = !!course?.id
  return (
    <Sheet open onClose={onClose} title={editing ? 'Edit class' : 'Add class'}>
      <p className="eyebrow">Timetable</p>
      <h2 className="sheet-title">{editing ? 'Edit class' : 'Add a class'}</h2>
      <form onSubmit={(e) => {
        e.preventDefault(); setTried(true)
        if (!ok) return
        const saved = { ...c, name: c.name.trim(), place: c.place?.trim(), id: c.id || newId(c.name) }
        dispatch({ type: 'upsertCourse', course: saved })
        toast({ title: editing ? 'Class updated' : `${saved.name} added`, tone: 'success' })
        onClose()
      }}>
        <label className="field">
          <span className="field-label">Class name</span>
          <input autoFocus={!editing} value={c.name} maxLength={40} placeholder="e.g. Intelligent Vision" onChange={(e) => setC({ ...c, name: e.target.value })}
            aria-invalid={tried && !c.name.trim()} />
        </label>
        <fieldset className="field">
          <legend className="field-label">Days</legend>
          <div className="day-pills">
            {weekOrder.map((d) => {
              const on = c.days.includes(d)
              return (
                <button key={d} type="button" aria-pressed={on} className={on ? 'on' : ''}
                  onClick={() => setC({ ...c, days: on ? c.days.filter((x) => x !== d) : [...c.days, d] })}>
                  {dayShort[d].slice(0, 2)}
                </button>
              )
            })}
          </div>
          {tried && !c.days.length && <span className="field-error">Pick at least one day.</span>}
        </fieldset>
        <div className="time-pair">
          <label className="field">
            <span className="field-label">Starts</span>
            <input type="time" className="time-input big" value={c.start} onChange={(e) => setC({ ...c, start: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Ends</span>
            <input type="time" className="time-input big" value={c.end} onChange={(e) => setC({ ...c, end: e.target.value })} />
          </label>
        </div>
        {!timeOk && <span className="field-error">The class must end after it starts.</span>}
        <label className="field">
          <span className="field-label">Room <small className="text-muted">(optional)</small></span>
          <input value={c.place ?? ''} maxLength={40} placeholder="e.g. Engineering 2, 21352" onChange={(e) => setC({ ...c, place: e.target.value })} />
        </label>
        <fieldset className="field">
          <legend className="field-label">Colour</legend>
          <div className="color-row">
            {colorOrder.map((k: ColorKey) => (
              <button key={k} type="button" aria-label={colors[k].name} aria-pressed={c.color === k}
                className={`color-opt ${c.color === k ? 'on' : ''}`} style={{ background: colors[k].bg }} onClick={() => setC({ ...c, color: k })} />
            ))}
          </div>
        </fieldset>
        <Button type="submit">{editing ? 'Save class' : 'Add class'}</Button>
        {editing && (
          <Button variant="danger" onClick={() => {
            dispatch({ type: 'removeCourse', id: c.id })
            toast({ title: `${c.name} removed` })
            onClose()
          }}>Remove class</Button>
        )}
      </form>
    </Sheet>
  )
}

export function TimetableEditor() {
  const { state } = useStore()
  const [editing, setEditing] = useState<Course | null | undefined>(undefined)
  const first = (c: Course) => Math.min(...c.days.map((d) => weekOrder.indexOf(d)))
  const sorted = [...state.timetable].sort((a, b) => first(a) - first(b) || a.start.localeCompare(b.start))
  return (
    <>
      {state.timetable.length > 0 && <WeekGrid courses={state.timetable} onPick={(c) => setEditing(c)} />}
      <div className="stack">
        {sorted.map((c) => (
          <button key={c.id} type="button" className="row pressable course-row" onClick={() => setEditing(c)}>
            <span className="course-dot" style={{ background: courseColor(c.color) }} />
            <span className="row-copy">
              <span className="row-title">{c.name}</span>
              <span className="row-sub">{daysLabel(c.days)} · {c.start}–{c.end}{c.place ? <> · <MapPin size={11} /> {c.place}</> : null}</span>
            </span>
          </button>
        ))}
        {state.timetable.length === 0 && (
          <div className="empty-timetable">
            <b>No classes yet</b>
            <span>Add each class once with its days and time. Tagly repeats it every week.</span>
          </div>
        )}
      </div>
      <Button variant="blue" onClick={() => setEditing(null)}><Plus size={18} /> Add class</Button>
      {editing !== undefined && <CourseSheet key={editing?.id ?? 'new'} course={editing} onClose={() => setEditing(undefined)} />}
    </>
  )
}

export function TimetableStep() {
  const nav = useNavigate()
  const { state } = useStore()
  return (
    <Screen className="onboarding">
      <SetupProgress step={3} back="/setup/pair" />
      <PageHead title="Your timetable" sub="Add your classes. On class days, Tagly adds what you need for them to the morning list." />
      <TimetableEditor />
      <div className="bottom-actions">
        <Button onClick={() => nav('/setup/item')}>{state.timetable.length ? 'Continue' : 'Skip for now'}</Button>
        {state.timetable.length === 0 && <p className="hint center">You can add classes later in Settings → Timetable.</p>}
      </div>
    </Screen>
  )
}

export function TimetableSettings() {
  return (
    <Screen tabs>
      <PageHead back="/settings" backLabel="Settings" title="Timetable" sub="Tap a class to edit it. Link items to classes from each item’s “When do I need this?”." />
      <TimetableEditor />
    </Screen>
  )
}

