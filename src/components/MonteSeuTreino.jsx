import { useEffect, useRef, useState } from 'react'
import Corpo, { CorpoMini } from './Corpo.jsx'
import { BIBLIOTECA, GRUPOS, buscaVideo, filtrarExercicios } from '../lib/exercicios.js'
import { MUSCULOS, cargaPorMusculo, faltouNaSemana, musculosDoExercicio, nomeMusculo } from '../lib/musculos.js'

// "Monte seu treino": o aluno brinca de montar um treino com os exercícios da biblioteca e vê no bonequinho
// os músculos que cada um trabalha. É só para aprender os grupos: fica no aparelho e não muda a ficha do personal.
const CHAVE = 'monte-seu-treino'
const MAXIMO = 15
const LETRAS = 'ABCDEFGH'
const novo = (i) => ({ letra: LETRAS[i] || String(i + 1), nome: '', exercicios: [] })
// Treinos separados (A, B, C…), cada um com o nome que o aluno der. A versão antiga guardava só uma lista.
export function lerTreinos(bruto) {
  if (Array.isArray(bruto) && bruto.every((x) => typeof x === 'string')) return [{ ...novo(0), exercicios: bruto }]
  if (Array.isArray(bruto) && bruto.length) return bruto
  return [novo(0)]
}
const ler = () => { try { return lerTreinos(JSON.parse(localStorage.getItem(CHAVE))) } catch { return [novo(0)] } }
const nomes = (l) => l.map(nomeMusculo).join(', ')
// Bonequinho pequeno com os músculos do exercício, para o aluno se achar na lista.
const Mini = ({ nome, onClick }) => <span className="monte-mini">{<CorpoMini {...musculosDoExercicio(nome)} tamanho={40} onClick={onClick} />}</span>

