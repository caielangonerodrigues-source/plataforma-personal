import { useEffect } from 'react'
import BotaoWhatsApp from './BotaoWhatsApp.jsx'
import { TIPOS_AVISO, ordenarAvisos } from '../lib/academia.js'
import { quandoFoi } from '../lib/comunidade.js'

// Aba Novidades do aluno: grupo do WhatsApp e os avisos da academia (novidades, lembretes e informações).
export default function NovidadesAcademia({ academia }) {
  const { avisos, whatsapp, vistoEm, marcarVisto } = academia
  useEffect(() => () => marcarVisto(), []) // ao sair da aba, conta como lido
  const lista = ordenarAvisos(avisos)

  return (
    <div className="stack">
      {whatsapp && (
        <div className="panel cartao-whatsapp">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="name">Grupo da academia no WhatsApp</div>
            <div className="meta">Avisos rápidos, mudanças de horário e a turma toda junta.</div>
          </div>
          <BotaoWhatsApp link={whatsapp} texto="Entrar no grupo" />
        </div>
      )}
      {lista.map((a) => {
        const [rotulo, icone] = TIPOS_AVISO[a.tipo] || TIPOS_AVISO.novidade
        const novo = !vistoEm || a.created_at > vistoEm
        return (
          <article key={a.id} className={`panel aviso aviso-${a.tipo}`}>
            <div className="row" style={{ gap: 8 }}>
              <span className="aviso-tipo"><span aria-hidden="true">{icone}</span> {rotulo}</span>
              {a.fixado && <span className="meta">📌 Fixado</span>}
              {novo && <span className="pill pendente">Novo</span>}
              <span className="meta" style={{ marginLeft: 'auto' }}>{quandoFoi(a.created_at)}</span>
            </div>
            <h2 style={{ margin: '8px 0 4px' }}>{a.titulo}</h2>
            {a.texto && <p style={{ margin: 0, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{a.texto}</p>}
          </article>
        )
      })}
      {!lista.length && <div className="panel empty">Nenhuma novidade por enquanto. Os avisos da academia aparecem aqui.</div>}
    </div>
  )
}
