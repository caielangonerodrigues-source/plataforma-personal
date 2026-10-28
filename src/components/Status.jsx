const NOMES = { ativo: 'Ativo', pendente: 'Pendente', pausado: 'Pausado' }

export default function Status({ status }) {
  return <span className={`pill ${status}`}>{NOMES[status] || status}</span>
}
