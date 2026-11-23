import {
  BatteryCharging, BookOpen, Camera, Earbuds, Glasses, Headphones, IdCard, KeyRound, Laptop, Milk, Shirt, Tablet, Umbrella, Wallet,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import type { ColorKey, IconKey } from '../store'

/** Pencil case: a rounded capsule with a zip line (matches the design). */
function PencilCase(props: LucideProps) {
  const { size = 24, strokeWidth = 2, ...rest } = props
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <rect x="2.5" y="7.5" width="19" height="9" rx="4.5" />
      <path d="M7 12h10" />
    </svg>
  )
}

export const itemIcons: Record<IconKey, (p: LucideProps) => React.ReactElement> = {
  laptop: (p) => <Laptop {...p} />,
  tablet: (p) => <Tablet {...p} />,
  pencil: (p) => <PencilCase {...p} />,
  umbrella: (p) => <Umbrella {...p} />,
  earbuds: (p) => <Earbuds {...p} />,
  key: (p) => <KeyRound {...p} />,
  bottle: (p) => <Milk {...p} />,
  wallet: (p) => <Wallet {...p} />,
  glasses: (p) => <Glasses {...p} />,
  book: (p) => <BookOpen {...p} />,
  headphones: (p) => <Headphones {...p} />,
  camera: (p) => <Camera {...p} />,
  charger: (p) => <BatteryCharging {...p} />,
  shirt: (p) => <Shirt {...p} />,
  idcard: (p) => <IdCard {...p} />,
}

export const iconOrder: IconKey[] = ['laptop', 'tablet', 'pencil', 'umbrella', 'earbuds', 'key', 'bottle', 'wallet', 'glasses', 'book', 'headphones', 'camera', 'charger', 'shirt', 'idcard']

export const iconNames: Record<IconKey, string> = {
  laptop: 'Laptop', tablet: 'Tablet', pencil: 'Pencil case', umbrella: 'Umbrella', earbuds: 'Earbuds',
  key: 'Keys', bottle: 'Bottle', wallet: 'Wallet', glasses: 'Glasses', book: 'Book', headphones: 'Headphones', camera: 'Camera', charger: 'Charger', shirt: 'Clothes', idcard: 'ID card',
}

export const colors: Record<ColorKey, { bg: string; fg: string; name: string }> = {
  yellow: { bg: '#FCEBB0', fg: '#7A5B00', name: 'Sunny yellow' },
  peach: { bg: '#FBDCD2', fg: '#9A3B1E', name: 'Peach' },
  mint: { bg: '#D3F1E1', fg: '#17694A', name: 'Mint green' },
  lavender: { bg: '#E6E0FB', fg: '#4B3A9E', name: 'Lavender' },
  sky: { bg: '#DCE4FD', fg: '#2443B8', name: 'Sky blue' },
  gray: { bg: '#E4E7EC', fg: '#3E4654', name: 'Stone grey' },
}
export const colorOrder: ColorKey[] = ['yellow', 'peach', 'mint', 'lavender', 'sky', 'gray']

export function ItemTile({ icon, color, size = 44 }: { icon: IconKey; color: ColorKey; size?: number }) {
  const c = colors[color]
  const Icon = itemIcons[icon]
  return (
    <span className="tile" style={{ width: size, height: size, background: c.bg, color: c.fg }}>
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.9} />
    </span>
  )
}

/** Tagly logo mark: a "t" inside a blue ring. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#3158FF" />
      <text x="20" y="27.5" textAnchor="middle" fontFamily="Inter Variable, Inter, sans-serif" fontWeight="700" fontSize="21" fill="#fff">t</text>
    </svg>
  )
}
