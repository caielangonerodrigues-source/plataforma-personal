import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import ListaAlimentos from './ListaAlimentos.jsx'
import Modal from './Modal.jsx'
import IconeLinha, { ICONES } from './IconeLinha.jsx'
import { acharAlimento } from '../lib/nutricao.js'
import { REFEICOES_LIVRES, copiarRefeicao, divisaoMacros, gramasDasPorcoes, lembrarRecente, macrosDoAlimento, metaDoDia, PCT_PADRAO, metaPorCalorias, quantidadeDosGramas, resumoDoDia, textoQuantidade, unidadeDaMedida } from '../lib/minhaDieta.js'
import { idadeDoAluno } from '../lib/pollock.js'
import { f1, fmtData, num } from '../lib/formato.js'
import { somarDias } from '../lib/comunidade.js'

// "Monte sua dieta": diário de alimentação no estilo MyFitnessPal. O aluno escolhe os alimentos de cada refeição,
// vê as calorias que restam (Meta − Alimentos + Exercício) e os macros. Não muda o plano do personal.
const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao } catch { return padrao } }
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sem armazenamento */ } }
const CORES = { proteina: '#e5484d', carboidrato: '#f5a524', gordura: '#3e8ed0' }
const NOMES = { proteina: 'Proteína', carboidrato: 'Carbo', gordura: 'Gordura' }

