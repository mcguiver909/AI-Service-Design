/**
 * Illustrated (non-geographic) map used on Find, item details and route previews.
 * Three layouts so different places don't all look identical.
 */
const layouts = [
  { pin: [222, 62], you: [70, 228], route: 'M78 228 H140 V112 H222 V78' },
  { pin: [96, 70], you: [262, 214], route: 'M254 214 H196 V140 H96 V86' },
  { pin: [272, 96], you: [70, 200], route: 'M78 200 H170 V96 H256' },
] as const

export function MapView({
  variant = 0, label, showRoute = true, compact = false,
}: { variant?: 0 | 1 | 2; label?: string; showRoute?: boolean; compact?: boolean }) {
  const l = layouts[variant]
  const vbY = Math.min(Math.max(l.pin[1] + 30 - 101, 0), 98)
  const flip = l.pin[0] > 200
  return (
    <div className={compact ? 'map compact' : 'map'}>
      <svg viewBox={compact ? `0 ${vbY} 360 202` : '0 0 360 300'} preserveAspectRatio="xMidYMid slice" width="100%" height="100%" role="img"
        aria-label={label ? `Map showing ${label} and your position` : 'Map'}>
        <rect width="360" height="300" fill="#E4E8EF" />
        {/* blocks */}
        <rect x="14" y="14" width="98" height="78" rx="12" fill="#D5EDDD" />
        <rect x="150" y="14" width="118" height="80" rx="12" fill="#D3D8E1" />
        <rect x="300" y="14" width="60" height="80" rx="12" fill="#DCE0E7" />
        <rect x="14" y="230" width="98" height="70" rx="12" fill="#D3D8E1" />
        <rect x="150" y="226" width="120" height="74" rx="12" fill="#DCE0E7" />
        <rect x="296" y="150" width="64" height="86" rx="12" fill="#D3D8E1" />
        {/* streets */}
        <rect x="0" y="104" width="360" height="16" fill="#fff" />
        <rect x="0" y="206" width="360" height="16" fill="#fff" />
        <rect x="126" y="0" width="16" height="300" fill="#fff" />
        <rect x="280" y="0" width="16" height="300" fill="#fff" />
        <path d="M0 196 L360 120 L360 138 L0 214 Z" fill="#fff" opacity="0.9" />
        {showRoute && (
          <path d={l.route} fill="none" stroke="#3158FF" strokeWidth="4" strokeDasharray="3 7" strokeLinecap="round" />
        )}
        {/* pin with halo */}
        <circle cx={l.pin[0]} cy={l.pin[1]} r="32" fill="#F26A3D" opacity="0.16" className="halo" />
        <circle cx={l.pin[0]} cy={l.pin[1]} r="13" fill="#fff" />
        <circle cx={l.pin[0]} cy={l.pin[1]} r="8.5" fill="#F26A3D" />
        {/* you */}
        <circle cx={l.you[0]} cy={l.you[1]} r="11" fill="#fff" />
        <circle cx={l.you[0]} cy={l.you[1]} r="7.5" fill="#3158FF" />
      </svg>
      {label && !compact && (
        <span className={`map-label ${flip ? 'flip' : ''}`} style={{ left: `${(l.pin[0] / 360) * 100}%`, top: `${(l.pin[1] / 300) * 100}%` }}>
          {label}
        </span>
      )}
      {!compact && (
        <span className="map-label you" style={{ left: `${(l.you[0] / 360) * 100}%`, top: `${(l.you[1] / 300) * 100}%` }}>
          You
        </span>
      )}
    </div>
  )
}
