import { APARELHOS_CARDIO, ESPORTES, GRUPOS_MUSCULACAO, fmtTempo, ritmo } from '../lib/social.js'
import Corpo from './Corpo.jsx'

const kg = (n) => `${Number(n).toLocaleString('pt-BR')} kg`

// Números do treino no post, como no Strava: da ficha (exercícios, séries, volume, recordes), de musculação livre
// (bonequinho com os grupos e duração) ou de corrida/pedal/caminhada.
export default function CardTreino({ resumo }) {
  if (!resumo) return null
  if (resumo.tipo === 'musculacao') {
    const grupos = (resumo.grupos || []).filter((g) => GRUPOS_MUSCULACAO[g])
    return (
      <div className="card-treino card-musculacao">
        <Corpo principais={grupos.flatMap((g) => GRUPOS_MUSCULACAO[g][1])} tamanho={34} legenda={false} />
        <div className="card-treino-nums">
          <div><span>Treino</span><strong>Musculação</strong></div>
          {resumo.minutos && <div><span>Duração</span><strong>{resumo.minutos} min</strong></div>}
          {grupos.length > 0 && <div><span>Grupos</span><strong>{grupos.map((g) => GRUPOS_MUSCULACAO[g][0]).join(', ')}</strong></div>}
        </div>
      </div>
    )
  }
  if (resumo.tipo === 'cardio' && resumo.esporte === 'cardio') {
    return (
      <div className="card-treino">
        <div className="card-treino-nums">
          <div><span>Treino</span><strong>Cardio</strong></div>
          {resumo.minutos && <div><span>Duração</span><strong>{resumo.minutos} min</strong></div>}
          {APARELHOS_CARDIO[resumo.aparelho] && <div><span>Aparelho</span><strong>{APARELHOS_CARDIO[resumo.aparelho]}</strong></div>}
        </div>
      </div>
    )
  }
  if (resumo.tipo === 'cardio') {
    const [nome] = ESPORTES[resumo.esporte] || ['Cardio']
    return (
      <div className="card-treino">
        <div className="card-treino-nums">
          <div><span>Distância</span><strong>{String(resumo.km).replace('.', ',')} km</strong></div>
          <div><span>Tempo</span><strong>{fmtTempo(resumo.segundos)}</strong></div>
          <div><span>{resumo.esporte === 'bike' ? 'Média' : 'Ritmo'}</span><strong>{ritmo(resumo.esporte, resumo.km, resumo.segundos)}</strong></div>
        </div>
        <div className="card-treino-esporte" aria-hidden="true">{nome}</div>
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
        <div key={r.nome} className="card-treino-recorde">Recorde: <b>{r.nome}</b> · {kg(r.carga)}</div>
      ))}
    </div>
  )
}
