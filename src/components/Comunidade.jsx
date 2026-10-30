import { useState } from 'react'
import IconeLinha, { ICONES } from './IconeLinha.jsx'
import { doGrupo, grupoDe, nomeCurto, quandoFoi, ranking } from '../lib/comunidade.js'
import { hojeISO } from '../lib/formato.js'
import Avatar from './Avatar.jsx'
import Reacoes from './Reacoes.jsx'
import CardTreino from './CardTreino.jsx'
import PerfilAluno from './PerfilAluno.jsx'
import { montarFeed } from '../lib/social.js'
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
  const [perfilDe, setPerfilDe] = useState(null) // aluno com o perfil aberto
  const [grupo, setGrupo] = useState(null) // ranking: academia | online (começa no grupo do aluno)
  if (erro) return <p className="erro">{erro}</p>
  if (!dados) return <p className="carregando">Carregando…</p>

  const membro = Object.fromEntries(dados.membros.map((m) => [m.id, m]))
  // Ranking: Geral (todos), Academia, Online e Minha equipe. Começa no grupo do aluno.
  const temOnline = dados.membros.some((m) => grupoDe(m) === 'online')
  const eu = dados.membros.find((m) => m.id === meuAlunoId)
  const equipeMinha = (dados.equipes || []).find((e) => e.id === eu?.equipe_id)
  const visoesRanking = [['geral', 'Geral'], ...(temOnline ? [['academia', 'Academia'], ['online', 'Online']] : []), ...(equipeMinha ? [['equipe', 'Minha equipe']] : [])]
  const meuGrupo = visoesRanking.some(([k]) => k === grupo) ? grupo : temOnline && eu ? grupoDe(eu) : 'geral'
  const tabela = ranking(dados.mes, meuGrupo === 'geral' ? dados.membros : meuGrupo === 'equipe' ? dados.membros.filter((m) => m.equipe_id === equipeMinha.id) : doGrupo(dados.membros, meuGrupo))
  const legenda = { geral: 'Todos os alunos', academia: 'Quem treina na academia', online: 'Alunos da consultoria online', equipe: `Quem é da ${equipeMinha?.nome || 'sua equipe'}` }[meuGrupo]
  // Fotos do personal entram no feed assinadas com o nome dele e a marca "Personal".
  const autorDe = (c) => (c.personal_id ? { ...dados.personal, personal: true } : membro[c.aluno_id])
  const feed = dados.feed.filter((c) => c.personal_id || membro[c.aluno_id])
  const comFoto = feed.filter((c) => c.foto && dados.fotos[c.foto])
  const equipes = placarEquipes(dados.equipes || [], dados.membros, dados.mes)
  const maxPontos = Math.max(1, ...equipes.map((e) => e.pontos))
  const minhaEquipe = dados.membros.find((m) => m.id === meuAlunoId)?.equipe_id
  const itens = montarFeed(feed, (dados.conquistas || []).filter((q) => membro[q.aluno_id]))
  const abrirPerfil = (id) => membro[id] && setPerfilDe(membro[id])

  function abrirPost(id) {
    setPerfilDe(null)
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
                <button key={c.id} onClick={() => abrirPost(c.id)} aria-label={`Abrir post de ${nomeCurto(autorDe(c).nome)}`}>
                  <img src={dados.fotos[c.foto]} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          ) : <div className="panel empty">Nenhum check-in com foto ainda. Tire uma foto no próximo treino!</div>
        )}

        {podeApagarTudo && visao === 'feed' && <PostarFoto postar={comunidade.postarFoto} />}
        {visao === 'feed' && itens.map((c) => (c.tipoItem === 'conquista'
          ? <Conquista key={`q${c.id}`} q={c} dados={dados} autor={membro[c.aluno_id]} reagir={comunidade.reagirConquista} abrirPerfil={abrirPerfil} />
          : <Post key={c.id} c={c} dados={dados} membro={membro} autor={autorDe(c)} comunidade={comunidade} abrirPerfil={abrirPerfil}
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
                  <span className="name"><span className="equipe-cor" style={{ background: e.cor }} />{e.nome}{e.id === minhaEquipe && <span className="meta"> (sua)</span>}</span>
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
        {visoesRanking.length > 1 && (
          <div className="segmentos" role="tablist" style={{ margin: '8px 0 4px', flexWrap: 'wrap' }}>
            {visoesRanking.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={meuGrupo === k} aria-pressed={meuGrupo === k} onClick={() => setGrupo(k)}>{l}</button>
            ))}
          </div>
        )}
        <p className="meta" style={{ margin: '2px 0 8px' }}>{legenda}: dias com check-in neste mês</p>
        <div>
          {tabela.map((r, i) => (
            <div key={r.id} className={`rank${i < 3 && r.dias > 0 ? ' top' : ''}${r.id === meuAlunoId ? ' eu' : ''}`} role="button" tabIndex={0} style={{ cursor: 'pointer' }}
              onClick={() => abrirPerfil(r.id)} onKeyDown={(e) => e.key === 'Enter' && abrirPerfil(r.id)} aria-label={`Ver perfil de ${nomeCurto(r.nome)}`}>
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
      {perfilDe && <PerfilAluno membro={perfilDe} dados={dados} equipe={(dados.equipes || []).find((e) => e.id === perfilDe.equipe_id)} onFechar={() => setPerfilDe(null)} onAbrirPost={abrirPost} />}
    </div>
  )
}

// Medalha ganha ou recorde de carga, publicado sozinho no feed.
function Conquista({ q, dados, autor, reagir, abrirPerfil }) {
  return (
    <article className="post conquista">
      <div className="post-head">
        <button className="abre-perfil" onClick={() => abrirPerfil(q.aluno_id)}>
          <Avatar nome={autor.nome} avatar={autor.avatar} fotos={dados.fotos} />
          <span style={{ minWidth: 0 }}>
            <span className="name" style={{ display: 'block' }}>{nomeCurto(autor.nome)}</span>
            <span className="meta">{q.tipo === 'recorde' ? 'bateu um recorde' : 'ganhou uma medalha'} · {quandoFoi(q.created_at)}</span>
          </span>
        </button>
      </div>
      <div className="conquista-corpo">
        <span className="conquista-icone"><IconeLinha d={q.tipo === 'recorde' ? ICONES.haltere : ICONES.medalha} tamanho={30} /></span>
        <div style={{ minWidth: 0 }}><strong>{q.titulo}</strong>{q.texto && q.texto !== q.titulo && <span className="meta">{q.texto}</span>}</div>
      </div>
      <div className="kudos">
        <Reacoes reacoes={dados.reacoesConquistas.filter((k) => k.conquista_id === q.id)} eu={dados.eu} onReagir={(e) => reagir(q.id, e)} />
      </div>
    </article>
  )
}

function Post({ c, dados, membro, autor, comunidade, meu, podeApagarTudo, reagir, apagar, abrirPerfil }) {
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
        <button className="abre-perfil" onClick={() => abrirPerfil(c.aluno_id)} aria-label={`Ver perfil de ${nomeCurto(autor.nome)}`}>
          <Avatar nome={autor.nome} avatar={autor.avatar} fotos={dados.fotos} />
          <span style={{ minWidth: 0 }}>
            <span className="name" style={{ display: 'block' }}>{nomeCurto(autor.nome)}{autor.personal && <span className="post-tag" style={{ marginLeft: 6 }}>Personal</span>}</span>
            <span className="meta">{quandoFoi(c.created_at)}{!autor.personal && c.data !== hojeISO() && c.data !== c.created_at.slice(0, 10) ? ` · treino de ${c.data.slice(8)}/${c.data.slice(5, 7)}` : ''}</span>
            {c.local && <span className="meta post-local"><IconeLinha d={ICONES.pino} tamanho={14} traco={1.8} />{c.local}</span>}
          </span>
        </button>
      </div>
      {c.resumo && !foto && c.titulo && <div className="post-body" style={{ paddingTop: 0 }}><span className="post-tag">{c.titulo}</span></div>}
      <CardTreino resumo={c.resumo} />
      {foto && (
        <div className="post-foto-caixa" onDoubleClick={() => !curtidas.some((k) => k.user_id === dados.eu) && reagir(c.id, '❤️')}>
          <img className="post-foto" src={foto} alt={`Foto de ${nomeCurto(autor.nome)}`} loading="lazy" />
          {c.titulo && <span className="post-tag sobre-foto">{c.titulo}</span>}
        </div>
      )}
      {(c.comentario || (c.titulo && !foto && !c.resumo)) && (
        <div className="post-body">
          {c.titulo && !foto && !c.resumo && <span className="post-tag">{c.titulo}</span>}
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
                <Avatar nome={k.autor} avatar={k.do_personal ? dados.personal?.avatar : quem?.avatar} fotos={dados.fotos} tamanho={28} />
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

// Personal: posta uma foto no feed de todos os alunos (não conta como check-in).
function PostarFoto({ postar }) {
  const [foto, setFoto] = useState(null)
  const [legenda, setLegenda] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [chave, setChave] = useState(0) // limpa o campo do arquivo depois de postar

  async function enviar(e) {
    e.preventDefault()
    if (!foto) return setErro('Escolha uma foto.')
    setEnviando(true); setErro('')
    const falha = await postar(foto, legenda)
    setEnviando(false)
    if (falha) return setErro(falha)
    setFoto(null); setLegenda(''); setChave((k) => k + 1)
  }

  return (
    <form className="postar-foto" onSubmit={enviar}>
      <IconeLinha d={ICONES.camera} tamanho={30} />
      <div className="stack" style={{ gap: 8, flex: 1, minWidth: 0 }}>
        <strong>Postar foto para os alunos</strong>
        <span className="meta">Aparece no feed de todos, com a marca Personal. Não conta como check-in.</span>
        <input key={chave} type="file" accept="image/*" aria-label="Foto" onChange={(e) => setFoto(e.target.files?.[0] || null)} />
        <textarea rows={2} maxLength={280} placeholder="Escreva algo para motivar a turma (opcional)" value={legenda} onChange={(e) => setLegenda(e.target.value)} />
        {erro && <p className="erro" style={{ margin: 0 }}>{erro}</p>}
        <div><button className="primary" disabled={enviando || !foto}>{enviando ? 'Postando…' : 'Postar'}</button></div>
      </div>
    </form>
  )
}
