import { DOBRA_NOME, PERIMETRO_NOME, PERIMETROS_PARES, PERIMETROS_TRONCO, PROTOCOLOS, classificacao, dobrasDo, faixaIdeal, imc, massaGorda, massaMagra, perimetrosDe, pesoIdeal, resultadoGordura } from '../lib/pollock.js'
import { f1, fmtData } from '../lib/formato.js'

// Diferença para a avaliação anterior: "−1,0" / "+0,5"; nada quando não dá para comparar ou não mudou.
// melhor="menor" (gordura, dobras) ou "maior" (massa magra) pinta de verde/vermelho; sem ele (peso, perímetros), fica neutro,
// porque depende do objetivo do aluno.
function Dif({ agora, antes, melhor }) {
  if (agora == null || antes == null) return null
  const d = Number(agora) - Number(antes)
  if (Math.abs(d) < 0.05) return <span className="dif" aria-label="sem mudança" />
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

// Barras da composição em kg: peso atual, faixa de peso ideal, peso gordo e peso magro.
function GraficoComposicao({ barras }) {
  const W = 320, H = 170, base = 140, topo = 18
  const max = Math.max(...barras.map((b) => b.valor || 0)) * 1.1 || 1
  const larg = W / barras.length
  return (
    <figure className="grafico-composicao">
      <figcaption>Composição corporal (kg)</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={barras.map((b) => `${b.nome} ${f1(b.valor)} kg`).join(', ')}>
        <line x1="0" x2={W} y1={base} y2={base} stroke="var(--line)" />
        {barras.map((b, i) => {
          const h = ((b.valor || 0) / max) * (base - topo)
          const x = i * larg + larg * 0.18, w = larg * 0.64
          return (
            <g key={b.nome}>
              <rect x={x} y={base - h} width={w} height={h} rx="5" fill={b.cor} />
              <text x={x + w / 2} y={base - h - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)">{f1(b.valor)}</text>
              <text x={x + w / 2} y={base + 16} textAnchor="middle" fontSize="10.5" fill="var(--muted)">{b.nome}</text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

// Régua da % de gordura: zonas abaixo, ideal, na média e acima, com a marca de hoje.
function ReguaGordura({ gordura, faixa }) {
  const ini = Math.max(0, faixa.min - 8), fim = faixa.max + 11
  const pos = (v) => `${Math.min(100, Math.max(0, ((v - ini) / (fim - ini)) * 100))}%`
  const g = Number(gordura)
  return (
    <div className="regua-gordura" aria-label={`Gordura ${f1(g)}%, ideal entre ${faixa.min} e ${faixa.max}%`}>
      <div className="regua-faixas">
        <i className="z-abaixo" style={{ left: 0, width: pos(faixa.min) }} />
        <i className="z-ideal" style={{ left: pos(faixa.min), width: `calc(${pos(faixa.max)} - ${pos(faixa.min)})` }} />
        <i className="z-media" style={{ left: pos(faixa.max), width: `calc(${pos(faixa.max + 3)} - ${pos(faixa.max)})` }} />
        <i className="z-acima" style={{ left: pos(faixa.max + 3), right: 0 }} />
        <b style={{ left: pos(g) }}><span>{f1(g)}%</span></b>
      </div>
      <div className="regua-legenda">
        <span style={{ left: pos(ini + (faixa.min - ini) / 2) }}>Abaixo</span>
        <span style={{ left: pos((faixa.min + faixa.max) / 2) }}>Ideal</span>
        <span style={{ left: pos(faixa.max + 1.5) }}>Média</span>
        <span style={{ left: pos(faixa.max + 3 + (fim - faixa.max - 3) / 2) }}>Acima</span>
      </div>
    </div>
  )
}

const CLASSE_RESULTADO = { Ideal: 'bom', 'Abaixo do ideal': 'atencao', 'Na média': 'atencao', 'Acima da média': 'ruim' }

// Linha "nome ...... valor" dos blocos de resultado.
const Linha = ({ nome, valor, forte, classe }) => <li className={`${forte ? 'total' : ''} ${classe || ''}`}><span>{nome}</span><span className="v"><strong>{valor}</strong></span></li>

// Resumo da avaliação mais recente: % de gordura, classificação, massas, dobras e perímetros,
// com a diferença para a avaliação anterior quando houver.
export default function Composicao({ avaliacao: u, anterior: a, sexo, idade, titulo = 'Composição atual' }) {
  const dobras = u.dobras ? Object.entries(u.dobras).filter(([k]) => DOBRA_NOME[k]) : []
  // A soma é só das dobras do protocolo; as outras (bíceps, panturrilha...) são para acompanhar.
  const doProtocolo = dobrasDo(u.protocolo, sexo)
  const soma = (av) => {
    const ds = av?.dobras ? Object.entries(av.dobras) : []
    const usadas = doProtocolo.length ? ds.filter(([k]) => doProtocolo.includes(k)) : ds
    return usadas.length ? usadas.reduce((s, [, v]) => s + Number(v), 0) : null
  }
  const somadas = doProtocolo.length ? dobras.filter(([k]) => doProtocolo.includes(k)) : dobras
  const perimAntes = a ? perimetrosDe(a) : null
  const manual = !u.protocolo || u.protocolo === 'manual'
  const valorImc = imc(u)
  const faixa = faixaIdeal(sexo, idade)
  const ideal = pesoIdeal(u, faixa)
  const resultado = resultadoGordura(u.gordura, faixa)
  const tronco = PERIMETROS_TRONCO.filter((k) => perimetrosDe(u)[k] != null).map((k) => [k, PERIMETRO_NOME[k], perimetrosDe(u)[k]])
  const pares = PERIMETROS_PARES.filter(([k]) => perimetrosDe(u)[`${k}_d`] != null || perimetrosDe(u)[`${k}_e`] != null)
  const med = perimetrosDe(u)

  return (
    <div className="panel">
      <div className="row between">
        <h2>{titulo}</h2>
        <span className="meta">{fmtData(u.data)} · {PROTOCOLOS[u.protocolo] || PROTOCOLOS.manual}{idade ? ` · ${idade} anos` : ''}</span>
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
      {u.gordura != null && u.peso && (
        <div className="aval-resultados">
          <section className="medidas">
            <h3>Resultados</h3>
            {faixa && <ReguaGordura gordura={u.gordura} faixa={faixa} />}
            <ul>
              <Linha nome="Gordura atual" valor={`${f1(u.gordura)}%`} />
              {faixa && <Linha nome="Gordura ideal" valor={`${faixa.min} a ${faixa.max}%`} />}
              <Linha nome="Peso atual" valor={`${f1(u.peso)} kg`} />
              {ideal && <Linha nome="Peso ideal" valor={`${f1(ideal.min)} a ${f1(ideal.max)} kg`} />}
              <Linha nome="Peso gordo" valor={`${f1(massaGorda(u))} kg`} />
              <Linha nome="Peso magro" valor={`${f1(massaMagra(u))} kg`} />
              {resultado && <Linha nome="Resultado" valor={resultado} forte classe={`res-${CLASSE_RESULTADO[resultado]}`} />}
            </ul>
            {ideal && Number(u.peso) > ideal.max + 0.05 && (
              <p className="aval-meta-texto">Para chegar ao ideal: perder cerca de <strong>{f1(Number(u.peso) - ideal.max)} kg de gordura</strong>, mantendo a massa magra.</p>
            )}
            {ideal && Number(u.peso) < ideal.min - 0.05 && (
              <p className="aval-meta-texto">Abaixo do peso ideal: dá para ganhar cerca de <strong>{f1(ideal.min - Number(u.peso))} kg</strong> com foco em massa magra.</p>
            )}
            {faixa ? <p className="meta">Faixa ideal para {sexo === 'M' ? 'homens' : 'mulheres'} de {idade} anos. O peso ideal mantém a massa magra de hoje.</p>
              : <p className="meta">Com a idade no cadastro, aparecem a gordura e o peso ideais.</p>}
          </section>
          <GraficoComposicao barras={[
            { nome: 'Atual', valor: Number(u.peso), cor: 'var(--accent)' },
            ...(ideal ? [{ nome: 'Ideal mín.', valor: ideal.min, cor: 'var(--chart2)' }, { nome: 'Ideal máx.', valor: ideal.max, cor: 'var(--chart2)' }] : []),
            { nome: 'Gordo', valor: massaGorda(u), cor: '#f2b33d' },
            { nome: 'Magro', valor: massaMagra(u), cor: '#2f9e62' },
          ]} />
        </div>
      )}
      <div className="medidas-grid">
        <section className="medidas uma-coluna">
          <h3>Biometria</h3>
          <ul>
            <li><span>Massa corporal</span><span className="v"><strong>{f1(u.peso)}</strong> kg{a && <Dif agora={u.peso} antes={a.peso} />}</span></li>
            {u.altura && <li><span>Estatura</span><span className="v"><strong>{Math.round(Number(u.altura) * 100)}</strong> cm</span></li>}
            {valorImc != null && <li><span>IMC</span><span className="v"><strong>{f1(valorImc)}</strong></span></li>}
          </ul>
        </section>
        {dobras.length > 0 && (
          <Lista titulo="Dobras cutâneas" unidade="mm" melhor="menor"
            itens={dobras.map(([k, v]) => [k, DOBRA_NOME[k], v])}
            anteriores={a?.dobras || null}
            total={somadas.length ? { nome: doProtocolo.length && somadas.length < dobras.length ? `Soma das ${somadas.length} do protocolo` : 'Soma', valor: somadas.reduce((s, [, v]) => s + Number(v), 0), antes: a ? soma(a) : null } : null}
            rodape={manual ? '% de gordura informada pelo personal.' : 'Densidade por Jackson & Pollock, % de gordura pela equação de Siri, classificação do ACE.'} />
        )}
        {tronco.length > 0 && (
          <Lista titulo="Perímetros" unidade="cm" itens={tronco}
            anteriores={perimAntes && Object.keys(perimAntes).length ? perimAntes : null} />
        )}
        {pares.length > 0 && (
          <section className="medidas">
            <h3>Membros <span className="meta">em cm</span></h3>
            <table className="tabela-lados">
              <thead><tr><th /><th>Direito</th><th>Esquerdo</th></tr></thead>
              <tbody>
                {pares.map(([k, nome]) => (
                  <tr key={k}>
                    <td>{nome}</td>
                    <td><strong>{f1(med[`${k}_d`])}</strong>{perimAntes && <Dif agora={med[`${k}_d`]} antes={perimAntes[`${k}_d`]} />}</td>
                    <td><strong>{f1(med[`${k}_e`])}</strong>{perimAntes && <Dif agora={med[`${k}_e`]} antes={perimAntes[`${k}_e`]} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  )
}
