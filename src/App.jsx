import { Suspense, lazy, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { configurado, supabase } from './supabase.js'
import Entrar from './pages/Entrar.jsx'
const NovaSenha = lazy(() => import('./pages/NovaSenha.jsx'))
const SemAcesso = lazy(() => import('./pages/SemAcesso.jsx'))
const LayoutPersonal = lazy(() => import('./pages/personal/LayoutPersonal.jsx'))
const Painel = lazy(() => import('./pages/personal/Painel.jsx'))
const Alunos = lazy(() => import('./pages/personal/Alunos.jsx'))
const AlunoDetalhe = lazy(() => import('./pages/personal/AlunoDetalhe.jsx'))
const Mensagens = lazy(() => import('./pages/personal/Mensagens.jsx'))
const ComunidadePersonal = lazy(() => import('./pages/personal/ComunidadePersonal.jsx'))
const RankingPersonal = lazy(() => import('./pages/personal/RankingPersonal.jsx'))
const Financeiro = lazy(() => import('./pages/personal/Financeiro.jsx'))
const Configuracoes = lazy(() => import('./pages/personal/Configuracoes.jsx'))
const AreaAluno = lazy(() => import('./pages/aluno/AreaAluno.jsx'))
const Spinning = lazy(() => import('./pages/personal/Spinning.jsx'))
const AulasSpinning = lazy(() => import('./pages/spinning/AulasSpinning.jsx'))
const AulaSpinning = lazy(() => import('./pages/spinning/AulaSpinning.jsx'))
const ReservaSpinning = lazy(() => import('./pages/spinning/ReservaSpinning.jsx'))
const PacotesSpinning = lazy(() => import('./pages/spinning/PacotesSpinning.jsx'))
const PacoteSpinning = lazy(() => import('./pages/spinning/PacoteSpinning.jsx'))
const PaginaVendas = lazy(() => import('./pages/PaginaVendas.jsx'))
const Privacidade = lazy(() => import('./pages/Privacidade.jsx'))
const Experimental = lazy(() => import('./pages/Experimental.jsx'))
const Modelos = lazy(() => import('./pages/personal/Modelos.jsx'))
const Vendas = lazy(() => import('./pages/personal/Vendas.jsx'))
const Exercicios = lazy(() => import('./pages/personal/Exercicios.jsx'))
const Assistente = lazy(() => import('./pages/personal/Assistente.jsx'))
const Agenda = lazy(() => import('./pages/personal/Agenda.jsx'))
const Academia = lazy(() => import('./pages/personal/Academia.jsx'))

// QR code da recepção: guarda o código para fazer o check-in depois de entrar na conta.
try { const c = new URLSearchParams(window.location.search).get('checkin'); if (c) sessionStorage.setItem('checkin-qr', c) } catch { /* sem armazenamento */ }

// Cada área baixa só o código dela: o aluno no celular não carrega as telas do personal (e vice-versa).
const carregando = <div className="centro carregando">Carregando…</div>

export default function App() {
  return <Suspense fallback={carregando}><Rotas /></Suspense>
}

function Rotas() {
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
      // Personal da equipe enxerga só o cadastro do dono da academia (supabase/migracao-equipe.sql): o nome vem da conta Google/e-mail.
      const { data: p } = await supabase.from('personais').select('user_id, nome').maybeSingle()
      if (p) {
        const meta = sessao.user.user_metadata || {}
        const meu = p.user_id === uid ? null : (await supabase.rpc('meu_perfil')).data?.[0]
        if (ativo) setPerfil({ tipo: 'personal', nome: p.user_id === uid ? p.nome : meu?.nome || meta.full_name || meta.name || '' })
        return
      }
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
  if (sessao === undefined || (sessao && !perfil)) return carregando

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
          <Route path="/ranking" element={<RankingPersonal />} />
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
