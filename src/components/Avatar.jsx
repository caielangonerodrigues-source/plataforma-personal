import { lerAvatar } from '../lib/avatar.js'
import { iniciais } from '../lib/comunidade.js'
import { ICONES } from './IconeLinha.jsx'

// Foto do aluno, avatar pronto ou as iniciais. `fotos` mapeia o caminho da foto para o link assinado.
export default function Avatar({ nome, avatar, fotos = {}, tamanho = 38 }) {
  const a = lerAvatar(avatar)
  const estilo = { width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.37) }
  if (a?.tipo === 'foto' && fotos[a.caminho]) return <img className="avatar" style={{ ...estilo, objectFit: 'cover' }} src={fotos[a.caminho]} alt="" />
  if (a?.tipo === 'pronto') return <span className="avatar pronto" aria-hidden="true" style={estilo}><IconeAvatar chave={a.icone} tamanho={tamanho} /></span>
  return <span className="avatar" aria-hidden="true" style={estilo}>{iniciais(nome)}</span>
}

export function IconeAvatar({ chave, tamanho }) {
  const lado = Math.round(tamanho * 0.56)
  return (
    <svg width={lado} height={lado} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={tamanho < 34 ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round"><path d={ICONES[chave] || ICONES.haltere} /></svg>
  )
}
