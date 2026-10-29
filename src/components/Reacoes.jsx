import { useEffect, useRef, useState } from 'react'
import { EMOJIS, resumirReacoes } from '../lib/reacoes.js'

// Reações com emoji de um post ou mensagem. Toque num emoji para reagir, no mesmo de novo para tirar.
// `reacoes`: [{ user_id, emoji }]. `onReagir(emoji)`. `opcoes` limita os emojis (antes do SQL novo, só ❤️).
// `mini` (chat): sem botão de reagir; quem abre a lista de emojis é o toque na mensagem (`aberto`/`onAbrir`).
export default function Reacoes({ reacoes, eu, onReagir, opcoes = EMOJIS, mini = false, aberto: abertoFora, onAbrir }) {
  const [abertoDentro, setAbertoDentro] = useState(false)
  const aberto = onAbrir ? abertoFora : abertoDentro
  const setAberto = onAbrir || setAbertoDentro
  const caixa = useRef(null)
  const { lista, minha } = resumirReacoes(reacoes, eu)

  useEffect(() => {
    if (!aberto) return
    // No chat, o toque na própria mensagem já abre e fecha a lista.
    const area = () => (mini ? caixa.current?.parentElement : caixa.current)
    const fora = (e) => area() && !area().contains(e.target) && setAberto(false)
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [aberto, mini, setAberto])

  if (mini && !lista.length && !aberto) return null
  const escolher = (emoji) => { setAberto(false); onReagir(emoji) }

  return (
    <div className={`reacoes${mini ? ' mini' : ''}`} ref={caixa}>
      {lista.map(({ emoji, total }) => (
        <button key={emoji} type="button" className="reacao" aria-pressed={minha === emoji}
          aria-label={`${emoji} ${total}${minha === emoji ? ', sua reação (toque para tirar)' : ''}`} onClick={() => onReagir(emoji)}>
          <span aria-hidden="true">{emoji}</span>{total > 1 && <b>{total}</b>}
        </button>
      ))}
      {!mini && <button type="button" className="reacao reagir" aria-expanded={aberto} aria-label="Reagir com emoji" onClick={() => setAberto(!aberto)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="12" r="8" /><path d="M8 14c.8 1.2 1.8 1.8 3 1.8s2.2-.6 3-1.8M8.5 9.5h.01M13.5 9.5h.01M20 3v5M17.5 5.5h5" />
        </svg>
        {!lista.length && <span>Reagir</span>}
      </button>}
      {aberto && (
        <div className="reacoes-menu" role="menu">
          {opcoes.map((e) => (
            <button key={e} type="button" role="menuitem" aria-pressed={minha === e} aria-label={`Reagir com ${e}`} onClick={() => escolher(e)}>{e}</button>
          ))}
        </div>
      )}
    </div>
  )
}
