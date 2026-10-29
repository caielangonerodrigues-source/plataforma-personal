import { useCallback, useEffect, useState } from 'react'
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
import BarraApp from '../../components/BarraApp.jsx'
import { SimboloCA } from '../../components/Logo.jsx'
import { buscaVideo } from '../../lib/exercicios.js'
import { useComunidade } from '../../hooks/useComunidade.js'
import { useAcademia } from '../../hooks/useAcademia.js'
import { codigoDoLink } from '../../lib/academia.js'
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
  const [agenda, setAgenda] = useState(null) // próximo atendimento presencial
  const [proximaFase, setProximaFase] = useState(null)
  const [prazoFicha, setPrazoFicha] = useState(null) // semanas para trocar a ficha (do personal)
  const comunidade = useComunidade()
  const academia = useAcademia()
  const online = aluno.modalidade === 'online' // consultoria online: sem grade, QR, Spinning e grupo da academia
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

  const situacao = prazoFicha && !proximaFase && treinos ? situacaoFicha({ ...aluno, treinos }, hoje, prazoFicha) : null
  const fichaVencida = situacao?.vencida ? situacao : null
  const deHoje = (id) => registros.find((r) => r.exercicio_id === id && r.data === hoje)

  const trocaDe = (id) => deHoje(id)?.troca || trocas[id] || null
  // Só manda a coluna troca quando existe, para funcionar mesmo antes do SQL novo.
  const comTroca = (id, dados) => (trocaDe(id) ? { ...dados, troca: trocaDe(id) } : dados)
  function descansar(e) {
    prepararSom()
    setDescanso({ nome: trocaDe(e.id) || e.nome, segundos: segundosDescanso(e.descanso) })
  }

  async function marcar(e, feito) {
    const exercicioId = e.id
    if (feito) descansar(e)
    setRegistros((rs) => (feito ? [...rs, comTroca(exercicioId, { exercicio_id: exercicioId, data: hoje, series: null })] : rs.filter((r) => !(r.exercicio_id === exercicioId && r.data === hoje))))
    const { error } = feito
      ? await supabase.from('registros').insert(comTroca(exercicioId, { aluno_id: aluno.id, exercicio_id: exercicioId, data: hoje }))
      : await supabase.from('registros').delete().eq('exercicio_id', exercicioId).eq('data', hoje)
    if (error && error.code !== '23505') { setErro('Não foi possível salvar. Verifique a internet e tente de novo.'); carregar() } else setErro('')
  }

  async function salvarSeries(e, series) {
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
  const abas = [['inicio', 'Início'], ['treino', 'Treino'], ...(online ? [['consultoria', 'Consultoria']] : [['aulas', 'Aulas']]), ['novidades', 'Novidades'], ...(aluno.comunidade ? [['comunidade', 'Comunidade']] : []), ['dieta', 'Dieta'], ['evolucao', 'Evolução'], ...(online ? [] : [['spinning', 'Spinning']]), ['conta', 'Conta']]
  const irPara = (k) => { setAba(k); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  // No celular: barra de app embaixo com as abas principais; o resto fica em "Mais".
  const principais = ['inicio', 'treino', online ? 'consultoria' : 'aulas', aluno.comunidade ? 'comunidade' : 'novidades']
  const whatsapp = online ? null : academia.whatsapp
  const badgeAba = (k) => (k === 'novidades' && aba !== k ? academia.novos : 0)

  return (
    <div className={`solo${aba === 'inicio' ? ' largo' : ''}`}>
      <Cabecalho aluno={aluno} whatsapp={whatsapp} />
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
            {l}{k === 'novidades' && academia.novos > 0 && aba !== k && <span className="tab-badge" aria-label={`${academia.novos} novas`}>{academia.novos}</span>}
          </button>
        ))}
      </div>

      {aba === 'inicio' && (
        <InicioAluno aluno={aluno} avatar={meuAvatar} hoje={hoje} dias={diasCheckin} registros={registros} avaliacoes={avaliacoes} treinos={treinos}
          temAnamnese={temAnamnese} comunidade={comunidade} agenda={agenda} ficha={ficha} fichaVencida={fichaVencida} academia={academia} online={online}
          irPara={irPara} onCheckin={() => setCheckinAberto(true)} />
      )}

      {aba === 'aulas' && !online && (academia.aulas ? <GradeAulas aulas={academia.aulas} /> : <p className="carregando">Carregando…</p>)}
      {aba === 'novidades' && <NovidadesAcademia academia={academia} />}
      {aba === 'comunidade' && <Comunidade comunidade={comunidade} meuAlunoId={aluno.id} minhasDatas={diasCheckin} whatsapp={whatsapp} />}

      {aba === 'consultoria' && <Consultoria aluno={aluno} />}

      {aba === 'dieta' && <DietaAluno alunoId={aluno.id} />}
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

      {!['inicio', 'comunidade', 'conta', 'consultoria', 'dieta', 'aulas', 'novidades'].includes(aba) && !treinos && <p className="carregando">Carregando…</p>}

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
                          <div className="row" style={{ gap: 12, marginTop: 2, rowGap: 2 }}>
                            <button className="link" style={{ fontSize: 13 }} onClick={() => setAberto(aberto === e.id ? null : e.id)}>
                              {hojeReg?.series?.length ? `Cargas: ${hojeReg.series.map((s) => f1(s.carga)).join(' / ')} kg` : 'Anotar cargas'}
                            </button>
                            <a href={troca ? buscaVideo(troca) : e.video_url || buscaVideo(e.nome)} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600 }}>{e.video_url && !troca ? 'Ver execução' : 'Como fazer'}</a>
                            <button className="link" style={{ fontSize: 13 }} onClick={() => descansar(e)}>Descansar</button>
                            <button className="link" style={{ fontSize: 13 }} onClick={() => setTrocando(e)}>{troca ? 'Mudar troca' : 'Trocar'}</button>
                          </div>
                          {anterior && <div className="meta" style={{ fontSize: 12 }}>Última vez: {anterior.series.map((s) => `${f1(s.carga)}×${s.reps}`).join(', ')}</div>}
                        </div>
                        <div className="meta mono">{e.carga}</div>
                      </div>
                      {aberto === e.id && <Series exercicio={e} inicial={hojeReg?.series || anterior?.series} onSalvar={(s) => salvarSeries(e, s)} onFechar={() => setAberto(null)} />}
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

      {aba === 'evolucao' && treinos && (
        <div className="stack">
          {ultima ? <Composicao avaliacao={ultima} sexo={aluno.sexo} titulo="Última avaliação" /> : <div className="panel empty">Seu personal ainda não registrou nenhuma avaliação.</div>}
          {avaliacoes.length > 0 && <div className="panel"><h2 style={{ marginBottom: 10 }}>Peso e gordura</h2><Grafico avaliacoes={avaliacoes} /></div>}
          <div className="panel"><h2 style={{ marginBottom: 10 }}>Evolução das cargas</h2><Progressao treinos={todosTreinos} registros={registros} /></div>
          <CompartilharStory aluno={aluno} hoje={hoje} dias={diasCheckin} registros={registros} avaliacoes={avaliacoes.length} treinos={todosTreinos} desafios={comunidade.dados?.desafios || []} />
          <RelatoriosAluno alunoId={aluno.id} />
          <Medalhas datas={diasCheckin} registros={registros} avaliacoes={avaliacoes.length} desafios={comunidade.dados?.desafios || []} />
          <FotosEvolucao alunoId={aluno.id} />
        </div>
      )}

      <button className="botao-checkin-flutuante" onClick={() => setCheckinAberto(true)} aria-label="Fazer check-in">
        <span aria-hidden="true">📸</span> {fezHoje ? 'Novo check-in' : 'Check-in'}
      </button>
      <BarraApp
        itens={principais.map((k) => ({ chave: k, rotulo: abas.find(([c]) => c === k)[1], icone: k, ativo: aba === k, badge: badgeAba(k), onClick: () => irPara(k) }))}
        mais={abas.filter(([k]) => !principais.includes(k)).map(([k, l]) => ({ chave: k, rotulo: l, icone: k, ativo: aba === k, badge: badgeAba(k), onClick: () => irPara(k) }))}
      />

      {trocando && <TrocaExercicio exercicio={trocando} trocaAtual={trocaDe(trocando.id)} onEscolher={(nome) => trocar(trocando, nome)} onFechar={() => setTrocando(null)} />}
      {descanso && <Cronometro descanso={descanso} onFechar={() => setDescanso(null)} />}

      {checkinAberto && (
        <FormCheckin
          aluno={aluno}
          treinos={treinos || []}
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

function Cabecalho({ aluno, whatsapp }) {
  return (
    <div className="row between">
      <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
        <SimboloCA size={44} />
        <div><p className="meta" style={{ margin: 0 }}>Corpo Atlético · Área do aluno</p><h1>Olá, {primeiroNome(aluno.nome)}</h1></div>
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
        {whatsapp && <a className="botao-whatsapp redondo" href={whatsapp} target="_blank" rel="noreferrer" aria-label="Grupo da academia no WhatsApp" title="Grupo da academia no WhatsApp"><IconeWhatsApp /></a>}
        <button className="small" onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>
    </div>
  )
}
