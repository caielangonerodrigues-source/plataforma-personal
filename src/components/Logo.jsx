// Logo da Corpo Atlético: símbolo "CA" + nome. As cores seguem o tema (claro/escuro).
export function SimboloCA({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ flex: 'none' }}>
      <rect width="100" height="100" rx="22" fill="var(--accent)" />
      <g transform="translate(50 50) skewX(-12) translate(-50 -50)" fill="var(--accent-ink)" fillRule="evenodd">
        <path d="M15 36L23 28H45V39H29L26 42V58L29 61H45V72H23L15 64Z" />
        <path d="M48 72L59 28H73L86 72H74L72 64H61L59 72ZM63.5 54H70L66.5 39Z" />
      </g>
    </svg>
  )
}

export default function Logo({ sub, grande = false }) {
  const s = grande ? 1.5 : 1
  return (
    <div className="logo" style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 * s }} aria-label="Corpo Atlético">
        <SimboloCA size={44 * s} />
        <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontStyle: 'italic', textTransform: 'uppercase', lineHeight: 0.92, fontSize: 22 * s, letterSpacing: '.01em' }}>
          <div>Corpo</div>
          <div style={{ color: 'var(--accent)' }}>Atlético</div>
        </div>
      </div>
      {sub && <small style={{ display: 'block', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 8 }}>{sub}</small>}
    </div>
  )
}
