import { useEffect } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, MapPin, SlidersHorizontal, Sun, Tag, X } from 'lucide-react'
import { useStore } from '../store'
import type { ItemStatus } from '../store'
import { LogoMark } from './icons'

/* Layout ------------------------------------------------------------ */

export function Screen({ children, tabs = false, className = '' }: { children: ReactNode; tabs?: boolean; className?: string }) {
  useEffect(() => {
    document.querySelector('.app-scroll')?.scrollTo({ top: 0 })
  }, [])
  return (
    <div className={`screen ${tabs ? 'with-tabs' : ''} ${className}`}>
      <div className="app-scroll">{children}</div>
      {tabs && <TabBar />}
    </div>
  )
}

export function TabBar() {
  const tabs = [
    { to: '/today', label: 'Today', Icon: Sun },
    { to: '/items', label: 'Items', Icon: Tag },
    { to: '/find', label: 'Find', Icon: MapPin },
    { to: '/settings', label: 'Settings', Icon: SlidersHorizontal },
  ]
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          <Icon size={22} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function BackButton({ to, label }: { to?: string; label?: string }) {
  const nav = useNavigate()
  const go = () => (to ? nav(to) : nav(-1))
  return (
    <button type="button" className={`back ${label ? 'with-label' : ''}`} onClick={go} aria-label={label ? undefined : 'Back'}>
      <ChevronLeft size={label ? 20 : 24} strokeWidth={2} />
      {label && <span>{label}</span>}
    </button>
  )
}

export function SetupProgress({ step, back }: { step: number; back?: string }) {
  return (
    <div className="setup-top">
      {back ? <BackButton to={back} /> : null}
      <div className="setup-progress" aria-label={`Setup step ${step} of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>
    </div>
  )
}

export function PageHead({ eyebrow, title, sub, back, backLabel, action }: {
  eyebrow?: string; title: ReactNode; sub?: ReactNode; back?: string | true; backLabel?: string; action?: ReactNode
}) {
  return (
    <header className="page-head">
      {back && <BackButton to={back === true ? undefined : back} label={backLabel} />}
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <div className="title-row">
        <h1>{title}</h1>
        {action}
      </div>
      {sub && <p className="lead">{sub}</p>}
    </header>
  )
}

export function Card({ children, className = '', tone, onClick }: {
  children: ReactNode; className?: string; tone?: 'blue' | 'green' | 'red' | 'soft' | 'warn'; onClick?: () => void
}) {
  const cls = `card ${tone ? 'tone-' + tone : ''} ${onClick ? 'pressable' : ''} ${className}`
  if (onClick) {
    return <button type="button" className={cls} onClick={onClick}>{children}</button>
  }
  return <div className={cls}>{children}</div>
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/* Rows -------------------------------------------------------------- */

export function Row({ leading, title, sub, trailing, onClick, to, chevron, className = '' }: {
  leading?: ReactNode; title: ReactNode; sub?: ReactNode; trailing?: ReactNode
  onClick?: () => void; to?: string; chevron?: boolean; className?: string
}) {
  const inner = (
    <>
      {leading}
      <span className="row-copy">
        <span className="row-title">{title}</span>
        {sub && <span className="row-sub">{sub}</span>}
      </span>
      {trailing && <span className="row-trailing">{trailing}</span>}
      {chevron && <ChevronRight size={18} className="chev" />}
    </>
  )
  if (to) return <Link to={to} className={`row pressable ${className}`}>{inner}</Link>
  if (onClick) {
    return (
      <div role="button" tabIndex={0} className={`row pressable ${className}`} onClick={onClick}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onClick() } }}>
        {inner}
      </div>
    )
  }
  return <div className={`row ${className}`}>{inner}</div>
}

/** Grouped settings list (iOS-like). */
export function Group({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="group">
      {label && <p className="group-label">{label}</p>}
      <div className="group-body">{children}</div>
    </div>
  )
}

export function GroupRow({ title, sub, value, onClick, to, tone, trailing }: {
  title: ReactNode; sub?: ReactNode; value?: ReactNode; onClick?: () => void; to?: string; tone?: 'link' | 'danger'; trailing?: ReactNode
}) {
  const content = (
    <>
      <span className="row-copy">
        <span className={`row-title ${tone ? 'text-' + tone : ''}`}>{title}</span>
        {sub && <span className="row-sub">{sub}</span>}
      </span>
      {value !== undefined && <span className="g-value">{value}</span>}
      {trailing}
      {(to || onClick) && !tone && !trailing && <ChevronRight size={18} className="chev" />}
    </>
  )
  if (to) return <Link to={to} className="g-row pressable">{content}</Link>
  if (onClick) return <button type="button" className="g-row pressable" onClick={onClick}>{content}</button>
  return <div className="g-row">{content}</div>
}

/* Controls ---------------------------------------------------------- */

type BtnVariant = 'dark' | 'light' | 'blue' | 'outline' | 'danger' | 'ghost'

export function Button({ variant = 'dark', block = true, small = false, className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; block?: boolean; small?: boolean }) {
  return <button type="button" className={`btn btn-${variant} ${block ? 'block' : ''} ${small ? 'small' : ''} ${className}`} {...rest} />
}

export function LinkButton({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
  return <button type="button" className={`text-link ${className}`} onClick={onClick}>{children}</button>
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label}
      className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  )
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label}
      className={`checkbox ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      {checked && <Check size={15} strokeWidth={3} />}
    </button>
  )
}

export function Chip({ children, active, onClick, onRemove, dashed }: {
  children: ReactNode; active?: boolean; onClick?: () => void; onRemove?: () => void; dashed?: boolean
}) {
  return (
    <span className={`chip ${active ? 'active' : ''} ${dashed ? 'dashed' : ''} ${onClick ? 'pressable' : ''}`}>
      {onClick ? <button type="button" onClick={onClick}>{children}</button> : <span>{children}</span>}
      {onRemove && (
        <button type="button" className="chip-x" aria-label="Remove" onClick={onRemove}><X size={13} /></button>
      )}
    </span>
  )
}

const statusTone: Record<ItemStatus, string> = { inBag: 'green', withYou: 'blue', leftBehind: 'orange', lost: 'dark' }
const statusText: Record<ItemStatus, string> = { inBag: 'In bag', withYou: 'With you', leftBehind: 'Left behind', lost: 'Lost' }

export function StatusBadge({ status }: { status: ItemStatus }) {
  return <Badge tone={statusTone[status]}>{statusText[status]}</Badge>
}

export function Badge({ children, tone = 'gray', dot }: { children: ReactNode; tone?: string; dot?: boolean }) {
  return <span className={`badge badge-${tone}`}>{dot && <i />}{children}</span>
}

export function Meter({ value, tone }: { value: number; tone?: 'green' | 'red' | 'blue' }) {
  const t = tone ?? (value < 20 ? 'red' : 'green')
  return (
    <span className="meter" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span className={`meter-fill fill-${t}`} style={{ width: `${value}%` }} />
    </span>
  )
}

export function Notice({ children, tone = 'warn' }: { children: ReactNode; tone?: 'warn' | 'info' }) {
  return <p className={`notice notice-${tone}`}>{children}</p>
}

/* Sheet (bottom modal) ------------------------------------------------ */

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <span className="sheet-grab" />
        {children}
      </div>
    </div>
  )
}

