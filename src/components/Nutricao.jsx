import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { ALIMENTOS, ATIVIDADE, REFEICOES_PADRAO, macrosDoItem, somarItens, sugerirMetas, totalDaDieta } from '../lib/nutricao.js'
import { f1, fmtData, num, porData } from '../lib/formato.js'

const VAZIA = { calorias: null, proteina: null, carboidrato: null, gordura: null, agua: null, refeicoes: REFEICOES_PADRAO, orientacoes: '' }
const AVISO = 'Orientação nutricional geral para acompanhar o treino. Para dieta clínica (doenças, gestação, alergias), procure um nutricionista.'

export function useDieta(alunoId) {
  const [dieta, setDieta] = useState(undefined) // undefined = carregando, null = sem dieta
  const carregar = useCallback(async () => {
    const { data } = await supabase.from('dietas').select('*').eq('aluno_id', alunoId).maybeSingle()
    setDieta(data || null)
  }, [alunoId])
  useEffect(() => { carregar() }, [carregar])
  return { dieta, carregar }
}

// Grava a dieta inteira do aluno (cria ou substitui).
export async function salvarDieta(alunoId, d) {
  const inteiro = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Math.round(Number(v)))
  const { error } = await supabase.from('dietas').upsert({
    aluno_id: alunoId,
    calorias: inteiro(d.calorias), proteina: inteiro(d.proteina), carboidrato: inteiro(d.carboidrato), gordura: inteiro(d.gordura),
    agua: d.agua === '' || d.agua == null ? null : num(d.agua),
    refeicoes: (d.refeicoes || []).map((r) => ({ ...r, itens: (r.itens || []).filter((i) => i.alimento?.trim()).map((i) => ({ ...i, alimento: i.alimento.trim(), gramas: num(i.gramas), kcal: num(i.kcal) })) })),
    orientacoes: d.orientacoes?.trim() || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'aluno_id' })
  return error?.message || null
}

// Metas no topo e refeições em cartões (área do aluno e prévia da IA).
export function VerDieta({ dieta }) {
  const total = totalDaDieta(dieta.refeicoes)
  const metas = [['kcal', dieta.calorias, total.kcal], ['Proteína (g)', dieta.proteina, total.proteina], ['Carboidrato (g)', dieta.carboidrato, total.carboidrato], ['Gordura (g)', dieta.gordura, total.gordura], ['Água (L)', dieta.agua]]
  return (
    <div className="stack">
      <div className="macros">
        {metas.map(([l, meta, somado]) => (
          <div className="panel kpi" key={l}>
            <div className="n">{f1(meta ?? somado)}</div>
            <div className="l">{l}</div>
          </div>
        ))}
      </div>
      {(dieta.refeicoes || []).filter((r) => r.itens?.length).map((r, i) => {
        const t = somarItens(r.itens)
        return (
          <div className="panel refeicao" key={i}>
            <div className="row between"><h3>{r.horario && <span className="mono" style={{ color: 'var(--accent)', marginRight: 8 }}>{r.horario}</span>}{r.nome}</h3>{t.kcal > 0 && <span className="meta">{t.kcal} kcal</span>}</div>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {r.itens.map((it, j) => (
                <li key={j}>{it.alimento}{(it.quantidade || it.gramas) && <span className="meta"> · {[it.quantidade, it.gramas && `${f1(it.gramas)} g`].filter(Boolean).join(', ')}</span>}</li>
              ))}
            </ul>
            {r.obs && <p className="meta" style={{ margin: '6px 0 0' }}>{r.obs}</p>}
          </div>
        )
      })}
      {dieta.orientacoes && <div className="panel"><h3 style={{ marginTop: 0 }}>Orientações</h3><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{dieta.orientacoes}</p></div>}
      <p className="meta" style={{ margin: 0 }}>{AVISO}</p>
    </div>
  )
}

// Aba "Dieta" da área do aluno.
export function DietaAluno({ alunoId }) {
  const { dieta } = useDieta(alunoId)
  if (dieta === undefined) return <p className="carregando">Carregando…</p>
  if (!dieta) return <div className="panel empty">Seu personal ainda não montou seu plano alimentar.</div>
  return <><p className="meta" style={{ marginTop: 0 }}>Atualizado em {fmtData(dieta.updated_at)}</p><VerDieta dieta={dieta} /></>
}

