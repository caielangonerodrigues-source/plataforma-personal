import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { provedoresLigados, supabase } from '../supabase.js'
import HeroEntrada from '../components/HeroEntrada.jsx'
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
  const [provedores, setProvedores] = useState({})

  useEffect(() => { provedoresLigados().then(setProvedores) }, [])

  // Google e Apple: o Supabase cria a conta na primeira vez; o cadastro de aluno sai com o nome da conta.
  async function social(provider) {
    setErro('')
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })
    if (error) setErro(traduz(error))
  }

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
    <div className="entrada">
      <HeroEntrada />
      <div className="entrada-form">
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Logo sub="Academia & Fitness · Treinos e avaliações" grande />
        <form className="panel stack" onSubmit={enviar}>
          <h2>{titulo}</h2>
          {modo !== 'esqueci' && (provedores.google || provedores.apple) && (
            <>
              {provedores.google && (
                <button type="button" className="botao-social" onClick={() => social('google')}>
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                  Continuar com Google
                </button>
              )}
              {provedores.apple && (
                <button type="button" className="botao-social apple" onClick={() => social('apple')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.3.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.8-4.2zM13.9 5.1c.7-.9 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"/></svg>
                  Continuar com Apple
                </button>
              )}
              <div className="ou"><span>ou com e-mail</span></div>
            </>
          )}
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
    </div>
  )
}
