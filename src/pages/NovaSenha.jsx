import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import CampoSenha from '../components/CampoSenha.jsx'

export default function NovaSenha() {
  const navigate = useNavigate()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  async function salvar(e) {
    e.preventDefault()
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.')
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) return setErro('Não foi possível salvar. Peça um novo link em "Esqueci a senha".')
    navigate('/')
  }

  return (
    <div className="centro">
      <form className="panel stack" style={{ width: '100%', maxWidth: 420 }} onSubmit={salvar}>
        <h2>Nova senha</h2>
        <CampoSenha rotulo="Nova senha" id="nova-senha" autoComplete="new-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        {erro && <p className="erro">{erro}</p>}
        <button className="primary">Salvar senha</button>
      </form>
    </div>
  )
}
