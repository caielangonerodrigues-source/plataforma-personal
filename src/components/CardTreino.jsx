import { ESPORTES, fmtTempo, ritmo } from '../lib/social.js'

const kg = (n) => `${Number(n).toLocaleString('pt-BR')} kg`

// Números do treino no post, como no Strava: da ficha (exercícios, séries, volume, recordes) ou de corrida/pedal/caminhada.
export default function CardTreino({ resumo }) {
  if (!resumo) return null
  if (resumo.tipo === 'cardio') {
    const [nome, icone] = ESPORTES[resumo.esporte] || ['Cardio', '🏃']
    return (
      <div className="card-treino">
        <div className="card-treino-nums">
          <div><span>Distância</span><strong>{String(resumo.km).replace('.', ',')} km</strong></div>
          <div><span>Tempo</span><strong>{fmtTempo(resumo.segundos)}</strong></div>
          <div><span>{resumo.esporte === 'bike' ? 'Média' : 'Ritmo'}</span><strong>{ritmo(resumo.esporte, resumo.km, resumo.segundos)}</strong></div>
        </div>
        <div className="card-treino-esporte" aria-hidden="true">{icone} {nome}</div>
      </div>
    )
  }
  return (
    <div className="card-treino">
      <div className="card-treino-nums">
        <div><span>Exercícios</span><strong>{resumo.feitos}/{resumo.total}</strong></div>
        <div><span>Séries</span><strong>{resumo.series || '—'}</strong></div>
        <div><span>Volume</span><strong>{resumo.volume ? kg(resumo.volume) : '—'}</strong></div>
      </div>
      {resumo.recordes?.map((r) => (
        <div key={r.nome} className="card-treino-recorde">🏆 Recorde: <b>{r.nome}</b> · {kg(r.carga)}</div>
      ))}
    </div>
  )
}
