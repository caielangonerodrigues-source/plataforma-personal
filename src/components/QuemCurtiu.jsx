import { useEffect, useState } from 'react'
import Avatar from './Avatar.jsx'
import { nomeCurto } from '../lib/comunidade.js'
import { quemReagiu, curtidoPor } from '../lib/reacoes.js'

// "Curtido por Ana S. e outras pessoas" (como no Instagram) embaixo das reações; tocando, abre a lista de quem reagiu
// com avatar, nome e o emoji de cada um (como no Instagram). Personais aparecem com a marca "Personal".
export default function QuemCurtiu({ reacoes, dados }) {
  const [aberto, setAberto] = useState(false)
  const lista = quemReagiu(reacoes, dados.pessoas, dados.eu)
  const partes = curtidoPor(lista, nomeCurto)

  useEffect(() => {
    if (!aberto) return
    const esc = (e) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [aberto])

  if (!lista.length) return null
  return (
    <>
      <button type="button" className="quem-curtiu" aria-haspopup="dialog" onClick={() => setAberto(true)}>
        Curtido por {partes.map((t, i) => <span key={i}>{i > 0 && ' e '}<b>{t}</b></span>)}
      </button>
      {aberto && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setAberto(false)}>
          <div className="modal quem-curtiu-lista" role="dialog" aria-modal="true" aria-label="Quem curtiu">
            <div className="quem-curtiu-topo">
              <h3>Curtidas <span className="meta">{lista.length}</span></h3>
              <button className="ghost small" aria-label="Fechar" onClick={() => setAberto(false)}>✕</button>
            </div>
            <ul>
              {lista.map((p) => (
                <li key={p.user_id}>
                  <Avatar nome={p.nome} avatar={p.avatar} fotos={dados.fotos} tamanho={40} />
                  <span className="name">
                    {p.voce && p.nome !== 'Você' ? `${nomeCurto(p.nome)} (você)` : nomeCurto(p.nome)}
                    {p.personal && <span className="post-tag" style={{ marginLeft: 6 }}>Personal</span>}
                  </span>
                  <span className="quem-curtiu-emoji" aria-label={`reagiu com ${p.emoji}`}>{p.emoji}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
