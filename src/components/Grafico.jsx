import { f1, fmtData } from '../lib/formato.js'

// Peso (eixo esquerdo) e % de gordura (eixo direito) ao longo das avaliações.
export default function Grafico({ avaliacoes }) {
  const av = avaliacoes.filter((v) => v.peso != null)
  if (av.length < 2) return <p className="empty">O gráfico aparece a partir da segunda avaliação.</p>
  const comGordura = av.every((v) => v.gordura != null)
  const W = 640, H = 220, P = { l: 44, r: 44, t: 16, b: 30 }
  const xs = av.map((_, i) => P.l + (i * (W - P.l - P.r)) / (av.length - 1))
  const faixa = (arr) => {
    const mn = Math.min(...arr), mx = Math.max(...arr), pad = Math.max((mx - mn) * 0.15, 1)
    return [Math.floor(mn - pad), Math.ceil(mx + pad)]
  }
  const [pmn, pmx] = faixa(av.map((v) => Number(v.peso)))
  const [gmn, gmx] = comGordura ? faixa(av.map((v) => Number(v.gordura))) : [0, 1]
  const y = (v, mn, mx) => P.t + (1 - (v - mn) / (mx - mn)) * (H - P.t - P.b)
  const linha = (k, mn, mx) => av.map((v, i) => `${i ? 'L' : 'M'}${xs[i].toFixed(1)},${y(Number(v[k]), mn, mx).toFixed(1)}`).join('')
  const ultimo = av.length - 1

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolução de peso e gordura">
        {[0, 0.5, 1].map((t) => {
          const yy = P.t + t * (H - P.t - P.b)
          return (
            <g key={t}>
              <line x1={P.l} x2={W - P.r} y1={yy} y2={yy} stroke="var(--line)" />
              <text x={P.l - 8} y={yy + 4} textAnchor="end" fontSize="11" fill="var(--muted)" fontFamily="var(--mono)">{f1(pmx - t * (pmx - pmn))}</text>
              {comGordura && <text x={W - P.r + 8} y={yy + 4} fontSize="11" fill="var(--muted)" fontFamily="var(--mono)">{f1(gmx - t * (gmx - gmn))}</text>}
            </g>
          )
        })}
        <path d={linha('peso', pmn, pmx)} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
        {comGordura && <path d={linha('gordura', gmn, gmx)} fill="none" stroke="var(--warn)" strokeWidth="2.5" strokeDasharray="6 4" />}
        {av.map((v, i) => (
          <g key={v.id}>
            <circle cx={xs[i]} cy={y(Number(v.peso), pmn, pmx)} r={i === ultimo ? 5 : 3.5} fill="var(--accent)" />
            {comGordura && <circle cx={xs[i]} cy={y(Number(v.gordura), gmn, gmx)} r={i === ultimo ? 5 : 3.5} fill="var(--warn)" />}
            <text x={xs[i]} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)" fontFamily="var(--mono)">{fmtData(v.data).slice(0, 5)}</text>
          </g>
        ))}
      </svg>
      <div className="legend">
        <span><i className="sw" style={{ background: 'var(--accent)' }} />Peso (kg, eixo esquerdo)</span>
        {comGordura && <span><i className="sw" style={{ background: 'var(--warn)' }} />Gordura (%, eixo direito)</span>}
      </div>
    </div>
  )
}
