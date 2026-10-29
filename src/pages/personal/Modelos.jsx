import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import Modal from '../../components/Modal.jsx'
import { MODELOS_PRONTOS, letrasAoAplicar, resumoModelo } from '../../lib/modelos.js'
import { AjudaDaPagina } from '../../components/ComoFunciona.jsx'

// Cria as fichas e os exercícios do modelo no aluno. Devolve a mensagem de erro, se houver.
export async function aplicarModelo(aluno, modelo) {
  const letras = letrasAoAplicar(modelo.fichas, aluno.treinos)
  let ordem = aluno.treinos.reduce((m, t) => Math.max(m, t.ordem + 1), 0)
  for (const [i, f] of modelo.fichas.entries()) {
    const { data: t, error } = await supabase.from('treinos').insert({ aluno_id: aluno.id, nome: letras[i] || f.nome, foco: f.foco, ordem: ordem++ }).select('id').single()
    if (error) return error.message
    if (f.exercicios.length) {
      const { error: e2 } = await supabase.from('exercicios').insert(f.exercicios.map((e, j) => ({ ...e, treino_id: t.id, ordem: j })))
      if (e2) return e2.message
    }
  }
  return null
}

export function useModelos() {
  const [modelos, setModelos] = useState(null)
  const carregar = useCallback(async () => {
    const { data } = await supabase.from('modelos_treino').select('*').order('nome')
    setModelos(data || [])
  }, [])
  useEffect(() => { carregar() }, [carregar])
  return { modelos, carregar }
}

