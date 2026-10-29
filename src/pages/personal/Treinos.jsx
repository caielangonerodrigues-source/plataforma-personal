import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import Modal from '../../components/Modal.jsx'
import { num } from '../../lib/formato.js'
import { fichasDoAluno } from '../../lib/modelos.js'
import { BIBLIOTECA } from '../../lib/exercicios.js'
import SeletorExercicios from '../../components/SeletorExercicios.jsx'
import { AplicarModelo, FormModelo } from './Modelos.jsx'

export default function Treinos({ aluno, recarregar }) {
  const [modal, setModal] = useState(null) // { tipo: 'ficha' } | { tipo: 'exercicio', treino, exercicio? }
  const [confirmar, setConfirmar] = useState(null)
  const [erro, setErro] = useState('')

  async function rodar(q) {
    const { error } = await q
    if (error) { setErro(`Não foi possível salvar: ${error.message}`); return false }
    setErro(''); await recarregar(); return true
  }

  return (
    <>
      <div className="row between" style={{ marginBottom: 12 }}>
        <span className="meta">Fichas que o aluno vê quando entra</span>
        <div className="row" style={{ gap: 6 }}>
          <Link className="small botao-link" to={`/assistente?aluno=${aluno.id}&tipo=treino`}>Gerar com IA</Link>
          {aluno.treinos.length > 0 && <button className="small" onClick={() => setModal({ tipo: 'salvarModelo' })}>Salvar como modelo</button>}
          <button className="small" onClick={() => setModal({ tipo: 'aplicarModelo' })}>Aplicar modelo</button>
          <button className="primary small" onClick={() => setModal({ tipo: 'ficha' })}>Nova ficha</button>
        </div>
      </div>
      {erro && <p className="erro">{erro}</p>}
      <div className="stack">
        {aluno.treinos.map((t) => (
          <div className="panel" key={t.id}>
            <div className="ficha-head">
              <div className="row" style={{ gap: 0 }}><span className="letter">{t.nome}</span><h3>{t.foco}</h3></div>
              <div className="row">
                <button className="small" onClick={() => setModal({ tipo: 'biblioteca', treino: t })}>Adicionar exercícios</button>
                {confirmar === t.id
                  ? <button className="small" style={{ color: 'var(--warn)' }} onClick={() => rodar(supabase.from('treinos').delete().eq('id', t.id))}>Confirmar exclusão</button>
                  : <button className="ghost small" onClick={() => setConfirmar(t.id)}>Excluir ficha</button>}
              </div>
            </div>
            <div className="tablewrap">
              <table>
                <thead><tr><th>Exercício</th><th className="num">Séries</th><th className="num">Reps</th><th className="num">Carga</th><th className="num">Descanso</th><th /></tr></thead>
                <tbody>
                  {t.exercicios.map((e) => (
                    <tr key={e.id}>
                      <td>
                        {e.nome}{e.obs && <div className="meta">{e.obs}</div>}
                        {e.video_url && <div><a className="meta" href={e.video_url} target="_blank" rel="noreferrer">Ver vídeo</a></div>}
                      </td>
                      <td className="num">{e.series}</td><td className="num">{e.reps}</td><td className="num">{e.carga}</td><td className="num">{e.descanso}</td>
                      <td style={{ whiteSpace: 'nowrap' }}><button className="ghost small" onClick={() => setModal({ tipo: 'exercicio', treino: t, exercicio: e })}>Editar</button><button className="ghost small" aria-label={`Remover ${e.nome}`} onClick={() => rodar(supabase.from('exercicios').delete().eq('id', e.id))}>✕</button></td>
                    </tr>
                  ))}
                  {!t.exercicios.length && <tr><td colSpan="6" className="empty">Nenhum exercício ainda.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {!aluno.treinos.length && <div className="panel empty">Este aluno ainda não tem ficha. Clique em "Aplicar modelo" para usar uma ficha pronta ou em "Nova ficha" para montar o treino A.</div>}
      </div>

      {modal?.tipo === 'aplicarModelo' && <AplicarModelo aluno={aluno} onFechar={() => setModal(null)} onAplicado={() => { setModal(null); recarregar() }} />}
      {modal?.tipo === 'salvarModelo' && <FormModelo fichas={fichasDoAluno(aluno.treinos)} onFechar={() => setModal(null)} onSalvo={() => setModal(null)} />}
      {modal?.tipo === 'ficha' && <FormFicha aluno={aluno} onFechar={() => setModal(null)} rodar={rodar} />}
      {modal?.tipo === 'biblioteca' && (
        <SeletorExercicios
          treino={modal.treino}
          onFechar={() => setModal(null)}
          onPersonalizado={() => setModal({ tipo: 'exercicio', treino: modal.treino })}
          onAdicionar={async (lista) => {
            const ordem = modal.treino.exercicios.reduce((m, e) => Math.max(m, e.ordem + 1), 0)
            const { error } = await supabase.from('exercicios').insert(lista.map((e, i) => ({ ...e, treino_id: modal.treino.id, ordem: ordem + i })))
            if (error) return `Não foi possível salvar: ${error.message}`
            setModal(null); recarregar(); return null
          }}
        />
      )}
      {modal?.tipo === 'exercicio' && <FormExercicio treino={modal.treino} exercicio={modal.exercicio} onFechar={() => setModal(null)} rodar={rodar} />}
    </>
  )
}

function FormFicha({ aluno, onFechar, rodar }) {
  const [nome, setNome] = useState(String.fromCharCode(65 + aluno.treinos.length))
  const [foco, setFoco] = useState('')
  const [erro, setErro] = useState('')
  async function salvar() {
    if (!foco.trim()) return setErro('Informe o foco do treino.')
    const ordem = aluno.treinos.reduce((m, t) => Math.max(m, t.ordem + 1), 0)
    if (await rodar(supabase.from('treinos').insert({ aluno_id: aluno.id, nome: nome.trim().toUpperCase(), foco: foco.trim(), ordem }))) onFechar()
  }
  return (
    <Modal titulo="Nova ficha" botao="Criar ficha" onFechar={onFechar} onSalvar={salvar} erro={erro}>
      <label>Letra<input id="ficha-nome" maxLength={3} required value={nome} onChange={(e) => setNome(e.target.value)} /></label>
      <label>Foco do treino<input id="ficha-foco" placeholder="Ex.: Peito e tríceps" value={foco} onChange={(e) => setFoco(e.target.value)} /></label>
    </Modal>
  )
}

function FormExercicio({ treino, exercicio: ex, onFechar, rodar }) {
  const [d, setD] = useState(() => (ex
    ? { nome: ex.nome, series: String(ex.series ?? ''), reps: ex.reps ?? '', carga: ex.carga === '—' ? '' : ex.carga ?? '', descanso: ex.descanso ?? '', obs: ex.obs ?? '', video: ex.video_url ?? '' }
    : { nome: '', series: '3', reps: '12', carga: '', descanso: '60s', obs: '', video: '' }))
  const [erro, setErro] = useState('')
  const campo = (k) => ({ id: `ex-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  async function salvar() {
    if (!d.nome.trim()) return setErro('Informe o nome do exercício.')
    const video = d.video.trim()
    if (video && !/^https:\/\//.test(video)) return setErro('O link do vídeo precisa começar com https://')
    const dados = { nome: d.nome.trim(), series: num(d.series) || 1, reps: d.reps, carga: d.carga || '—', descanso: d.descanso, obs: d.obs || null, video_url: video || null }
    const ordem = treino.exercicios.reduce((m, e) => Math.max(m, e.ordem + 1), 0)
    const ok = await rodar(ex
      ? supabase.from('exercicios').update(dados).eq('id', ex.id)
      : supabase.from('exercicios').insert({ ...dados, treino_id: treino.id, ordem }))
    if (ok) onFechar()
  }
  return (
    <Modal titulo={`${ex ? 'Editar exercício' : 'Exercício'} na ficha ${treino.nome}`} botao={ex ? 'Salvar' : 'Adicionar'} onFechar={onFechar} onSalvar={salvar} erro={erro}>
      <label className="full">Exercício<input list="sugestoes" required {...campo('nome')} /></label>
      <datalist id="sugestoes">{BIBLIOTECA.map((s) => <option key={s.nome} value={s.nome} />)}</datalist>
      <label>Séries<input type="number" min="1" {...campo('series')} /></label>
      <label>Repetições<input {...campo('reps')} /></label>
      <label>Carga<input placeholder="Ex.: 20 kg" {...campo('carga')} /></label>
      <label>Descanso<input {...campo('descanso')} /></label>
      <label className="full">Observação<input placeholder="Opcional, ex.: cadência 3-1-1" {...campo('obs')} /></label>
      <label className="full">Vídeo de execução<input type="url" placeholder="Opcional, link do YouTube ou Instagram" {...campo('video')} /></label>
    </Modal>
  )
}
