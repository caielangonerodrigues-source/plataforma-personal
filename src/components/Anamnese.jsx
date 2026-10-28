import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { fmtData } from '../lib/formato.js'

export const PARQ = [
  'Algum médico já disse que você possui algum problema de coração e que só deveria realizar atividade física supervisionada por profissionais de saúde?',
  'Você sente dores no peito quando pratica atividade física?',
  'No último mês, você sentiu dores no peito quando praticou atividade física?',
  'Você apresenta desequilíbrio devido a tontura e/ou perda de consciência?',
  'Você possui algum problema ósseo ou articular que poderia ser piorado pela atividade física?',
  'Você toma atualmente algum medicamento para pressão arterial e/ou problema de coração?',
  'Sabe de alguma outra razão pela qual você não deve praticar atividade física?',
]
const CAMPOS = [
  ['lesoes', 'Lesões ou dores', 'Ex.: dor no joelho direito ao agachar'],
  ['doencas', 'Doenças ou condições', 'Ex.: hipertensão, diabetes, asma'],
  ['medicamentos', 'Medicamentos em uso', ''],
  ['cirurgias', 'Cirurgias', ''],
  ['atividade_atual', 'Atividade física atual', 'Ex.: caminhada 2x por semana'],
  ['observacoes', 'Observações', ''],
]

export const temAlertaParq = (a) => Object.values(a?.parq || {}).some(Boolean)

// Anamnese + PAR-Q. Aluno e personal podem preencher; o resultado fica igual para os dois.
export default function Anamnese({ alunoId, onSalva, intro }) {
  const [dados, setDados] = useState(null)
  const [editando, setEditando] = useState(false)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    supabase.from('anamneses').select('*').eq('aluno_id', alunoId).maybeSingle().then(({ data }) => {
      setDados(data || { aluno_id: alunoId, parq: {} })
      setEditando(!data)
    })
  }, [alunoId])

  if (!dados) return <p className="carregando">Carregando…</p>
  const respondidas = PARQ.every((_, i) => typeof dados.parq[`p${i + 1}`] === 'boolean')

  async function salvar(e) {
    e.preventDefault()
    if (!respondidas) return setErro('Responda as 7 perguntas do PAR-Q.')
    const { aluno_id, parq, lesoes, doencas, medicamentos, cirurgias, atividade_atual, observacoes } = dados
    const { error } = await supabase.from('anamneses').upsert({ aluno_id, parq, lesoes, doencas, medicamentos, cirurgias, atividade_atual, observacoes, updated_at: new Date().toISOString() })
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    setErro(''); setEditando(false); setSalvo(true); onSalva?.()
  }

  const alerta = temAlertaParq(dados)
  if (!editando) {
    return (
      <div className="stack">
        {alerta && <div className="panel" style={{ borderColor: 'var(--warn)', background: 'var(--warn-soft)' }}><strong style={{ color: 'var(--warn)' }}>Atenção:</strong> houve resposta "sim" no PAR-Q. Recomenda-se liberação médica antes de aumentar a intensidade.</div>}
        {salvo && <p className="ok">Anamnese salva.</p>}
        <div className="panel">
          <div className="row between"><h2>PAR-Q</h2><span className="meta">Atualizada em {fmtData(dados.updated_at)}</span></div>
          <ol style={{ paddingLeft: 20, margin: '10px 0 0' }}>
            {PARQ.map((q, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{q} <strong style={{ color: dados.parq[`p${i + 1}`] ? 'var(--warn)' : 'var(--ok)' }}>{dados.parq[`p${i + 1}`] ? 'Sim' : 'Não'}</strong></li>
            ))}
          </ol>
        </div>
        <div className="panel">
          <h2>Histórico</h2>
          <dl style={{ margin: '10px 0 0', display: 'grid', gap: 8 }}>
            {CAMPOS.map(([k, l]) => <div key={k}><dt className="meta">{l}</dt><dd style={{ margin: 0 }}>{dados[k] || '—'}</dd></div>)}
          </dl>
        </div>
        <div><button onClick={() => { setSalvo(false); setEditando(true) }}>Editar anamnese</button></div>
      </div>
    )
  }

  return (
    <form className="stack" onSubmit={salvar}>
      {intro}
      <div className="panel">
        <h2>PAR-Q</h2>
        <p className="meta" style={{ margin: '4px 0 10px' }}>Questionário de prontidão para atividade física.</p>
        {PARQ.map((q, i) => {
          const k = `p${i + 1}`
          return (
            <fieldset key={k} style={{ border: 0, borderBottom: '1px solid var(--line)', padding: '10px 0', margin: 0 }}>
              <legend style={{ padding: 0, marginBottom: 6 }}>{i + 1}. {q}</legend>
              <div className="row">
                {[[false, 'Não'], [true, 'Sim']].map(([v, l]) => (
                  <label key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, textTransform: 'none', letterSpacing: 0, fontSize: 15, color: 'var(--ink)' }}>
                    <input type="radio" name={k} id={`${k}-${l}`} style={{ width: 18, height: 18 }} checked={dados.parq[k] === v} onChange={() => setDados({ ...dados, parq: { ...dados.parq, [k]: v } })} />{l}
                  </label>
                ))}
              </div>
            </fieldset>
          )
        })}
      </div>
      <div className="panel form">
        <div className="secao" style={{ marginTop: 0 }}>Histórico de saúde</div>
        {CAMPOS.map(([k, l, ph]) => (
          <label key={k} className="full">{l}<textarea id={`anamnese-${k}`} rows={2} placeholder={ph} value={dados[k] || ''} onChange={(e) => setDados({ ...dados, [k]: e.target.value })} /></label>
        ))}
      </div>
      {erro && <p className="erro">{erro}</p>}
      <div><button className="primary">Salvar anamnese</button></div>
    </form>
  )
}
