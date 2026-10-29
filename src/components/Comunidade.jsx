import { useState } from 'react'
import { nomeCurto, quandoFoi, ranking } from '../lib/comunidade.js'
import { hojeISO } from '../lib/formato.js'
import Avatar from './Avatar.jsx'
import Reacoes from './Reacoes.jsx'
import Desafios from './Desafios.jsx'
import ChatTurma from './ChatTurma.jsx'
import BotaoWhatsApp from './BotaoWhatsApp.jsx'
import { placarEquipes } from '../lib/academia.js'

const nomeDoMes = () => new Date().toLocaleDateString('pt-BR', { month: 'long' })

// Feed de check-ins (foto em destaque, curtidas e comentários), grade de fotos e ranking do mês.
// `meuAlunoId` destaca o aluno logado; `podeApagarTudo` é o personal.
export default function Comunidade({ comunidade, meuAlunoId, minhasDatas, podeApagarTudo, whatsapp }) {
  const { dados, erro, reagir, apagar, carregar } = comunidade
  const [visao, setVisao] = useState('feed') // feed | fotos | chat
  if (erro) return <p className="erro">{erro}</p>
  if (!dados) return <p className="carregando">Carregando…</p>

  const membro = Object.fromEntries(dados.membros.map((m) => [m.id, m]))
  const tabela = ranking(dados.mes, dados.membros)
  const feed = dados.feed.filter((c) => membro[c.aluno_id])
  const comFoto = feed.filter((c) => c.foto && dados.fotos[c.foto])
  const equipes = placarEquipes(dados.equipes || [], dados.membros, dados.mes)
  const maxPontos = Math.max(1, ...equipes.map((e) => e.pontos))
  const minhaEquipe = dados.membros.find((m) => m.id === meuAlunoId)?.equipe_id

  function abrirPost(id) {
    setVisao('feed')
    setTimeout(() => document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  return (
    <div className="comunidade">
      <div className="feed">
        <div className="tabs" role="tablist" style={{ marginBottom: 0 }}>
          <button className="tab" role="tab" aria-selected={visao === 'feed'} onClick={() => setVisao('feed')}>Feed</button>
          <button className="tab" role="tab" aria-selected={visao === 'fotos'} onClick={() => setVisao('fotos')}>Fotos{comFoto.length ? ` (${comFoto.length})` : ''}</button>
          <button className="tab" role="tab" aria-selected={visao === 'chat'} onClick={() => setVisao('chat')}>Chat da turma</button>
        </div>

        {visao === 'chat' && <ChatTurma dados={dados} podeApagarTudo={podeApagarTudo} />}

        {visao === 'fotos' && (
          comFoto.length ? (
            <div className="grade-fotos">
              {comFoto.map((c) => (
                <button key={c.id} onClick={() => abrirPost(c.id)} aria-label={`Abrir check-in de ${nomeCurto(membro[c.aluno_id].nome)}`}>
                  <img src={dados.fotos[c.foto]} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          ) : <div className="panel empty">Nenhum check-in com foto ainda. Tire uma foto no próximo treino!</div>
        )}

        {visao === 'feed' && feed.map((c) => (
          <Post key={c.id} c={c} dados={dados} membro={membro} comunidade={comunidade}
            meu={c.aluno_id === meuAlunoId} podeApagarTudo={podeApagarTudo} reagir={reagir} apagar={apagar} />
        ))}
        {visao === 'feed' && !feed.length && <div className="panel empty">Nenhum check-in ainda. O primeiro a treinar abre o feed!</div>}
      </div>

      <aside className="stack">
      {whatsapp && <BotaoWhatsApp link={whatsapp} />}
      {equipes.length > 0 && (
        <div className="panel">
          <h2>Equipes de {nomeDoMes()}</h2>
          <p className="meta" style={{ margin: '2px 0 10px' }}>Cada dia de treino de um membro vale 1 ponto</p>
          <div className="stack" style={{ gap: 12 }}>
            {equipes.map((e, i) => (
              <div key={e.id} className={`equipe${e.id === minhaEquipe ? ' eu' : ''}`}>
                <div className="row between" style={{ flexWrap: 'nowrap' }}>
                  <span className="name"><span className="equipe-cor" style={{ background: e.cor }} />{i === 0 && e.pontos > 0 ? '👑 ' : ''}{e.nome}{e.id === minhaEquipe && <span className="meta"> (sua)</span>}</span>
                  <span><span className="dias">{e.pontos}</span> <span className="meta">pts</span></span>
                </div>
                <div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${Math.round((e.pontos / maxPontos) * 100)}%`, background: e.cor }} /></div>
                <div className="meta" style={{ fontSize: 12, marginTop: 4 }}>{e.membros.length ? e.membros.map((m) => `${nomeCurto(m.nome)} ${m.pontos}`).join(' · ') : 'Sem membros ainda'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Desafios desafios={dados.desafios} checkins={dados.periodo} membros={dados.membros} minhasDatas={minhasDatas} podeGerenciar={podeApagarTudo} recarregar={carregar} />
      <div className="panel">
        <h2>Ranking de {nomeDoMes()}</h2>
        <p className="meta" style={{ margin: '2px 0 8px' }}>Dias com check-in neste mês</p>
        <div>
          {tabela.map((r, i) => (
            <div key={r.id} className={`rank${i < 3 && r.dias > 0 ? ' top' : ''}${r.id === meuAlunoId ? ' eu' : ''}`}>
              <span className="pos">{i + 1}</span>
              <Avatar nome={r.nome} avatar={r.avatar} fotos={dados.fotos} />
              <span className="name" style={{ minWidth: 0 }}>{nomeCurto(r.nome)}{r.id === meuAlunoId && <span className="meta"> (você)</span>}</span>
              <span><span className="dias">{r.dias}</span> <span className="meta">{r.dias === 1 ? 'dia' : 'dias'}</span></span>
            </div>
          ))}
          {!tabela.length && <p className="empty">Ninguém na turma ainda.</p>}
        </div>
      </div>
      </aside>
    </div>
  )
}

function Post({ c, dados, membro, comunidade, meu, podeApagarTudo, reagir, apagar }) {
  const autor = membro[c.aluno_id]
  const curtidas = dados.curtidas.filter((k) => k.checkin_id === c.id)
  const foto = c.foto && dados.fotos[c.foto]
  const comentarios = dados.comentarios ? dados.comentarios.filter((k) => k.checkin_id === c.id) : null
  const [abrirTodos, setAbrirTodos] = useState(false)
  const [escrevendo, setEscrevendo] = useState(false)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const visiveis = comentarios && (abrirTodos ? comentarios : comentarios.slice(-2))

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim()) return
    setEnviando(true)
    const falha = await comunidade.comentar(c.id, texto.trim())
    setEnviando(false)
    setErro(falha)
    if (!falha) { setTexto(''); setAbrirTodos(true) }
  }

  return (
    <article className="post" id={`post-${c.id}`}>
      <div className="post-head">
        <Avatar nome={autor.nome} avatar={autor.avatar} fotos={dados.fotos} />
        <div style={{ minWidth: 0 }}>
          <div className="name">{nomeCurto(autor.nome)}</div>
          <div className="meta">{quandoFoi(c.created_at)}{c.data !== hojeISO() && c.data !== c.created_at.slice(0, 10) ? ` · treino de ${c.data.slice(8)}/${c.data.slice(5, 7)}` : ''}</div>
        </div>
      </div>
      {foto && (
        <div className="post-foto-caixa" onDoubleClick={() => !curtidas.some((k) => k.user_id === dados.eu) && reagir(c.id, '❤️')}>
          <img className="post-foto" src={foto} alt={`Foto do check-in de ${nomeCurto(autor.nome)}`} loading="lazy" />
          {c.titulo && <span className="post-tag sobre-foto">{c.titulo}</span>}
        </div>
      )}
      {(c.comentario || (c.titulo && !foto)) && (
        <div className="post-body">
          {c.titulo && !foto && <span className="post-tag">{c.titulo}</span>}
          {c.comentario && <p style={{ display: 'inline' }}>{c.comentario}</p>}
        </div>
      )}
      <div className="kudos">
        <Reacoes reacoes={curtidas} eu={dados.eu} onReagir={(e) => reagir(c.id, e)} opcoes={dados.reacoesSimples ? ['❤️'] : undefined} />
        {comentarios && (
          <button aria-expanded={escrevendo} onClick={() => setEscrevendo(!escrevendo)}>
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></svg>
            Comentar
          </button>
        )}
        {comentarios?.length > 0 && <span className="meta">{comentarios.length} comentário{comentarios.length > 1 ? 's' : ''}</span>}
        {(podeApagarTudo || meu) && <button className="ghost small" style={{ marginLeft: 'auto' }} onClick={() => apagar(c)}>Apagar</button>}
      </div>
      {comentarios && (comentarios.length > 0 || escrevendo) && (
        <div className="comentarios">
          {comentarios.length > 2 && !abrirTodos && <button className="link" onClick={() => setAbrirTodos(true)}>Ver os {comentarios.length} comentários</button>}
          {visiveis.map((k) => {
            const quem = k.aluno_id && membro[k.aluno_id]
            return (
              <div className="comentario" key={k.id}>
                <Avatar nome={k.autor} avatar={quem?.avatar} fotos={dados.fotos} tamanho={28} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span className="name" style={{ fontSize: 14 }}>{nomeCurto(k.autor || 'Aluno')}</span>
                  {k.do_personal && <span className="post-tag" style={{ marginLeft: 6 }}>Personal</span>}
                  <span className="meta" style={{ marginLeft: 6, fontSize: 12 }}>{quandoFoi(k.created_at)}</span>
                  <div style={{ overflowWrap: 'anywhere' }}>{k.texto}</div>
                </div>
                {(k.user_id === dados.eu || meu || podeApagarTudo) && (
                  <button className="ghost small" aria-label="Apagar comentário" onClick={() => comunidade.apagarComentario(k.id)}>✕</button>
                )}
              </div>
            )
          })}
          {escrevendo && (
            <form className="row" style={{ gap: 6, flexWrap: 'nowrap' }} onSubmit={enviar}>
              <input aria-label="Escreva um comentário" autoFocus maxLength={280} placeholder="Escreva um comentário…" value={texto} onChange={(e) => setTexto(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
              <button className="primary small" disabled={enviando || !texto.trim()}>{enviando ? '…' : 'Enviar'}</button>
            </form>
          )}
          {erro && <p className="erro" style={{ margin: 0 }}>{erro}</p>}
        </div>
      )}
    </article>
  )
}
