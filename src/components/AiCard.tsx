import { Plus, Sparkles, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useBrief } from '../ai'
import type { Suggestion } from '../ai'
import { ItemTile } from './icons'

/** Tagly AI: things your schedule and the forecast call for that aren't on today's list yet. */
export function AiCard() {
  const { state, dispatch, toast } = useStore()
  const nav = useNavigate()
  const { brief, thinking } = useBrief(state)
  if (!state.ai.on) return null

  const accept = (s: Suggestion) => {
    const reason = s.reasons[0]
    if (!s.itemId) {
      const q = new URLSearchParams({ name: s.name, icon: s.icon, ai: reason, keys: s.keys.join(',') })
      nav(`/items/new?${q}`)
      return
    }
    dispatch({ type: 'aiAccept', itemId: s.itemId, reason, keys: s.keys })
    // Learning: the second time you accept the same idea, it becomes a rule.
    const item = state.items.find((i) => i.id === s.itemId)
    const learned = s.keyword && item && s.keys.some((k) => !k.startsWith('rain') && (state.aiFeedback[k]?.yes ?? 0) + 1 >= 2)
    if (learned && item && s.keyword && !item.rule.keywords.some((k) => k.toLowerCase() === s.keyword!.toLowerCase())) {
      dispatch({ type: 'updateItem', id: item.id, patch: { rule: { ...item.rule, events: true, keywords: [...item.rule.keywords, s.keyword] } } })
      toast({ title: `Tagly learned: ${item.name} for ${s.conceptLabel ?? s.keyword}`, body: `It’s added automatically when an event mentions “${s.keyword}”.`, tone: 'success' })
    } else {
      toast({ title: `${s.name} added to today`, body: reason, tone: 'success' })
    }
  }

  return (
    <section className="ai-card">
      <div className="ai-head">
        <span className="ai-mark"><Sparkles size={15} /></span>
        <b>Tagly AI suggests</b>
        <span className={`ai-engine ${thinking ? 'thinking' : brief.engine}`}>{thinking ? 'Thinking…' : brief.engine === 'claude' ? 'Claude' : 'On-device'}</span>
      </div>
      {brief.suggestions.length === 0 ? (
        <p className="ai-none">Nothing missing. Your list covers today’s schedule and weather.</p>
      ) : (
        <>
          <p className="ai-sub">Not on your list, but today might need:</p>
          <div className="ai-list">
            {brief.suggestions.map((s) => (
              <div key={s.key} className="ai-sugg">
                <ItemTile icon={s.icon} color={s.itemId ? state.items.find((i) => i.id === s.itemId)!.color : 'gray'} size={34} />
                <span className="row-copy">
                  <span className="row-title">{s.name}{!s.itemId && <em className="ai-new">New</em>}</span>
                  <span className="row-sub">{s.reasons[0]}</span>
                </span>
                <button type="button" className="ai-add" onClick={() => accept(s)} aria-label={`Add ${s.name}`}><Plus size={16} strokeWidth={2.4} /> Add</button>
                <button type="button" className="ai-x" aria-label={`Not today: ${s.name}`}
                  onClick={() => { dispatch({ type: 'aiDismiss', key: s.key, keys: s.keys }); toast({ title: 'Got it', body: `Tagly will suggest ${s.name.toLowerCase()} less for this.` }) }}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
