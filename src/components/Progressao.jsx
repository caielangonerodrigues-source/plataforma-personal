import { historicoPorExercicio } from '../lib/progressao.js'
import { f1, fmtData } from '../lib/formato.js'

function Linha({ pontos }) {
  if (pontos.length < 2) return <svg width="120" height="32" aria-hidden="true" />
  const W = 120, H = 32, mn = Math.min(...pontos), mx = Math.max(...pontos), faixa = mx - mn || 1
  const xy = pontos.map((v, i) => [(i * (W - 6)) / (pontos.length - 1) + 3, H - 4 - ((v - mn) / faixa) * (H - 8)])
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={xy.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2" />
      <circle cx={xy.at(-1)[0]} cy={xy.at(-1)[1]} r="3.5" fill="var(--accent)" />
    </svg>
  )
}

// Evolução de carga de cada exercício das fichas atuais.
export default function Progressao({ treinos, registros }) {
  const hist = historicoPorExercicio(registros)
  const linhas = treinos.flatMap((t) => t.exercicios.map((e) => ({ treino: t.nome, e, h: hist[e.id] || [] })))
  const comDados = linhas.filter((l) => l.h.length)
  if (!comDados.length) return <p className="empty">As cargas aparecem aqui quando o aluno anotar as séries no treino.</p>
  return (
    <div className="tablewrap">
      <table>
        <thead><tr><th>Exercício</th><th className="opcional">Evolução</th><th className="num opcional">Primeira</th><th className="num">Última</th><th className="num">Variação</th><th className="num opcional">Sessões</th></tr></thead>
        <tbody>
          {comDados.map(({ treino, e, h }) => {
            const p = h[0], u = h.at(-1), d = u.max - p.max
            return (
              <tr key={e.id}>
                <td><span className="post-tag">{treino}</span>{e.nome}<div className="meta">última em {fmtData(u.data)}</div></td>
                <td className="opcional"><Linha pontos={h.slice(-10).map((x) => x.max)} /></td>
                <td className="num opcional">{f1(p.max)} kg</td>
                <td className="num"><strong>{f1(u.max)} kg</strong></td>
                <td className="num" style={{ color: d > 0 ? 'var(--ok)' : d < 0 ? 'var(--warn)' : undefined }}>{d > 0 ? '+' : ''}{f1(d)} kg</td>
                <td className="num opcional">{h.length}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
