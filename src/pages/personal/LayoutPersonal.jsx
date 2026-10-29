import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import { primeiroNome } from '../../lib/formato.js'
import Logo from '../../components/Logo.jsx'
import BarraApp from '../../components/BarraApp.jsx'
import ComoFunciona, { AJUDA_PERSONAL } from '../../components/ComoFunciona.jsx'

// Menu em grupos (computador) e barra de app embaixo com "Mais" (celular).
const GRUPOS = [
  [null, [['/painel', 'Painel', 'painel'], ['/mensagens', 'Mensagens', 'mensagens'], ['/agenda', 'Agenda', 'agenda']]],
  ['Alunos', [['/alunos', 'Alunos', 'alunos'], ['/modelos', 'Modelos de treino', 'modelos'], ['/exercicios', 'Exercícios', 'exercicios'], ['/assistente', 'Assistente IA', 'assistente']]],
  ['Academia', [['/academia', 'Academia', 'academia'], ['/comunidade', 'Comunidade', 'comunidade'], ['/aulas', 'Spinning', 'spinning']]],
  ['Negócio', [['/vendas', 'Vendas', 'vendas'], ['/financeiro', 'Financeiro', 'financeiro'], ['/configuracoes', 'Configurações', 'configuracoes']]],
]
const PRINCIPAIS = ['/painel', '/alunos', '/mensagens', '/agenda']

export default function LayoutPersonal({ nome }) {
  const cls = ({ isActive }) => `navbtn${isActive ? ' active' : ''}`
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const todos = GRUPOS.flatMap(([, itens]) => itens)
  const ativo = (to) => pathname === to || pathname.startsWith(`${to}/`)
  const ir = (to) => { navigate(to); window.scrollTo({ top: 0 }) }
  // Mensagens dos alunos ainda não lidas (sem o SQL novo, fica 0).
  const [naoLidas, setNaoLidas] = useState(0)
  useEffect(() => {
    const contar = () => supabase.from('mensagens_privadas').select('id', { count: 'exact', head: true }).eq('do_personal', false).is('lida_em', null)
      .then(({ count, error }) => !error && setNaoLidas(count || 0))
    contar()
    const t = setInterval(contar, 60000)
    return () => clearInterval(t)
  }, [pathname])
  const badge = (to) => (to === '/mensagens' && !ativo(to) ? naoLidas : 0)

  return (
    <div className="app">
      <nav className="side" aria-label="Seções">
        <Logo sub={nome ? `Olá, ${primeiroNome(nome)}` : 'Área do treinador'} />
        {GRUPOS.map(([titulo, itens]) => (
          <div key={titulo || 'inicio'} className="nav-grupo so-computador">
            {titulo && <div className="nav-titulo">{titulo}</div>}
            {itens.map(([to, rotulo]) => <NavLink key={to} to={to} className={cls}>{rotulo}{badge(to) > 0 && <span className="tab-badge" style={{ marginLeft: 6 }}>{badge(to)}</span>}</NavLink>)}
          </div>
        ))}
        <div className="spacer" />
        <button className="small so-computador" onClick={() => supabase.auth.signOut()}>Sair</button>
      </nav>
      <main>{AJUDA_PERSONAL[pathname] && <ComoFunciona key={pathname} chave={`personal${pathname}`} itens={AJUDA_PERSONAL[pathname]} />}<Outlet /></main>
      <BarraApp
        itens={PRINCIPAIS.map((to) => { const [, rotulo, icone] = todos.find(([t]) => t === to); return { chave: to, rotulo, icone, ativo: ativo(to), badge: badge(to), onClick: () => ir(to) } })}
        mais={[
          ...todos.filter(([to]) => !PRINCIPAIS.includes(to)).map(([to, rotulo, icone]) => ({ chave: to, rotulo, icone, ativo: ativo(to), onClick: () => ir(to) })),
          { chave: 'sair', rotulo: 'Sair', icone: 'sair', perigo: true, onClick: () => supabase.auth.signOut() },
        ]}
      />
    </div>
  )
}