export default function MonteSeuTreino() {
  const [treinos, setTreinos] = useState(ler)
  const [atual, setAtual] = useState(0)
  const treino = treinos[Math.min(atual, treinos.length - 1)]
  const lista = treino.exercicios
  const mudar = (f) => setTreinos((ts) => ts.map((t) => (t === treino ? f(t) : t)))
  const setLista = (f) => mudar((t) => ({ ...t, exercicios: f(t.exercicios) }))
  const criar = () => { setTreinos((ts) => [...ts, novo(ts.length)]); setAtual(treinos.length); setOlhando(null) }
  const apagar = () => {
    if (lista.length && !window.confirm(`Apagar o Treino ${treino.letra}?`)) return
    setTreinos((ts) => (ts.length === 1 ? [novo(0)] : ts.filter((t) => t !== treino).map((t, i) => ({ ...t, letra: LETRAS[i] || String(i + 1) }))))
    setAtual(0); setOlhando(null)
  }
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState('Peito')
  const [olhando, setOlhandoEstado] = useState(null) // exercício que o bonequinho mostra sozinho
  const boneco = useRef(null)
  // Ao escolher um exercício lá embaixo, sobe até o bonequinho para o aluno ver o músculo acender.
  const setOlhando = (nome) => { setOlhandoEstado(nome); if (nome) boneco.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  useEffect(() => { try { localStorage.setItem(CHAVE, JSON.stringify(treinos)) } catch { /* sem armazenamento */ } }, [treinos])

  const opcoes = filtrarExercicios(BIBLIOTECA, { busca, grupo: busca ? '' : grupo }).slice(0, 40)
  const adicionar = (nome) => { setLista((l) => (l.includes(nome) || l.length >= MAXIMO ? l : [...l, nome])); setOlhando(nome) }
  const tirar = (nome) => { setLista((l) => l.filter((n) => n !== nome)); if (olhando === nome) setOlhando(null) }

  const conta = cargaPorMusculo(lista)
  const treinados = Object.entries(conta).sort((a, b) => b[1] - a[1])
  const maior = treinados[0]?.[1] || 1
  const faltou = faltouNaSemana(conta).filter((m) => !conta[m]) // grupos grandes que nenhum exercício toca
  const um = olhando && musculosDoExercicio(olhando)

  return (
    <div className="monte-treino stack">
      <div className="panel">
        <h2>Monte seu treino</h2>
        <p className="meta" style={{ margin: '4px 0 0' }}>Escolha exercícios e veja no bonequinho os músculos que eles trabalham. É só para aprender: a sua ficha continua a do personal.</p>
        <div className="chips monte-treinos" role="tablist" aria-label="Seus treinos">
          {treinos.map((t, i) => (
            <button key={t.letra} type="button" role="tab" aria-selected={t === treino} className={`chip${t === treino ? ' on' : ''}`} onClick={() => { setAtual(i); setOlhando(null) }}>
              Treino {t.letra}{t.nome ? ` · ${t.nome}` : ''}
            </button>
          ))}
          {treinos.length < LETRAS.length && <button type="button" className="chip" onClick={criar}>+ Novo treino</button>}
        </div>
        <div className="row monte-nome-treino">
          <input aria-label={`Nome do Treino ${treino.letra}`} placeholder="Grupos do treino (ex.: Peito e tríceps)" maxLength={40} value={treino.nome}
            onChange={(e) => mudar((t) => ({ ...t, nome: e.target.value }))} />
          <button type="button" className="link" onClick={apagar}>Apagar</button>
        </div>
      </div>

      <section className="panel musculos-semana" ref={boneco}>
        {um ? (
          <>
            <span className="atalho-rotulo">Exercício</span>
            <h2>{olhando}</h2>
            <Corpo principais={um.principais} secundarios={um.secundarios} ativo={um.ativo} foco={um.foco} tamanho={104} />
            <div className="row" style={{ gap: 16, justifyContent: 'center' }}>
              <a className="link" href={buscaVideo(olhando)} target="_blank" rel="noreferrer">Como fazer ›</a>
              <button className="link" onClick={() => setOlhando(null)}>{lista.length ? 'Ver o treino todo ›' : 'Voltar ›'}</button>
            </div>
          </>
        ) : (
          <>
            <span className="atalho-rotulo">Treino {treino.letra}{treino.nome ? ` · ${treino.nome}` : ''}</span>
            <h2>{lista.length ? `${lista.length} ${lista.length === 1 ? 'exercício' : 'exercícios'}` : 'Comece escolhendo abaixo'}</h2>
            <Corpo intensidade={Object.fromEntries(treinados.map(([m, n]) => [m, Math.min(1, n / 2)]))} tamanho={104} />
            {treinados.length > 0 && (
              <ul className="musculos-lista">
                {treinados.slice(0, 8).map(([m, n]) => (
                  <li key={m}><span>{MUSCULOS[m]}</span><i><b style={{ width: `${Math.round((n / maior) * 100)}%` }} /></i></li>
                ))}
              </ul>
            )}
            {lista.length > 0 && <p className="meta">{faltou.length ? `Ainda não trabalha: ${nomes(faltou)}.` : 'Treino de corpo todo!'}</p>}
          </>
        )}
      </section>

      {lista.length > 0 && (
        <div className="panel">
          <div className="row between"><h2>Exercícios do Treino {treino.letra}</h2><button className="link" onClick={() => { setLista([]); setOlhando(null) }}>Limpar</button></div>
          {lista.map((nome) => {
            const m = musculosDoExercicio(nome)
            return (
              <div key={nome} className={`monte-item${olhando === nome ? ' ativo' : ''}`}>
                <Mini nome={nome} onClick={() => setOlhando(nome)} />
                <button className="monte-nome" onClick={() => setOlhando(nome)}>
                  <span className="name">{nome}</span>
                  <span className="meta">{m.principais.length ? `Trabalha: ${nomes(m.principais)}${m.secundarios.length ? ` · ajuda: ${nomes(m.secundarios)}` : ''}` : 'Toque para ver'}</span>
                </button>
                <button className="link" onClick={() => tirar(nome)}>Tirar</button>
              </div>
            )
          })}
        </div>
      )}

      <div className="panel">
        <h2>Biblioteca de exercícios</h2>
        <input id="monte-busca" aria-label="Buscar exercício" placeholder="Buscar (ex.: agachamento, remada)" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ margin: '10px 0' }} />
        {!busca && (
          <div className="chips" role="group" aria-label="Grupo muscular">
            {GRUPOS.map((g) => <button key={g} type="button" className={`chip${grupo === g ? ' on' : ''}`} aria-pressed={grupo === g} onClick={() => setGrupo(g)}>{g}</button>)}
          </div>
        )}
        {lista.length >= MAXIMO && <p className="meta">Chegou a {MAXIMO} exercícios. Tire algum para colocar outro.</p>}
        {opcoes.length === 0 && <p className="meta">Nenhum exercício com esse nome.</p>}
        {opcoes.map((e) => {
          const escolhido = lista.includes(e.nome)
          return (
            <div key={e.nome} className={`monte-item${olhando === e.nome ? ' ativo' : ''}`}>
              <Mini nome={e.nome} onClick={() => setOlhando(e.nome)} />
              <button className="monte-nome" onClick={() => setOlhando(e.nome)}>
                <span className="name">{e.nome}</span>
                <span className="meta">{e.grupo}{e.equipamento ? ` · ${e.equipamento}` : ''}</span>
              </button>
              {escolhido ? <span className="meta">No treino</span> : <button className="link" onClick={() => adicionar(e.nome)}>Adicionar</button>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
