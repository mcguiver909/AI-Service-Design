import { useEffect, useState } from 'react'
import { Check, Radar } from 'lucide-react'
import type { ColorKey, IconKey, Item, ItemRule } from '../store'
import { colorOrder, colors, iconNames, iconOrder, itemIcons } from './icons'
import { RuleQuickPick } from './RuleEditor'
import { Button } from './ui'

export interface ItemDraft {
  name: string
  icon: IconKey
  color: ColorKey
  rule: ItemRule
  stickerId: string
}

/** Simulated sticker detection card ("Sticker found"). */
export function StickerCard({ stickerId, detected }: { stickerId: string; detected: boolean }) {
  return (
    <div className={`card sticker-card ${detected ? 'found' : 'scanning'}`}>
      <span className="sticker-ico">{detected ? <Check size={20} strokeWidth={2.6} /> : <Radar size={20} />}</span>
      <span className="row-copy">
        <span className="row-title">{detected ? 'Sticker found' : 'Looking for a sticker…'}</span>
        <span className="row-sub">{detected ? `ID ${stickerId} · battery full` : 'Hold your phone close to the sticker'}</span>
      </span>
      {detected && <Check size={20} className="text-green" strokeWidth={2.6} />}
    </div>
  )
}

export function useStickerScan(delay = 1300) {
  const [detected, setDetected] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setDetected(true), delay)
    return () => window.clearTimeout(t)
  }, [delay])
  return detected
}

const nameHints: [RegExp, IconKey][] = [
  [/laptop|macbook|notebook|gram|노트북/i, 'laptop'],
  [/ipad|tablet|galaxy tab|태블릿|아이패드/i, 'tablet'],
  [/pencil|pen|필통/i, 'pencil'],
  [/umbrella|우산/i, 'umbrella'],
  [/earbud|airpod|buds|이어폰|에어팟/i, 'earbuds'],
  [/key|열쇠|키/i, 'key'],
  [/bottle|tumbler|water|텀블러|물병/i, 'bottle'],
  [/wallet|card|지갑|카드/i, 'wallet'],
  [/glass|안경/i, 'glasses'],
  [/book|textbook|책|교재/i, 'book'],
  [/headphone|헤드폰/i, 'headphones'],
  [/camera|카메라/i, 'camera'],
]

export function ItemForm({ initial, submitLabel, onSubmit, showRule = true, detected = true }: {
  initial: ItemDraft
  submitLabel: string
  onSubmit: (d: ItemDraft) => void
  showRule?: boolean
  detected?: boolean
}) {
  const [d, setD] = useState<ItemDraft>(initial)
  const [touched, setTouched] = useState(false)
  const [iconTouched, setIconTouched] = useState(false)
  const nameOk = d.name.trim().length > 0

  return (
    <form className="item-form" onSubmit={(e) => { e.preventDefault(); setTouched(true); if (nameOk && detected) onSubmit({ ...d, name: d.name.trim() }) }}>
      <label className="field">
        <span className="field-label">Name</span>
        <input value={d.name} maxLength={28} placeholder="e.g. Water bottle"
          onChange={(e) => {
            const name = e.target.value
            const hint = nameHints.find(([re]) => re.test(name))
            setD({ ...d, name, icon: hint && !iconTouched ? hint[1] : d.icon })
          }} aria-invalid={touched && !nameOk} />
        {touched && !nameOk && <span className="field-error">Give your item a name.</span>}
      </label>

      <fieldset className="field">
        <legend className="field-label">Icon</legend>
        <div className="icon-grid">
          {iconOrder.map((k) => {
            const Icon = itemIcons[k]
            const on = d.icon === k
            return (
              <button key={k} type="button" aria-label={iconNames[k]} aria-pressed={on}
                className={`icon-opt ${on ? 'on' : ''}`}
                style={on ? { background: colors[d.color].bg, color: colors[d.color].fg } : undefined}
                onClick={() => { setIconTouched(true); setD({ ...d, icon: k, name: d.name || iconNames[k] }) }}>
                <Icon size={22} strokeWidth={1.8} />
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="field-label">Colour</legend>
        <div className="color-row">
          {colorOrder.map((c) => (
            <button key={c} type="button" aria-label={colors[c].name} aria-pressed={d.color === c}
              className={`color-opt ${d.color === c ? 'on' : ''}`} style={{ background: colors[c].bg }}
              onClick={() => setD({ ...d, color: c })} />
          ))}
        </div>
      </fieldset>

      {showRule && (
        <fieldset className="field">
          <legend className="field-label">When do you need it?</legend>
          <RuleQuickPick rule={d.rule} onChange={(rule) => setD({ ...d, rule })} />
        </fieldset>
      )}

      <div className="form-actions">
        <Button type="submit" disabled={!detected}>{submitLabel}</Button>
      </div>
    </form>
  )
}

export function draftFromItem(i: Item): ItemDraft {
  return { name: i.name, icon: i.icon, color: i.color, rule: i.rule, stickerId: i.stickerId }
}
