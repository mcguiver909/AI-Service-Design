import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CloudRain, Snowflake, Sun } from 'lucide-react'
import { courseColor, useStore } from '../store'
import type { ItemRule, WeatherKind } from '../store'
import { Chip, Toggle } from './ui'

const weatherOpts: { kind: WeatherKind; label: string; Icon: typeof Sun }[] = [
  { kind: 'rain', label: 'Rain', Icon: CloudRain },
  { kind: 'cold', label: 'Cold', Icon: Snowflake },
  { kind: 'sun', label: 'Strong sun', Icon: Sun },
]

const keywordSuggestions = ['Meeting', 'Gym', 'Study', 'Travel', 'Lesson', 'Exam']

/** Pick weekly schedules + calendar keywords. */
function EventPicker({ rule, onChange }: { rule: ItemRule; onChange: (r: ItemRule) => void }) {
  const { state } = useStore()
  const [draft, setDraft] = useState('')
  const addKeyword = (k: string) => {
    const v = k.trim()
    if (!v || rule.keywords.some((x) => x.toLowerCase() === v.toLowerCase())) return
    onChange({ ...rule, keywords: [...rule.keywords, v] })
  }
  const unused = keywordSuggestions.filter((s) => !rule.keywords.includes(s)).slice(0, 4)
  return (
    <div className="rule-extra">
      <p className="mini-label">Weekly schedules</p>
      {state.timetable.length ? (
        <div className="chips">
          {state.timetable.map((c) => {
            const on = rule.courses.includes(c.id)
            return (
              <Chip key={c.id} active={on} onClick={() => onChange({
                ...rule, courses: on ? rule.courses.filter((x) => x !== c.id) : [...rule.courses, c.id],
              })}>
                <i className="dot" style={{ background: courseColor(c.color) }} /> {c.name}
              </Chip>
            )
          })}
        </div>
      ) : (
        <p className="hint">Nothing scheduled yet. <Link to="/settings/schedule" className="text-link small">Add a weekly schedule</Link></p>
      )}
      <p className="mini-label">Calendar events containing…</p>
      <div className="chips">
        {rule.keywords.map((k) => (
          <Chip key={k} active onRemove={() => onChange({ ...rule, keywords: rule.keywords.filter((x) => x !== k) })}>{k}</Chip>
        ))}
        <form className="kw-form" onSubmit={(e) => { e.preventDefault(); addKeyword(draft); setDraft('') }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => { addKeyword(draft); setDraft('') }}
            placeholder="+ Keyword" aria-label="New keyword" />
        </form>
      </div>
      {unused.length > 0 && (
        <div className="chips subtle">
          {unused.map((s) => <Chip key={s} onClick={() => addKeyword(s)}>+ {s}</Chip>)}
        </div>
      )}
    </div>
  )
}

function WeatherPicker({ rule, onChange }: { rule: ItemRule; onChange: (r: ItemRule) => void }) {
  return (
    <div className="rule-extra">
      <div className="chips">
        {weatherOpts.map(({ kind, label, Icon }) => {
          const on = rule.weatherKinds.includes(kind)
          return (
            <Chip key={kind} active={on} onClick={() => onChange({
              ...rule, weatherKinds: on ? rule.weatherKinds.filter((k) => k !== kind) : [...rule.weatherKinds, kind],
            })}><Icon size={14} /> {label}</Chip>
          )
        })}
      </div>
    </div>
  )
}

/** Full rule editor with toggles (item details). */
export function RuleEditor({ rule, onChange }: { rule: ItemRule; onChange: (r: ItemRule) => void }) {
  return (
    <div className="rules">
      <div className="rule">
        <div className="rule-copy"><b>Always</b><span>On the list every day</span></div>
        <Toggle label="Always" checked={rule.always} onChange={(v) => onChange({ ...rule, always: v })} />
      </div>
      <div className="rule">
        <div className="rule-copy"><b>For certain schedules or events</b><span>Pick schedules, or words in event titles</span></div>
        <Toggle label="For certain schedules or events" checked={rule.events} onChange={(v) => onChange({ ...rule, events: v })} />
      </div>
      {rule.events && <EventPicker rule={rule} onChange={onChange} />}
      <div className="rule">
        <div className="rule-copy"><b>For certain weather</b><span>e.g. rain, cold, strong sun</span></div>
        <Toggle label="For certain weather" checked={rule.weather}
          onChange={(v) => onChange({ ...rule, weather: v, weatherKinds: v && !rule.weatherKinds.length ? ['rain'] : rule.weatherKinds })} />
      </div>
      {rule.weather && <WeatherPicker rule={rule} onChange={onChange} />}
    </div>
  )
}

type RuleMode = 'always' | 'events' | 'weather'

/** Compact "When do you need it?" picker for the add-item flow. */
export function RuleQuickPick({ rule, onChange }: { rule: ItemRule; onChange: (r: ItemRule) => void }) {
  const mode: RuleMode | null = rule.always ? 'always' : rule.events ? 'events' : rule.weather ? 'weather' : null
  const pick = (m: RuleMode) => {
    if (m === 'always') onChange({ ...rule, always: true, events: false, weather: false })
    if (m === 'events') onChange({ ...rule, always: false, events: true, weather: false })
    if (m === 'weather') onChange({ ...rule, always: false, events: false, weather: true, weatherKinds: rule.weatherKinds.length ? rule.weatherKinds : ['rain'] })
  }
  return (
    <>
      <div className="seg-pills">
        <button type="button" className={mode === 'always' ? 'on' : ''} onClick={() => pick('always')}>Always</button>
        <button type="button" className={mode === 'events' ? 'on' : ''} onClick={() => pick('events')}>For certain schedules</button>
        <button type="button" className={mode === 'weather' ? 'on' : ''} onClick={() => pick('weather')}>For certain weather</button>
      </div>
      {mode === 'events' && <div className="card pad-sm"><EventPicker rule={rule} onChange={onChange} /></div>}
      {mode === 'weather' && <div className="card pad-sm"><WeatherPicker rule={rule} onChange={onChange} /></div>}
    </>
  )
}