// Anel de progresso (calorias e macros).
function Anel({ valor, total, cor = 'var(--accent)', tamanho = 132, traco = 11, children }) {
  const r = (tamanho - traco) / 2
  const c = 2 * Math.PI * r
  const pct = total ? Math.min(1, Math.max(0, valor / total)) : 0
  return (
    <div className="anel" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} aria-hidden="true">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={traco} />
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={cor} strokeWidth={traco} strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`} />
      </svg>
      <div className="anel-centro">{children}</div>
    </div>
  )
}

function useMinhaDieta(alunoId, data) {
  const [estado, setEstado] = useState({ itens: null, ontem: [], indisponivel: false })
  const carregar = useCallback(async () => {
    const ontem = somarDias(data, -1)
    const { data: linhas, error } = await supabase.from('minha_dieta').select('*').eq('aluno_id', alunoId).gte('data', ontem).lte('data', data).order('created_at')
    if (error) return setEstado({ itens: [], ontem: [], indisponivel: true })
    setEstado({ itens: linhas.filter((l) => l.data === data), ontem: linhas.filter((l) => l.data === ontem), indisponivel: false })
  }, [alunoId, data])
  useEffect(() => { carregar() }, [carregar])
  return { ...estado, carregar }
}

export default function MonteSuaDieta({ aluno, dieta, hoje }) {
  const [data, setData] = useState(hoje)
  const diario = useMinhaDieta(aluno.id, data)
  const chaveMeta = `minha-meta-${aluno.id}`
  const [propria, setPropria] = useState(() => ler(chaveMeta, null))
  const [recentes, setRecentes] = useState(() => ler('alimentos-recentes', []))
  const [lista, setLista] = useState(null) // refeição que está escolhendo alimento
  const [porcao, setPorcao] = useState(null) // { refeicao, alimento, unidade, porcoes, gramas, kcal, id? }
  const [exercicio, setExercicio] = useState(null) // { nome, kcal }
  const [editandoMeta, setEditandoMeta] = useState(null) // { kcal, proteina, carboidrato, gordura } com as % em texto
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [modo, setModo] = useState(() => ler('modo-quantidade', 'qtd')) // anotar por quantidade ou por gramas

  const meta = metaDoDia({ propria, dieta, aluno, idade: idadeDoAluno(aluno) })
  if (!diario.itens) return <p className="carregando">Carregando…</p>
  if (diario.indisponivel) return <div className="panel empty">O “Monte sua dieta” aparece aqui assim que seu personal atualizar o sistema.</div>

  const { porRefeicao, comido, exercicio: queimado, restante } = resumoDoDia(diario.itens, meta)
  const divisao = divisaoMacros(comido)
  const passou = restante < 0

  async function rodar(fn) {
    setOcupado(true); setErro('')
    try { const { error } = await fn(); if (error) throw error } catch { setErro('Não foi possível salvar agora. Verifique a internet e tente de novo.') }
    setOcupado(false); diario.carregar()
  }
  // Alimento escolhido na lista: abre a janela da quantidade, contada na medida caseira ("3 ovos", "2 fatias").
  // Sem medida que dê para contar, a unidade é 100 g.
  const unidadeDe = (tabela) => tabela && (unidadeDaMedida(tabela.medida, tabela.gramas) || { singular: 'porção de 100 g', plural: 'porções de 100 g', gramas: 100 })
  function escolher(a) {
    const tabela = acharAlimento(a.nome)
    const u = unidadeDe(tabela)
    const n = tabela ? quantidadeDosGramas(tabela.gramas, u) || 1 : 1
    setPorcao({ refeicao: lista, alimento: a.nome, unidade: u, porcoes: String(n).replace('.', ','), gramas: tabela ? String(tabela.gramas) : '', kcal: '' })
    setLista(null)
  }
  function editar(item) {
    const tabela = acharAlimento(item.alimento)
    const u = unidadeDe(tabela)
    setPorcao({ id: item.id, refeicao: item.refeicao, alimento: item.alimento, unidade: u, porcoes: u ? String(porcoesDosGramas(item.gramas, u.gramas)).replace('.', ',') : '', gramas: item.gramas ? String(item.gramas) : '', kcal: tabela ? '' : String(item.macros?.kcal || '') })
  }
  const mudarModo = (m) => { setModo(m); gravar('modo-quantidade', m) }
  const mudaGramas = (g) => setPorcao((p) => ({ ...p, gramas: g, porcoes: String(porcoesDosGramas(num(g), p.unidade.gramas)).replace('.', ',') }))
  const mudaQtd = (q) => setPorcao((p) => ({ ...p, porcoes: q, gramas: String(gramasDasPorcoes(q, p.unidade.gramas)) }))
  const passo = (d) => { const q = Math.max(0.5, (num(porcao.porcoes) || 0) + d); mudaQtd(String(q).replace('.', ',')) }
  // Como o item aparece na refeição: "3 ovos · 150 g" quando a conta fecha em unidades.
  function quanto(i) {
    const u = unidadeDe(acharAlimento(i.alimento))
    const q = u && u.gramas !== 100 && quantidadeDosGramas(i.gramas, u)
    return [q && textoQuantidade(q, u), i.gramas && `${f1(i.gramas)} g`].filter(Boolean).join(' · ') || 'porção'
  }
  const previa = porcao && macrosDoAlimento(porcao.alimento, num(porcao.gramas), porcao.kcal)
  async function salvarPorcao() {
    if (!previa) return setErro(porcao.unidade ? 'Coloque a quantidade.' : 'Coloque as calorias do alimento.')
    const linha = { alimento: porcao.alimento.slice(0, 80), gramas: num(porcao.gramas) || null, macros: previa }
    const p = porcao
    setPorcao(null)
    if (!p.id) { const r = lembrarRecente(recentes, p.alimento); setRecentes(r); gravar('alimentos-recentes', r) }
    await rodar(() => (p.id
      ? supabase.from('minha_dieta').update(linha).eq('id', p.id)
      : supabase.from('minha_dieta').insert({ aluno_id: aluno.id, data, refeicao: p.refeicao, ...linha })))
  }
  const tirar = (id) => { setPorcao(null); rodar(() => supabase.from('minha_dieta').delete().eq('id', id)) }
  const copiar = (k) => rodar(() => supabase.from('minha_dieta').insert(copiarRefeicao(diario.ontem, k, aluno.id, data)))
  function salvarExercicio() {
    const kcal = Math.round(num(exercicio.kcal) || 0)
    if (!exercicio.nome.trim() || kcal <= 0 || kcal > 3000) return setErro('Coloque o exercício e as calorias gastas (até 3000).')
    const e = exercicio
    setExercicio(null)
    rodar(() => supabase.from('minha_dieta').insert({ aluno_id: aluno.id, data, refeicao: 'exercicio', alimento: e.nome.trim().slice(0, 80), macros: { kcal } }))
  }
  const MACROS_PCT = [['proteina', 'Proteína'], ['carboidrato', 'Carbo'], ['gordura', 'Gordura']]
  function abrirMeta() {
    const c = meta.pct || divisaoMacros(meta)
    const d = c.proteina + c.gordura ? { ...c, carboidrato: 100 - c.proteina - c.gordura } : PCT_PADRAO // arredondamento: fecha em 100%
    setErro(''); setEditandoMeta({ kcal: String(meta.kcal), ...Object.fromEntries(MACROS_PCT.map(([k]) => [k, String(d[k])])) })
  }
  const somaPct = editandoMeta ? MACROS_PCT.reduce((t, [k]) => t + (num(editandoMeta[k]) || 0), 0) : 0
  function salvarMeta() {
    if (editandoMeta.kcal === '') { setPropria(null); gravar(chaveMeta, null); return setEditandoMeta(null) }
    if (Math.round(somaPct) !== 100) return setErro(`Ainda sobram ${Math.round(100 - somaPct)}%. Distribua até dar 100%.`)
    const m = metaPorCalorias(num(editandoMeta.kcal), Object.fromEntries(MACROS_PCT.map(([k]) => [k, num(editandoMeta[k])])))
    if (!m) return setErro('A meta precisa ficar entre 800 e 6000 kcal.')
    setPropria(m); gravar(chaveMeta, m); setEditandoMeta(null)
  }
  const nomeDia = data === hoje ? 'Hoje' : data === somarDias(hoje, -1) ? 'Ontem' : fmtData(data)
  const origem = { propria: 'meta que você escolheu', personal: 'meta do seu plano', calculada: 'calculada pelo seu peso e altura', padrao: 'meta padrão: ajuste a sua' }[meta.origem]
  const exercicios = diario.itens.filter((i) => i.refeicao === 'exercicio')

  return (
    <div className="monte-dieta stack">
      <div className="panel dia-dieta">
        <button type="button" className="ghost small" aria-label="Dia anterior" onClick={() => setData(somarDias(data, -1))}>‹</button>
        <strong>{nomeDia}</strong>
        <button type="button" className="ghost small" aria-label="Próximo dia" disabled={data >= hoje} onClick={() => setData(somarDias(data, 1))}>›</button>
      </div>

      <section className="panel resumo-calorias">
        <div className="row between"><h2 style={{ margin: 0 }}>Calorias</h2><button type="button" className="link" onClick={abrirMeta}>Editar meta</button></div>
        <p className="meta" style={{ margin: '2px 0 0' }}>Restante = Meta − Alimentos + Exercício</p>
        <div className="calorias-linha">
          <Anel valor={comido.kcal} total={meta.kcal + queimado} cor={passou ? '#e5484d' : 'var(--accent)'}>
            <strong className={passou ? 'passou' : ''}>{Math.abs(restante).toLocaleString('pt-BR')}</strong>
            <span>{passou ? 'Passou' : 'Restante'}</span>
          </Anel>
          <ul className="calorias-conta">
            <li><span><IconeLinha d={ICONES.bandeira} tamanho={18} traco={1.8} />Meta</span><strong>{meta.kcal.toLocaleString('pt-BR')}</strong></li>
            <li><span><IconeLinha d={ICONES.talheres} tamanho={18} traco={1.8} />Alimentos</span><strong>{comido.kcal.toLocaleString('pt-BR')}</strong></li>
            <li><span><IconeLinha d={ICONES.chama} tamanho={18} traco={1.8} />Exercício</span><strong>{queimado.toLocaleString('pt-BR')}</strong></li>
          </ul>
        </div>
        <p className="meta" style={{ margin: 0 }}>{origem}</p>
      </section>

      <section className="panel">
        <h2 style={{ margin: 0 }}>Macros</h2>
        <div className="macros-aneis">
          {['proteina', 'carboidrato', 'gordura'].map((k) => (
            <div key={k} className="macro-anel">
              <Anel valor={comido[k]} total={meta[k]} cor={CORES[k]} tamanho={84} traco={8}>
                <strong>{Math.round(comido[k])}</strong><span>/{meta[k]} g</span>
              </Anel>
              <span className="name">{NOMES[k]}</span>
              <span className="meta">{comido.kcal ? `${divisao[k]}% das kcal` : '—'}</span>
            </div>
          ))}
        </div>
      </section>

      {erro && <p className="erro">{erro}</p>}

      {REFEICOES_LIVRES.map(([k, nome]) => {
        const itens = diario.itens.filter((i) => i.refeicao === k)
        const deOntem = !itens.length && diario.ontem.some((i) => i.refeicao === k)
        return (
          <section key={k} className="panel refeicao-livre">
            <div className="row between"><h2 style={{ margin: 0 }}>{nome}</h2><strong>{porRefeicao[k].kcal} kcal</strong></div>
            {itens.length > 0 && <div className="meta">P {f1(porRefeicao[k].proteina)} g · C {f1(porRefeicao[k].carboidrato)} g · G {f1(porRefeicao[k].gordura)} g</div>}
            {itens.map((i) => (
              <button type="button" key={i.id} className="item-livre" onClick={() => { setErro(''); editar(i) }}>
                <span style={{ minWidth: 0 }}><span className="name">{i.alimento}</span><span className="meta">{quanto(i)}</span></span>
                <span className="kcal">{i.macros?.kcal ?? 0}</span>
              </button>
            ))}
            <div className="row" style={{ gap: 16 }}>
              <button type="button" className="link adicionar-livre" onClick={() => { setErro(''); setLista(k) }}>+ Adicionar alimento</button>
              {deOntem && <button type="button" className="link" disabled={ocupado} onClick={() => copiar(k)}>Copiar de ontem</button>}
            </div>
          </section>
        )
      })}

      <section className="panel refeicao-livre">
        <div className="row between"><h2 style={{ margin: 0 }}>Exercício</h2><strong>{queimado} kcal</strong></div>
        {exercicios.map((e) => (
          <div key={e.id} className="item-livre">
            <span className="name">{e.alimento}</span>
            <span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><span className="kcal">{e.macros?.kcal}</span><button type="button" className="ghost small" aria-label={`Tirar ${e.alimento}`} onClick={() => tirar(e.id)}>✕</button></span>
          </div>
        ))}
        <button type="button" className="link adicionar-livre" onClick={() => { setErro(''); setExercicio({ nome: '', kcal: '' }) }}>+ Adicionar exercício</button>
        <p className="meta" style={{ margin: 0 }}>As calorias que você gasta treinando voltam para o restante do dia.</p>
      </section>

      {lista && <ListaAlimentos titulo={REFEICOES_LIVRES.find(([k]) => k === lista)[1]} recentes={recentes} onEscolher={escolher} onFechar={() => setLista(null)} />}

      {porcao && (
        <Modal titulo={porcao.alimento} botao={porcao.id ? 'Salvar' : 'Adicionar'} erro={erro} salvando={ocupado} onFechar={() => setPorcao(null)} onSalvar={salvarPorcao}>
          {porcao.unidade ? (
            <div className="full stack" style={{ gap: 10 }}>
              <div className="segmentos modo-quantidade" role="group" aria-label="Anotar por">
                <button type="button" aria-pressed={modo === 'qtd'} onClick={() => mudarModo('qtd')}>Quantidade</button>
                <button type="button" aria-pressed={modo === 'g'} onClick={() => mudarModo('g')}>Gramas</button>
              </div>
              {modo === 'qtd' ? (
                <span className="quantidade-passo">
                  <button type="button" aria-label="Menos" onClick={() => passo(-(num(porcao.porcoes) > 1 ? 1 : 0.5))}>−</button>
                  <input inputMode="decimal" autoFocus aria-label={`Quantidade em ${porcao.unidade.plural}`} value={porcao.porcoes} onChange={(e) => mudaQtd(e.target.value)} />
                  <button type="button" aria-label="Mais" onClick={() => passo(num(porcao.porcoes) >= 1 ? 1 : 0.5)}>+</button>
                </span>
              ) : (
                <span className="quantidade-passo">
                  <button type="button" aria-label="Menos 10 gramas" onClick={() => mudaGramas(String(Math.max(5, (num(porcao.gramas) || 0) - 10)))}>−</button>
                  <input inputMode="decimal" autoFocus aria-label="Gramas" value={porcao.gramas} onChange={(e) => mudaGramas(e.target.value)} />
                  <button type="button" aria-label="Mais 10 gramas" onClick={() => mudaGramas(String((num(porcao.gramas) || 0) + 10))}>+</button>
                </span>
              )}
            </div>
          ) : (
            <div className="row full" style={{ gap: 10, flexWrap: 'nowrap' }}>
              <label style={{ flex: 1 }}>Calorias (kcal)<input inputMode="numeric" autoFocus value={porcao.kcal} onChange={(e) => setPorcao({ ...porcao, kcal: e.target.value })} /></label>
              <label style={{ width: 110 }}>Gramas<input inputMode="decimal" placeholder="opcional" value={porcao.gramas} onChange={(e) => setPorcao({ ...porcao, gramas: e.target.value })} /></label>
            </div>
          )}
          <p className="meta full" style={{ margin: 0 }}>{porcao.unidade ? <><strong>{textoQuantidade(num(porcao.porcoes) || 0, porcao.unidade)} = {f1(num(porcao.gramas) || 0)} g</strong> · 1 {porcao.unidade.singular} = {f1(porcao.unidade.gramas)} g</> : 'Fora da nossa lista: veja as calorias no rótulo.'}</p>
          {previa && (
            <div className="previa-porcao full">
              <strong>{previa.kcal} kcal</strong>
              {porcao.unidade && <span><i style={{ background: CORES.proteina }} />P {f1(previa.proteina)} g</span>}
              {porcao.unidade && <span><i style={{ background: CORES.carboidrato }} />C {f1(previa.carboidrato)} g</span>}
              {porcao.unidade && <span><i style={{ background: CORES.gordura }} />G {f1(previa.gordura)} g</span>}
            </div>
          )}
          {porcao.id && <button type="button" className="link full" style={{ justifySelf: 'start', color: '#e5484d' }} onClick={() => tirar(porcao.id)}>Tirar da refeição</button>}
        </Modal>
      )}

      {exercicio && (
        <Modal titulo="Exercício" botao="Adicionar" erro={erro} salvando={ocupado} onFechar={() => setExercicio(null)} onSalvar={salvarExercicio}>
          <label className="full">O que você fez<input autoFocus placeholder="Ex.: Spinning 45 min" maxLength={80} value={exercicio.nome} onChange={(e) => setExercicio({ ...exercicio, nome: e.target.value })} /></label>
          <label className="full">Calorias gastas<input inputMode="numeric" placeholder="Ex.: 400 (veja no relógio)" value={exercicio.kcal} onChange={(e) => setExercicio({ ...exercicio, kcal: e.target.value })} /></label>
        </Modal>
      )}

      {editandoMeta != null && (
        <Modal titulo="Sua meta de calorias" erro={erro} onFechar={() => setEditandoMeta(null)} onSalvar={salvarMeta}>
          <label className="full">Calorias por dia<input inputMode="numeric" autoFocus value={editandoMeta.kcal} onChange={(e) => setEditandoMeta({ ...editandoMeta, kcal: e.target.value })} /></label>
          <div className="full meta-pct">
            {MACROS_PCT.map(([k, nome]) => {
              const kcal = num(editandoMeta.kcal) || 0
              const g = Math.round((kcal * (num(editandoMeta[k]) || 0)) / (k === 'gordura' ? 900 : 400))
              // A soma nunca passa de 100%: o + e o que for digitado param no que sobra.
              const atual = num(editandoMeta[k]) || 0
              const limite = 100 - (somaPct - atual)
              const definir = (v) => setEditandoMeta({ ...editandoMeta, [k]: v === '' ? '' : String(Math.min(limite, Math.max(0, Math.round(v)))) })
              return (
                <div key={k} className="linha-pct">
                  <span className="nome-pct"><i style={{ background: CORES[k] }} />{nome}</span>
                  <span className="quantidade-passo">
                    <button type="button" aria-label={`Menos ${nome}`} disabled={atual <= 0} onClick={() => definir(atual - 5)}>−</button>
                    <span className="campo-pct"><input inputMode="numeric" aria-label={`% de ${nome}`} value={editandoMeta[k]} onChange={(e) => definir(e.target.value.trim() === '' ? '' : num(e.target.value.replace(/\D/g, '')) || 0)} />%</span>
                    <button type="button" aria-label={`Mais ${nome}`} disabled={atual >= limite} onClick={() => definir(atual + 5)}>+</button>
                  </span>
                  <span className="meta gramas-pct">{g} g</span>
                </div>
              )
            })}
          </div>
          <p className="meta full" style={{ margin: 0, fontWeight: 600, color: somaPct < 100 ? 'var(--warn)' : 'var(--ok)' }}>{somaPct < 100 ? `Sobram ${Math.round(100 - somaPct)}% para distribuir` : 'Total: 100% ✓'}</p>
          <p className="meta full" style={{ margin: 0 }}>Deixe as calorias vazias para voltar {dieta ? 'à meta do seu plano' : 'à meta calculada'}.</p>
        </Modal>
      )}
    </div>
  )
}

// Para o personal: o que o aluno anotou no "Monte sua dieta" nos últimos 7 dias.
export function DietaMontadaDoAluno({ aluno, hoje }) {
  const [linhas, setLinhas] = useState(null)
  useEffect(() => {
    supabase.from('minha_dieta').select('data, refeicao, alimento, gramas, macros').eq('aluno_id', aluno.id).gte('data', somarDias(hoje, -6)).lte('data', hoje).order('created_at')
      .then(({ data, error }) => setLinhas(error ? [] : data))
  }, [aluno.id, hoje])
  if (!linhas?.length) return null
  const dias = [...new Set(linhas.map((l) => l.data))].sort().reverse()
  return (
    <div className="panel stack" style={{ gap: 10 }}>
      <div className="row between"><h2 style={{ margin: 0 }}>Monte sua dieta</h2><span className="meta">o aluno anotou em {dias.length} dos últimos 7 dias</span></div>
      {dias.map((d) => {
        const doDia = linhas.filter((l) => l.data === d)
        const t = resumoDoDia(doDia, { kcal: 0 })
        return (
          <details key={d} className="dia-diario">
            <summary className="row between" style={{ flexWrap: 'nowrap' }}>
              <strong>{d === hoje ? 'Hoje' : fmtData(d).slice(0, 5)}</strong>
              <span className="meta">{t.comido.kcal} kcal · P {f1(t.comido.proteina)} · C {f1(t.comido.carboidrato)} · G {f1(t.comido.gordura)}{t.exercicio ? ` · exercício ${t.exercicio} kcal` : ''}</span>
            </summary>
            {REFEICOES_LIVRES.map(([k, nome]) => {
              const itens = doDia.filter((l) => l.refeicao === k)
              return itens.length > 0 && <p key={k} className="meta" style={{ margin: '4px 0 0' }}><strong>{nome}:</strong> {itens.map((i) => `${i.alimento}${i.gramas ? ` ${f1(i.gramas)} g` : ''}`).join(', ')}</p>
            })}
          </details>
        )
      })}
    </div>
  )
}
