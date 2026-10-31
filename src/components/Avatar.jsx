import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { lerAvatar } from '../lib/avatar.js'
import { iniciais, nomeCurto } from '../lib/comunidade.js'
import { ICONES } from './IconeLinha.jsx'

// Foto do aluno, avatar pronto ou as iniciais. `fotos` mapeia o caminho da foto para o link assinado.
// Quando é foto, tocar nela abre a foto grande (`ampliar={false}` desliga, ex.: barra de baixo).
export default function Avatar({ nome, avatar, fotos = {}, tamanho = 38, ampliar = true }) {
  const [aberta, setAberta] = useState(false)
  const a = lerAvatar(avatar)
  const estilo = { width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.37) }
  if (a?.tipo === 'foto' && fotos[a.caminho]) {
    const src = fotos[a.caminho]
    if (!ampliar) return <img className="avatar" style={{ ...estilo, objectFit: 'cover' }} src={src} alt="" />
    const abrir = (e) => { e.stopPropagation(); e.preventDefault(); setAberta(true) }
    return (
      <>
        <img className="avatar avatar-ampliavel" style={{ ...estilo, objectFit: 'cover' }} src={src} alt={nome ? `Foto de ${nome}` : 'Foto de perfil'}
          role="button" tabIndex={0} title="Ver foto"
          onClick={abrir} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && abrir(e)} />
        {aberta && <FotoAmpliada src={src} nome={nome} onFechar={() => setAberta(false)} />}
      </>
    )
  }
  if (a?.tipo === 'pronto') return <span className="avatar pronto" aria-hidden="true" style={estilo}><IconeAvatar chave={a.icone} tamanho={tamanho} /></span>
  return <span className="avatar" aria-hidden="true" style={estilo}>{iniciais(nome)}</span>
}

// Foto de perfil em tela cheia, como no Instagram: fundo escuro, foto redonda grande e o nome. Toque em qualquer lugar fecha.
function FotoAmpliada({ src, nome, onFechar }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])
  // Os eventos do portal sobem pela árvore do React: segura aqui para não abrir o perfil/fechar o modal de baixo.
  const parar = (e) => e.stopPropagation()
  return createPortal(
    <div className="foto-ampliada" role="dialog" aria-modal="true" aria-label={nome ? `Foto de ${nome}` : 'Foto de perfil'}
      onClick={(e) => { parar(e); onFechar() }} onMouseDown={parar} onTouchStart={parar} onKeyDown={parar}>
      <button type="button" className="foto-ampliada-fechar" aria-label="Fechar">✕</button>
      <img src={src} alt="" />
      {nome && <strong>{nomeCurto(nome)}</strong>}
    </div>,
    document.body,
  )
}

export function IconeAvatar({ chave, tamanho }) {
  const lado = Math.round(tamanho * 0.56)
  return (
    <svg width={lado} height={lado} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={tamanho < 34 ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round"><path d={ICONES[chave] || ICONES.haltere} /></svg>
  )
}