export default function Modelos() {
  const { modelos, carregar } = useModelos()
  const [aberto, setAberto] = useState(null)
  const [editando, setEditando] = useState(null)
  const [erro, setErro] = useState('')

  async function adicionarProntos() {
    const faltam = MODELOS_PRONTOS.filter((p) => !modelos.some((m) => m.nome === p.nome))
    const { error } = await supabase.from('modelos_treino').insert(faltam)
    if (error) setErro(`Não foi possível salvar: ${error.message}`)
    carregar()
  }
  async function apagar(m) {
    if (!confirm(`Apagar o modelo "${m.nome}"? Os alunos que já receberam as fichas continuam com elas.`)) return
    await supabase.from('modelos_treino').delete().eq('id', m.id)
    carregar()
  }

  if (!modelos) return <p className="carregando">Carregando…</p>
  const faltamProntos = MODELOS_PRONTOS.some((p) => !modelos.some((m) => m.nome === p.nome))

  return (
    <>
      <div className="row between">
        <div><h1>Treinos modelo</h1><p className="sub">Fichas prontas para aplicar em qualquer aluno com um clique.</p></div>
        {faltamProntos && <button className="primary" onClick={adicionarProntos}>Adicionar modelos prontos</button>}
      </div>
      <AjudaDaPagina />
      {erro && <p className="erro">{erro}</p>}
      <div className="panel meta" style={{ marginBottom: 16 }}>
        Para criar um modelo seu, monte as fichas num aluno e clique em <strong>Salvar como modelo</strong> na aba Treinos dele. Para aplicar, abra o aluno e clique em <strong>Aplicar modelo</strong>.
      </div>
      {modelos.length === 0 && <div className="panel empty">Nenhum modelo ainda. Comece pelos modelos prontos (iniciante, hipertrofia e emagrecimento) e ajuste do seu jeito.</div>}
      <div className="stack">
        {modelos.map((m) => (
          <div className="panel" key={m.id}>
            <div className="row between">
              <button onClick={() => setAberto(aberto === m.id ? null : m.id)} aria-expanded={aberto === m.id} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }}>
                <div className="name" style={{ fontSize: 17 }}>{m.nome}</div>
                <div className="meta">{[m.descricao, resumoModelo(m)].filter(Boolean).join(' · ')}</div>
              </button>
              <div className="row" style={{ gap: 6 }}>
                <button className="small" onClick={() => setEditando(m)}>Renomear</button>
                <button className="ghost small" onClick={() => apagar(m)}>Apagar</button>
              </div>
            </div>
            {aberto === m.id && (
              <div className="grid2" style={{ marginTop: 12 }}>
                {m.fichas.map((f, i) => (
                  <div key={i}>
                    <div className="row" style={{ gap: 0 }}><span className="letter">{f.nome}</span><h3>{f.foco}</h3></div>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                      {f.exercicios.map((e, j) => <li key={j}>{e.nome} <span className="meta">{e.series} × {e.reps}</span></li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {editando && <FormModelo modelo={editando} onFechar={() => setEditando(null)} onSalvo={() => { setEditando(null); carregar() }} />}
    </>
  )
}

// Cria (com as fichas recebidas) ou renomeia um modelo.
export function FormModelo({ modelo, fichas, onFechar, onSalvo }) {
  const [nome, setNome] = useState(modelo?.nome || '')
  const [descricao, setDescricao] = useState(modelo?.descricao || '')
  const [erro, setErro] = useState('')
  async function salvar() {
    if (!nome.trim()) return setErro('Dê um nome ao modelo.')
    const dados = { nome: nome.trim(), descricao: descricao.trim() || null }
    const { error } = modelo
      ? await supabase.from('modelos_treino').update(dados).eq('id', modelo.id)
      : await supabase.from('modelos_treino').insert({ ...dados, fichas })
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    onSalvo()
  }
  return (
    <Modal titulo={modelo ? 'Renomear modelo' : 'Salvar como modelo'} onFechar={onFechar} onSalvar={salvar} erro={erro}>
      <label className="full">Nome<input id="modelo-nome" maxLength={80} placeholder="Ex.: Hipertrofia feminino ABC" value={nome} onChange={(e) => setNome(e.target.value)} /></label>
      <label className="full">Descrição<input id="modelo-descricao" maxLength={300} placeholder="Opcional" value={descricao} onChange={(e) => setDescricao(e.target.value)} /></label>
      {fichas && <p className="meta full" style={{ margin: 0 }}>{resumoModelo({ fichas })}. As cargas e os vídeos vão junto.</p>}
    </Modal>
  )
}

export function AplicarModelo({ aluno, onFechar, onAplicado }) {
  const { modelos } = useModelos()
  const [escolhido, setEscolhido] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  async function salvar() {
    const m = modelos.find((x) => x.id === escolhido)
    if (!m) return setErro('Escolha um modelo.')
    setSalvando(true)
    const falha = await aplicarModelo(aluno, m)
    setSalvando(false)
    if (falha) return setErro(`Não foi possível aplicar: ${falha}`)
    onAplicado()
  }
  return (
    <Modal titulo="Aplicar modelo" botao="Aplicar" onFechar={onFechar} onSalvar={salvar} erro={erro} salvando={salvando}>
      {!modelos ? <p className="carregando full">Carregando…</p> : modelos.length === 0 ? (
        <p className="full" style={{ margin: 0 }}>Você ainda não tem modelos. Abra <Link to="/modelos">Treinos modelo</Link> e adicione os modelos prontos.</p>
      ) : (
        <div className="full stack" style={{ gap: 8 }}>
          {modelos.map((m) => (
            <label key={m.id} className="check" style={{ gridTemplateColumns: '28px 1fr', padding: '10px 4px' }}>
              <input type="radio" name="modelo" checked={escolhido === m.id} onChange={() => setEscolhido(m.id)} />
              <div><div className="name">{m.nome}</div><div className="meta">{resumoModelo(m)}{m.descricao ? ` · ${m.descricao}` : ''}</div></div>
            </label>
          ))}
          {aluno.treinos.length > 0 && <p className="meta" style={{ margin: 0 }}>As fichas atuais de {aluno.nome.split(' ')[0]} continuam. As do modelo entram com as próximas letras.</p>}
        </div>
      )}
    </Modal>
  )
}
