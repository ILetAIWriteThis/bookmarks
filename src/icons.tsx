interface IconProps {
  name?: string
  size?: number
  className?: string
}

const paths: Record<string, React.ReactNode> = {
  newspaper: <><path d="M4 6h14v12H4z"/><path d="M7 9h3v3H7zm6 0h2m-2 3h2m-8 3h8"/></>,
  play: <><rect x="3" y="5" width="18" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/></>,
  ticket: <><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M12 8v2m0 4v2"/></>,
  chart: <><path d="M5 19V5m0 14h15"/><path d="m8 15 3-4 3 2 5-6"/></>,
  shield: <path d="M12 3 5 6v5c0 4.6 2.8 7.8 7 10 4.2-2.2 7-5.4 7-10V6z"/>,
  spark: <><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/><path d="m18 16 .7 2.3L21 19l-2.3.7L18 22l-.7-2.3L15 19l2.3-.7z"/></>,
  star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>,
  document: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 12h6m-6 4h6"/></>,
  bookmark: <path d="M6 3h12v18l-6-4-6 4z"/>,
  arrow: <path d="m9 18 6-6-6-6"/>,
  back: <><path d="m15 18-6-6 6-6"/><path d="M9 12h11"/></>,
  search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
  external: <><path d="M13 5h6v6m0-6-8 8"/><path d="M18 14v5H5V6h5"/></>,
  close: <path d="m7 7 10 10M17 7 7 17"/>,
}

export function Icon({ name = 'bookmark', size = 24, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.bookmark}
    </svg>
  )
}
