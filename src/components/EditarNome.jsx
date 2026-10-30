import { useState } from 'react'
import { supabase } from '../supabase.js'

// Aluno corrige o próprio nome na aba Conta. O banco só deixa mudar o nome (função definir_meu_nome).
export default function EditarNome({ aluno, onMudou }) {
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(aluno.nome || '')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e) {
    e.preventDefault()
    const novo = nome.trim().replace(/\s+/g, ' ')
    if (novo.length < 2) return setErro('Escreva seu nome.')
    setOcupado(true); setErro('')
    const { error } = await supabase.rpc('definir_meu_nome', { p_nome: novo })
    setOcupado(false)
    if (error) return setErro(error.message.includes('definir_meu_nome') ? 'Peça ao seu personal para atualizar o sistema.' : 'Não foi possível salvar. Tente de novo.')
    setEditando(false)
    onMudou(novo)
  }

  return (
    <div className="panel">
      <div className="row between">
        <h2>Seu nome</h2>
        {!editando && <button type="button" className="link" onClick={() => { setNome(aluno.nome || ''); setEditando(true) }}>Editar</button>}
      </div>
      {editando ? (
        <form className="stack" style={{ gap: 10, marginTop: 10 }} onSubmit={salvar}>
          <input aria-label="Seu nome" value={nome} maxLength={60} autoFocus onChange={(e) => setNome(e.target.value)} />
          {erro && <p className="erro" style={{ margin: 0 }}>{erro}</p>}
          <div className="row" style={{ gap: 12 }}>
            <button className="primary" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="link" onClick={() => { setEditando(false); setErro('') }}>Cancelar</button>
          </div>
        </form>
      ) : <p className="meta" style={{ margin: '4px 0 0' }}>{aluno.nome}</p>}
    </div>
  )
}
