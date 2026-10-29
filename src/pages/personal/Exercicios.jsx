import { useState } from 'react'
import { supabase } from '../../supabase.js'
import Modal from '../../components/Modal.jsx'
import { ListaExercicios, useBiblioteca } from '../../components/SeletorExercicios.jsx'
import { GRUPOS } from '../../lib/exercicios.js'
import { AjudaDaPagina } from '../../components/ComoFunciona.jsx'

export default function Exercicios() {
  const { lista, meus, recarregar } = useBiblioteca()
  const [editando, setEditando] = useState(null) // {} = novo
  const [erro, setErro] = useState('')

  async function apagar(e) {
    if (!confirm(`Apagar "${e.nome}" da sua biblioteca? As fichas que já têm esse exercício não mudam.`)) return
    const { error } = await supabase.from('exercicios_biblioteca').delete().eq('id', e.id)
    if (error) setErro(`Não foi possível apagar: ${error.message}`)
    recarregar()
  }

  return (
    <>
      <div className="row between">
        <div><h1>Exercícios</h1><p className="sub">{lista.length} exercícios para montar as fichas, separados por grupo muscular.</p></div>
        <button className="primary" onClick={() => setEditando({})}>Cadastrar exercício</button>
      </div>
      <AjudaDaPagina />
      {erro && <p className="erro">{erro}</p>}
      <div className="panel meta" style={{ marginBottom: 16 }}>
        Na aba Treinos do aluno, clique em <strong>Adicionar exercícios</strong> para marcar vários de uma vez. Os que você cadastrar aqui aparecem primeiro, com o seu vídeo de execução{meus.length ? ` (você tem ${meus.length})` : ''}.
      </div>
      <div className="panel">
        <ListaExercicios lista={lista} acoes={(e) => e.meu && (
          <>
            <button className="ghost small" onClick={() => setEditando(e)}>Editar</button>
            <button className="ghost small" aria-label={`Apagar ${e.nome}`} onClick={() => apagar(e)}>✕</button>
          </>
        )} />
      </div>
      {editando && <FormExercicioBiblioteca exercicio={editando} onFechar={() => setEditando(null)} onSalvo={() => { setEditando(null); recarregar() }} />}
    </>
  )
}

function FormExercicioBiblioteca({ exercicio: ex, onFechar, onSalvo }) {
  const [d, setD] = useState({ nome: ex.nome || '', grupo: ex.grupo || GRUPOS[0], equipamento: ex.equipamento || '', video: ex.video_url || '' })
  const [erro, setErro] = useState('')
  const campo = (k) => ({ id: `bib-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  async function salvar() {
    if (!d.nome.trim()) return setErro('Informe o nome do exercício.')
    const video = d.video.trim()
    if (video && !/^https:\/\//.test(video)) return setErro('O link do vídeo precisa começar com https://')
    const dados = { nome: d.nome.trim(), grupo: d.grupo, equipamento: d.equipamento.trim() || null, video_url: video || null }
    const { error } = ex.id
      ? await supabase.from('exercicios_biblioteca').update(dados).eq('id', ex.id)
      : await supabase.from('exercicios_biblioteca').insert(dados)
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    onSalvo()
  }
  return (
    <Modal titulo={ex.id ? 'Editar exercício' : 'Cadastrar exercício'} onFechar={onFechar} onSalvar={salvar} erro={erro}>
      <label className="full">Nome<input maxLength={80} placeholder="Ex.: Agachamento com pausa" {...campo('nome')} /></label>
      <label>Grupo muscular<select {...campo('grupo')}>{GRUPOS.map((g) => <option key={g}>{g}</option>)}</select></label>
      <label>Equipamento<input maxLength={40} placeholder="Ex.: Halteres" {...campo('equipamento')} /></label>
      <label className="full">Vídeo de execução<input type="url" placeholder="Opcional, link do YouTube ou Instagram" {...campo('video')} /></label>
    </Modal>
  )
}
