import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import { diasDesde, f1, fmtData, hojeISO, porData, primeiroNome } from '../../lib/formato.js'
import { linkWhatsApp } from '../../lib/whatsapp.js'

export default function Painel() {
  const [alunos, setAlunos] = useState(null)
  const [treinaramHoje, setTreinaramHoje] = useState(0)
  const [envios, setEnvios] = useState([])
  const [novos, setNovos] = useState(0)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase.from('alunos').select('id, nome, telefone, objetivo, status, avaliacoes(data, peso, gordura), treinos(id)').order('nome')
      .then(({ data, error }) => (error ? setErro(error.message) : setAlunos(data)))
    supabase.from('envios_consultoria').select('id, data, peso, aluno_id, alunos(nome)').is('resposta', null).order('data')
      .then(({ data }) => setEnvios(data || []))
    supabase.from('interessados').select('id').eq('status', 'novo').then(({ data }) => setNovos(data?.length || 0))
    Promise.all([
      supabase.from('registros').select('aluno_id').eq('data', hojeISO()),
      supabase.from('checkins').select('aluno_id').eq('data', hojeISO()),
    ]).then(([r, c]) => setTreinaramHoje(new Set([...(r.data || []), ...(c.data || [])].map((x) => x.aluno_id)).size))
  }, [])

  if (erro) return <p className="erro">Não foi possível carregar: {erro}</p>
  if (!alunos) return <p className="carregando">Carregando…</p>

  const ultima = (a) => a.avaliacoes.slice().sort(porData).at(-1)
  const ativos = alunos.filter((a) => a.status === 'ativo').length
  const reavaliar = alunos.filter((a) => { const u = ultima(a); return a.status !== 'pausado' && (!u || diasDesde(u.data) > 60) })
  const semTreino = alunos.filter((a) => a.status !== 'pausado' && a.treinos.length === 0)
  const evolucao = alunos.filter((a) => a.avaliacoes.length > 1)

  return (
    <>
      <h1>Painel</h1>
      <p className="sub">Resumo dos seus alunos hoje.</p>
      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="panel kpi"><div className="n">{alunos.length}</div><div className="l">Alunos</div></div>
        <div className="panel kpi"><div className="n">{ativos}</div><div className="l">Ativos</div></div>
        <div className="panel kpi"><div className="n">{treinaramHoje}</div><div className="l">Treinaram hoje</div></div>
        <div className="panel kpi"><div className="n">{reavaliar.length}</div><div className="l">Reavaliar</div></div>
      </div>
      {alunos.length === 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h2>Comece cadastrando um aluno</h2>
          <p>Vá em <Link to="/alunos">Alunos</Link> e clique em "Novo aluno". Coloque o e-mail dele para ele conseguir entrar e ver o treino.</p>
        </div>
      )}
      {novos > 0 && (
        <Link to="/vendas" className="panel row between" style={{ marginBottom: 16, borderColor: 'var(--accent)', textDecoration: 'none', color: 'inherit' }}>
          <span><strong>{novos === 1 ? '1 pessoa quer' : `${novos} pessoas querem`} fazer a consultoria online</strong><br /><span className="meta">Pediram contato pela sua página de vendas</span></span>
          <span className="pill pendente">Chamar no WhatsApp</span>
        </Link>
      )}
      {envios.length > 0 && (
        <div className="panel" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>
          <div className="row between"><h2>Consultoria online</h2><span className="meta">{envios.length} {envios.length === 1 ? 'envio' : 'envios'} para responder</span></div>
          <div className="list">
            {envios.map((e) => (
              <Link className="item" key={e.id} to={`/alunos/${e.aluno_id}?aba=consultoria`}>
                <div><div className="name">{e.alunos?.nome}</div><div className="meta">Enviou medidas e fotos em {fmtData(e.data)}{e.peso != null ? ` · ${f1(e.peso)} kg` : ''}</div></div>
                <span className="pill pendente">Responder</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="grid2">
        <div className="panel">
          <div className="row between"><h2>Reavaliação</h2><span className="meta">mais de 60 dias</span></div>
          <div className="list">
            {reavaliar.length ? reavaliar.map((a) => {
              const u = ultima(a)
              const zap = linkWhatsApp(a.telefone, `Oi, ${primeiroNome(a.nome)}! Já ${u ? `faz ${diasDesde(u.data)} dias da sua última avaliação` : 'está na hora da sua primeira avaliação'}. Vamos marcar a reavaliação? Qual dia fica bom pra você?`)
              return (
                <div className="item" key={a.id} style={{ cursor: 'default' }}>
                  <Link to={`/alunos/${a.id}?aba=avaliacoes`} style={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
                    <div className="name">{a.nome}</div><div className="meta">{u ? `Última em ${fmtData(u.data)} · há ${diasDesde(u.data)} dias` : 'Nunca avaliado'}</div>
                  </Link>
                  {zap ? <a className="pill pendente" style={{ textDecoration: 'none' }} href={zap} target="_blank" rel="noreferrer">Chamar no WhatsApp</a> : <span className="pill pendente">Agendar</span>}
                </div>
              ) }) : <p className="empty">Todos em dia.</p>}
          </div>
        </div>
        <div className="panel">
          <h2>Evolução</h2>
          <div className="list">
            {evolucao.length ? evolucao.map((a) => {
              const av = a.avaliacoes.slice().sort(porData), p = av[0], u = av.at(-1)
              const dp = u.peso - p.peso
              const dg = u.gordura != null && p.gordura != null ? u.gordura - p.gordura : null
              return (
                <Link className="item" key={a.id} to={`/alunos/${a.id}?aba=avaliacoes`}>
                  <div><div className="name">{a.nome}</div><div className="meta">{a.objetivo}</div></div>
                  <div className="meta mono" style={{ textAlign: 'right' }}>
                    {dp > 0 ? '+' : ''}{f1(dp)} kg{dg != null && <><br />{dg > 0 ? '+' : ''}{f1(dg)} % gord.</>}
                  </div>
                </Link>)
            }) : <p className="empty">Registre duas avaliações de um aluno para ver a evolução.</p>}
          </div>
        </div>
      </div>
      {semTreino.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h2>Sem treino montado</h2>
          <div className="list">
            {semTreino.map((a) => (
              <Link className="item" key={a.id} to={`/alunos/${a.id}`}><div className="name">{a.nome}</div><span className="pill pendente">Montar ficha</span></Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
