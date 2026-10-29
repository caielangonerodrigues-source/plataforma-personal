import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import Grafico from '../../components/Grafico.jsx'
import Composicao from '../../components/Composicao.jsx'
import Comunidade from '../../components/Comunidade.jsx'
import FormCheckin from '../../components/FormCheckin.jsx'
import InstalarApp from '../../components/InstalarApp.jsx'
import Progressao from '../../components/Progressao.jsx'
import Medalhas from '../../components/Medalhas.jsx'
import EditarAvatar from '../../components/EditarAvatar.jsx'
import InicioAluno from '../../components/InicioAluno.jsx'
import FotosEvolucao from '../../components/FotosEvolucao.jsx'
import Mensalidade from '../../components/Mensalidade.jsx'
import Anamnese from '../../components/Anamnese.jsx'
import Consultoria from '../../components/Consultoria.jsx'
import VideosExecucao from '../../components/VideosExecucao.jsx'
import ConversaPrivada from '../../components/ConversaPrivada.jsx'
import AulasSpinning from '../spinning/AulasSpinning.jsx'
import { DietaAluno } from '../../components/Nutricao.jsx'
import Cronometro, { prepararSom } from '../../components/Cronometro.jsx'
import TrocaExercicio from '../../components/TrocaExercicio.jsx'
import ComoFoiTreino from '../../components/ComoFoiTreino.jsx'
import IndiqueAmigo from '../../components/IndiqueAmigo.jsx'
import AtivarNotificacoes from '../../components/AtivarNotificacoes.jsx'
import { RelatoriosAluno } from '../../components/Relatorio.jsx'
import GradeAulas from '../../components/GradeAulas.jsx'
import NovidadesAcademia from '../../components/NovidadesAcademia.jsx'
import CompartilharStory from '../../components/CompartilharStory.jsx'
import { IconeWhatsApp } from '../../components/BotaoWhatsApp.jsx'
import BarraApp, { Icone } from '../../components/BarraApp.jsx'
import Voce from '../../components/Voce.jsx'
import ComoFunciona, { AJUDA_ALUNO } from '../../components/ComoFunciona.jsx'
import Avatar from '../../components/Avatar.jsx'
import { SimboloCA } from '../../components/Logo.jsx'
import { buscaVideo } from '../../lib/exercicios.js'
import { useComunidade } from '../../hooks/useComunidade.js'
import { useAcademia } from '../../hooks/useAcademia.js'
import { codigoDoLink } from '../../lib/academia.js'
import { medalhas } from '../../lib/medalhas.js'
import { conquistasAtuais, conquistasParaPublicar, recordesDoDia } from '../../lib/social.js'
import { inicioDoMes, sequencia, somarDias } from '../../lib/comunidade.js'
import { ultimaSessao } from '../../lib/progressao.js'
import { segundosDescanso } from '../../lib/descanso.js'
import { situacaoFicha } from '../../lib/ficha.js'
import { DIAS_SEMANA, diaDaSemana, proximoAtendimento } from '../../lib/agenda.js'
import { f1, hojeISO, num, porData, porOrdem, primeiroNome } from '../../lib/formato.js'

