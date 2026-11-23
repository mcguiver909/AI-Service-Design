import { useId } from 'react'
import type { KeyringDesign, StickerDesign } from './shopStore'

/* Sticker -------------------------------------------------------------- */

const HEART = 'M0 6 C-6 0 -12 -2 -12 -8 C-12 -13 -6 -15 0 -9 C6 -15 12 -13 12 -8 C12 -2 6 0 0 6 Z'
const STAR = 'M0 -13 L3.8 -4.2 L13 -4 L5.8 2 L8.2 11.5 L0 6.2 L-8.2 11.5 L-5.8 2 L-13 -4 L-3.8 -4.2 Z'

/** Small deterministic pseudo-random for confetti. */
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function readableOn(hex: string) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? '#12161C' : '#FFFFFF'
}

export function StickerArt({ d, showAntenna = true }: { d: StickerDesign; showAntenna?: boolean }) {
  const uid = useId().replace(/:/g, '')
  const circle = d.shape === 'circle'
  const outer = circle
    ? <circle cx="100" cy="100" r="84" />
    : <rect x="16" y="16" width="168" height="168" rx="30" />
  const inner = circle
    ? <circle cx="100" cy="100" r="70" />
    : <rect x="30" y="30" width="140" height="140" rx="20" />
  const fc = d.frameColor

  const confetti = Array.from({ length: 46 }, (_, i) => {
    const a = rand(i + 1) * Math.PI * 2
    const t = rand(i + 7)
    // place along the border band
    let x: number, y: number
    if (circle) {
      const r = 72 + rand(i + 3) * 11
      x = 100 + Math.cos(a) * r; y = 100 + Math.sin(a) * r
    } else {
      const side = i % 4, p = 22 + t * 156, w = 18 + rand(i + 5) * 10
      x = side === 0 ? p : side === 1 ? 182 - (w - 18) : side === 2 ? p : 18 + (w - 18)
      y = side === 0 ? 18 + (w - 18) : side === 1 ? p : side === 2 ? 182 - (w - 18) : p
    }
    const colors = [fc, '#F26A3D', '#22A06B', '#E8B100', '#7357E0']
    return { x, y, r: 2 + rand(i + 9) * 2.6, c: colors[i % colors.length], rot: rand(i + 11) * 180, kind: i % 3 }
  })

  return (
    <svg viewBox="0 0 200 200" className="sticker-art" role="img" aria-label="Sticker preview">
      <defs>
        <linearGradient id={`gl${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.02" />
        </linearGradient>
        <clipPath id={`clip${uid}`}>{outer}</clipPath>
        <mask id={`band${uid}`}>
          <g fill="#fff">{outer}</g>
          <g fill="#000">{inner}</g>
        </mask>
        <pattern id={`stripes${uid}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="10" fill={fc} />
        </pattern>
        <pattern id={`checker${uid}`} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill={fc} /><rect x="6" y="6" width="6" height="6" fill={fc} />
        </pattern>
      </defs>

      {/* clear film */}
      <g clipPath={`url(#clip${uid})`}>
        <g fill="rgba(255,255,255,0.14)">{outer}</g>
        {showAntenna && (
          <path d="M100 100 h10 v10 h-20 v-20 h30 v30 h-40 v-40 h50 v50 h-60 v-60 h70 v70 h-80 v-80 h90"
            fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.2" />
        )}
        {/* frame print (kept on the outer band so the antenna keeps working) */}
        <g mask={`url(#band${uid})`}>
          {d.frame === 'stripes' && <rect width="200" height="200" fill={`url(#stripes${uid})`} />}
          {d.frame === 'checker' && <rect width="200" height="200" fill={`url(#checker${uid})`} />}
          {d.frame === 'confetti' && confetti.map((c, i) => (
            c.kind === 0
              ? <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={c.c} />
              : <rect key={i} x={c.x - c.r} y={c.y - c.r / 2} width={c.r * 2} height={c.r} fill={c.c} transform={`rotate(${c.rot} ${c.x} ${c.y})`} />
          ))}
        </g>
        <g fill={`url(#gl${uid})`}>{outer}</g>
      </g>
      {d.frame === 'solid' && <g fill="none" stroke={fc} strokeWidth="7">{circle ? <circle cx="100" cy="100" r="80" /> : <rect x="20" y="20" width="160" height="160" rx="26" />}</g>}
      {d.frame === 'dashed' && <g fill="none" stroke={fc} strokeWidth="5" strokeDasharray="12 8" strokeLinecap="round">{circle ? <circle cx="100" cy="100" r="79" /> : <rect x="21" y="21" width="158" height="158" rx="25" />}</g>}
      {d.frame === 'dots' && <g fill="none" stroke={fc} strokeWidth="6" strokeDasharray="0.1 11" strokeLinecap="round">{circle ? <circle cx="100" cy="100" r="78" /> : <rect x="22" y="22" width="156" height="156" rx="24" />}</g>}

      {/* edge */}
      <g fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4">{outer}</g>

      {/* chip cover: the "dot" */}
      <g transform="translate(100 100)">
        <circle r="19" fill={d.dotColor} />
        <circle r="19" fill="none" stroke="rgba(0,0,0,0.12)" />
        {d.dot === 'logo' && <text y="7.5" textAnchor="middle" fontSize="22" fontWeight="800" fill={readableOn(d.dotColor)} fontFamily="Inter Variable, Inter, sans-serif">t</text>}
        {d.dot === 'heart' && <path d={HEART} transform="scale(0.85) translate(0 2)" fill={readableOn(d.dotColor)} />}
        {d.dot === 'star' && <path d={STAR} transform="scale(0.85)" fill={readableOn(d.dotColor)} />}
        {d.dot === 'initials' && (
          <text y={d.initials.length > 2 ? 4.5 : 5.5} textAnchor="middle" fontSize={d.initials.length > 2 ? 12 : 15} fontWeight="750"
            fill={readableOn(d.dotColor)} fontFamily="Inter Variable, Inter, sans-serif" letterSpacing="0.5">
            {(d.initials || 'AB').toUpperCase()}
          </text>
        )}
      </g>
    </svg>
  )
}

/* Keyring ---------------------------------------------------------------- */

const ringGrad: Record<KeyringDesign['ring'], [string, string, string]> = {
  silver: ['#F2F4F7', '#B8BEC9', '#8A93A3'],
  gold: ['#FBE7A8', '#D9A93E', '#A87A1C'],
  black: ['#5A606B', '#2A2E35', '#12161C'],
}
const fontFamily = { sans: 'Inter Variable, Inter, sans-serif', serif: 'Georgia, "Times New Roman", serif', mono: 'ui-monospace, Menlo, monospace' }

export function KeyringArt({ d }: { d: KeyringDesign }) {
  const uid = useId().replace(/:/g, '')
  const [r1, r2, r3] = ringGrad[d.ring]
  const ink = readableOn(d.body) === '#FFFFFF' ? 'rgba(255,255,255,0.75)' : 'rgba(18,22,28,0.55)'
  const text = d.engraving.trim()
  return (
    <svg viewBox="0 0 200 270" className="keyring-art" role="img" aria-label="Keyring preview">
      <defs>
        <linearGradient id={`ring${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={r1} /><stop offset="0.5" stopColor={r2} /><stop offset="1" stopColor={r3} />
        </linearGradient>
        <linearGradient id={`body${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
        <radialGradient id={`led${uid}`}>
          <stop offset="0" stopColor="#9FB4FF" /><stop offset="0.6" stopColor="#3158FF" /><stop offset="1" stopColor="#3158FF" stopOpacity="0" />
        </radialGradient>
        <filter id={`sh${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#12161C" floodOpacity="0.22" />
        </filter>
      </defs>
      {/* ring */}
      <circle cx="100" cy="44" r="30" fill="none" stroke={`url(#ring${uid})`} strokeWidth="7" />
      {/* body 35 × 50 mm */}
      <g filter={`url(#sh${uid})`}>
        <rect x="45" y="66" width="110" height="160" rx="34" fill={d.body} />
        <rect x="45" y="66" width="110" height="160" rx="34" fill={`url(#body${uid})`} />
        <rect x="45.5" y="66.5" width="109" height="159" rx="33.5" fill="none" stroke="rgba(0,0,0,0.08)" />
      </g>
      {/* hole */}
      <circle cx="100" cy="84" r="7" fill="#fff" stroke="rgba(0,0,0,0.1)" />
      {/* LED pin */}
      <circle cx="100" cy="114" r="14" fill={`url(#led${uid})`} opacity="0.55" />
      <path d="M100 104 c-5.5 0 -9 4 -9 8.6 c0 6 9 13.4 9 13.4 s9 -7.4 9 -13.4 c0 -4.6 -3.5 -8.6 -9 -8.6 z" fill="#3158FF" />
      <circle cx="100" cy="112.5" r="3.2" fill="#fff" />
      {/* button */}
      <circle cx="100" cy="160" r="21" fill="rgba(0,0,0,0.06)" />
      <circle cx="100" cy="158" r="19" fill={d.body} stroke="rgba(0,0,0,0.12)" />
      <circle cx="100" cy="158" r="19" fill={`url(#body${uid})`} />
      {/* engraving */}
      {text && (
        <text x="100" y="204" textAnchor="middle" fontSize={text.length > 8 ? 10 : 12} fontFamily={fontFamily[d.font]}
          fontWeight={d.font === 'serif' ? 500 : 650} letterSpacing={d.font === 'mono' ? 0.5 : 1.2} fill={ink}>
          {text.toUpperCase()}
        </text>
      )}
      {/* usb-c */}
      <rect x="88" y="223" width="24" height="5" rx="2.5" fill="rgba(0,0,0,0.35)" />
    </svg>
  )
}

/* Fabric backdrop ----------------------------------------------------------- */

export const fabrics = [
  { key: 'navy', name: 'Navy canvas', a: '#24324F', b: '#1D2942' },
  { key: 'sand', name: 'Sand canvas', a: '#CBB89A', b: '#BFAA8A' },
  { key: 'olive', name: 'Olive nylon', a: '#5E6A4C', b: '#525D42' },
  { key: 'black', name: 'Black nylon', a: '#2B2D31', b: '#222428' },
] as const
export type FabricKey = (typeof fabrics)[number]['key']

export function fabricStyle(key: FabricKey): React.CSSProperties {
  const f = fabrics.find((x) => x.key === key) ?? fabrics[0]
  return {
    backgroundColor: f.a,
    backgroundImage: `repeating-linear-gradient(0deg, ${f.b} 0 2px, transparent 2px 5px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 6px)`,
  }
}