/* Toasts ------------------------------------------------------------ */

export function Toasts() {
  const { toasts, dismissToast } = useStore()
  const nav = useNavigate()
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) =>
        t.push ? (
          <button key={t.id} type="button" className="push" onClick={() => { dismissToast(t.id); if (t.to) nav(t.to) }}>
            <LogoMark size={36} />
            <span className="push-copy">
              <span className="push-top"><b>{t.title}</b><small>now</small></span>
              {t.body && <span className="push-body">{t.body}</span>}
            </span>
          </button>
        ) : (
          <div key={t.id} className={`toast toast-${t.tone ?? 'default'}`} onClick={() => dismissToast(t.id)}>
            {t.tone === 'success' && <Check size={16} strokeWidth={3} />}
            <span>
              <b>{t.title}</b>
              {t.body && <span className="toast-body">{t.body}</span>}
            </span>
          </div>
        ),
      )}
    </div>
  )
}

/* Rings (pairing / ringing animation) ------------------------------- */

export function PulseRings({ tone = 'blue', active = true, children }: { tone?: 'blue' | 'green'; active?: boolean; children?: ReactNode }) {
  return (
    <div className={`pulse ${tone} ${active ? 'active' : ''}`}>
      <span className="ring r3" />
      <span className="ring r2" />
      <span className="ring r1" />
      <span className="pulse-core">{children ?? 't'}</span>
    </div>
  )
}
