import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { assinarFotos } from '../lib/fotosAssinadas.js'
import Avatar from './Avatar.jsx'
import { inicioDoMes, nomeCurto, quandoFoi, sequencia } from '../lib/comunidade.js'
import { hojeISO } from '../lib/formato.js'

// Perfil de um aluno da turma: números, medalhas, recordes e fotos dos check-ins.
export default function PerfilAluno({ membro, dados, equipe, onFechar, onAbrirPost }) {
  const [perfil, setPerfil] = useState(null)
  const hoje = hojeISO()

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const [checkins, conquistas] = await Promise.all([
        supabase.from('checkins').select('id, data, foto, created_at').eq('aluno_id', membro.id).order('created_at', { ascending: false }),
        supabase.from('conquistas').select('*').eq('aluno_id', membro.id).order('created_at', { ascending: false }),
      ])
      const lista = checkins.data || []
      const faltam = lista.slice(0, 30).map((c) => c.foto).filter((f) => f && !dados.fotos[f])
      const assinadas = faltam.length ? (await assinarFotos('checkins', faltam)).data || [] : []
      if (vivo) setPerfil({ checkins: lista, conquistas: conquistas.error ? [] : conquistas.data, fotos: { ...dados.fotos, ...Object.fromEntries(assinadas.filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl])) } })
    })()
    return () => { vivo = false }
  }, [membro.id])

  const datas = perfil ? perfil.checkins.map((c) => c.data) : []
  const noMes = new Set(datas.filter((d) => d >= inicioDoMes(hoje))).size
  const medalhas = perfil ? perfil.conquistas.filter((c) => c.tipo === 'medalha') : []
  const recordes = perfil ? perfil.conquistas.filter((c) => c.tipo === 'recorde').slice(0, 5) : []
  const comFoto = perfil ? perfil.checkins.filter((c) => c.foto && perfil.fotos[c.foto]).slice(0, 30) : []

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal perfil-aluno" role="dialog" aria-label={`Perfil de ${membro.nome}`}>
        <button className="ghost small fechar" aria-label="Fechar" onClick={onFechar}>✕</button>
        <div className="perfil-aluno-topo">
          <Avatar nome={membro.nome} avatar={membro.avatar} fotos={dados.fotos} tamanho={84} />
          <h2>{nomeCurto(membro.nome)}</h2>
          {equipe && <span className="post-tag" style={{ background: equipe.cor, color: '#fff' }}>{equipe.nome}</span>}
        </div>
        {!perfil ? <p className="carregando">Carregando…</p> : (
          <>
            <div className="perfil-aluno-nums">
              <div><strong>{sequencia(datas, hoje)}</strong><span>dias seguidos</span></div>
              <div><strong>{noMes}</strong><span>treinos no mês</span></div>
              <div><strong>{new Set(datas).size}</strong><span>check-ins</span></div>
            </div>
            {medalhas.length > 0 && (
              <>
                <div className="secao">Medalhas ({medalhas.length})</div>
                <div className="perfil-medalhas">
                  {medalhas.map((m) => <span key={m.id} title={m.texto || m.titulo}>{m.titulo}</span>)}
                </div>
              </>
            )}
            {recordes.length > 0 && (
              <>
                <div className="secao">Últimos recordes</div>
                {recordes.map((r) => <div key={r.id} className="meta" style={{ color: 'var(--ink)' }}>{r.titulo.replace(/^Recorde no /, '')} · {r.texto?.replace(/^Nova melhor carga: /, '')} <span className="meta">· {quandoFoi(r.created_at)}</span></div>)}
              </>
            )}
            <div className="secao">Fotos</div>
            {comFoto.length ? (
              <div className="grade-fotos">
                {comFoto.map((c) => (
                  <button key={c.id} onClick={() => onAbrirPost(c.id)} aria-label={`Check-in de ${c.data.slice(8)}/${c.data.slice(5, 7)}`}>
                    <img src={perfil.fotos[c.foto]} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            ) : <p className="meta">Nenhum check-in com foto ainda.</p>}
          </>
        )}
      </div>
    </div>
  )
}
