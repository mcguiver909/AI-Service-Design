import { useId } from 'react'
import type { ReactNode } from 'react'
import type { ArtKey, CaseChoice, HubDesign, RingFinish, StickerDesign } from './shopStore'

/* Helpers ------------------------------------------------------------------- */

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a), [r2, g2, b2] = hexToRgb(b)
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`
}
function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000
}
function readableOn(hex: string) { return luminance(hex) > 160 ? '#12161C' : '#FFFFFF' }
function uidOf(raw: string) { return raw.replace(/[^a-zA-Z0-9]/g, '') }

function starPoints(cx: number, cy: number, R: number, r: number, n = 5, rot = -90) {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const rad = ((rot + (i * 180) / n) * Math.PI) / 180
    const rr = i % 2 === 0 ? R : r
    pts.push(`${(cx + Math.cos(rad) * rr).toFixed(1)},${(cy + Math.sin(rad) * rr).toFixed(1)}`)
  }
  return pts.join(' ')
}

const HEART = 'M100 162 C 42 124 30 92 46 66 C 62 42 92 46 100 70 C 108 46 138 42 154 66 C 170 92 158 124 100 162 Z'

/** Crescent: outer circle minus an offset circle, computed once. */
const CRESCENT = (() => {
  const [x1, y1, r1] = [94, 104, 60]
  const [x2, y2, r2] = [122, 86, 50]
  const d = Math.hypot(x2 - x1, y2 - y1)
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  const h = Math.sqrt(r1 * r1 - a * a)
  const xm = x1 + (a * (x2 - x1)) / d, ym = y1 + (a * (y2 - y1)) / d
  const px = xm + (h * (y2 - y1)) / d, py = ym - (h * (x2 - x1)) / d
  const qx = xm - (h * (y2 - y1)) / d, qy = ym + (h * (x2 - x1)) / d
  return `M ${px.toFixed(1)} ${py.toFixed(1)} A ${r1} ${r1} 0 1 0 ${qx.toFixed(1)} ${qy.toFixed(1)} A ${r2} ${r2} 0 0 1 ${px.toFixed(1)} ${py.toFixed(1)} Z`
})()

function halfRing(cx: number, cy: number, R: number, r: number) {
  return `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx - r} ${cy} Z`
}

/* Die-cut art --------------------------------------------------------------- */

/**
 * Each art returns its silhouette (drawn first in white with a thick stroke = the die-cut border)
 * and its coloured body (drawn on top).
 */
function artParts(a: ArtKey, c: string, x: string): { sil: ReactNode; body: ReactNode } {
  const hl = <circle cx="0" cy="0" r="0" />
  switch (a) {
    case 'drizzle': {
      const cloud = (<><circle cx="76" cy="94" r="30" /><circle cx="110" cy="78" r="38" /><circle cx="144" cy="98" r="27" /><rect x="50" y="94" width="122" height="34" rx="17" /></>)
      const drops = [78, 104, 130].map((dx) => <rect key={dx} x="-6" y="-14" width="12" height="28" rx="6" transform={`translate(${dx} 156) rotate(18)`} />)
      return {
        sil: <>{cloud}{drops}</>,
        body: <><g fill={c}>{cloud}</g><g fill={x}>{drops}</g><circle cx="98" cy="66" r="9" fill="#fff" opacity="0.55" /></>,
      }
    }
    case 'sun': {
      const rays = Array.from({ length: 8 }, (_, i) => <rect key={i} x="-8" y="-82" width="16" height="28" rx="8" transform={`translate(100 100) rotate(${i * 45})`} />)
      return {
        sil: <>{rays}<circle cx="100" cy="100" r="44" /></>,
        body: <><g fill={x}>{rays}</g><circle cx="100" cy="100" r="44" fill={c} /><circle cx="84" cy="84" r="9" fill="#fff" opacity="0.55" /></>,
      }
    }
    case 'rainbow': {
      const b1 = halfRing(100, 132, 82, 64), b2 = halfRing(100, 132, 64, 46), b3 = halfRing(100, 132, 46, 30)
      return {
        sil: <><path d={b1} /><circle cx="34" cy="140" r="16" /><circle cx="166" cy="140" r="16" /></>,
        body: <><path d={b1} fill={c} /><path d={b2} fill={x} /><path d={b3} fill="#9CC7F7" />
          <g fill="#fff"><circle cx="30" cy="142" r="13" /><circle cx="44" cy="136" r="12" /><circle cx="170" cy="142" r="13" /><circle cx="156" cy="136" r="12" /></g></>,
      }
    }
    case 'comet': {
      const pts = starPoints(100, 106, 76, 34)
      return {
        sil: <polygon points={pts} strokeLinejoin="round" />,
        body: <><polygon points={pts} fill={c} stroke={c} strokeWidth="6" strokeLinejoin="round" /><circle cx="88" cy="94" r="8" fill={x} opacity="0.9" /></>,
      }
    }
    case 'heart':
      return {
        sil: <path d={HEART} />,
        body: <><path d={HEART} fill={c} /><ellipse cx="70" cy="80" rx="12" ry="8" transform="rotate(-35 70 80)" fill={x} opacity="0.85" /></>,
      }
    case 'smile':
      return {
        sil: <circle cx="100" cy="100" r="66" />,
        body: <><circle cx="100" cy="100" r="66" fill={c} />
          <ellipse cx="78" cy="88" rx="7" ry="11" fill={x} /><ellipse cx="122" cy="88" rx="7" ry="11" fill={x} />
          <path d="M70 112 Q100 144 130 112" fill="none" stroke={x} strokeWidth="9" strokeLinecap="round" />
          <circle cx="64" cy="114" r="9" fill="#F26A3D" opacity="0.3" /><circle cx="136" cy="114" r="9" fill="#F26A3D" opacity="0.3" /></>,
      }
    case 'orbit': {
      const ring = <ellipse cx="0" cy="0" rx="84" ry="22" />
      return {
        sil: <><circle cx="100" cy="100" r="46" /><g transform="translate(100 100) rotate(-20)"><ellipse cx="0" cy="0" rx="84" ry="22" fill="none" strokeWidth="26" /></g></>,
        body: <>
          <g transform="translate(100 100) rotate(-20)" fill="none" stroke={x} strokeWidth="8">{ring}</g>
          <circle cx="100" cy="100" r="46" fill={c} />
          <circle cx="84" cy="82" r="9" fill="#fff" opacity="0.5" />
          <path d="M -84 0 A 84 22 0 0 0 84 0" transform="translate(100 100) rotate(-20)" fill="none" stroke={x} strokeWidth="8" strokeLinecap="round" />
        </>,
      }
    }
    case 'moon': {
      const st = starPoints(150, 62, 15, 6.5)
      return {
        sil: <><path d={CRESCENT} /><polygon points={st} /></>,
        body: <><path d={CRESCENT} fill={c} /><polygon points={st} fill={x} stroke={x} strokeWidth="2" strokeLinejoin="round" /><circle cx="62" cy="112" r="7" fill="#fff" opacity="0.5" /></>,
      }
    }
    case 'bloom': {
      const petals = Array.from({ length: 5 }, (_, i) => {
        const r = ((i * 72 - 90) * Math.PI) / 180
        return <circle key={i} cx={100 + Math.cos(r) * 40} cy={100 + Math.sin(r) * 40} r="33" />
      })
      return {
        sil: <>{petals}</>,
        body: <><g fill={c}>{petals}</g><circle cx="100" cy="100" r="25" fill={x} /><circle cx="92" cy="92" r="6" fill="#fff" opacity="0.6" /></>,
      }
    }
    case 'leaf': {
      const d = 'M100 30 C 156 58 164 126 100 172 C 36 126 44 58 100 30 Z'
      return {
        sil: <path d={d} transform="rotate(-18 100 100)" />,
        body: <g transform="rotate(-18 100 100)"><path d={d} fill={c} />
          <path d="M100 48 L100 160 M100 84 L76 68 M100 84 L124 68 M100 114 L72 96 M100 114 L128 96" stroke={x} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9" /></g>,
      }
    }
    case 'cherry': {
      const stems = 'M70 112 Q84 64 112 42 M132 118 Q122 72 112 42'
      return {
        sil: <><circle cx="70" cy="136" r="30" /><circle cx="132" cy="142" r="30" /><path d={stems} fill="none" strokeWidth="24" /><ellipse cx="132" cy="44" rx="24" ry="12" transform="rotate(-25 132 44)" /></>,
        body: <>
          <path d={stems} fill="none" stroke="#6B4423" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="132" cy="44" rx="24" ry="12" transform="rotate(-25 132 44)" fill={x} />
          <circle cx="70" cy="136" r="30" fill={c} /><circle cx="132" cy="142" r="30" fill={c} />
          <circle cx="60" cy="124" r="7" fill="#fff" opacity="0.55" /><circle cx="122" cy="130" r="7" fill="#fff" opacity="0.55" />
        </>,
      }
    }
    case 'bolt': {
      const d = 'M120 22 L54 112 L98 112 L80 178 L150 84 L106 84 L128 22 Z'
      return {
        sil: <path d={d} strokeLinejoin="round" />,
        body: <><path d={d} fill={c} stroke={c} strokeWidth="5" strokeLinejoin="round" /><path d="M112 36 L74 96" stroke={x} strokeWidth="6" strokeLinecap="round" opacity="0.85" /></>,
      }
    }
    case 'note': {
      const parts = (<><ellipse cx="70" cy="146" rx="24" ry="17" transform="rotate(-20 70 146)" /><ellipse cx="140" cy="132" rx="24" ry="17" transform="rotate(-20 140 132)" />
        <rect x="84" y="54" width="11" height="92" rx="5" /><rect x="154" y="40" width="11" height="92" rx="5" /></>)
      const beam = <polygon points="84,54 165,40 165,64 84,78" />
      return {
        sil: <>{parts}{beam}</>,
        body: <><g fill={c}>{parts}</g><g fill={x}>{beam}</g><circle cx="62" cy="140" r="5" fill="#fff" opacity="0.55" /></>,
      }
    }
  }
  return { sil: hl, body: hl }
}

function ArtSkin({ d }: { d: StickerDesign }) {
  const uid = uidOf(useId())
  const { sil, body } = artParts(d.art, d.color, d.accent)
  return (
    <svg viewBox="0 0 200 200" className="sticker-art" role="img" aria-label="Sticker skin preview">
      <defs>
        <filter id={`ds${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#12161C" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter={`url(#ds${uid})`} fill="#fff" stroke="#fff" strokeWidth="16" strokeLinejoin="round" strokeLinecap="round">{sil}</g>
      {body}
    </svg>
  )
}

