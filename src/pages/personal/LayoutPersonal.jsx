import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import { primeiroNome } from '../../lib/formato.js'
import Logo from '../../components/Logo.jsx'
import BarraApp from '../../components/BarraApp.jsx'

// Menu em grupos (computador) e barra de app embaixo com "Mais" (celular).
const GRUPOS = [
  [null, [['/painel', 'Painel', 'painel'], ['/agenda', 'Agenda', 'agenda']]],
  ['Alunos', [['/alunos', 'Alunos', 'alunos'], ['/modelos', 'Modelos de treino', 'modelos'], ['/exercicios', 'Exercícios', 'exercicios'], ['/assistente', 'Assistente IA', 'assistente']]],
  ['Academia', [['/academia', 'Academia', 'academia'], ['/comunidade', 'Comunidade', 'comunidade'], ['/aulas', 'Spinning', 'spinning']]],
  ['Negócio', [['/vendas', 'Vendas', 'vendas'], ['/financeiro', 'Financeiro', 'financeiro'], ['/configuracoes', 'Configurações', 'configuracoes']]],
]
const PRINCIPAIS = ['/painel', '/alunos', '/agenda', '/academia']

export default function LayoutPersonal({ nome }) {
  const cls = ({ isActive }) => `navbtn${isActive ? ' active' : ''}`
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const todos = GRUPOS.flatMap(([, itens]) => itens)
  const ativo = (to) => pathname === to || pathname.startsWith(`${to}/`)
  const ir = (to) => { navigate(to); window.scrollTo({ top: 0 }) }

  return (
    <div className="app">
      <nav className="side" aria-label="Seções">
        <Logo sub={nome ? `Olá, ${primeiroNome(nome)}` : 'Área do treinador'} />
        {GRUPOS.map(([titulo, itens]) => (
          <div key={titulo || 'inicio'} className="nav-grupo so-computador">
            {titulo && <div className="nav-titulo">{titulo}</div>}
            {itens.map(([to, rotulo]) => <NavLink key={to} to={to} className={cls}>{rotulo}</NavLink>)}
          </div>
        ))}
        <div className="spacer" />
        <button className="small so-computador" onClick={() => supabase.auth.signOut()}>Sair</button>
      </nav>
      <main><Outlet /></main>
      <BarraApp
        itens={PRINCIPAIS.map((to) => { const [, rotulo, icone] = todos.find(([t]) => t === to); return { chave: to, rotulo, icone, ativo: ativo(to), onClick: () => ir(to) } })}
        mais={[
          ...todos.filter(([to]) => !PRINCIPAIS.includes(to)).map(([to, rotulo, icone]) => ({ chave: to, rotulo, icone, ativo: ativo(to), onClick: () => ir(to) })),
          { chave: 'sair', rotulo: 'Sair', icone: 'sair', perigo: true, onClick: () => supabase.auth.signOut() },
        ]}
      />
    </div>
  )
}
