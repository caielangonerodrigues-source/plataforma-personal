import { useEffect, useState } from 'react'
import Avatar from './Avatar.jsx'
import { fotosDaTurma, autorDoPost, nomeCurto, quandoFoi } from '../lib/comunidade.js'

const CHAVE = 'fotosTurmaVistas'
const POR_FOTO = 5000 // ms de cada foto no visualizador, como um story

function lerVisto(eu) {
  try { return localStorage.getItem(`${CHAVE}:${eu}`) } catch { return null }
}
function gravarVisto(eu, quando) {
  try { localStorage.setItem(`${CHAVE}:${eu}`, quando) } catch { /* modo privado: só não lembra */ }
}

// Tempo curto desde a última foto, para o arco do leque: "13 h", "25 min", "2 d".
function desde(createdAt, agora = Date.now()) {
  const min = Math.max(0, Math.floor((agora - new Date(createdAt).getTime()) / 60000))
  if (min < 60) return `${Math.max(1, min)} min`
  if (min < 48 * 60) return `${Math.floor(min / 60)} h`
  return `${Math.floor(min / 1440)} d`
}

// Fotos que a turma postou, no Início do aluno (como no GymRats e nos stories do Instagram): um leque
// flutuando meio escondido na lateral direita da tela, com quantas são novas e há quanto tempo foi a última
// escritos em arco. Tocar abre as fotos em tela cheia, uma por vez.
export default function FotosDaTurma({ dados, eu, irPara }) {
  const [visto, setVisto] = useState(() => lerVisto(eu))
  const [aberta, setAberta] = useState(null) // índice da foto no visualizador
  const membro = Object.fromEntries(dados.membros.map((m) => [m.id, m]))
  const { lista, novas, ultima } = fotosDaTurma(dados.feed, dados.membros, dados.fotos, visto, eu)
  if (!lista.length) return null

  const autorDe = (c) => autorDoPost(c, dados.personal, dados.personais, membro)
  const leque = lista.slice(0, 3) // a mais nova na frente, as outras abrindo para cima e para baixo
  const frente = autorDe(lista[0])
  const texto = novas ? `${novas} ${novas === 1 ? 'NOVA' : 'NOVAS'} · ${desde(ultima)}` : desde(ultima)

  function fechar() {
    setAberta(null)
    gravarVisto(eu, ultima)
    setVisto(ultima)
  }

  return (
    <>
      {aberta == null && (
        <button type="button" className={`leque-turma${novas ? ' tem-novas' : ''}`} onClick={() => setAberta(0)}
          aria-label={`Fotos da turma${novas ? `: ${novas} novas` : ''}, última há ${desde(ultima)}`}>
          {leque.slice().reverse().map((c, i, arr) => {
            const pos = arr.length - 1 - i // 0 = a mais nova, na frente
            return (
              <span key={c.id} className="leque-carta" style={{ '--giro': `${[0, -14, 14][pos]}deg`, zIndex: 3 - pos }}>
                <img src={dados.fotos[c.foto]} alt="" loading="lazy" />
              </span>
            )
          })}
          <svg className="leque-texto" viewBox="0 0 150 300" aria-hidden="true">
            <path id="leque-arco" d="M 120 288 A 160 160 0 0 1 120 12" fill="none" />
            <text><textPath href="#leque-arco" startOffset="50%" textAnchor="middle">
              {novas > 0 && <tspan className="leque-ponto">● </tspan>}{texto}
            </textPath></text>
          </svg>
          {frente && <span className="leque-autor"><Avatar nome={frente.nome} avatar={frente.avatar} fotos={dados.fotos} tamanho={24} ampliar={false} /></span>}
        </button>
      )}
      {aberta != null && (
        <Visualizador lista={lista} inicio={aberta} dados={dados} autorDe={autorDe} onFechar={fechar} onFeed={() => { fechar(); irPara('comunidade') }} />
      )}
    </>
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