/* Clear sticker (printed border + center dot) ------------------------------ */

const STAR_PATH = 'M0 -13 L3.8 -4.2 L13 -4 L5.8 2 L8.2 11.5 L0 6.2 L-8.2 11.5 L-5.8 2 L-13 -4 L-3.8 -4.2 Z'
const SMALL_HEART = 'M0 6 C-6 0 -12 -2 -12 -8 C-12 -13 -6 -15 0 -9 C6 -15 12 -13 12 -8 C12 -2 6 0 0 6 Z'
function rand(seed: number) { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x) }

function ClearSkin({ d, showAntenna = true }: { d: StickerDesign; showAntenna?: boolean }) {
  const uid = uidOf(useId())
  const circle = d.shape === 'circle'
  const outer = circle ? <circle cx="100" cy="100" r="84" /> : <rect x="16" y="16" width="168" height="168" rx="30" />
  const inner = circle ? <circle cx="100" cy="100" r="70" /> : <rect x="30" y="30" width="140" height="140" rx="20" />
  const fc = d.frameColor
  const confetti = Array.from({ length: 46 }, (_, i) => {
    const a = rand(i + 1) * Math.PI * 2, t = rand(i + 7)
    let x: number, y: number
    if (circle) { const r = 72 + rand(i + 3) * 11; x = 100 + Math.cos(a) * r; y = 100 + Math.sin(a) * r }
    else {
      const side = i % 4, p = 22 + t * 156, w = 18 + rand(i + 5) * 10
      x = side === 0 ? p : side === 1 ? 182 - (w - 18) : side === 2 ? p : 18 + (w - 18)
      y = side === 0 ? 18 + (w - 18) : side === 1 ? p : side === 2 ? 182 - (w - 18) : p
    }
    const cs = [fc, '#F26A3D', '#22A06B', '#E8B100', '#7357E0']
    return { x, y, r: 2 + rand(i + 9) * 2.6, c: cs[i % cs.length], rot: rand(i + 11) * 180, k: i % 3 }
  })
  return (
    <svg viewBox="0 0 200 200" className="sticker-art" role="img" aria-label="Clear sticker preview">
      <defs>
        <linearGradient id={`gl${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" /><stop offset="0.35" stopColor="#fff" stopOpacity="0.08" /><stop offset="1" stopColor="#fff" stopOpacity="0.02" />
        </linearGradient>
        <clipPath id={`clip${uid}`}>{outer}</clipPath>
        <mask id={`band${uid}`}><g fill="#fff">{outer}</g><g fill="#000">{inner}</g></mask>
        <pattern id={`st${uid}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="10" fill={fc} /></pattern>
        <pattern id={`ck${uid}`} width="12" height="12" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill={fc} /><rect x="6" y="6" width="6" height="6" fill={fc} /></pattern>
      </defs>
      <g clipPath={`url(#clip${uid})`}>
        <g fill="rgba(255,255,255,0.14)">{outer}</g>
        {showAntenna && <path d="M100 100 h10 v10 h-20 v-20 h30 v30 h-40 v-40 h50 v50 h-60 v-60 h70 v70 h-80 v-80 h90" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />}
        <g mask={`url(#band${uid})`}>
          {d.frame === 'stripes' && <rect width="200" height="200" fill={`url(#st${uid})`} />}
          {d.frame === 'checker' && <rect width="200" height="200" fill={`url(#ck${uid})`} />}
          {d.frame === 'confetti' && confetti.map((c, i) => (c.k === 0
            ? <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={c.c} />
            : <rect key={i} x={c.x - c.r} y={c.y - c.r / 2} width={c.r * 2} height={c.r} fill={c.c} transform={`rotate(${c.rot} ${c.x} ${c.y})`} />))}
        </g>
        <g fill={`url(#gl${uid})`}>{outer}</g>
      </g>
      {d.frame === 'solid' && <g fill="none" stroke={fc} strokeWidth="7">{circle ? <circle cx="100" cy="100" r="80" /> : <rect x="20" y="20" width="160" height="160" rx="26" />}</g>}
      {d.frame === 'dashed' && <g fill="none" stroke={fc} strokeWidth="5" strokeDasharray="12 8" strokeLinecap="round">{circle ? <circle cx="100" cy="100" r="79" /> : <rect x="21" y="21" width="158" height="158" rx="25" />}</g>}
      {d.frame === 'dots' && <g fill="none" stroke={fc} strokeWidth="6" strokeDasharray="0.1 11" strokeLinecap="round">{circle ? <circle cx="100" cy="100" r="78" /> : <rect x="22" y="22" width="156" height="156" rx="24" />}</g>}
      <g fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4">{outer}</g>
      <g transform="translate(100 100)">
        <circle r="19" fill={d.dotColor} />
        {d.dot === 'logo' && <text y="7.5" textAnchor="middle" fontSize="22" fontWeight="800" fill={readableOn(d.dotColor)} fontFamily="Inter Variable, Inter, sans-serif">t</text>}
        {d.dot === 'heart' && <path d={SMALL_HEART} transform="scale(0.85) translate(0 2)" fill={readableOn(d.dotColor)} />}
        {d.dot === 'star' && <path d={STAR_PATH} transform="scale(0.85)" fill={readableOn(d.dotColor)} />}
        {d.dot === 'initials' && (
          <text y={d.initials.length > 2 ? 4.5 : 5.5} textAnchor="middle" fontSize={d.initials.length > 2 ? 12 : 15} fontWeight="750"
            fill={readableOn(d.dotColor)} fontFamily="Inter Variable, Inter, sans-serif">{(d.initials || 'AB').toUpperCase()}</text>
        )}
      </g>
    </svg>
  )
}

export function StickerArt({ d, showAntenna }: { d: StickerDesign; showAntenna?: boolean }) {
  return d.style === 'clear' ? <ClearSkin d={d} showAntenna={showAntenna} /> : <ArtSkin d={d} />
}

/* Keyring hub (3/4 view, Ø 38 mm pebble) ------------------------------------ */

export type LedState = 'blue' | 'green' | 'red'
const ledHex: Record<LedState, string> = { blue: '#3158FF', green: '#22C07A', red: '#EF4A3F' }
const metal: Record<RingFinish, [string, string, string]> = {
  silver: ['#F4F6F9', '#B9C0CB', '#7E8796'],
  gold: ['#FCEBB5', '#DDB04C', '#A87A1C'],
  black: ['#6A707B', '#2E333B', '#14171C'],
}
const fonts = { sans: 'Inter Variable, Inter, sans-serif', serif: 'Georgia, "Times New Roman", serif', mono: 'ui-monospace, Menlo, monospace' }

export function HubArt({ d, led = 'blue' }: { d: HubDesign; led?: LedState }) {
  const uid = uidOf(useId())
  const [m1, m2, m3] = metal[d.loop]
  const fin = d.finish ?? 'matte'
  const side = mix(d.shell, '#000000', luminance(d.shell) > 120 ? 0.14 : 0.3)
  const sideLine = mix(d.shell, '#FFFFFF', 0.25)
  const glow = ledHex[led]
  const text = d.engraving.trim().toUpperCase()
  return (
    <svg viewBox="0 0 240 250" className="hub-art" role="img" aria-label="Keyring hub preview">
      <defs>
        <linearGradient id={`m${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={m1} /><stop offset="0.5" stopColor={m2} /><stop offset="1" stopColor={m3} /></linearGradient>
        <linearGradient id={`top${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.4" /><stop offset="0.6" stopColor="#fff" stopOpacity="0.05" /><stop offset="1" stopColor="#000" stopOpacity="0.05" /></linearGradient>
        <linearGradient id={`metal${uid}`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor={mix(d.shell, '#FFFFFF', 0.6)} /><stop offset="0.3" stopColor={d.shell} /><stop offset="0.55" stopColor={mix(d.shell, '#000000', 0.3)} />
          <stop offset="0.78" stopColor={mix(d.shell, '#FFFFFF', 0.45)} /><stop offset="1" stopColor={mix(d.shell, '#000000', 0.2)} />
        </linearGradient>
        <radialGradient id={`win${uid}`} cx="0.45" cy="0.4" r="0.7"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#E9ECF1" /></radialGradient>
        <filter id={`gl${uid}`} x="-40%" y="-60%" width="180%" height="220%"><feGaussianBlur stdDeviation="6" /></filter>
        <filter id={`sh${uid}`} x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>
      <ellipse cx="124" cy="222" rx="96" ry="20" fill="#12161C" opacity="0.22" filter={`url(#sh${uid})`} />
      {d.strap && (
        <g fill="none" strokeLinecap="round">
          <path d="M86 92 C 66 64 52 40 40 6" stroke={d.strap} strokeWidth="13" />
          <path d="M86 92 C 66 64 52 40 40 6" stroke="#000" strokeOpacity="0.12" strokeWidth="2" />
        </g>
      )}
      {/* loop tab behind the body */}
      <ellipse cx="94" cy="108" rx="22" ry="15" fill={side} />
      <ellipse cx="94" cy="105" rx="22" ry="14" fill={d.shell} />
      <ellipse cx="94" cy="104" rx="7" ry="4.5" fill={side} />
      {/* metal ring through the tab */}
      <ellipse cx="88" cy="80" rx="13" ry="27" fill="none" stroke={`url(#m${uid})`} strokeWidth="5.5" transform="rotate(-12 88 80)" />
      {/* side wall with layered lines */}
      <path d="M32 150 L32 172 A 88 54 0 0 0 208 172 L208 150 Z" fill={fin === 'metal' ? `url(#metal${uid})` : side} />
      {fin === 'metal' && <path d="M32 150 L32 172 A 88 54 0 0 0 208 172 L208 150 Z" fill="#000" opacity="0.15" />}
      <path d="M32 158 A 88 54 0 0 0 208 158" fill="none" stroke={sideLine} strokeOpacity="0.35" strokeWidth="1.2" />
      <path d="M32 165 A 88 54 0 0 0 208 165" fill="none" stroke={sideLine} strokeOpacity="0.25" strokeWidth="1.2" />
      <rect x="112" y="219" width="18" height="4" rx="2" fill="#000" opacity="0.35" transform="rotate(-4 121 221)" />
      {text && (
        <text x="120" y="216" textAnchor="middle" fontSize={text.length > 8 ? 9 : 10.5} fontFamily={fonts[d.font]} fontWeight={650}
          letterSpacing="1.4" fill={luminance(d.shell) > 140 ? 'rgba(18,22,28,0.45)' : 'rgba(255,255,255,0.6)'}>{text}</text>
      )}
      {/* top face */}
      <ellipse cx="120" cy="150" rx="88" ry="54" fill={fin === 'metal' ? `url(#metal${uid})` : d.shell} />
      <ellipse cx="120" cy="150" rx="88" ry="54" fill={`url(#top${uid})`} />
      {fin === 'gloss' && <ellipse cx="78" cy="124" rx="34" ry="11" transform="rotate(-14 78 124)" fill="#FFFFFF" opacity="0.6" />}
      {fin === 'gloss' && <circle cx="56" cy="138" r="3.5" fill="#FFFFFF" opacity="0.85" />}
      {/* LED ring glow + frosted window */}
      <ellipse cx="120" cy="150" rx="60" ry="36" fill="none" stroke={glow} strokeWidth="14" opacity="0.55" filter={`url(#gl${uid})`} />
      <ellipse cx="120" cy="150" rx="58" ry="35" fill="none" stroke={glow} strokeWidth="7" />
      <ellipse cx="120" cy="150" rx="52" ry="31" fill={`url(#win${uid})`} />
      <text x="0" y="0" transform="translate(120 160) scale(1 0.62)" textAnchor="middle" fontSize="34" fontWeight="800" fill="#12161C"
        fontFamily="Inter Variable, Inter, sans-serif">t</text>
    </svg>
  )
}

/* Front view hub face (used inside cases) ----------------------------------- */

function HubFace({ cx, cy, r, shell, led, uid }: { cx: number; cy: number; r: number; shell: string; led: LedState; uid: string }) {
  const g = ledHex[led]
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={shell} />
      <circle cx={cx} cy={cy} r={r * 0.8} fill="none" stroke={g} strokeWidth={r * 0.2} opacity="0.35" filter={`url(#soft${uid})`} />
      <circle cx={cx} cy={cy} r={r * 0.8} fill="none" stroke={g} strokeWidth={r * 0.085} />
      <circle cx={cx} cy={cy} r={r * 0.7} fill={`url(#frost${uid})`} />
      <text x={cx} y={cy + r * 0.24} textAnchor="middle" fontSize={r * 0.72} fontWeight="800" fill="#1A1E26" fontFamily="Inter Variable, Inter, sans-serif">t</text>
    </g>
  )
}

/* Cases: clean, matte silicone (plus clear and leather) ------------------------- */

const HEART_CASE = 'M100 196 C 44 160 30 128 42 100 C 54 74 86 72 100 96 C 114 72 146 74 158 100 C 170 128 156 160 100 196 Z'

export function CaseArt({ c, shell = '#F4F5F7', led = 'green' }: { c: CaseChoice; shell?: string; led?: LedState }) {
  const uid = uidOf(useId())
  const col = c.color
  const lum = luminance(col)
  const isDark = lum < 110
  const plain = c.key === 'leather' || c.key === 'clear'
  const finish = plain ? 'matte' : c.finish ?? 'matte'
  const pattern = plain ? 'solid' : c.pattern ?? 'solid'
  const pc = c.patternColor ?? (isDark ? '#FFFFFF' : '#16171B')
  const loopCol = isDark ? mix(col, '#FFFFFF', 0.08) : mix(col, '#000000', 0.07)
  const deboss = isDark ? mix(col, '#000000', 0.25) : mix(col, '#000000', 0.06)
  const lip = isDark ? mix(col, '#FFFFFF', 0.06) : mix(col, '#000000', 0.05)

  // Silhouette + window position per case
  let shape: ReactNode = <circle cx="100" cy="140" r="58" />
  let extras: ReactNode = null
  let win = { x: 100, y: 140, r: 30 }
  let hardware: 'loop' | 'ring' = 'loop'

  switch (c.key) {
    case 'bear':
      shape = <><circle cx="58" cy="94" r="21" /><circle cx="142" cy="94" r="21" /><circle cx="100" cy="142" r="58" /></>
      extras = <g fill={deboss}><circle cx="58" cy="94" r="10" /><circle cx="142" cy="94" r="10" /></g>
      win = { x: 100, y: 146, r: 29 }
      break
    case 'bunny':
      shape = <><rect x="68" y="30" width="26" height="84" rx="13" transform="rotate(-9 81 110)" /><rect x="106" y="30" width="26" height="84" rx="13" transform="rotate(9 119 110)" /><circle cx="100" cy="148" r="56" /></>
      extras = <g fill={deboss}><rect x="76" y="42" width="10" height="56" rx="5" transform="rotate(-9 81 110)" /><rect x="114" y="42" width="10" height="56" rx="5" transform="rotate(9 119 110)" /></g>
      win = { x: 100, y: 152, r: 28 }
      break
    case 'cat':
      shape = <><path d="M52 118 L58 70 L96 96 Z" strokeLinejoin="round" /><path d="M148 118 L142 70 L104 96 Z" strokeLinejoin="round" /><circle cx="100" cy="144" r="58" /></>
      extras = <g fill={deboss}><path d="M62 108 L66 82 L86 96 Z" /><path d="M138 108 L134 82 L114 96 Z" /></g>
      win = { x: 100, y: 148, r: 29 }
      break
    case 'cloud':
      shape = <><circle cx="68" cy="152" r="34" /><circle cx="104" cy="126" r="44" /><circle cx="140" cy="154" r="32" /><rect x="34" y="150" width="138" height="38" rx="19" /></>
      win = { x: 102, y: 150, r: 27 }
      break
    case 'heart':
      shape = <path d={HEART_CASE} />
      win = { x: 100, y: 138, r: 27 }
      break
    case 'clear':
      hardware = 'ring'
      win = { x: 100, y: 140, r: 46 }
      break
    case 'leather':
      hardware = 'ring'
      shape = <><rect x="84" y="60" width="32" height="40" rx="10" /><circle cx="100" cy="142" r="58" /></>
      extras = (<>
        <circle cx="100" cy="142" r="51" fill="none" stroke={mix(col, '#FFFFFF', 0.35)} strokeWidth="1.6" strokeDasharray="4 4" opacity="0.8" />
        <rect x="89" y="66" width="22" height="24" rx="6" fill="none" stroke={mix(col, '#FFFFFF', 0.35)} strokeWidth="1.4" strokeDasharray="3 3" opacity="0.8" />
      </>)
      win = { x: 100, y: 146, r: 28 }
      break
  }

  const [m1, m2, m3] = metal.silver
  return (
    <svg viewBox="-14 0 228 230" className="case-art" role="img" aria-label="Hub case preview">
      <defs>
        {finish === 'metal' ? (
          <linearGradient id={`matte${uid}`} x1="0.05" y1="0" x2="0.95" y2="1">
            <stop offset="0" stopColor={mix(col, '#FFFFFF', 0.7)} />
            <stop offset="0.28" stopColor={col} />
            <stop offset="0.5" stopColor={mix(col, '#000000', 0.32)} />
            <stop offset="0.72" stopColor={mix(col, '#FFFFFF', 0.45)} />
            <stop offset="1" stopColor={mix(col, '#000000', 0.22)} />
          </linearGradient>
        ) : (
          <radialGradient id={`matte${uid}`} cx="0.36" cy="0.28" r="0.85">
            <stop offset="0" stopColor={mix(col, '#FFFFFF', finish === 'gloss' ? (isDark ? 0.3 : 0.55) : isDark ? 0.14 : 0.32)} />
            <stop offset={finish === 'gloss' ? '0.45' : '0.55'} stopColor={col} />
            <stop offset="1" stopColor={mix(col, '#000000', finish === 'gloss' ? (isDark ? 0.35 : 0.2) : isDark ? 0.2 : 0.1)} />
          </radialGradient>
        )}
        <clipPath id={`shape${uid}`}>{shape}</clipPath>
        {pattern === 'dots' && (
          <pattern id={`pat${uid}`} width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="3.6" fill={pc} /><circle cx="12" cy="12" r="3.6" fill={pc} />
          </pattern>
        )}
        {pattern === 'stripes' && (
          <pattern id={`pat${uid}`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="5" height="12" fill={pc} />
          </pattern>
        )}
        {pattern === 'checker' && (
          <pattern id={`pat${uid}`} width="18" height="18" patternUnits="userSpaceOnUse">
            <rect width="9" height="9" fill={pc} /><rect x="9" y="9" width="9" height="9" fill={pc} />
          </pattern>
        )}
        {pattern === 'gingham' && (
          <pattern id={`pat${uid}`} width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="8" height="16" fill={pc} opacity="0.45" /><rect width="16" height="8" fill={pc} opacity="0.45" />
          </pattern>
        )}
        {pattern === 'hearts' && (
          <pattern id={`pat${uid}`} width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M6 9 C3 6.5 1.5 5.5 1.5 3.6 C1.5 2 3.4 1.2 6 3.4 C8.6 1.2 10.5 2 10.5 3.6 C10.5 5.5 9 6.5 6 9 Z" fill={pc} />
            <path d="M17 20 C14 17.5 12.5 16.5 12.5 14.6 C12.5 13 14.4 12.2 17 14.4 C19.6 12.2 21.5 13 21.5 14.6 C21.5 16.5 20 17.5 17 20 Z" fill={pc} />
          </pattern>
        )}
        <radialGradient id={`frost${uid}`} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#E7EAEF" />
        </radialGradient>
        <linearGradient id={`met${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={m1} /><stop offset="0.5" stopColor={m2} /><stop offset="1" stopColor={m3} /></linearGradient>
        <filter id={`soft${uid}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.5" /></filter>
        <filter id={`shadow${uid}`} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#12161C" floodOpacity="0.16" /></filter>
        {c.key === 'leather' && (
          <pattern id={`grain${uid}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="transparent" /><circle cx="1.5" cy="1.5" r="0.7" fill="#000" opacity="0.08" /><circle cx="4.5" cy="4" r="0.6" fill="#fff" opacity="0.06" />
          </pattern>
        )}
      </defs>

      {/* hardware */}
      {hardware === 'loop' ? (
        <g fill="none" strokeLinecap="round" transform={['bear', 'bunny', 'cat'].includes(c.key) ? 'rotate(38 100 146)' : undefined}>
          <path d="M100 92 C 82 92 78 66 80 44 C 82 22 91 12 100 12 C 109 12 118 22 120 44 C 122 66 118 92 100 92" stroke={loopCol} strokeWidth="13" />
          <path d="M86 40 C 88 26 94 18 100 18" stroke="#FFFFFF" strokeOpacity={isDark ? 0.12 : 0.35} strokeWidth="3" />
        </g>
      ) : (
        <g>
          <ellipse cx="100" cy="46" rx="20" ry="20" fill="none" stroke={`url(#met${uid})`} strokeWidth="5" />
          {c.key === 'clear' && <rect x="94" y="62" width="12" height="26" rx="4" fill={`url(#met${uid})`} />}
        </g>
      )}

      {c.key === 'clear' ? (
        <g filter={`url(#shadow${uid})`}>
          <circle cx="100" cy="140" r="60" fill="rgba(255,255,255,0.35)" />
          <HubFace cx={100} cy={140} r={46} shell={shell} led={led} uid={uid} />
          <circle cx="100" cy="140" r="56" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="8" />
          <circle cx="100" cy="140" r="60" fill="none" stroke="rgba(18,22,28,0.1)" strokeWidth="1" />
          <path d="M58 112 A 50 50 0 0 1 92 86" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        </g>
      ) : (
        <>
          <g filter={`url(#shadow${uid})`}>
            <g fill={`url(#matte${uid})`} stroke={`url(#matte${uid})`} strokeWidth={c.key === 'cat' ? 10 : 0}>{shape}</g>
          </g>
          {c.key === 'leather' && <g fill={`url(#grain${uid})`}>{shape}</g>}
          {pattern !== 'solid' && <g fill={`url(#pat${uid})`} opacity={finish === 'metal' ? 0.85 : 1}>{shape}</g>}
          {extras}
          {finish === 'gloss' && (
            <g clipPath={`url(#shape${uid})`}>
              <ellipse cx={win.x - 34} cy={win.y - 30} rx="22" ry="11" transform={`rotate(-38 ${win.x - 34} ${win.y - 30})`} fill="#FFFFFF" opacity="0.5" />
              <circle cx={win.x - 46} cy={win.y - 12} r="3.5" fill="#FFFFFF" opacity="0.75" />
              <path d="M150 178 A 62 62 0 0 1 120 198" stroke="#FFFFFF" strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
            </g>
          )}
          {finish === 'metal' && (
            <g clipPath={`url(#shape${uid})`}>
              <rect x="40" y="60" width="16" height="200" transform="rotate(-32 48 160)" fill="#FFFFFF" opacity="0.35" />
            </g>
          )}
          <circle cx={win.x} cy={win.y} r={win.r + 4} fill={lip} />
          <circle cx={win.x} cy={win.y} r={win.r + 4} fill="none" stroke="#000" strokeOpacity="0.06" />
          <HubFace cx={win.x} cy={win.y} r={win.r} shell={shell} led={led} uid={uid} />
        </>
      )}
    </svg>
  )
}

/* Backdrops ------------------------------------------------------------------- */

export const fabrics = [
  { key: 'studio', name: 'Studio', a: '#EFEBE5', b: '#E9E4DD' },
  { key: 'navy', name: 'Navy canvas', a: '#24324F', b: '#1D2942' },
  { key: 'sand', name: 'Sand canvas', a: '#CBB89A', b: '#BFAA8A' },
  { key: 'olive', name: 'Olive nylon', a: '#5E6A4C', b: '#525D42' },
  { key: 'black', name: 'Black nylon', a: '#2B2D31', b: '#222428' },
] as const
export type FabricKey = (typeof fabrics)[number]['key']

export function fabricStyle(key: FabricKey): React.CSSProperties {
  const f = fabrics.find((x) => x.key === key) ?? fabrics[0]
  if (key === 'studio') return { backgroundColor: f.a, backgroundImage: 'radial-gradient(120% 90% at 50% 10%, #F7F4F0 0%, #ECE7E0 70%)' }
  return {
    backgroundColor: f.a,
    backgroundImage: `repeating-linear-gradient(0deg, ${f.b} 0 2px, transparent 2px 5px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 6px)`,
  }
}
