import Comunidade from '../../components/Comunidade.jsx'
import { useComunidade } from '../../hooks/useComunidade.js'
import { AjudaDaPagina } from '../../components/ComoFunciona.jsx'

export default function ComunidadePersonal() {
  const comunidade = useComunidade()
  return (
    <>
      <h1>Comunidade</h1>
      <p className="sub">Check-ins dos seus alunos, desafios e o ranking do mês. Você pode postar fotos para motivar a turma, criar desafios, reagir e apagar posts.</p>
      <AjudaDaPagina />
      <Comunidade comunidade={comunidade} podeApagarTudo />
    </>
  )
}
