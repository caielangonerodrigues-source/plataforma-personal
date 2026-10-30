import { useEffect } from 'react'
import BotaoWhatsApp from './BotaoWhatsApp.jsx'
import { TIPOS_AVISO, ordenarAvisos } from '../lib/academia.js'
import { quandoFoi } from '../lib/comunidade.js'
import { ICONE_AVISO } from './IconeLinha.jsx'

// Aba Novidades do aluno: grupo do WhatsApp e os avisos da academia (novidades, lembretes e informações).
export default function NovidadesAcademia({ academia }) {
  const { avisos, whatsapp, vistoEm, marcarVisto } = academia
  useEffect(() => () => marcarVisto(), []) // ao sair da aba, conta como lido
  const lista = ordenarAvisos(avisos)

  return (
    <div className="stack">
      {whatsapp && (
        <div className="panel cartao-whatsapp">
          <div style={{ minWidth: 0, flex: '1 1 200px' }}>
            <div className="name">Grupo da academia no WhatsApp</div>
            <div className="meta">Avisos rápidos, mudanças de horário e a turma toda junta.</div>
          </div>
          <BotaoWhatsApp link={whatsapp} texto="Entrar no grupo" />
        </div>
      )}
      {lista.map((a) => {
        const [rotulo] = TIPOS_AVISO[a.tipo] || TIPOS_AVISO.novidade
        const novo = !vistoEm || a.created_at > vistoEm
        return (
          <article key={a.id} className={`panel aviso tipo-${a.tipo in TIPOS_AVISO ? a.tipo : 'novidade'}`}>
            <div className="row" style={{ gap: 10 }}>
              <SeloAviso tipo={a.tipo} />
              <span className="aviso-tipo">{rotulo}</span>
              {a.fixado && <span className="meta">Fixado</span>}
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

// Círculo com o ícone do tipo de aviso, na cor do tipo.
export function SeloAviso({ tipo, tamanho = 36 }) {
  const t = tipo in ICONE_AVISO ? tipo : 'novidade'
  return (
    <span className={`selo-aviso tipo-${t}`} style={{ width: tamanho, height: tamanho }} aria-hidden="true">
      <svg width={Math.round(tamanho * 0.55)} height={Math.round(tamanho * 0.55)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONE_AVISO[t]} /></svg>
    </span>
  )
}
