import { useState } from 'react'
import { supabase } from '../supabase.js'
import { f1, fmtData, num } from '../lib/formato.js'
import { imc } from '../lib/pollock.js'

// Altura digitada em centímetros (175) ou em metros (1,75): guarda sempre em metros.
const emMetros = (v) => (v == null ? null : v > 3 ? v / 100 : v)

// Aluno informa peso e altura na aba Conta. O banco só deixa mudar esses dois campos (função definir_meu_peso_altura).
export default function EditarPesoAltura({ aluno, onMudou }) {
  const [editando, setEditando] = useState(false)
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const valorImc = imc(aluno)

  function abrir() {
    setPeso(aluno.peso != null ? String(aluno.peso).replace('.', ',') : '')
    setAltura(aluno.altura != null ? String(Math.round(aluno.altura * 100)) : '')
    setErro(''); setEditando(true)
  }

  async function salvar(e) {
    e.preventDefault()
    const p = num(peso)
    const a = emMetros(num(altura))
    if (p == null && a == null) return setErro('Informe o peso ou a altura.')
    if (p != null && (Number.isNaN(p) || p < 20 || p > 350)) return setErro('Peso inválido. Use quilos, ex.: 72,5.')
    if (a != null && (Number.isNaN(a) || a < 0.8 || a > 2.5)) return setErro('Altura inválida. Use centímetros, ex.: 175.')
    setOcupado(true); setErro('')
    const { error } = await supabase.rpc('definir_meu_peso_altura', { p_peso: p, p_altura: a })
    setOcupado(false)
    if (error) return setErro(error.message.includes('definir_meu_peso_altura') ? 'Peça ao seu personal para atualizar o sistema.' : 'Não foi possível salvar. Tente de novo.')
    setEditando(false)
    onMudou({ peso: p == null ? null : Math.round(p * 10) / 10, altura: a == null ? null : Math.round(a * 100) / 100, peso_altura_em: new Date().toISOString() })
  }

  const vazio = aluno.peso == null && aluno.altura == null

  return (
    <div className="panel">
      <div className="row between">
        <h2>Peso e altura</h2>
        {!editando && <button type="button" className="link" onClick={abrir}>{vazio ? 'Informar' : 'Editar'}</button>}
      </div>
      {editando ? (
        <form className="stack" style={{ gap: 10, marginTop: 10 }} onSubmit={salvar}>
          <div className="row" style={{ gap: 10 }}>
            <label style={{ flex: 1 }}>Peso (kg)<input inputMode="decimal" placeholder="72,5" value={peso} autoFocus onChange={(e) => setPeso(e.target.value)} /></label>
            <label style={{ flex: 1 }}>Altura (cm)<input inputMode="decimal" placeholder="175" value={altura} onChange={(e) => setAltura(e.target.value)} /></label>
          </div>
          {erro && <p className="erro" style={{ margin: 0 }}>{erro}</p>}
          <div className="row" style={{ gap: 12 }}>
            <button className="primary" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="link" onClick={() => { setEditando(false); setErro('') }}>Cancelar</button>
          </div>
        </form>
      ) : vazio ? (
        <p className="meta" style={{ margin: '4px 0 0' }}>Conte seu peso e sua altura para o seu personal acompanhar.</p>
      ) : (
        <p className="meta" style={{ margin: '4px 0 0' }}>
          {[aluno.peso != null && `${f1(aluno.peso)} kg`, aluno.altura != null && `${f1(aluno.altura * 100)} cm`, valorImc && `IMC ${f1(valorImc)}`].filter(Boolean).join(' · ')}
          {aluno.peso_altura_em && ` · atualizado em ${fmtData(aluno.peso_altura_em)}`}
        </p>
      )}
    </div>
  )
}
