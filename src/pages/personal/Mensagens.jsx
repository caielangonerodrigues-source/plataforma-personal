import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import Avatar from '../../components/Avatar.jsx'
import ConversaPrivada from '../../components/ConversaPrivada.jsx'
import { quandoFoi } from '../../lib/comunidade.js'

// Conversas particulares com os alunos: quem mandou por último aparece primeiro.
export default function Mensagens() {
  const [params, setParams] = useSearchParams()
  const [alunos, setAlunos] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [eu, setEu] = useState(null)
  const [indisponivel, setIndisponivel] = useState(false)
  const [busca, setBusca] = useState('')
  const aberto = params.get('aluno')

  const carregar = useCallback(async () => {
    const [a, m, s] = await Promise.all([
      supabase.from('alunos').select('id, nome, avatar, modalidade, status').neq('status', 'pausado').order('nome'),
      supabase.from('mensagens_privadas').select('aluno_id, texto, do_personal, lida_em, created_at').order('created_at', { ascending: false }).limit(500),
      supabase.auth.getSession(),
    ])
    if (m.error) setIndisponivel(true)
    setAlunos(a.data || [])
    setMsgs(m.data || [])
    setEu(s.data.session?.user.id)
  }, [])

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 30000)
    return () => clearInterval(t)
  }, [carregar])

  if (indisponivel) return <><h1>Mensagens</h1><div className="panel empty">Rode o SQL novo (supabase/migracao-social.sql) para usar as mensagens com os alunos.</div></>
  if (!alunos) return <p className="carregando">Carregando…</p>

  const ultima = {}
  const naoLidas = {}
  for (const m of msgs) {
    if (!ultima[m.aluno_id]) ultima[m.aluno_id] = m
    if (!m.do_personal && !m.lida_em) naoLidas[m.aluno_id] = (naoLidas[m.aluno_id] || 0) + 1
  }
  const lista = alunos
    .filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((x, y) => (ultima[y.id]?.created_at || '').localeCompare(ultima[x.id]?.created_at || '') || x.nome.localeCompare(y.nome, 'pt-BR'))
  const atual = alunos.find((a) => a.id === aberto)

  return (
    <>
      <h1>Mensagens</h1>
      <p className="sub">Conversa particular com cada aluno, da academia e da consultoria online.</p>
      <div className={`conversas${atual ? ' aberta' : ''}`}>
        <div className="panel conversas-lista">
          <input placeholder="Buscar aluno" aria-label="Buscar aluno" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ marginBottom: 6 }} />
          {lista.map((a) => {
            const u = ultima[a.id]
            return (
              <button key={a.id} className={`item${a.id === aberto ? ' ativa' : ''}`} onClick={() => setParams({ aluno: a.id })}>
                <Avatar nome={a.nome} avatar={a.avatar?.startsWith('p:') ? a.avatar : null} tamanho={36} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="name" style={{ display: 'block' }}>{a.nome}{a.modalidade === 'online' && <span className="meta"> · online</span>}</span>
                  <span className="previa" style={{ display: 'block' }}>{u ? `${u.do_personal ? 'Você: ' : ''}${u.texto}` : 'Sem mensagens'}</span>
                </span>
                <span className="stack" style={{ gap: 2, alignItems: 'flex-end' }}>
                  {u && <span className="meta" style={{ fontSize: 11 }}>{quandoFoi(u.created_at)}</span>}
                  {naoLidas[a.id] > 0 && <span className="tab-badge">{naoLidas[a.id]}</span>}
                </span>
              </button>
            )
          })}
          {!lista.length && <p className="empty">Nenhum aluno.</p>}
        </div>
        <div className="conversa-aberta stack">
          {atual ? (
            <>
              <div className="row between">
                <button className="link so-celular" onClick={() => setParams({})}>← Conversas</button>
                <strong>{atual.nome}</strong>
              </div>
              <ConversaPrivada key={atual.id} alunoId={atual.id} eu={eu} com={atual.nome.split(' ')[0]} onLidas={carregar} />
            </>
          ) : <div className="panel empty">Escolha um aluno para ver a conversa.</div>}
        </div>
      </div>
    </>
  )
}
