import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import { primeiroNome } from '../../lib/formato.js'
import Logo from '../../components/Logo.jsx'

export default function LayoutPersonal({ nome }) {
  const cls = ({ isActive }) => `navbtn${isActive ? ' active' : ''}`
  return (
    <div className="app">
      <nav className="side" aria-label="Seções">
        <Logo sub={nome ? `Olá, ${primeiroNome(nome)}` : 'Área do treinador'} />
        <NavLink to="/painel" className={cls}>Painel</NavLink>
        <NavLink to="/alunos" className={cls}>Alunos</NavLink>
        <NavLink to="/modelos" className={cls}>Modelos</NavLink>
        <NavLink to="/comunidade" className={cls}>Comunidade</NavLink>
        <NavLink to="/aulas" className={cls}>Spinning</NavLink>
        <NavLink to="/vendas" className={cls}>Vendas</NavLink>
        <NavLink to="/financeiro" className={cls}>Financeiro</NavLink>
        <NavLink to="/configuracoes" className={cls}>Configurações</NavLink>
        <div className="spacer" />
        <button className="small" onClick={() => supabase.auth.signOut()}>Sair</button>
      </nav>
      <main><Outlet /></main>
    </div>
  )
}
