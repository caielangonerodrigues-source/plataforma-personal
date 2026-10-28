import { DOBRA_NOME, PROTOCOLOS, classificacao, imc, massaGorda, massaMagra } from '../lib/pollock.js'
import { f1, fmtData } from '../lib/formato.js'

// Resumo da avaliação mais recente: % de gordura, classificação, massas e dobras.
export default function Composicao({ avaliacao: u, sexo, titulo = 'Composição atual' }) {
  const dobras = u.dobras ? Object.entries(u.dobras) : []
  return (
    <div className="panel">
      <div className="row between">
        <h2>{titulo}</h2>
        <span className="meta">{fmtData(u.data)} · {PROTOCOLOS[u.protocolo] || PROTOCOLOS.manual}</span>
      </div>
      <div className="kpis" style={{ marginTop: 12 }}>
        <div className="kpi"><div className="n">{f1(u.gordura)}%</div><div className="l">Gordura</div></div>
        <div className="kpi"><div className="n txt">{classificacao(sexo, u.gordura == null ? null : Number(u.gordura)) || '—'}</div><div className="l">Classificação</div></div>
        <div className="kpi"><div className="n">{f1(massaGorda(u))}</div><div className="l">Massa gorda kg</div></div>
        <div className="kpi"><div className="n">{f1(massaMagra(u))}</div><div className="l">Massa magra kg</div></div>
      </div>
      <p className="meta" style={{ margin: '10px 0 0' }}>Peso {f1(u.peso)} kg · IMC {f1(imc(u))}</p>
      {dobras.length > 0 && (
        <>
          <div className="tablewrap" style={{ marginTop: 12 }}>
            <table>
              <thead><tr>{dobras.map(([k]) => <th key={k} className="num">{DOBRA_NOME[k]}</th>)}<th className="num">Soma</th></tr></thead>
              <tbody><tr>
                {dobras.map(([k, v]) => <td key={k} className="num">{f1(v)}</td>)}
                <td className="num"><strong>{f1(dobras.reduce((s, [, v]) => s + Number(v), 0))}</strong></td>
              </tr></tbody>
            </table>
          </div>
          <p className="meta" style={{ margin: '8px 0 0' }}>Dobras em mm. Densidade por Jackson &amp; Pollock, % de gordura pela equação de Siri, classificação de referência do ACE.</p>
        </>
      )}
    </div>
  )
}