// Aba "Nutrição" do aluno, na área do personal: calcula metas e monta as refeições.
export default function Nutricao({ aluno }) {
  const { dieta, carregar } = useDieta(aluno.id)
  const [d, setD] = useState(null)
  const [atividade, setAtividade] = useState('moderado')
  const [msg, setMsg] = useState({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { if (dieta !== undefined) setD(dieta ? { ...VAZIA, ...dieta } : VAZIA) }, [dieta])
  if (!d) return <p className="carregando">Carregando…</p>

  const ultima = (aluno.avaliacoes || []).slice().sort(porData).at(-1)
  const base = { peso: Number(ultima?.peso) || null, altura: Number(ultima?.altura) || null, gordura: Number(ultima?.gordura) || null, idade: aluno.idade, sexo: aluno.sexo, objetivo: aluno.objetivo }
  const sug = sugerirMetas({ ...base, atividade })
  const total = totalDaDieta(d.refeicoes)

  const muda = (k, v) => setD({ ...d, [k]: v })
  const mudaRefeicao = (i, r) => setD({ ...d, refeicoes: d.refeicoes.map((x, j) => (j === i ? r : x)) })
  function mudaItem(i, j, k, v) {
    const r = d.refeicoes[i]
    const itens = r.itens.map((it, n) => {
      if (n !== j) return it
      const novo = { ...it, [k]: v }
      const m = (k === 'alimento' || k === 'gramas') && macrosDoItem(novo.alimento, num(novo.gramas))
      if (m) Object.assign(novo, m)
      else if (k === 'alimento') Object.assign(novo, { kcal: '', proteina: null, carboidrato: null, gordura: null })
      return novo
    })
    mudaRefeicao(i, { ...r, itens })
  }
  async function salvar() {
    setSalvando(true)
    const falha = await salvarDieta(aluno.id, d)
    setSalvando(false)
    setMsg(falha ? { erro: `Não foi possível salvar: ${falha}` } : { ok: 'Dieta salva. O aluno já vê na aba Dieta.' })
    if (!falha) carregar()
  }

  return (
    <div className="stack">
      <div className="row between">
        <span className="meta">{dieta ? `Última alteração em ${fmtData(dieta.updated_at)}` : 'Este aluno ainda não tem dieta.'}</span>
        <Link className="small botao-link" to={`/assistente?aluno=${aluno.id}&tipo=dieta`}>Gerar com IA</Link>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Metas do dia</h2>
        {sug ? (
          <div className="row between" style={{ marginBottom: 12, alignItems: 'flex-end' }}>
            <label style={{ flex: '1 1 260px' }}>Nível de atividade
              <select value={atividade} onChange={(e) => setAtividade(e.target.value)}>{ATIVIDADE.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </label>
            <div className="meta" style={{ flex: '2 1 280px' }}>
              Basal {sug.tmb} kcal · gasto do dia {sug.gasto} kcal · objetivo: {sug.tipo === 'emagrecer' ? 'emagrecer (−20%)' : sug.tipo === 'ganhar' ? 'ganhar massa (+10%)' : 'manter'}.<br />
              Sugestão: {sug.calorias} kcal, {sug.proteina} g proteína, {sug.carboidrato} g carboidrato, {sug.gordura} g gordura, {f1(sug.agua)} L de água.
            </div>
            <button className="small" onClick={() => setD({ ...d, calorias: sug.calorias, proteina: sug.proteina, carboidrato: sug.carboidrato, gordura: sug.gordura, agua: sug.agua })}>Usar sugestão</button>
          </div>
        ) : <p className="meta">Registre uma avaliação física com peso e altura (e a idade no cadastro) para o site sugerir as metas.</p>}
        <div className="form">
          <label>Calorias (kcal)<input id="dieta-kcal" inputMode="numeric" value={d.calorias ?? ''} onChange={(e) => muda('calorias', e.target.value)} /></label>
          <label>Proteína (g)<input id="dieta-p" inputMode="numeric" value={d.proteina ?? ''} onChange={(e) => muda('proteina', e.target.value)} /></label>
          <label>Carboidrato (g)<input id="dieta-c" inputMode="numeric" value={d.carboidrato ?? ''} onChange={(e) => muda('carboidrato', e.target.value)} /></label>
          <label>Gordura (g)<input id="dieta-g" inputMode="numeric" value={d.gordura ?? ''} onChange={(e) => muda('gordura', e.target.value)} /></label>
          <label>Água (litros)<input id="dieta-agua" inputMode="decimal" value={d.agua ?? ''} onChange={(e) => muda('agua', e.target.value)} /></label>
        </div>
        <p className="meta" style={{ marginBottom: 0 }}>
          Somando as refeições: <strong>{total.kcal} kcal</strong> · P {f1(total.proteina)} g · C {f1(total.carboidrato)} g · G {f1(total.gordura)} g
          {d.calorias ? ` (${Math.round((total.kcal / d.calorias) * 100)}% da meta)` : ''}
        </p>
      </div>

      <datalist id="alimentos">{ALIMENTOS.map((a) => <option key={a.nome} value={a.nome} />)}</datalist>
      {d.refeicoes.map((r, i) => (
        <div className="panel refeicao" key={i}>
          <div className="row" style={{ marginBottom: 8 }}>
            <input aria-label="Horário" style={{ width: 84 }} value={r.horario || ''} onChange={(e) => mudaRefeicao(i, { ...r, horario: e.target.value })} />
            <input aria-label="Nome da refeição" style={{ flex: 1, fontWeight: 700 }} value={r.nome} onChange={(e) => mudaRefeicao(i, { ...r, nome: e.target.value })} />
            <button className="ghost small" aria-label={`Remover ${r.nome}`} onClick={() => setD({ ...d, refeicoes: d.refeicoes.filter((_, j) => j !== i) })}>✕</button>
          </div>
          {r.itens.length > 0 && (
            <div className="tablewrap">
              <table className="itens">
                <thead><tr><th>Alimento</th><th>Medida</th><th style={{ width: 70 }}>Gramas</th><th style={{ width: 70 }}>kcal</th><th className="opcional">P / C / G</th><th /></tr></thead>
                <tbody>
                  {r.itens.map((it, j) => (
                    <tr key={j}>
                      <td style={{ minWidth: 150 }}><input list="alimentos" aria-label="Alimento" value={it.alimento || ''} onChange={(e) => mudaItem(i, j, 'alimento', e.target.value)} /></td>
                      <td style={{ minWidth: 110 }}><input aria-label="Medida caseira" placeholder="Ex.: 1 concha" value={it.quantidade || ''} onChange={(e) => mudaItem(i, j, 'quantidade', e.target.value)} /></td>
                      <td><input aria-label="Gramas" placeholder="g" inputMode="decimal" value={it.gramas ?? ''} onChange={(e) => mudaItem(i, j, 'gramas', e.target.value)} /></td>
                      <td><input aria-label="Calorias" placeholder="kcal" inputMode="numeric" value={it.kcal ?? ''} onChange={(e) => mudaItem(i, j, 'kcal', e.target.value)} /></td>
                      <td className="meta mono opcional" style={{ whiteSpace: 'nowrap' }}>{it.proteina != null ? `${f1(it.proteina)} / ${f1(it.carboidrato)} / ${f1(it.gordura)}` : '—'}</td>
                      <td><button className="ghost small" aria-label="Remover alimento" onClick={() => mudaRefeicao(i, { ...r, itens: r.itens.filter((_, n) => n !== j) })}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button className="small" style={{ marginTop: 8 }} onClick={() => mudaRefeicao(i, { ...r, itens: [...r.itens, { alimento: '', quantidade: '', gramas: '' }] })}>Adicionar alimento</button>
        </div>
      ))}
      <div><button className="small" onClick={() => setD({ ...d, refeicoes: [...d.refeicoes, { nome: 'Nova refeição', horario: '', itens: [] }] })}>Adicionar refeição</button></div>

      <div className="panel">
        <label>Orientações para o aluno
          <textarea id="dieta-orientacoes" rows={4} maxLength={4000} placeholder="Ex.: beber água ao longo do dia, trocas permitidas, o que comer antes do treino…" value={d.orientacoes || ''} onChange={(e) => muda('orientacoes', e.target.value)} />
        </label>
        <p className="meta" style={{ marginBottom: 0 }}>{AVISO} Escolha um alimento da lista e informe os gramas para calcular as calorias sozinho (valores aproximados da tabela TACO).</p>
      </div>
      {msg.erro && <p className="erro">{msg.erro}</p>}
      {msg.ok && <p className="ok">{msg.ok}</p>}
      <div className="row" style={{ justifyContent: 'flex-end' }}><button className="primary" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar dieta'}</button></div>
    </div>
  )
}
