import { useEffect } from 'react'
import { ListaExercicios } from './SeletorExercicios.jsx'
import { BIBLIOTECA, grupoDoExercicio } from '../lib/exercicios.js'

// Aparelho ocupado: o aluno escolhe outro exercício do mesmo grupo muscular para hoje.
// O personal vê a troca no painel e na aba Cargas do aluno.
export default function TrocaExercicio({ exercicio, trocaAtual, onEscolher, onFechar }) {
  const grupo = grupoDoExercicio(exercicio.nome) || ''
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])
  const lista = BIBLIOTECA.filter((e) => e.nome !== exercicio.nome)
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal stack" style={{ width: 'min(620px, 100%)' }}>
        <div>
          <h2>Trocar {exercicio.nome}</h2>
          <p className="meta" style={{ margin: '4px 0 0' }}>Só para hoje. {grupo ? `Mostrando outras opções de ${grupo.toLowerCase()}.` : 'Escolha um exercício parecido.'} Seu personal fica sabendo da troca.</p>
        </div>
        <ListaExercicios lista={lista} grupoInicial={grupo} acoes={(e) => (
          <button className="small primary" style={{ whiteSpace: 'nowrap' }} onClick={() => onEscolher(e.nome)}>Fazer este</button>
        )} />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          {trocaAtual && <button onClick={() => onEscolher(null)}>Voltar para {exercicio.nome}</button>}
          <button onClick={onFechar}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
