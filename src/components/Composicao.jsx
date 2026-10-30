import { DOBRA_NOME, PERIMETRO_NOME, PROTOCOLOS, classificacao, dobrasDo, imc, massaGorda, massaMagra, perimetrosDe } from '../lib/pollock.js'
import { f1, fmtData } from '../lib/formato.js'

// Diferença para a avaliação anterior: "−1,0" / "+0,5"; nada quando não dá para comparar ou não mudou.
// melhor="menor" (gordura, dobras) ou "maior" (massa magra) pinta de verde/vermelho; sem ele (peso, perímetros), fica neutro,
// porque depende do objetivo do aluno.
function Dif({ agora, antes, melhor }) {
  if (agora == null || antes == null) return null
  const d = Number(agora) - Number(antes)
  if (Math.abs(d) < 0.05) return <span className="dif">=</span>
  const cor = !melhor ? '' : (melhor === 'menor') === (d < 0) ? ' bom' : ' ruim'
  return <span className={`dif${cor}`}>{d > 0 ? '+' : '−'}{f1(Math.abs(d))}</span>
}

// Lista de medidas: nome à esquerda, valor e diferença à direita, uma por linha.
function Lista({ titulo, unidade, itens, anteriores, melhor, rodape, total }) {
  return (
    <section className="medidas">
      <h3>{titulo} <span className="meta">em {unidade}</span></h3>
      <ul>
        {itens.map(([k, nome, v]) => (
          <li key={k}>
            <span>{nome}</span>
            <span className="v"><strong>{f1(v)}</strong>{anteriores && <Dif agora={v} antes={anteriores[k]} melhor={melhor} />}</span>
          </li>
        ))}
        {total && (
          <li className="total">
            <span>{total.nome}</span>
            <span className="v"><strong>{f1(total.valor)}</strong>{total.antes != null && <Dif agora={total.valor} antes={total.antes} melhor={melhor} />}</span>
          </li>
        )}
      </ul>
      {rodape && <p className="meta">{rodape}</p>}
    </section>
  )
}

// Resumo da avaliação mais recente: % de gordura, classificação, massas, dobras e perímetros,
// com a diferença para a avaliação anterior quando houver.
export default function Composicao({ avaliacao: u, anterior: a, sexo, titulo = 'Composição atual' }) {
  const dobras = u.dobras ? Object.entries(u.dobras).filter(([k]) => DOBRA_NOME[k]) : []
  // A soma é só das dobras do protocolo; as outras (bíceps, panturrilha...) são para acompanhar.
  const doProtocolo = dobrasDo(u.protocolo, sexo)
  const soma = (av) => {
    const ds = av?.dobras ? Object.entries(av.dobras) : []
    const usadas = doProtocolo.length ? ds.filter(([k]) => doProtocolo.includes(k)) : ds
    return usadas.length ? usadas.reduce((s, [, v]) => s + Number(v), 0) : null
  }
  const somadas = doProtocolo.length ? dobras.filter(([k]) => doProtocolo.includes(k)) : dobras
  const perimetros = Object.entries(perimetrosDe(u)).filter(([k]) => PERIMETRO_NOME[k])
  const perimAntes = a ? perimetrosDe(a) : null
  const manual = !u.protocolo || u.protocolo === 'manual'
  const valorImc = imc(u)

  return (
    <div className="panel">
      <div className="row between">
        <h2>{titulo}</h2>
        <span className="meta">{fmtData(u.data)} · {PROTOCOLOS[u.protocolo] || PROTOCOLOS.manual}</span>
      </div>
      <div className="kpis" style={{ marginTop: 12 }}>
        <div className="kpi"><div className="n">{f1(u.gordura)}%</div><div className="l">Gordura {a && <Dif agora={u.gordura} antes={a.gordura} melhor="menor" />}</div></div>
        <div className="kpi"><div className="n txt">{classificacao(sexo, u.gordura == null ? null : Number(u.gordura)) || '—'}</div><div className="l">Classificação</div></div>
        <div className="kpi"><div className="n">{f1(massaGorda(u))}</div><div className="l">Massa gorda kg {a && <Dif agora={massaGorda(u)} antes={massaGorda(a)} melhor="menor" />}</div></div>
        <div className="kpi"><div className="n">{f1(massaMagra(u))}</div><div className="l">Massa magra kg {a && <Dif agora={massaMagra(u)} antes={massaMagra(a)} melhor="maior" />}</div></div>
      </div>
      <p className="meta" style={{ margin: '10px 0 0' }}>
        Peso {f1(u.peso)} kg{a && <> <Dif agora={u.peso} antes={a.peso} /></>}{valorImc != null && <> · IMC {f1(valorImc)}</>}
        {a && <> · comparado com {fmtData(a.data)}</>}
      </p>
      {(dobras.length > 0 || perimetros.length > 0) && (
        <div className="medidas-grid">
          {dobras.length > 0 && (
            <Lista titulo="Dobras cutâneas" unidade="mm" melhor="menor"
              itens={dobras.map(([k, v]) => [k, DOBRA_NOME[k], v])}
              anteriores={a?.dobras || null}
              total={somadas.length ? { nome: doProtocolo.length && somadas.length < dobras.length ? `Soma das ${somadas.length} do protocolo` : 'Soma', valor: somadas.reduce((s, [, v]) => s + Number(v), 0), antes: a ? soma(a) : null } : null}
              rodape={manual ? '% de gordura informada pelo personal.' : 'Densidade por Jackson & Pollock, % de gordura pela equação de Siri, classificação do ACE.'} />
          )}
          {perimetros.length > 0 && (
            <Lista titulo="Medidas" unidade="cm"
              itens={perimetros.map(([k, v]) => [k, PERIMETRO_NOME[k], v])}
              anteriores={perimAntes && Object.keys(perimAntes).length ? perimAntes : null} />
          )}
        </div>
      )}
    </div>
  )
}
