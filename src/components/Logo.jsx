// Logo da Corpo Atlético: o bonequinho do logo antigo (vetorizado) no selo laranja + "CORPO ATLÉTICO." com ponto laranja.
// As cores do nome seguem o tema (claro/escuro); o selo é sempre laranja com o bonequinho branco.
import { BONECO_LARGURA, BONECO_PATH } from './Boneco.jsx'

// Selo: círculo laranja com o bonequinho branco (o mesmo do ícone do app no celular).
export function SimboloCA({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx="50" cy="50" r="50" fill="#fc4c02" />
      <svg x="27" y="8" width="46" height="84" viewBox={`0 0 ${BONECO_LARGURA} 140`}><path fillRule="evenodd" fill="#fff" d={BONECO_PATH} /></svg>
    </svg>
  )
}

export default function Logo({ sub, grande = false }) {
  return (
    <div className="logo" style={{ marginBottom: 18 }}>
      <div className="row" style={{ gap: grande ? 14 : 10, flexWrap: 'nowrap', alignItems: 'center' }}>
        <SimboloCA size={grande ? 64 : 44} />
        <div aria-label="Corpo Atlético" style={{ fontFamily: 'var(--marca)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.02em', lineHeight: 0.95, fontSize: grande ? 44 : 26 }}>
          Corpo Atlético<span style={{ color: 'var(--accent)' }}>.</span>
        </div>
      </div>
      {sub && <small style={{ display: 'block', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 8 }}>{sub}</small>}
    </div>
  )
}
