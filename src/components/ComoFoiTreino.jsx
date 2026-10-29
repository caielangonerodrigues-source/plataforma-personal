import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { fmtData } from '../lib/formato.js'

export const NIVEL = (n) => (n <= 3 ? 'leve' : n <= 6 ? 'moderado' : n <= 8 ? 'pesado' : 'no limite')

// Área do aluno: no fim do treino, nota de esforço (1 a 10) e se sentiu dor.
export default function ComoFoiTreino({ aluno, treinoId, hoje }) {
  const [salvo, setSalvo] = useState(undefined) // undefined = carregando, null = não enviou
  const [editando, setEditando] = useState(false)
  const [d, setD] = useState({ esforco: null, dor: false, dor_local: '', comentario: '' })
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase.from('feedbacks_treino').select('*').eq('aluno_id', aluno.id).eq('data', hoje).maybeSingle()
      .then(({ data, error }) => setSalvo(error ? false : data || null))
  }, [aluno.id, hoje])

  if (salvo === undefined || salvo === false) return null // carregando, ou o SQL novo ainda não rodou
  if (salvo && !editando) {
    return (
      <div className="panel row between" style={{ marginTop: 16 }}>
        <span className="meta" style={{ color: 'var(--ink)' }}>Treino de hoje: esforço <strong>{salvo.esforco}/10</strong> ({NIVEL(salvo.esforco)}){salvo.dor ? ` · dor${salvo.dor_local ? ` em ${salvo.dor_local}` : ''}` : ' · sem dor'}. Seu personal já recebeu.</span>
        <button className="link" onClick={() => { setD({ ...salvo, dor_local: salvo.dor_local || '', comentario: salvo.comentario || '' }); setEditando(true) }}>Mudar</button>
      </div>
    )
  }

  async function enviar() {
    if (!d.esforco) return setErro('Escolha uma nota de 1 a 10.')
    const dados = { aluno_id: aluno.id, data: hoje, treino_id: treinoId || null, esforco: d.esforco, dor: d.dor, dor_local: d.dor ? d.dor_local.trim() || null : null, comentario: d.comentario.trim() || null }
    const { data, error } = await supabase.from('feedbacks_treino').upsert(dados, { onConflict: 'aluno_id,data' }).select().maybeSingle()
    if (error) return setErro('Não foi possível enviar. Tente de novo.')
    setErro(''); setSalvo(data || dados); setEditando(false)
  }

  return (
    <div className="panel stack" style={{ marginTop: 16, gap: 10 }}>
      <h2 style={{ margin: 0 }}>Como foi o treino?</h2>
      <div>
        <span className="meta">Esforço de 1 (muito leve) a 10 (no limite){d.esforco ? `: ${NIVEL(d.esforco)}` : ''}</span>
        <div className="chips esforco" role="group" aria-label="Nota de esforço" style={{ marginTop: 6 }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button type="button" key={n} className={`chip${d.esforco === n ? ' on' : ''}`} aria-pressed={d.esforco === n} onClick={() => setD({ ...d, esforco: n })}>{n}</button>
          ))}
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <span className="meta">Sentiu alguma dor?</span>
        <button type="button" className={`chip${!d.dor ? ' on' : ''}`} onClick={() => setD({ ...d, dor: false })}>Não</button>
        <button type="button" className={`chip${d.dor ? ' on' : ''}`} onClick={() => setD({ ...d, dor: true })}>Sim</button>
      </div>
      {d.dor && <input id="fb-dor" maxLength={120} placeholder="Onde? Ex.: joelho direito no agachamento" value={d.dor_local} onChange={(e) => setD({ ...d, dor_local: e.target.value })} />}
      <textarea id="fb-comentario" rows={2} maxLength={500} placeholder="Comentário para o personal (opcional)" value={d.comentario} onChange={(e) => setD({ ...d, comentario: e.target.value })} />
      {erro && <p className="erro">{erro}</p>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {editando && <button onClick={() => setEditando(false)}>Cancelar</button>}
        <button className="primary" onClick={enviar}>Enviar para o personal</button>
      </div>
    </div>
  )
}

// Personal: últimos feedbacks. Com alunos, mostra o nome e vira link para o aluno.
export function ListaFeedbacks({ feedbacks, alunos }) {
  if (!feedbacks.length) return null
  const nome = (id) => alunos?.find((a) => a.id === id)?.nome
  return (
    <div className="list">
      {feedbacks.map((f) => {
        const corpo = (
          <>
            <div style={{ minWidth: 0 }}>
              {alunos && <div className="name">{nome(f.aluno_id) || 'Aluno'}</div>}
              <div className="meta" style={{ color: alunos ? undefined : 'var(--ink)' }}>
                {fmtData(f.data)} · esforço <strong>{f.esforco}/10</strong> ({NIVEL(f.esforco)}){f.dor ? ` · dor${f.dor_local ? ` em ${f.dor_local}` : ''}` : ''}
              </div>
              {f.comentario && <div className="meta">“{f.comentario}”</div>}
            </div>
            {f.dor ? <span className="pill pendente">Dor</span> : f.esforco >= 9 ? <span className="pill pendente">No limite</span> : <span className="pill ativo">Ok</span>}
          </>
        )
        return alunos
          ? <Link className="item" key={f.id || f.aluno_id + f.data} to={`/alunos/${f.aluno_id}?aba=progressao`}>{corpo}</Link>
          : <div className="item" key={f.id || f.data} style={{ cursor: 'default' }}>{corpo}</div>
      })}
    </div>
  )
}
