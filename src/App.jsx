import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { configurado, supabase } from './supabase.js'
import Entrar from './pages/Entrar.jsx'
import NovaSenha from './pages/NovaSenha.jsx'
import SemAcesso from './pages/SemAcesso.jsx'
import LayoutPersonal from './pages/personal/LayoutPersonal.jsx'
import Painel from './pages/personal/Painel.jsx'
import Alunos from './pages/personal/Alunos.jsx'
import AlunoDetalhe from './pages/personal/AlunoDetalhe.jsx'
import Mensagens from './pages/personal/Mensagens.jsx'
import ComunidadePersonal from './pages/personal/ComunidadePersonal.jsx'
import Financeiro from './pages/personal/Financeiro.jsx'
import Configuracoes from './pages/personal/Configuracoes.jsx'
import AreaAluno from './pages/aluno/AreaAluno.jsx'
import Spinning from './pages/personal/Spinning.jsx'
import AulasSpinning from './pages/spinning/AulasSpinning.jsx'
import AulaSpinning from './pages/spinning/AulaSpinning.jsx'
import ReservaSpinning from './pages/spinning/ReservaSpinning.jsx'
import PacotesSpinning from './pages/spinning/PacotesSpinning.jsx'
import PacoteSpinning from './pages/spinning/PacoteSpinning.jsx'
import PaginaVendas from './pages/PaginaVendas.jsx'
import Privacidade from './pages/Privacidade.jsx'
import Experimental from './pages/Experimental.jsx'
import Modelos from './pages/personal/Modelos.jsx'
import Vendas from './pages/personal/Vendas.jsx'
import Exercicios from './pages/personal/Exercicios.jsx'
import Assistente from './pages/personal/Assistente.jsx'
import Agenda from './pages/personal/Agenda.jsx'
import Academia from './pages/personal/Academia.jsx'

// QR code da recepção: guarda o código para fazer o check-in depois de entrar na conta.
try { const c = new URLSearchParams(window.location.search).get('checkin'); if (c) sessionStorage.setItem('checkin-qr', c) } catch { /* sem armazenamento */ }

export default function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [sessao, setSessao] = useState(undefined) // undefined = ainda carregando
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    if (!configurado) return
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSessao(s)
      if (evento === 'PASSWORD_RECOVERY') navigate('/nova-senha')
    })
    return () => data.subscription.unsubscribe()
  }, [navigate])

  const uid = sessao?.user?.id
  useEffect(() => {
    if (!uid) { setPerfil(null); return }
    let ativo = true
    ;(async () => {
      const { data: p } = await supabase.from('personais').select('user_id, nome').eq('user_id', uid).maybeSingle()
      if (p) { if (ativo) setPerfil({ tipo: 'personal', nome: p.nome }); return }
      const { data: a } = await supabase.from('alunos').select('*').eq('user_id', uid).maybeSingle()
      if (ativo) setPerfil(a ? { tipo: 'aluno', aluno: a } : { tipo: 'nenhum' })
    })()
    return () => { ativo = false }
  }, [uid])

  if (!configurado) {
    return (
      <div className="centro"><div className="panel" style={{ maxWidth: 520 }}>
        <h2>Falta configurar o Supabase</h2>
        <p>Cadastre as variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (veja o README).</p>
      </div></div>
    )
  }
  // Reserva de spinning e página de vendas são públicas: abrem com ou sem login.
  if (pathname === '/consultoria') return <PaginaVendas />
  if (pathname === '/privacidade') return <Privacidade />
  if (pathname === '/experimental') return <Experimental />
  if (pathname.startsWith('/spinning')) {
    return (
      <Routes>
        <Route path="/spinning" element={<AulasSpinning />} />
        <Route path="/spinning/reserva/:id" element={<ReservaSpinning />} />
        <Route path="/spinning/pacotes" element={<PacotesSpinning />} />
        <Route path="/spinning/pacote/:codigo" element={<PacoteSpinning />} />
        <Route path="/spinning/:aulaId" element={<AulaSpinning />} />
      </Routes>
    )
  }
  if (sessao === undefined || (sessao && !perfil)) return <div className="centro carregando">Carregando…</div>

  if (!sessao) {
    return (
      <Routes>
        <Route path="/nova-senha" element={<NovaSenha />} />
        <Route path="*" element={<Entrar />} />
      </Routes>
    )
  }

  if (perfil.tipo === 'personal') {
    return (
      <Routes>
        <Route path="/nova-senha" element={<NovaSenha />} />
        <Route element={<LayoutPersonal nome={perfil.nome} />}>
          <Route path="/painel" element={<Painel />} />
          <Route path="/alunos" element={<Alunos />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/alunos/:id" element={<AlunoDetalhe />} />
          <Route path="/comunidade" element={<ComunidadePersonal />} />
          <Route path="/mensagens" element={<Mensagens />} />
          <Route path="/academia" element={<Academia />} />
          <Route path="/modelos" element={<Modelos />} />
          <Route path="/exercicios" element={<Exercicios />} />
          <Route path="/assistente" element={<Assistente />} />
          <Route path="/aulas" element={<Spinning />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
        <Route path="*" element={<Navigate to="/painel" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/nova-senha" element={<NovaSenha />} />
      <Route path="*" element={perfil.tipo === 'aluno' ? <AreaAluno aluno={perfil.aluno} /> : <SemAcesso email={sessao.user.email} />} />
    </Routes>
  )
}
