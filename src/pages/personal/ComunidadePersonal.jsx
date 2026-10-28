import Comunidade from '../../components/Comunidade.jsx'
import { useComunidade } from '../../hooks/useComunidade.js'

export default function ComunidadePersonal() {
  const comunidade = useComunidade()
  return (
    <>
      <h1>Comunidade</h1>
      <p className="sub">Check-ins dos seus alunos, desafios e o ranking do mês. Você pode criar desafios, curtir e apagar posts.</p>
      <Comunidade comunidade={comunidade} podeApagarTudo />
    </>
  )
}
