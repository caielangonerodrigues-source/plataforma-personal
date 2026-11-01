import Avatar from './Avatar.jsx'
import { iniciais, nomeCurto } from '../lib/comunidade.js'

// Foto do aluno ou, para equipe, um círculo na cor da equipe com as iniciais.
function Figura({ r, fotos, tamanho }) {
  if (r.equipe) return <span className="avatar" style={{ width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.37), background: r.cor, color: '#fff' }}>{iniciais(r.nome)}</span>
  return <Avatar nome={r.nome} avatar={r.avatar} fotos={fotos} tamanho={tamanho} ampliar={false} />
}
const nome = (r) => (r.equipe ? r.nome : nomeCurto(r.nome))

// Pódio (2º, 1º, 3º) e lista do ranking. Cada linha: { id, nome, avatar | equipe+cor, valor, rotulo }.
export function Podio({ linhas, fotos, euId, onAbrir }) {
  const podio = linhas.slice(0, 3)
  if (!podio.length) return null
  return (
    <div className="podio">
      {[podio[1], podio[0], podio[2]].map((r, i) => r && (
        <button key={r.id} type="button" className={`podio-lugar p${[2, 1, 3][i]}${r.id === euId ? ' eu' : ''}`} onClick={() => onAbrir?.(r)} aria-label={`${[2, 1, 3][i]}º lugar: ${nome(r)}, ${r.rotulo}`}>
          <span className="podio-foto">
            <Figura r={r} fotos={fotos} tamanho={[2, 1, 3][i] === 1 ? 76 : 60} />
            <i>{[2, 1, 3][i]}</i>
          </span>
          <strong>{nome(r)}</strong>
          <span className="meta">{r.rotulo}</span>
          <span className="podio-degrau" />
        </button>
      ))}
    </div>
  )
}

export function ListaRanking({ linhas, fotos, euId, onAbrir, unidade, vazio = 'Ninguém na turma ainda.' }) {
  return (
    <div className="panel ranking-lista">
      {linhas.map((r, i) => (
        <div key={r.id} className={`rank${i < 3 && r.valor > 0 ? ' top' : ''}${r.id === euId ? ' eu' : ''}`}
          {...(onAbrir && !r.equipe ? { role: 'button', tabIndex: 0, style: { cursor: 'pointer' }, onClick: () => onAbrir(r), onKeyDown: (e) => e.key === 'Enter' && onAbrir(r), 'aria-label': `Ver perfil de ${nome(r)}` } : {})}>
          <span className="pos">{i + 1}</span>
          <Figura r={r} fotos={fotos} tamanho={38} />
          <span className="name" style={{ minWidth: 0 }}>{nome(r)}{r.id === euId && <span className="meta"> ({r.equipe ? 'sua' : 'você'})</span>}{r.detalhe && <span className="meta" style={{ display: 'block', fontWeight: 400, fontSize: 12.5 }}>{r.detalhe}</span>}</span>
          <span><span className="dias">{r.valor}</span> <span className="meta">{unidade(r.valor)}</span></span>
        </div>
      ))}
      {!linhas.length && <p className="empty">{vazio}</p>}
    </div>
  )
}
