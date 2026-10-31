import { useEffect, useState } from 'react'
import Avatar from './Avatar.jsx'
import IconeLinha, { ICONES } from './IconeLinha.jsx'
import { TituloSecao } from './HeroInicio.jsx'
import { fotosDaTurma, nomeCurto, quandoFoi } from '../lib/comunidade.js'

const CHAVE = 'fotosTurmaVistas'
const POR_FOTO = 5000 // ms de cada foto no visualizador, como um story

function lerVisto(eu) {
  try { return localStorage.getItem(`${CHAVE}:${eu}`) } catch { return null }
}
function gravarVisto(eu, quando) {
  try { localStorage.setItem(`${CHAVE}:${eu}`, quando) } catch { /* modo privado: só não lembra */ }
}

// Tempo curto desde a última foto, para o canto da pilha: "13 h", "25 min", "2 d".
function desde(createdAt, agora = Date.now()) {
  const min = Math.max(0, Math.floor((agora - new Date(createdAt).getTime()) / 60000))
  if (min < 60) return `${Math.max(1, min)} min`
  if (min < 48 * 60) return `${Math.floor(min / 60)} h`
  return `${Math.floor(min / 1440)} d`
}

// Fotos que a turma postou, no Início do aluno (como no GymRats): uma pilha em leque com as últimas fotos,
// quantas são novas e há quanto tempo foi a última. Tocar abre as fotos em tela cheia, uma por vez.
export default function FotosDaTurma({ dados, eu, irPara }) {
  const [visto, setVisto] = useState(() => lerVisto(eu))
  const [aberta, setAberta] = useState(null) // índice da foto no visualizador
  const membro = Object.fromEntries(dados.membros.map((m) => [m.id, m]))
  const { lista, novas, ultima } = fotosDaTurma(dados.feed, dados.membros, dados.fotos, visto, eu)
  if (!lista.length) return null

  const autorDe = (c) => (c.personal_id ? { ...dados.personal, personal: true } : membro[c.aluno_id])
  const pilha = lista.slice(0, 5)

  function fechar() {
    setAberta(null)
    gravarVisto(eu, ultima)
    setVisto(ultima)
  }

  return (
    <div className="panel stack fotos-turma" style={{ gap: 10 }}>
      <TituloSecao icone={<IconeLinha d={ICONES.camera} tamanho={22} traco={1.7} />} titulo="Fotos da turma" acao="Ver todas" onClick={() => irPara('comunidade')} />
      <button type="button" className="fotos-turma-corpo" onClick={() => setAberta(0)} aria-label={`Ver as fotos da turma${novas ? `, ${novas} novas` : ''}`}>
        <div className="fotos-turma-info">
          {novas > 0
            ? <strong className="fotos-turma-novas"><i aria-hidden="true" />{novas} {novas === 1 ? 'nova' : 'novas'}</strong>
            : <strong>Tudo visto</strong>}
          <span className="meta">Última há {desde(ultima)}</span>
          <span className="atalho-acao">Ver fotos ›</span>
        </div>
        <div className="fotos-turma-pilha" aria-hidden="true">
          {pilha.slice().reverse().map((c, i, arr) => {
            const pos = arr.length - 1 - i // 0 = a mais nova, por cima
            const autor = autorDe(c)
            return (
              <span key={c.id} className="fotos-turma-carta" style={{ '--pos': pos, zIndex: arr.length - pos }}>
                <img src={dados.fotos[c.foto]} alt="" loading="lazy" />
                {pos === 0 && autor && <span className="fotos-turma-autor"><Avatar nome={autor.nome} avatar={autor.avatar} fotos={dados.fotos} tamanho={30} /></span>}
              </span>
            )
          })}
        </div>
      </button>
      {aberta != null && (
        <Visualizador lista={lista} inicio={aberta} dados={dados} autorDe={autorDe} onFechar={fechar} onFeed={() => { fechar(); irPara('comunidade') }} />
      )}
    </div>
  )
}

// Fotos em tela cheia, uma por vez: toque à direita avança, à esquerda volta; passa sozinha a cada 5 s.
function Visualizador({ lista, inicio, dados, autorDe, onFechar, onFeed }) {
  const [i, setI] = useState(inicio)
  const c = lista[i]
  const autor = autorDe(c) || { nome: 'Aluno' }
  const ir = (n) => (n < 0 ? setI(0) : n >= lista.length ? onFechar() : setI(n))

  useEffect(() => {
    const t = setTimeout(() => ir(i + 1), POR_FOTO)
    return () => clearTimeout(t)
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') onFechar()
      if (e.key === 'ArrowRight') ir(i + 1)
      if (e.key === 'ArrowLeft') ir(i - 1)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="story-tela" role="dialog" aria-modal="true" aria-label="Fotos da turma">
      <div className="story-barras">
        {lista.map((x, n) => <i key={x.id} className={n < i ? 'feita' : n === i ? 'atual' : ''}><b key={i} style={{ animationDuration: `${POR_FOTO}ms` }} /></i>)}
      </div>
      <div className="story-topo">
        <Avatar nome={autor.nome} avatar={autor.avatar} fotos={dados.fotos} tamanho={34} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong>{nomeCurto(autor.nome)}{autor.personal && <span className="story-selo">Personal</span>}</strong>
          <span>{quandoFoi(c.created_at)}</span>
        </div>
        <button type="button" className="story-fechar" onClick={onFechar} aria-label="Fechar">×</button>
      </div>
      <img className="story-foto" src={dados.fotos[c.foto]} alt={c.comentario || `Foto de ${nomeCurto(autor.nome)}`} />
      <button type="button" className="story-toque esq" onClick={() => ir(i - 1)} aria-label="Foto anterior" />
      <button type="button" className="story-toque dir" onClick={() => ir(i + 1)} aria-label="Próxima foto" />
      <div className="story-rodape">
        {c.comentario && <p>{c.comentario}</p>}
        <button type="button" className="link" onClick={onFeed}>Curtir e comentar no feed ›</button>
      </div>
    </div>
  )
}
