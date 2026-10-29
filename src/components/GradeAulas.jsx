import { useState } from 'react'
import { SimboloCA } from './Logo.jsx'
import { DIAS_CURTOS, DIAS_LONGOS, aulasDoDia, corDaAula, fmtHora, montarGrade, proximaAula } from '../lib/academia.js'

// Grade de aulas no padrão do site: tabela no computador, um dia por vez no celular.
export default function GradeAulas({ aulas }) {
  const hojeDia = new Date().getDay()
  const grade = montarGrade(aulas)
  const [dia, setDia] = useState(grade.dias.includes(hojeDia) ? hojeDia : grade.dias[0])
  const proxima = proximaAula(aulas)
  const doDia = aulasDoDia(aulas, dia)

  return (
    <div className="panel grade-aulas">
      <div className="grade-topo">
        <SimboloCA size={52} />
        <div style={{ minWidth: 0 }}>
          <div className="grade-titulo">Horário das aulas<span style={{ color: 'var(--accent)' }}>.</span></div>
          <div className="meta">Corpo Atlético · Academia & Fitness</div>
        </div>
      </div>

      {proxima && (
        <div className="grade-proxima">
          <span className="meta">Próxima aula</span>
          <strong>{proxima.nome}</strong>
          <span>{proxima.emDias === 0 ? 'hoje' : proxima.emDias === 1 ? 'amanhã' : DIAS_LONGOS[proxima.dia_semana].toLowerCase()} às {fmtHora(proxima.hora)}</span>
        </div>
      )}

      {!aulas.length && <p className="empty">Nenhuma aula na grade ainda.</p>}

      {aulas.length > 0 && (
        <>
          <div className="grade-tabela" role="table" aria-label="Grade de aulas" style={{ gridTemplateColumns: `64px repeat(${grade.dias.length}, minmax(0, 1fr))` }}>
            <div role="row" style={{ display: 'contents' }}>
              <div role="columnheader" className="grade-cab">Hora</div>
              {grade.dias.map((d) => <div role="columnheader" key={d} className={`grade-cab${d === hojeDia ? ' hoje' : ''}`}>{DIAS_CURTOS[d]}</div>)}
            </div>
            {grade.linhas.map((l) => (
              <div role="row" key={l.hora} style={{ display: 'contents' }}>
                <div role="rowheader" className="grade-hora">{fmtHora(l.hora)}</div>
                {l.celulas.map((c, i) => (
                  <div role="cell" key={grade.dias[i]} className={`grade-celula${grade.dias[i] === hojeDia ? ' hoje' : ''}`}>
                    {c.map((a) => <Aula key={a.id} aula={a} />)}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="grade-celular">
            <div className="grade-dias" role="tablist" aria-label="Dia da semana">
              {grade.dias.map((d) => (
                <button key={d} role="tab" aria-selected={d === dia} onClick={() => setDia(d)}>
                  {DIAS_CURTOS[d]}{d === hojeDia && <i aria-label="hoje" />}
                </button>
              ))}
            </div>
            {doDia.length ? doDia.map((a) => (
              <div className="grade-linha" key={a.id}>
                <span className="grade-hora">{fmtHora(a.hora)}</span>
                <Aula aula={a} />
              </div>
            )) : <p className="empty" style={{ padding: '18px 0' }}>Sem aulas na {DIAS_LONGOS[dia].toLowerCase()}.</p>}
          </div>
        </>
      )}
    </div>
  )
}

function Aula({ aula }) {
  return (
    <div className="grade-aula" style={{ '--cor': corDaAula(aula.nome) }}>
      <strong>{aula.nome}</strong>
      {aula.obs && <small>*{aula.obs}</small>}
    </div>
  )
}
