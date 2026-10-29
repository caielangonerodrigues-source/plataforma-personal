import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase.js'
import Logo from '../components/Logo.jsx'

const MENSAGENS = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  'User already registered': 'Este e-mail já tem conta. Use "Entrar" ou "Esqueci a senha".',
}
const traduz = (e) => MENSAGENS[e?.message] || e?.message || 'Algo deu errado. Tente de novo.'

export default function Entrar() {
  const [modo, setModo] = useState('entrar') // entrar | criar | esqueci
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  // Cadastro do aluno no primeiro acesso (vai para o cadastro em alunos pelo banco)
  const [ficha, setFicha] = useState({ nome: '', nascimento: '', telefone: '', sexo: 'F', objetivo: '' })
  const campo = (k) => ({ id: `cad-${k}`, value: ficha[k], onChange: (e) => setFicha({ ...ficha, [k]: e.target.value }) })
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro(''); setAviso(''); setEnviando(true)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (error) throw error
      } else if (modo === 'criar') {
        if (ficha.nome.trim().split(/\s+/).length < 2) throw new Error('Informe seu nome completo.')
        if (!ficha.nascimento) throw new Error('Informe sua data de nascimento.')
        if (ficha.telefone.replace(/\D/g, '').length < 10) throw new Error('Informe seu WhatsApp com DDD.')
        if (senha.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.')
        const dados = { ...ficha, nome: ficha.nome.trim(), objetivo: ficha.objetivo.trim() }
        const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin, data: dados } })
        if (error) throw error
        if (!data.session) setAviso('Conta criada. Abra o e-mail que enviamos e clique no link para confirmar.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/nova-senha` })
        if (error) throw error
        setAviso('Se este e-mail tiver conta, você vai receber um link para criar uma nova senha.')
      }
    } catch (err) {
      setErro(traduz(err))
    } finally {
      setEnviando(false)
    }
  }

  const titulo = { entrar: 'Entrar', criar: 'Primeiro acesso', esqueci: 'Esqueci a senha' }[modo]
  return (
    <div className="centro">
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Logo sub="Academia & Fitness · Treinos e avaliações" grande />
        <form className="panel stack" onSubmit={enviar}>
          <h2>{titulo}</h2>
          {modo === 'criar' && (
            <>
              <p className="meta" style={{ margin: 0 }}>Preencha seus dados para criar sua conta de aluno.</p>
              <label>Nome completo<input autoComplete="name" required {...campo('nome')} /></label>
              <label>Data de nascimento<input type="date" required max={new Date().toISOString().slice(0, 10)} {...campo('nascimento')} /></label>
              <label>WhatsApp<input type="tel" autoComplete="tel" placeholder="(11) 99999-9999" required {...campo('telefone')} /></label>
              <label>Sexo<select {...campo('sexo')}><option value="F">Feminino</option><option value="M">Masculino</option></select></label>
              <label>Objetivo<input placeholder="Ex.: Emagrecer, ganhar massa" {...campo('objetivo')} /></label>
            </>
          )}
          <label>E-mail<input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          {modo !== 'esqueci' && (
            <label>Senha<input id="senha" type="password" autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} required value={senha} onChange={(e) => setSenha(e.target.value)} /></label>
          )}
          {erro && <p className="erro">{erro}</p>}
          {aviso && <p className="ok">{aviso}</p>}
          <button className="primary" disabled={enviando}>{enviando ? 'Aguarde…' : { entrar: 'Entrar', criar: 'Criar minha conta', esqueci: 'Enviar link' }[modo]}</button>
          <div className="row between">
            {modo !== 'entrar' && <button type="button" className="link" onClick={() => setModo('entrar')}>Já tenho conta</button>}
            {modo !== 'criar' && <button type="button" className="link" onClick={() => setModo('criar')}>Primeiro acesso</button>}
            {modo !== 'esqueci' && <button type="button" className="link" onClick={() => setModo('esqueci')}>Esqueci a senha</button>}
          </div>
        </form>
        <Link to="/spinning" className="panel row between" style={{ marginTop: 12, textDecoration: 'none', color: 'inherit' }}>
          <span><strong>Aula de spinning</strong><br /><span className="meta">Reserve sua bike, sem precisar de conta</span></span>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Reservar ›</span>
        </Link>
      </div>
    </div>
  )
}
