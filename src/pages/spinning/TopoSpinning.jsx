import { Link } from 'react-router-dom'
import Logo from '../../components/Logo.jsx'

// Guarda no aparelho as reservas feitas, para a pessoa voltar ao Pix sem login.
const CHAVE = 'spinning-reservas'
export function minhasReservas() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || [] } catch { return [] }
}
export function guardarReserva(r) {
  try { localStorage.setItem(CHAVE, JSON.stringify([r, ...minhasReservas().filter((x) => x.id !== r.id)].slice(0, 10))) } catch { /* modo privado */ }
}

export default function TopoSpinning({ voltar }) {
  return (
    <div className="topo-publico">
      <Link to="/spinning" style={{ textDecoration: 'none', color: 'inherit' }}>
        <Logo sub="Spinning · Reserve sua bike" />
      </Link>
      {voltar ? <Link to={voltar} className="meta">‹ Voltar</Link> : <Link to="/" className="meta">Área do aluno</Link>}
    </div>
  )
}

// Código do pacote comprado neste aparelho, para reservar com o saldo sem digitar.
const CHAVE_PACOTE = 'spinning-pacote'
export function meuCodigoPacote() {
  try { return localStorage.getItem(CHAVE_PACOTE) || '' } catch { return '' }
}
export function guardarCodigoPacote(codigo) {
  try { localStorage.setItem(CHAVE_PACOTE, codigo) } catch { /* modo privado */ }
}
