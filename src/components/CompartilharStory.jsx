import { useEffect, useState } from 'react'
import { medalhas } from '../lib/medalhas.js'
import { compartilharImagem, gerarStory, ultimoRecorde } from '../lib/story.js'
import { inicioDoMes, sequencia } from '../lib/comunidade.js'
import { MESES, primeiroNome } from '../lib/formato.js'

// Gera o card de story (mês, medalha ou recorde) e abre o compartilhar do celular para postar no Instagram.
export default function CompartilharStory({ aluno, hoje, dias, registros, avaliacoes, treinos, desafios }) {
  const [imagem, setImagem] = useState(null) // { blob, url, nome }
  const [gerando, setGerando] = useState('')
  const [aviso, setAviso] = useState('')
  useEffect(() => () => imagem && URL.revokeObjectURL(imagem.url), [imagem])

  const todosDias = [...new Set([...dias, ...registros.map((r) => r.data)])]
  const noMes = todosDias.filter((d) => d >= inicioDoMes(hoje)).length
  const ganhas = medalhas({ datas: dias, registros, avaliacoes }, desafios).filter((m) => m.ganhou)
  const medalha = ganhas.at(-1)
  const recorde = ultimoRecorde(registros)
  const nomeExercicio = recorde && treinos.flatMap((t) => t.exercicios).find((e) => e.id === recorde.exercicio_id)?.nome

  const opcoes = [
    { tipo: 'mes', rotulo: `📅 Meu mês (${noMes})`, dados: { mes: MESES[Number(hoje.slice(5, 7)) - 1], treinos: noMes, sequencia: sequencia(todosDias, hoje) }, pode: noMes > 0 },
    { tipo: 'medalha', rotulo: medalha ? `${medalha.icone} ${medalha.titulo}` : '🏅 Medalha', dados: medalha, pode: !!medalha },
    { tipo: 'recorde', rotulo: recorde ? `💪 Recorde: ${nomeExercicio || 'carga'}` : '💪 Recorde', dados: recorde && { ...recorde, exercicio: nomeExercicio || 'Exercício' }, pode: !!recorde },
  ]

  async function gerar(o) {
    setGerando(o.tipo); setAviso('')
    const blob = await gerarStory(o.tipo, o.dados, primeiroNome(aluno.nome))
    setGerando('')
    if (!blob) return setAviso('Não foi possível gerar a imagem neste aparelho.')
    setImagem({ blob, url: URL.createObjectURL(blob), nome: `corpo-atletico-${o.tipo}.png` })
  }

  async function compartilhar() {
    const r = await compartilharImagem(imagem.blob, imagem.nome)
    if (r === 'baixado') setAviso('Imagem baixada. Abra o Instagram e poste nos stories.')
  }

  return (
    <div className="panel stack" style={{ gap: 12 }}>
      <div>
        <h2>Postar no Instagram</h2>
        <p className="meta" style={{ margin: '4px 0 0' }}>Gere um card com a marca da academia e poste nos seus stories.</p>
      </div>
      <div className="row" style={{ gap: 8 }}>
        {opcoes.map((o) => (
          <button key={o.tipo} className="small" disabled={!o.pode || !!gerando} onClick={() => gerar(o)} title={o.pode ? '' : 'Ainda não tem'}>
            {gerando === o.tipo ? 'Gerando…' : o.rotulo}
          </button>
        ))}
      </div>
      {imagem && (
        <div className="story-previa">
          <img src={imagem.url} alt="Prévia do card para os stories" />
          <div className="stack" style={{ gap: 8 }}>
            <button className="primary" onClick={compartilhar}>Compartilhar</button>
            <button className="small" onClick={() => setImagem(null)}>Fechar</button>
          </div>
        </div>
      )}
      {aviso && <p className="meta" style={{ margin: 0 }}>{aviso}</p>}
    </div>
  )
}