export default function AreaAluno({ aluno }) {
  const [aba, setAba] = useState('inicio')
  const [meuAvatar, setMeuAvatar] = useState(aluno.avatar || null)
  const [treinos, setTreinos] = useState(null)
  const [todosTreinos, setTodosTreinos] = useState([]) // inclui fichas de fases anteriores, para o histórico
  const [avaliacoes, setAvaliacoes] = useState([])
  const [registros, setRegistros] = useState([])
  const [diasCheckin, setDiasCheckin] = useState([])
  const [temAnamnese, setTemAnamnese] = useState(true)
  const [fichaId, setFichaId] = useState(null)
  const [aberto, setAberto] = useState(null) // exercício com as séries abertas
  const [checkinAberto, setCheckinAberto] = useState(false)
  const [erro, setErro] = useState('')
  const [descanso, setDescanso] = useState(null) // { nome, segundos }
  const [trocando, setTrocando] = useState(null) // exercício
  const [trocas, setTrocas] = useState(() => lerTrocas(hojeISO())) // trocas escolhidas hoje e ainda não marcadas
  const [seriesFeitas, setSeriesFeitas] = useState(() => lerSeries(hojeISO())) // { exercicioId: séries já feitas hoje }
  const [agenda, setAgenda] = useState(null) // próximo atendimento presencial
  const [proximaFase, setProximaFase] = useState(null)
  const [prazoFicha, setPrazoFicha] = useState(null) // semanas para trocar a ficha (do personal)
  const comunidade = useComunidade()
  const academia = useAcademia()
  const online = aluno.modalidade === 'online' // consultoria online: sem grade, QR, Spinning e grupo da academia
  const [naoLidas, setNaoLidas] = useState(0) // mensagens do personal ainda não lidas
  const [qr, setQr] = useState(null) // resultado do check-in pelo QR code da recepção
  const hoje = hojeISO()

  const carregar = useCallback(async () => {
    await supabase.rpc('aplicar_fases') // começa a fase nova do treino, se chegou o dia (sem o SQL novo, não faz nada)
    const [t, a, r, c, an] = await Promise.all([
      supabase.from('treinos').select('*, exercicios(*)').eq('aluno_id', aluno.id),
      supabase.from('avaliacoes').select('*').eq('aluno_id', aluno.id),
      supabase.from('registros').select('*').eq('aluno_id', aluno.id).gte('data', somarDias(hoje, -365)),
      supabase.from('checkins').select('data').eq('aluno_id', aluno.id), // todos, para as medalhas
      supabase.from('anamneses').select('aluno_id').eq('aluno_id', aluno.id),
    ])
    const lista = (t.data || []).sort(porOrdem)
    lista.forEach((x) => x.exercicios.sort(porOrdem))
    setTodosTreinos(lista)
    setTreinos(lista.filter((x) => !x.arquivado))
    setAvaliacoes((a.data || []).sort(porData))
    setRegistros(r.data || [])
    setDiasCheckin((c.data || []).map((x) => x.data))
    setTemAnamnese(!!an.data?.length)
  }, [aluno.id, hoje])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    Promise.all([supabase.from('horarios').select('*').eq('aluno_id', aluno.id), supabase.from('remarcacoes').select('*')])
      .then(([h, r]) => !h.error && setAgenda(proximoAtendimento(h.data || [], r.data || [], hoje, new Date().toTimeString().slice(0, 5))))
    supabase.from('fases').select('nome, inicio').eq('aluno_id', aluno.id).is('aplicada_em', null).order('inicio').limit(1)
      .then(({ data }) => setProximaFase(data?.[0] || null))
    supabase.rpc('prazo_troca_ficha').then(({ data, error }) => !error && setPrazoFicha(data || 6))
  }, [aluno.id, hoje])

  const contarNaoLidas = useCallback(() => {
    supabase.from('mensagens_privadas').select('id', { count: 'exact', head: true }).eq('aluno_id', aluno.id).eq('do_personal', true).is('lida_em', null)
      .then(({ count, error }) => !error && setNaoLidas(count || 0))
  }, [aluno.id])
  useEffect(() => {
    contarNaoLidas()
    const t = setInterval(contarNaoLidas, 60000)
    return () => clearInterval(t)
  }, [contarNaoLidas])

  // Abriu pelo QR code da recepção (o código fica guardado se precisou entrar na conta antes).
  useEffect(() => {
    let codigo = codigoDoLink(window.location.search)
    try { codigo ||= sessionStorage.getItem('checkin-qr'); sessionStorage.removeItem('checkin-qr') } catch { /* sem armazenamento */ }
    if (!codigo) return
    if (online) return window.history.replaceState(null, '', window.location.pathname)
    window.history.replaceState(null, '', window.location.pathname)
    supabase.rpc('checkin_qr', { p_codigo: codigo }).then(({ data, error }) => {
      setQr(error ? { erro: error.message.includes('QR') ? error.message : 'Não foi possível fazer o check-in pelo QR code. Tente de novo.' } : { feito: data === 'feito' })
      if (!error) { carregar(); comunidade.carregar() }
    })
  }, [])

  // Medalhas novas e recordes de hoje viram post no feed da turma (sem o SQL novo, não faz nada).
  const sincronizando = useRef(false)
  const desafios = comunidade.dados?.desafios
  useEffect(() => {
    if (!treinos || !desafios || sincronizando.current) return
    sincronizando.current = true
    ;(async () => {
      const { data: salvas, error } = await supabase.from('conquistas').select('chave').eq('aluno_id', aluno.id)
      if (error) return
      const lista = medalhas({ datas: diasCheckin, registros, avaliacoes: avaliacoes.length }, desafios)
      const recordesHoje = recordesDoDia(registros, todosTreinos.flatMap((t) => t.exercicios), hoje)
      const novas = conquistasParaPublicar(conquistasAtuais(lista, recordesHoje, hoje), salvas)
      if (!novas.length) return
      await supabase.from('conquistas').upsert(novas.map((c) => ({ aluno_id: aluno.id, ...c })), { onConflict: 'aluno_id,chave', ignoreDuplicates: true })
      if (novas.some((c) => c.visivel)) comunidade.carregar()
    })().finally(() => { sincronizando.current = false })
  }, [treinos, desafios, diasCheckin, registros, avaliacoes.length])

  const situacao = prazoFicha && !proximaFase && treinos ? situacaoFicha({ ...aluno, treinos }, hoje, prazoFicha) : null
  const fichaVencida = situacao?.vencida ? situacao : null
  const deHoje = (id) => registros.find((r) => r.exercicio_id === id && r.data === hoje)

  const trocaDe = (id) => deHoje(id)?.troca || trocas[id] || null
  // Só manda a coluna troca quando existe, para funcionar mesmo antes do SQL novo.
  const comTroca = (id, dados) => (trocaDe(id) ? { ...dados, troca: trocaDe(id) } : dados)
  function descansar(e, serie) {
    prepararSom()
    setDescanso({ id: Date.now(), nome: trocaDe(e.id) || e.nome, serie, segundos: segundosDescanso(e.descanso) })
  }

  // Cada série marcada liga o cronômetro do descanso; a última conclui o exercício.
  function marcarSerie(e, i) {
    const total = Math.max(1, Number(e.series) || 1)
    const feitas = deHoje(e.id) ? total : seriesFeitas[e.id] || 0
    const novo = i < feitas ? i : i + 1
    const lista = { ...seriesFeitas, [e.id]: novo }
    setSeriesFeitas(lista); salvarSeries(hoje, lista)
    if (novo < feitas) { if (deHoje(e.id)) marcar(e, false); return }
    if (novo >= total) marcar(e, true, `série ${novo}/${total}`)
    else descansar(e, `série ${novo}/${total}`)
  }

  async function marcar(e, feito, serie) {
    const exercicioId = e.id
    if (feito) descansar(e, serie)
    if (!feito && seriesFeitas[e.id]) { const lista = { ...seriesFeitas }; delete lista[e.id]; setSeriesFeitas(lista); salvarSeries(hoje, lista) }
    setRegistros((rs) => (feito ? [...rs, comTroca(exercicioId, { exercicio_id: exercicioId, data: hoje, series: null })] : rs.filter((r) => !(r.exercicio_id === exercicioId && r.data === hoje))))
    const { error } = feito
      ? await supabase.from('registros').insert(comTroca(exercicioId, { aluno_id: aluno.id, exercicio_id: exercicioId, data: hoje }))
      : await supabase.from('registros').delete().eq('exercicio_id', exercicioId).eq('data', hoje)
    if (error && error.code !== '23505') { setErro('Não foi possível salvar. Verifique a internet e tente de novo.'); carregar() } else setErro('')
  }

  async function salvarCargas(e, series) {
    descansar(e)
    const { error } = await supabase.from('registros').upsert(comTroca(e.id, { aluno_id: aluno.id, exercicio_id: e.id, data: hoje, series }), { onConflict: 'exercicio_id,data' })
    if (error) return setErro('Não foi possível salvar as cargas. Tente de novo.')
    setErro(''); setAberto(null); carregar()
  }

  async function trocar(e, nome) {
    setTrocando(null)
    const novas = { ...trocas }
    if (nome) novas[e.id] = nome; else delete novas[e.id]
    setTrocas(novas); salvarTrocas(hoje, novas)
    if (!deHoje(e.id)) return
    const { error } = await supabase.from('registros').update({ troca: nome }).eq('exercicio_id', e.id).eq('data', hoje)
    if (error) setErro('Não foi possível salvar a troca. Peça ao seu personal para atualizar o sistema.')
    carregar()
  }

  if (aluno.status === 'pausado') {
    return (
      <div className="solo">
        <Cabecalho aluno={aluno} />
        <div className="panel" style={{ marginTop: 20 }}>Seu acesso está pausado. Fale com seu personal.</div>
      </div>
    )
  }

  const ficha = treinos?.find((t) => t.id === fichaId) || treinos?.[0]
  const qtdFeitos = ficha ? ficha.exercicios.filter((e) => deHoje(e.id)).length : 0
  const pct = ficha?.exercicios.length ? Math.round((qtdFeitos / ficha.exercicios.length) * 100) : 0
  const ultima = avaliacoes.at(-1)
  const fezHoje = diasCheckin.includes(hoje)
  const seq = sequencia(diasCheckin, hoje)
  const noMes = new Set(diasCheckin.filter((d) => d >= inicioDoMes(hoje))).size
  const abas = [['inicio', 'Início'], ['treino', 'Treino'], ...(online ? [['consultoria', 'Consultoria'], ['videos', 'Vídeos']] : [['aulas', 'Aulas']]), ['mensagens', 'Mensagens'], ['novidades', 'Novidades'], ...(aluno.comunidade ? [['comunidade', 'Comunidade']] : []), ['dieta', 'Dieta'], ['voce', 'Você'], ...(online ? [] : [['spinning', 'Spinning']]), ['conta', 'Conta']]
  const irPara = (k) => { setAba(k); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  // No celular: barra flutuante (Início, Treino, Check-in no meio, Turma/Consultoria e Você); o resto fica em Você › Mais.
  const quarta = online ? 'consultoria' : aluno.comunidade ? 'comunidade' : 'novidades'
  const principais = ['inicio', 'treino', quarta, 'voce']
  const rotuloBarra = { comunidade: 'Turma' }
  const textos = { aulas: 'Grade de aulas da academia', mensagens: 'Fale direto com seu personal', novidades: 'Avisos e eventos da academia', comunidade: 'Feed, ranking e chat da turma', dieta: 'Seu plano alimentar', spinning: 'Reserve sua bike', conta: 'Foto, notificações, mensalidade e anamnese', consultoria: 'Relato semanal da consultoria', videos: 'Mande vídeos para o personal avaliar' }
  const whatsapp = online ? null : academia.whatsapp
  const itemBarra = (k) => ({ chave: k, rotulo: rotuloBarra[k] || abas.find(([c]) => c === k)[1], icone: k, ativo: aba === k, badge: badgeAba(k), onClick: () => irPara(k) })
  const badgeAba = (k) => (aba === k ? 0 : k === 'novidades' ? academia.novos : k === 'mensagens' ? naoLidas : 0)

  return (
    <div className={`solo${aba === 'inicio' ? ' largo' : ''}`}>
      <Cabecalho aluno={aluno} whatsapp={whatsapp} naoLidas={aba === 'mensagens' ? 0 : naoLidas} onMensagens={() => irPara('mensagens')} />
      <InstalarApp />
      {qr && (
        <div className={`panel qr-resultado${qr.erro ? ' erro' : ''}`} role="status">
          <span aria-hidden="true" style={{ fontSize: 26 }}>{qr.erro ? '⚠️' : '✅'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{qr.erro ? 'Check-in não feito' : qr.feito ? 'Check-in na academia feito!' : 'Você já fez o check-in na academia hoje'}</strong>
            <div className="meta">{qr.erro || (qr.feito ? 'Contou para a sequência, o ranking e as medalhas. Quer postar uma foto do treino?' : 'Sua presença de hoje já está registrada.')}</div>
          </div>
          {!qr.erro && <button className="small" onClick={() => { setQr(null); setCheckinAberto(true) }}>Postar foto</button>}
          <button className="ghost small" aria-label="Fechar" onClick={() => setQr(null)}>✕</button>
        </div>
      )}
      {aba !== 'inicio' && !temAnamnese && (
        <div className="panel row between" style={{ marginTop: 16, borderColor: 'var(--accent)' }}>
          <div className="meta" style={{ color: 'var(--ink)', flex: 1, minWidth: 0 }}>Preencha sua anamnese e o PAR-Q para seu personal conhecer seu histórico de saúde.</div>
          <button className="small" onClick={() => setAba('conta')}>Preencher</button>
        </div>
      )}

      {aba !== 'inicio' && <>
      <div className="streak so-computador">
        <div className="panel kpi"><div className="n">{seq}</div><div className="l">{seq === 1 ? 'Dia seguido' : 'Dias seguidos'}</div></div>
        <div className="panel kpi"><div className="n">{noMes}</div><div className="l">Treinos no mês</div></div>
        <div className="panel kpi"><div className="n">{new Set(diasCheckin).size}</div><div className="l">Check-ins no total</div></div>
      </div>
      <div className="checkin-cta so-computador">
        <p>{fezHoje ? `Check-in de hoje feito. ${seq > 1 ? `São ${seq} dias seguidos!` : 'Bora manter a sequência amanhã.'}` : 'Treinou hoje? Registre e apareça no ranking.'}</p>
        <button onClick={() => setCheckinAberto(true)}>{fezHoje ? 'Novo check-in' : 'Fazer check-in'}</button>
      </div>
      </>}

      <div className="tabs so-computador" role="tablist">
        {abas.map(([k, l]) => (
          <button key={k} className="tab" role="tab" aria-selected={aba === k} onClick={() => setAba(k)}>
            {l}{badgeAba(k) > 0 && <span className="tab-badge" aria-label={`${badgeAba(k)} novas`}>{badgeAba(k)}</span>}
          </button>
        ))}
      </div>

      {AJUDA_ALUNO[aba] && <ComoFunciona key={aba} chave={aba} itens={AJUDA_ALUNO[aba]} />}

      {aba === 'inicio' && (
        <InicioAluno aluno={aluno} avatar={meuAvatar} hoje={hoje} dias={diasCheckin} registros={registros} avaliacoes={avaliacoes} treinos={treinos}
          temAnamnese={temAnamnese} comunidade={comunidade} agenda={agenda} ficha={ficha} fichaVencida={fichaVencida} situacaoFicha={situacao} proximaFase={proximaFase} academia={academia} online={online}
          irPara={irPara} onCheckin={() => setCheckinAberto(true)} />
      )}

      {aba === 'aulas' && !online && (academia.aulas ? <GradeAulas aulas={academia.aulas} /> : <p className="carregando">Carregando…</p>)}
      {aba === 'novidades' && <NovidadesAcademia academia={academia} />}
      {aba === 'comunidade' && <Comunidade comunidade={comunidade} meuAlunoId={aluno.id} minhasDatas={diasCheckin} whatsapp={whatsapp} />}

      {aba === 'consultoria' && <Consultoria aluno={aluno} />}
      {aba === 'videos' && <VideosExecucao aluno={aluno} exercicios={(treinos || []).flatMap((t) => t.exercicios.map((e) => e.nome))} />}
      {aba === 'mensagens' && (
        <ConversaPrivada alunoId={aluno.id} eu={aluno.user_id} com="seu personal" onLidas={() => setNaoLidas(0)} />
      )}

      {aba === 'dieta' && <DietaAluno aluno={aluno} hoje={hoje} />}
      {aba === 'spinning' && <AulasSpinning embutido />}
      {aba === 'conta' && (
        <div className="stack">
          <EditarAvatar aluno={aluno} onMudou={(novo) => { setMeuAvatar(novo); comunidade.carregar() }} />
          <AtivarNotificacoes />
          <Mensalidade aluno={aluno} />
          <IndiqueAmigo aluno={aluno} />
          <Anamnese alunoId={aluno.id} onSalva={() => setTemAnamnese(true)} intro={<p className="meta" style={{ margin: 0 }}>Responda com sinceridade: isso ajuda seu personal a montar um treino seguro.</p>} />
        </div>
      )}

      {!['inicio', 'comunidade', 'conta', 'consultoria', 'videos', 'mensagens', 'dieta', 'aulas', 'novidades'].includes(aba) && !treinos && <p className="carregando">Carregando…</p>}

      {aba === 'treino' && treinos && (
        <div className="phone">
          {!ficha ? <p className="empty">Seu personal ainda está montando sua ficha.</p> : (
            <>
              <div className="row" style={{ gap: 6, marginBottom: 14 }}>
                {treinos.map((t) => <button key={t.id} className={`small${t.id === ficha.id ? ' primary' : ''}`} onClick={() => setFichaId(t.id)}>{t.nome}</button>)}
              </div>
              {agenda && (
                <div className="meta" style={{ marginBottom: 10, color: 'var(--ink)' }}>
                  Próximo treino com o personal: <strong>{agenda.data === hoje ? 'hoje' : `${DIAS_SEMANA[diaDaSemana(agenda.data)].toLowerCase()}, ${fmtCurta(agenda.data)}`} às {agenda.hora}</strong>
                  {agenda.horario.local ? ` · ${agenda.horario.local}` : ''}{agenda.remarcado ? ' (remarcado)' : ''}
                </div>
              )}
              {fichaVencida && (
                <div className="aviso-ficha">
                  <strong>Hora de trocar a ficha 💪</strong>
                  <span className="meta" style={{ color: 'inherit' }}>Você está há {fichaVencida.semanas} semanas na mesma ficha. Seu personal já foi avisado para montar a próxima. Até lá, siga com esta.</span>
                </div>
              )}
              {proximaFase && <div className="meta" style={{ marginBottom: 10 }}>Nova fase do treino ({proximaFase.nome}) começa em {fmtCurta(proximaFase.inicio)}.</div>}
              <div className="meta" style={{ marginBottom: 6 }}>{ficha.foco} · {qtdFeitos} de {ficha.exercicios.length} feitos</div>
              <div className="bar"><i style={{ width: `${pct}%` }} /></div>
              {erro && <p className="erro" style={{ marginTop: 10 }}>{erro}</p>}
              <div>
                {ficha.exercicios.map((e) => {
                  const hojeReg = deHoje(e.id)
                  const troca = trocaDe(e.id)
                  const anterior = !troca && ultimaSessao(registros, e.id, hoje)
                  return (
                    <div key={e.id}>
                      <div className={`check${hojeReg ? ' done' : ''}`}>
                        <input type="checkbox" id={`ex-${e.id}`} aria-label={`Concluir ${e.nome}`} checked={!!hojeReg} onChange={(ev) => marcar(e, ev.target.checked)} />
                        <div style={{ minWidth: 0 }}>
                          <label htmlFor={`ex-${e.id}`} className="name" style={{ display: 'block', textTransform: 'none', letterSpacing: 0, fontSize: 15, color: 'inherit' }}>
                            {troca ? <>{troca} <span className="pill pendente" style={{ marginLeft: 4 }}>troca</span></> : e.nome}
                          </label>
                          {troca && <div className="meta" style={{ fontSize: 12 }}>no lugar de {e.nome}</div>}
                          <div className="meta">{e.series} × {e.reps} · descanso {e.descanso}{e.obs ? ` · ${e.obs}` : ''}</div>
                          <BolinhasSeries exercicio={e} feitas={hojeReg ? Infinity : seriesFeitas[e.id] || 0} onMarcar={(i) => marcarSerie(e, i)} />
                          <div className="row" style={{ gap: 12, marginTop: 2, rowGap: 2 }}>
                            <button className="link" style={{ fontSize: 13 }} onClick={() => setAberto(aberto === e.id ? null : e.id)}>
                              {hojeReg?.series?.length ? `Cargas: ${hojeReg.series.map((s) => f1(s.carga)).join(' / ')} kg` : 'Anotar cargas'}
                            </button>
                            <a href={troca ? buscaVideo(troca) : e.video_url || buscaVideo(e.nome)} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600 }}>{e.video_url && !troca ? 'Ver execução' : 'Como fazer'}</a>
                            <button className="link" style={{ fontSize: 13 }} onClick={() => setTrocando(e)}>{troca ? 'Mudar troca' : 'Trocar'}</button>
                          </div>
                          {anterior && <div className="meta" style={{ fontSize: 12 }}>Última vez: {anterior.series.map((s) => `${f1(s.carga)}×${s.reps}`).join(', ')}</div>}
                        </div>
                        <div className="meta mono">{e.carga}</div>
                      </div>
                      {aberto === e.id && <Series exercicio={e} inicial={hojeReg?.series || anterior?.series} onSalvar={(s) => salvarCargas(e, s)} onFechar={() => setAberto(null)} />}
                    </div>
                  )
                })}
              </div>
              {qtdFeitos > 0 && <ComoFoiTreino aluno={aluno} treinoId={ficha.id} hoje={hoje} />}
              {pct === 100 && (
                <div className="row between" style={{ marginTop: 16 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--accent)' }}>Treino concluído. Bom trabalho!</p>
                  {!fezHoje && <button className="primary small" onClick={() => setCheckinAberto(true)}>Fazer check-in</button>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {aba === 'voce' && treinos && (
        <Voce aluno={aluno} avatar={meuAvatar} fotosAvatar={comunidade.dados?.fotos} totalTreinos={new Set(diasCheckin).size}
          onEditar={() => irPara('conta')} onSair={() => supabase.auth.signOut()}
          itens={abas.filter(([k]) => !principais.includes(k) && k !== 'treino').map(([k, l]) => ({ chave: k, rotulo: l, icone: k, texto: textos[k], badge: badgeAba(k), onClick: () => irPara(k) }))}
          progresso={
        <div className="stack">
          {ultima ? <Composicao avaliacao={ultima} sexo={aluno.sexo} titulo="Última avaliação" /> : <div className="panel empty">Seu personal ainda não registrou nenhuma avaliação.</div>}
          {avaliacoes.length > 0 && <div className="panel"><h2 style={{ marginBottom: 10 }}>Peso e gordura</h2><Grafico avaliacoes={avaliacoes} /></div>}
          <div className="panel"><h2 style={{ marginBottom: 10 }}>Evolução das cargas</h2><Progressao treinos={todosTreinos} registros={registros} /></div>
          <CompartilharStory aluno={aluno} hoje={hoje} dias={diasCheckin} registros={registros} avaliacoes={avaliacoes.length} treinos={todosTreinos} desafios={comunidade.dados?.desafios || []} />
          <RelatoriosAluno alunoId={aluno.id} />
          <Medalhas datas={diasCheckin} registros={registros} avaliacoes={avaliacoes.length} desafios={comunidade.dados?.desafios || []} />
          <FotosEvolucao alunoId={aluno.id} />
        </div>} />
      )}

      <BarraApp
        itens={[
          ...principais.slice(0, 2).map(itemBarra),
          { chave: 'checkin', rotulo: 'Check-in', icone: 'gravar', centro: true, onClick: () => setCheckinAberto(true) },
          itemBarra(quarta),
          { ...itemBarra('voce'), ativo: aba === 'voce' || !principais.includes(aba), badge: abas.filter(([k]) => !principais.includes(k)).reduce((t, [k]) => t + badgeAba(k), 0), figura: <span className="figura-voce"><Avatar nome={aluno.nome} avatar={meuAvatar} fotos={comunidade.dados?.fotos} tamanho={26} /></span> },
        ]}
      />

      {trocando && <TrocaExercicio exercicio={trocando} trocaAtual={trocaDe(trocando.id)} onEscolher={(nome) => trocar(trocando, nome)} onFechar={() => setTrocando(null)} />}
      {descanso && <Cronometro key={descanso.id} descanso={descanso} onFechar={() => setDescanso(null)} />}

      {checkinAberto && (
        <FormCheckin
          aluno={aluno}
          treinos={treinos || []}
          registros={registros}
          treinoInicial={ficha?.id}
          onFechar={() => setCheckinAberto(false)}
          onFeito={() => { setCheckinAberto(false); carregar(); comunidade.carregar(); if (aluno.comunidade) setAba('comunidade') }}
        />
      )}
    </div>
  )
}

// Trocas escolhidas antes de marcar o exercício ficam no aparelho até o fim do dia.
const CHAVE_TROCAS = 'trocas-do-dia'
function lerTrocas(hoje) {
  try { const t = JSON.parse(localStorage.getItem(CHAVE_TROCAS) || '{}'); return t.dia === hoje ? t.trocas || {} : {} } catch { return {} }
}
function salvarTrocas(hoje, trocas) {
  try { localStorage.setItem(CHAVE_TROCAS, JSON.stringify({ dia: hoje, trocas })) } catch { /* sem armazenamento */ }
}
const CHAVE_SERIES = 'series-do-dia'
function lerSeries(hoje) {
  try { const t = JSON.parse(localStorage.getItem(CHAVE_SERIES) || '{}'); return t.dia === hoje ? t.feitas || {} : {} } catch { return {} }
}
function salvarSeries(hoje, feitas) {
  try { localStorage.setItem(CHAVE_SERIES, JSON.stringify({ dia: hoje, feitas })) } catch { /* sem armazenamento */ }
}

// Uma bolinha por série: tocar marca a série e liga o descanso; tocar numa já feita desmarca dali em diante.
function BolinhasSeries({ exercicio, feitas, onMarcar }) {
  const n = Math.max(1, Math.min(12, Number(exercicio.series) || 1))
  return (
    <div className="bolinhas-series" role="group" aria-label={`Séries de ${exercicio.nome}`}>
      {Array.from({ length: n }, (_, i) => (
        <button key={i} type="button" className={i < feitas ? 'feita' : ''} aria-pressed={i < feitas} aria-label={`Série ${i + 1}${i < feitas ? ' feita' : ''}`} onClick={() => onMarcar(i)}>
          {i < feitas ? '✓' : i + 1}
        </button>
      ))}
      <span className="meta">{feitas >= n ? 'Todas as séries feitas' : 'Toque na série ao terminar'}</span>
    </div>
  )
}

const fmtCurta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

// Carga e repetições de cada série, pré-preenchidas com o treino anterior.
function Series({ exercicio, inicial, onSalvar, onFechar }) {
  const n = Math.max(1, Number(exercicio.series) || 1)
  const [linhas, setLinhas] = useState(() => Array.from({ length: n }, (_, i) => ({
    carga: inicial?.[i]?.carga ?? inicial?.at(-1)?.carga ?? '',
    reps: inicial?.[i]?.reps ?? String(exercicio.reps || '').match(/\d+/)?.[0] ?? '',
  })))
  const muda = (i, k, v) => setLinhas(linhas.map((l, j) => (j === i ? { ...l, [k]: v } : l)))
  function salvar() {
    onSalvar(linhas.filter((l) => l.carga !== '' || l.reps !== '').map((l) => ({ carga: num(l.carga), reps: num(l.reps) })))
  }
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 12, margin: '0 0 12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 1fr', gap: 8, alignItems: 'center' }}>
        <span className="meta">Série</span><span className="meta">Carga (kg)</span><span className="meta">Reps</span>
        {linhas.map((l, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <span className="mono">{i + 1}</span>
            <input id={`serie-${exercicio.id}-${i}-carga`} inputMode="decimal" aria-label={`Carga da série ${i + 1}`} value={l.carga ?? ''} onChange={(e) => muda(i, 'carga', e.target.value)} />
            <input id={`serie-${exercicio.id}-${i}-reps`} inputMode="numeric" aria-label={`Repetições da série ${i + 1}`} value={l.reps ?? ''} onChange={(e) => muda(i, 'reps', e.target.value)} />
          </div>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="small" onClick={onFechar}>Cancelar</button>
        <button className="primary small" onClick={salvar}>Salvar e concluir</button>
      </div>
    </div>
  )
}

function Cabecalho({ aluno, whatsapp, naoLidas = 0, onMensagens }) {
  return (
    <div className="row between">
      <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
        <SimboloCA size={44} />
        <div><p className="meta" style={{ margin: 0 }}>Corpo Atlético · Área do aluno</p><h1>Olá, {primeiroNome(aluno.nome)}</h1></div>
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
        {onMensagens && (
          <button className="botao-redondo" onClick={onMensagens} aria-label={naoLidas ? `Mensagens, ${naoLidas} novas` : 'Mensagens do personal'} title="Mensagens do personal">
            <Icone nome="conversas" />{naoLidas > 0 && <i className="barra-badge">{naoLidas}</i>}
          </button>
        )}
        {whatsapp && <a className="botao-whatsapp redondo" href={whatsapp} target="_blank" rel="noreferrer" aria-label="Grupo da academia no WhatsApp" title="Grupo da academia no WhatsApp"><IconeWhatsApp /></a>}
        <button className="small so-computador" onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>
    </div>
  )
}
