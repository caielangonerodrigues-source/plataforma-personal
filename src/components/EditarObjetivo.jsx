import { useState } from 'react'
import { supabase } from '../supabase.js'

const SUGESTOES = ['Emagrecer', 'Ganhar massa', 'Condicionamento', 'Saúde e qualidade de vida', 'Performance esportiva']

// Aluno muda o objetivo que escreveu no cadastro, na aba Conta. O banco só deixa mudar esse campo (função definir_meu_objetivo).
export default function EditarObjetivo({ aluno, onMudou }) {
  const [editando, setEditando] = useState(false)
  const [objetivo, setObjetivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e) {
    e.preventDefault()
    const novo = objetivo.trim().replace(/\s+/g, ' ')
    if (novo.length < 3) return setErro('Escreva seu objetivo.')
    if (novo.length > 120) return setErro('Use no máximo 120 letras.')
    setOcupado(true); setErro('')
    const { error } = await supabase.rpc('definir_meu_objetivo', { p_objetivo: novo })
    setOcupado(false)
    if (error) return setErro(error.message.includes('definir_meu_objetivo') ? 'Peça ao seu personal para atualizar o sistema.' : 'Não foi possível salvar. Tente de novo.')
    setEditando(false)
    onMudou(novo)
  }

  return (
    <div className="panel">
      <div className="row between">
        <h2>Seu objetivo</h2>
        {!editando && <button type="button" className="link" onClick={() => { setObjetivo(aluno.objetivo || ''); setErro(''); setEditando(true) }}>{aluno.objetivo ? 'Editar' : 'Informar'}</button>}
      </div>
      {editando ? (
        <form className="stack" style={{ gap: 10, marginTop: 10 }} onSubmit={salvar}>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {SUGESTOES.map((s) => (
              <button key={s} type="button" className={`chip${objetivo === s ? ' on' : ''}`} aria-pressed={objetivo === s} onClick={() => setObjetivo(s)}>{s}</button>
            ))}
          </div>
          <label>Ou escreva do seu jeito<input maxLength={120} placeholder="Ex.: Emagrecer 5 kg até o verão" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} /></label>
          {erro && <p className="erro" style={{ margin: 0 }}>{erro}</p>}
          <div className="row" style={{ gap: 12 }}>
            <button className="primary" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="link" onClick={() => { setEditando(false); setErro('') }}>Cancelar</button>
          </div>
        </form>
      ) : (
        <p className="meta" style={{ margin: '4px 0 0' }}>{aluno.objetivo || 'Conte seu objetivo para o seu personal montar o treino e a dieta.'}</p>
      )}
    </div>
  )
}
