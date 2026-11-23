import { useState } from 'react'
import { CloudRain, Snowflake, Sun } from 'lucide-react'
import type { ItemRule, WeatherKind } from '../store'
import { Chip, Toggle } from './ui'

const weatherOpts: { kind: WeatherKind; label: string; Icon: typeof Sun }[] = [
  { kind: 'rain', label: 'Rain', Icon: CloudRain },
  { kind: 'cold', label: 'Cold', Icon: Snowflake },
  { kind: 'sun', label: 'Strong sun', Icon: Sun },
]

const keywordSuggestions = ['Lecture', 'Exam', 'Study', 'Meeting', 'Gym', 'Lab']

/** Full rule editor with toggles (used on item details and the item form). */
export function RuleEditor({ rule, onChange }: { rule: ItemRule; onChange: (r: ItemRule) => void }) {
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)

  const addKeyword = (k: string) => {
    const v = k.trim()
    if (!v || rule.keywords.some((x) => x.toLowerCase() === v.toLowerCase())) return
    onChange({ ...rule, events: true, keywords: [...rule.keywords, v] })
  }

  return (
    <div className="rules">
      <div className="rule">
        <div className="rule-copy">
          <b>Always</b>
          <span>On the list every day</span>
        </div>
        <Toggle label="Always" checked={rule.always} onChange={(v) => onChange({ ...rule, always: v })} />
      </div>

      <div className="rule">
        <div className="rule-copy">
          <b>For certain events</b>
          <span>When an event title contains…</span>
        </div>
        <Toggle label="For certain events" checked={rule.events} onChange={(v) => onChange({ ...rule, events: v })} />
      </div>
      {rule.events && (
        <div className="rule-extra">
          <div className="chips">
            {rule.keywords.map((k) => (
              <Chip key={k} active onRemove={() => onChange({ ...rule, keywords: rule.keywords.filter((x) => x !== k) })}>{k}</Chip>
            ))}
            {adding ? (
              <form className="kw-form" onSubmit={(e) => { e.preventDefault(); addKeyword(draft); setDraft(''); setAdding(false) }}>
                <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Keyword"
                  onBlur={() => { addKeyword(draft); setDraft(''); setAdding(false) }} aria-label="New keyword" />
              </form>
            ) : (
              <Chip dashed onClick={() => setAdding(true)}>+ Keyword</Chip>
            )}
          </div>
          {keywordSuggestions.filter((s) => !rule.keywords.includes(s)).length > 0 && (
            <div className="chips subtle">
              {keywordSuggestions.filter((s) => !rule.keywords.includes(s)).slice(0, 4).map((s) => (
                <Chip key={s} onClick={() => addKeyword(s)}>{s}</Chip>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rule">
        <div className="rule-copy">
          <b>For certain weather</b>
          <span>e.g. rain, cold, strong sun</span>
        </div>
        <Toggle label="For certain weather" checked={rule.weather}
          onChange={(v) => onChange({ ...rule, weather: v, weatherKinds: v && !rule.weatherKinds.length ? ['rain'] : rule.weatherKinds })} />
      </div>
      {rule.weather && (
        <div className="rule-extra">
          <div className="chips">
            {weatherOpts.map(({ kind, label, Icon }) => {
              const on = rule.weatherKinds.includes(kind)
              return (
                <Chip key={kind} active={on} onClick={() => onChange({
                  ...rule,
                  weatherKinds: on ? rule.weatherKinds.filter((k) => k !== kind) : [...rule.weatherKinds, kind],
                })}>
                  <Icon size={14} /> {label}
                </Chip>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export type RuleMode = 'always' | 'events' | 'weather'

/** Compact "When do you need it?" picker for the add-item flow (matches the setup design). */
export function RuleQuickPick({ rule, onChange }: { rule: ItemRule; onChange: (r: ItemRule) => void }) {
  const mode: RuleMode | null = rule.always ? 'always' : rule.events ? 'events' : rule.weather ? 'weather' : null
  const pick = (m: RuleMode) => {
    if (m === 'always') onChange({ ...rule, always: true, events: false, weather: false })
    if (m === 'events') onChange({ ...rule, always: false, events: true, weather: false, keywords: rule.keywords.length ? rule.keywords : ['Lecture'] })
    if (m === 'weather') onChange({ ...rule, always: false, events: false, weather: true, weatherKinds: rule.weatherKinds.length ? rule.weatherKinds : ['rain'] })
  }
  return (
    <>
      <div className="seg-pills">
        <button type="button" className={mode === 'always' ? 'on' : ''} onClick={() => pick('always')}>Always</button>
        <button type="button" className={mode === 'events' ? 'on' : ''} onClick={() => pick('events')}>For certain events</button>
        <button type="button" className={mode === 'weather' ? 'on' : ''} onClick={() => pick('weather')}>For certain weather</button>
      </div>
      {mode && mode !== 'always' && (
        <div className="card pad-sm">
          <RuleEditorPart rule={rule} onChange={onChange} part={mode} />
        </div>
      )}
    </>
  )
}

function RuleEditorPart({ rule, onChange, part }: { rule: ItemRule; onChange: (r: ItemRule) => void; part: 'events' | 'weather' }) {
  const [draft, setDraft] = useState('')
  if (part === 'weather') {
    return (
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
    )
  }
  const add = () => {
    const v = draft.trim()
    if (v && !rule.keywords.includes(v)) onChange({ ...rule, keywords: [...rule.keywords, v] })
    setDraft('')
  }
  return (
    <>
      <p className="hint">Add it when an event title contains:</p>
      <div className="chips">
        {rule.keywords.map((k) => (
          <Chip key={k} active onRemove={() => onChange({ ...rule, keywords: rule.keywords.filter((x) => x !== k) })}>{k}</Chip>
        ))}
        <form className="kw-form" onSubmit={(e) => { e.preventDefault(); add() }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={add} placeholder="+ Keyword" aria-label="New keyword" />
        </form>
      </div>
    </>
  )
}
