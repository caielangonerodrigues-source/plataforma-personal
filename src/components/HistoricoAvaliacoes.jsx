import { useRef, useState } from 'react'
import Composicao from './Composicao.jsx'
import { PROTOCOLOS } from '../lib/pollock.js'
import { f1, fmtData } from '../lib/formato.js'

// Área do aluno: a avaliação escolhida em detalhe (a mais recente, de início) e a lista de todas para abrir as anteriores.
export default function HistoricoAvaliacoes({ avaliacoes, sexo }) {
  const [sel, setSel] = useState(null) // índice na lista em ordem de data; null = a mais recente
  const topo = useRef(null)
  const i = sel ?? avaliacoes.length - 1
  const u = avaliacoes[i]
  const ultima = i === avaliacoes.length - 1
  return (
    <>
      <span ref={topo} style={{ display: 'block', scrollMarginTop: 120 }} />
      <Composicao avaliacao={u} anterior={avaliacoes[i - 1]} sexo={sexo} titulo={ultima ? 'Última avaliação' : `Avaliação de ${fmtData(u.data)}`} />
      {avaliacoes.length > 1 && (
        <div className="panel">
          <h2 style={{ marginBottom: 4 }}>Todas as avaliações</h2>
          <ul className="historico-aval">
            {avaliacoes.map((v, k) => k).reverse().map((k) => {
              const v = avaliacoes[k]
              return (
                <li key={v.id} className={k === i ? 'atual' : ''}>
                  <div>
                    <strong>{fmtData(v.data)}</strong>{k === avaliacoes.length - 1 && <span className="meta"> · atual</span>}
                    <div className="meta">{PROTOCOLOS[v.protocolo] || PROTOCOLOS.manual}</div>
                  </div>
                  <div className="nums">
                    <span><strong>{f1(v.peso)}</strong> kg</span>
                    <span><strong>{f1(v.gordura)}</strong>%</span>
                  </div>
                  {k === i
                    ? <span className="meta">Aberta</span>
                    : <button className="link" onClick={() => { setSel(k); topo.current?.scrollIntoView({ behavior: 'smooth' }) }}>Ver ›</button>}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )
}
