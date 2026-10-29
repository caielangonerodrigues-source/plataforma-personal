import { lerAvatar } from '../lib/avatar.js'
import { iniciais } from '../lib/comunidade.js'

// Foto do aluno, avatar pronto ou as iniciais. `fotos` mapeia o caminho da foto para o link assinado.
export default function Avatar({ nome, avatar, fotos = {}, tamanho = 38 }) {
  const a = lerAvatar(avatar)
  const estilo = { width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.37) }
  if (a?.tipo === 'foto' && fotos[a.caminho]) return <img className="avatar" style={{ ...estilo, objectFit: 'cover' }} src={fotos[a.caminho]} alt="" />
  if (a?.tipo === 'pronto') return <span className="avatar" aria-hidden="true" style={{ ...estilo, background: a.cor, fontSize: Math.round(tamanho * 0.52) }}>{a.emoji}</span>
  return <span className="avatar" aria-hidden="true" style={estilo}>{iniciais(nome)}</span>
}
