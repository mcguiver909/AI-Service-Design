import { useNavigate } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import { useStore } from '../store'
import { pct, useBrief } from '../ai'
import type { Suggestion } from '../ai'
import { ItemTile } from './icons'
import { Button } from './ui'

/** Today's AI briefing: what to add, and why. */
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
      toast({ title: `Tagly learned: ${item.name} for ${s.conceptLabel ?? s.keyword}`, body: `From now on it’s added automatically when an event mentions “${s.keyword}”.`, tone: 'success' })
    } else {
      toast({ title: `${s.name} added`, body: reason, tone: 'success' })
    }
  }

  return (
    <div className="card ai-card">
      <div className="ai-head">
        <span className="ai-mark"><Sparkles size={16} /></span>
        <b>Tagly AI</b>
        <span className={`ai-engine ${thinking ? 'thinking' : brief.engine}`}>
          {thinking ? 'Thinking…' : brief.engine === 'claude' ? 'Claude' : 'On-device'}
        </span>
      </div>
      <p className="ai-brief">{brief.text}</p>
      {brief.suggestions.length > 0 && (
        <div className="ai-list">
          {brief.suggestions.map((s) => (
            <div key={s.key} className="ai-sugg">
              <ItemTile icon={s.icon} color={s.itemId ? state.items.find((i) => i.id === s.itemId)!.color : 'gray'} size={38} />
              <span className="row-copy">
                <span className="row-title">{s.name}{!s.itemId && <em className="ai-new">New item</em>}</span>
                <span className="row-sub">{s.reasons.join(' · ')}</span>
                <span className="ai-conf"><span className="track"><i style={{ width: pct(s.confidence) }} /></span><small>{pct(s.confidence)} sure</small></span>
              </span>
              <Button variant="blue" small block={false} onClick={() => accept(s)}>{s.itemId ? 'Add' : 'Tag it'}</Button>
              <button type="button" className="icon-btn" aria-label={`Not today: ${s.name}`}
                onClick={() => { dispatch({ type: 'aiDismiss', key: s.key, keys: s.keys }); toast({ title: 'Got it', body: `Tagly will suggest ${s.name.toLowerCase()} less for this.` }) }}>
                <X size={17} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="text-link small ai-why" onClick={() => nav('/settings/ai')}>How Tagly AI decides →</button>
    </div>
  )
}
