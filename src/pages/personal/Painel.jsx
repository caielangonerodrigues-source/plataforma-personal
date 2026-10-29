import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import { MESES, brl, diasDesde, f1, fmtData, hojeISO, porData, primeiroNome } from '../../lib/formato.js'
import { linkWhatsApp } from '../../lib/whatsapp.js'
import { somarDias } from '../../lib/comunidade.js'
import { alunosSumidos, aniversariantes, mensalidadesAtrasadas } from '../../lib/atencao.js'
import { ListaFeedbacks } from '../../components/ComoFoiTreino.jsx'
import { atendimentos } from '../../lib/agenda.js'
import { fichasParaTrocar } from '../../lib/ficha.js'

export default function Painel() {
  const [alunos, setAlunos] = useState(null)
  const [treinaramHoje, setTreinaramHoje] = useState(0)
  const [envios, setEnvios] = useState([])
  const [novos, setNovos] = useState(0)
  const [atividades, setAtividades] = useState([])
  const [pagamentos, setPagamentos] = useState([])
  const [trocas, setTrocas] = useState([])
  const [amanha, setAmanha] = useState(0)
  const [feedbacks, setFeedbacks] = useState([])
  const [prazoFicha, setPrazoFicha] = useState(6)
  const [comFase, setComFase] = useState(new Set())
  const [revisados, setRevisados] = useState({})
  const [erro, setErro] = useState('')
  const hoje = hojeISO()

  useEffect(() => {
    const desde = somarDias(hoje, -60)
    // Começa as fases de treino programadas para hoje antes de contar as fichas.
    supabase.rpc('aplicar_fases').then(() => supabase.from('alunos').select('*, avaliacoes(data, peso, gordura), treinos(*)').order('nome'))
      .then(({ data, error }) => (error ? setErro(error.message) : setAlunos(data.map((a) => ({ ...a, treinos: a.treinos.filter((t) => !t.arquivado) })))))
    // Prazo de troca de ficha e quem já tem fase programada (sem o SQL novo, fica o padrão de 6 semanas).
    supabase.from('personais').select('*').maybeSingle().then(({ data }) => data?.trocar_ficha_semanas && setPrazoFicha(data.trocar_ficha_semanas))
    supabase.from('fases').select('aluno_id').is('aplicada_em', null).then(({ data }) => setComFase(new Set((data || []).map((f) => f.aluno_id))))
    // Uma vez por dia, manda a notificação das fichas vencidas (aluno e personal).
    try {
      if (localStorage.getItem('aviso-fichas') !== hoje) {
        localStorage.setItem('aviso-fichas', hoje)
        supabase.functions.invoke('notificacoes', { body: { acao: 'fichas' } }).catch(() => {})
        supabase.functions.invoke('notificacoes', { body: { acao: 'mensalidades' } }).catch(() => {})
      }
    } catch { /* sem localStorage */ }
    supabase.from('feedbacks_treino').select('*').gte('data', somarDias(hoje, -7)).order('data', { ascending: false }).limit(30)
      .then(({ data }) => setFeedbacks(data || []))
    supabase.from('envios_consultoria').select('id, data, peso, aluno_id, alunos(nome)').is('resposta', null).order('data')
      .then(({ data }) => setEnvios(data || []))
    supabase.from('interessados').select('id').eq('status', 'novo').then(({ data }) => setNovos(data?.length || 0))
    Promise.all([
      supabase.from('registros').select('aluno_id, data').gte('data', desde),
      supabase.from('checkins').select('aluno_id, data').gte('data', desde),
    ]).then(([r, c]) => {
      const todas = [...(r.data || []), ...(c.data || [])]
      setAtividades(todas)
      setTreinaramHoje(new Set(todas.filter((x) => x.data === hoje).map((x) => x.aluno_id)).size)
    })
    supabase.from('pagamentos').select('aluno_id').eq('competencia', hoje.slice(0, 7)).then(({ data }) => setPagamentos(data || []))
    // Colunas e tabelas novas: se o SQL da agenda ainda não rodou, só não aparecem.
    supabase.from('registros').select('aluno_id, data, troca, exercicios(nome)').not('troca', 'is', null).gte('data', somarDias(hoje, -7)).order('data', { ascending: false })
      .then(({ data }) => setTrocas(data || []))
    const dia = somarDias(hoje, 1)
    Promise.all([supabase.from('horarios').select('*'), supabase.from('remarcacoes').select('*').gte('data', somarDias(hoje, -60))])
      .then(([h, r]) => setAmanha(h.error ? 0 : atendimentos(h.data, r.data || [], dia, dia).filter((a) => !a.desmarcado).length))
  }, [hoje])

  if (erro) return <p className="erro">Não foi possível carregar: {erro}</p>
  if (!alunos) return <p className="carregando">Carregando…</p>

  const ultima = (a) => a.avaliacoes.slice().sort(porData).at(-1)
  const ativos = alunos.filter((a) => a.status === 'ativo').length
  const reavaliar = alunos.filter((a) => { const u = ultima(a); return a.status !== 'pausado' && (!u || diasDesde(u.data) > 60) })
  const semTreino = alunos.filter((a) => a.status !== 'pausado' && a.treinos.length === 0)
  const evolucao = alunos.filter((a) => a.avaliacoes.length > 1)
  const sumidos = alunosSumidos(alunos, atividades, hoje)
  const atrasados = mensalidadesAtrasadas(alunos, pagamentos, hoje)
  const mes = MESES[Number(hoje.slice(5, 7)) - 1]
  const aniversarios = aniversariantes(alunos, hoje)
  const feedbacksComDor = feedbacks.filter((f) => f.dor || f.esforco >= 9)
  const fichas = fichasParaTrocar(alunos.map((a) => (revisados[a.id] ? { ...a, ficha_renovada_em: revisados[a.id] } : a)), hoje, prazoFicha, comFase)
  async function jaRevisei(a) {
    const { error } = await supabase.from('alunos').update({ ficha_renovada_em: hoje }).eq('id', a.id)
    if (error) return alert('Rode o SQL novo (migracao-comunidade-fichas.sql) para usar este botão.')
    setRevisados({ ...revisados, [a.id]: hoje })
  }
  const atencao = [
    ...atrasados.map((a) => ({ a, chave: `m${a.id}`, texto: `Mensalidade de ${mes} atrasada (${brl(a.valor_mensal)}, venceu dia ${a.dia_vencimento})`, botao: 'Cobrar',
      zap: `Oi, ${primeiroNome(a.nome)}! A mensalidade de ${mes} (${brl(a.valor_mensal)}) venceu dia ${a.dia_vencimento}. O Pix está na área do aluno, em Conta. Qualquer dúvida me chama!` })),
    ...sumidos.map(({ aluno: a, ultimo, dias }) => ({ a, chave: `s${a.id}`, texto: ultimo ? `${dias} dias sem treinar · último em ${fmtData(ultimo)}` : `Não registrou nenhum treino em ${dias} dias`, botao: 'Chamar',
      zap: `Oi, ${primeiroNome(a.nome)}! Senti sua falta nos treinos 😅 Está tudo bem? Bora voltar essa semana? Me fala o melhor dia que eu te ajudo a encaixar.` })),
  ]

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
      {atencao.length > 0 && (
        <div className="panel" style={{ marginBottom: 16, borderColor: 'var(--warn)' }}>
          <div className="row between"><h2>Precisam de atenção</h2><span className="meta">sumidos há 7 dias ou mais e mensalidades atrasadas</span></div>
          <div className="list">
            {atencao.map(({ a, chave, texto, botao, zap }) => {
              const link = linkWhatsApp(a.telefone, zap)
              return (
                <div className="item" key={chave} style={{ cursor: 'default' }}>
                  <Link to={`/alunos/${a.id}`} style={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
                    <div className="name">{a.nome}</div><div className="meta">{texto}</div>
                  </Link>
                  {link ? <a className="pill pendente" style={{ textDecoration: 'none' }} href={link} target="_blank" rel="noreferrer">{botao} no WhatsApp</a> : <span className="meta">sem WhatsApp</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {fichas.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="row between"><h2>Fichas para trocar</h2><span className="meta">prazo de {prazoFicha} semanas · muda em Configurações</span></div>
          <div className="list">
            {fichas.map(({ aluno: a, semanas, faltam, vencida }) => (
              <div className="item" key={a.id} style={{ cursor: 'default' }}>
                <Link to={`/alunos/${a.id}`} style={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
                  <div className="name">{a.nome}</div>
                  <div className="meta">{semanas} semanas na mesma ficha · {faltam === 0 ? 'vence hoje' : vencida ? `venceu há ${-faltam} ${-faltam === 1 ? 'dia' : 'dias'}` : `vence em ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`}</div>
                </Link>
                <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                  <button className="ghost small" onClick={() => jaRevisei(a)}>Já revisei</button>
                  <Link className={`pill ${vencida ? 'pendente' : 'ativo'}`} style={{ textDecoration: 'none' }} to={`/alunos/${a.id}`}>Montar nova</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {amanha > 0 && (
        <Link to="/agenda" className="panel row between" style={{ marginBottom: 16, textDecoration: 'none', color: 'inherit' }}>
          <span><strong>Amanhã você tem {amanha} {amanha === 1 ? 'atendimento' : 'atendimentos'}</strong><br /><span className="meta">Mande o lembrete pelo WhatsApp na Agenda</span></span>
          <span className="pill pendente">Ver agenda</span>
        </Link>
      )}
      {aniversarios.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="row between"><h2>Aniversários</h2><span className="meta">próximos 7 dias</span></div>
          <div className="list">
            {aniversarios.map(({ aluno: a, data, idade, em }) => {
              const zap = linkWhatsApp(a.telefone, `Feliz aniversário, ${primeiroNome(a.nome)}! 🎉 Muita saúde, treino pago e conquistas nesse novo ciclo. Tamo junto!`)
              return (
                <div className="item" key={a.id} style={{ cursor: 'default' }}>
                  <Link to={`/alunos/${a.id}`} style={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
                    <div className="name">{a.nome}</div><div className="meta">{em === 0 ? 'Hoje' : em === 1 ? 'Amanhã' : fmtData(data).slice(0, 5)} · faz {idade} anos</div>
                  </Link>
                  {zap && em === 0 ? <a className="pill pendente" style={{ textDecoration: 'none' }} href={zap} target="_blank" rel="noreferrer">Dar parabéns</a> : <span className="meta">🎂</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {feedbacksComDor.length > 0 && (
        <div className="panel" style={{ marginBottom: 16, borderColor: 'var(--warn)' }}>
          <div className="row between"><h2>Como foi o treino</h2><span className="meta">dor ou esforço no limite, últimos 7 dias</span></div>
          <ListaFeedbacks feedbacks={feedbacksComDor} alunos={alunos} />
        </div>
      )}
      {alunos.length > 0 && (
        <Link to="/assistente" className="panel ia-caixa row between" style={{ marginBottom: 16, textDecoration: 'none', color: 'inherit' }}>
          <span><strong>Assistente IA</strong><br /><span className="meta">Monte treinos e dietas a partir da avaliação física e do objetivo do aluno</span></span>
          <span className="pill pendente">Criar com IA</span>
        </Link>
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
      {trocas.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="row between"><h2>Trocas de exercício</h2><span className="meta">últimos 7 dias</span></div>
          <div className="list">
            {trocas.map((t, i) => (
              <Link className="item" key={i} to={`/alunos/${t.aluno_id}?aba=progressao`}>
                <div style={{ minWidth: 0 }}><div className="name">{alunos.find((a) => a.id === t.aluno_id)?.nome}</div><div className="meta">Fez {t.troca} no lugar de {t.exercicios?.nome || 'um exercício'}</div></div>
                <span className="meta mono">{fmtData(t.data)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
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
