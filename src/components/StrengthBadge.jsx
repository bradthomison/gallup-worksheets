import { getStrengthColors } from '../lib/strengthColors'

export default function StrengthBadge({ name, size = 'sm' }) {
  const colors = getStrengthColors(name)
  const padding = size === 'sm' ? '2px 8px' : '4px 12px'
  const fontSize = size === 'sm' ? '11px' : '13px'

  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        display: 'inline-block',
        lineHeight: '1.6',
      }}
    >
      {name}
    </span>
  )
}
