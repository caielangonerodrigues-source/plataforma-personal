import { iniciais, nomeCurto, quandoFoi, ranking } from '../lib/comunidade.js'
import { hojeISO } from '../lib/formato.js'

const nomeDoMes = () => new Date().toLocaleDateString('pt-BR', { month: 'long' })

// Feed de check-ins + ranking do mês. `meuAlunoId` destaca o aluno logado; `podeApagarTudo` é o personal.
export default function Comunidade({ comunidade, meuAlunoId, podeApagarTudo }) {
  const { dados, erro, curtir, apagar } = comunidade
  if (erro) return <p className="erro">{erro}</p>
  if (!dados) return <p className="carregando">Carregando…</p>

  const nomes = Object.fromEntries(dados.membros.map((m) => [m.id, m.nome]))
  const tabela = ranking(dados.mes, dados.membros)
  const feed = dados.feed.filter((c) => nomes[c.aluno_id])

  return (
    <div className="comunidade">
      <div className="feed">
        {feed.map((c) => {
          const curtidas = dados.curtidas.filter((k) => k.checkin_id === c.id)
          const curti = curtidas.some((k) => k.user_id === dados.eu)
          return (
            <article className="post" key={c.id}>
              <div className="post-head">
                <span className="avatar" aria-hidden="true">{iniciais(nomes[c.aluno_id])}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="name">{nomeCurto(nomes[c.aluno_id])}</div>
                  <div className="meta">{quandoFoi(c.created_at)}{c.data !== hojeISO() && c.data !== c.created_at.slice(0, 10) ? ` · treino de ${c.data.slice(8)}/${c.data.slice(5, 7)}` : ''}</div>
                </div>
              </div>
              {c.foto && dados.fotos[c.foto] && <img className="post-foto" src={dados.fotos[c.foto]} alt={`Foto do check-in de ${nomeCurto(nomes[c.aluno_id])}`} loading="lazy" />}
              <div className="post-body">
                {c.titulo && <span className="post-tag">{c.titulo}</span>}
                {c.comentario && <p style={{ display: 'inline' }}>{c.comentario}</p>}
              </div>
              <div className="kudos">
                <button aria-pressed={curti} onClick={() => curtir(c.id, curti)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.5.8-1.3 2.3-2.5 4.4-2.5 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z" /></svg>
                  {curti ? 'Curtido' : 'Curtir'}
                </button>
                <span className="meta">{curtidas.length ? `${curtidas.length} curtida${curtidas.length > 1 ? 's' : ''}` : ''}</span>
                {(podeApagarTudo || c.aluno_id === meuAlunoId) && <button className="ghost small" style={{ marginLeft: 'auto' }} onClick={() => apagar(c)}>Apagar</button>}
              </div>
            </article>
          )
        })}
        {!feed.length && <div className="panel empty">Nenhum check-in ainda. O primeiro a treinar abre o feed!</div>}
      </div>

      <aside className="panel">
        <h2>Ranking de {nomeDoMes()}</h2>
        <p className="meta" style={{ margin: '2px 0 8px' }}>Dias com check-in neste mês</p>
        <div>
          {tabela.map((r, i) => (
            <div key={r.id} className={`rank${i < 3 && r.dias > 0 ? ' top' : ''}${r.id === meuAlunoId ? ' eu' : ''}`}>
              <span className="pos">{i + 1}</span>
              <span className="avatar" aria-hidden="true">{iniciais(r.nome)}</span>
              <span className="name" style={{ minWidth: 0 }}>{nomeCurto(r.nome)}{r.id === meuAlunoId && <span className="meta"> (você)</span>}</span>
              <span><span className="dias">{r.dias}</span> <span className="meta">{r.dias === 1 ? 'dia' : 'dias'}</span></span>
            </div>
          ))}
          {!tabela.length && <p className="empty">Ninguém na turma ainda.</p>}
        </div>
      </aside>
    </div>
  )
}
