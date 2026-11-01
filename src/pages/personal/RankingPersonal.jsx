import RankingMes from '../../components/RankingMes.jsx'
import { useComunidade } from '../../hooks/useComunidade.js'

// Ranking do mês na área do personal: o mesmo que os alunos veem, com o botão de mandar no grupo.
export default function RankingPersonal() {
  const comunidade = useComunidade()
  return (
    <div className="stack">
      <RankingMes comunidade={comunidade} podeCompartilhar />
    </div>
  )
}
