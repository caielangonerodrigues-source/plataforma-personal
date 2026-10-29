import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import Modal from '../../components/Modal.jsx'
import { fmtData, hojeISO, primeiroNome } from '../../lib/formato.js'
import { somarDias } from '../../lib/comunidade.js'
import { DIAS_SEMANA, atendimentos, diaDaSemana, hhmm, inicioDaSemana } from '../../lib/agenda.js'
import { linkWhatsApp } from '../../lib/whatsapp.js'

const ERRO_SQL = 'Para usar a agenda, rode o arquivo supabase/migracao-melhorias.sql no Supabase (SQL Editor).'
const curta = (iso) => `${DIAS_SEMANA[diaDaSemana(iso)].toLowerCase()}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const somarMinutos = (hora, min) => { const [h, m] = hora.split(':').map(Number), t = h * 60 + m + min; return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` }

// Mensagem pronta de WhatsApp para cada situação do atendimento.
function mensagem(a, aluno, hoje) {
  const nome = primeiroNome(aluno.nome), local = a.horario.local ? ` (${a.horario.local})` : ''
  if (a.desmarcado) return `Oi, ${nome}! Nosso treino de ${curta(a.data)} às ${a.hora} está desmarcado. Qualquer coisa me chama!`
  if (a.remarcado) return `Oi, ${nome}! Nosso treino de ${curta(a.dataOriginal)} ficou para ${curta(a.data)} às ${a.hora}${local}. Combinado?`
  const quando = a.data === hoje ? 'hoje' : a.data === somarDias(hoje, 1) ? 'amanhã' : curta(a.data)
  return `Oi, ${nome}! Lembrete do nosso treino ${quando} às ${a.hora}${local}. Confirma pra mim? 💪`
}

export default function Agenda() {
  const hoje = hojeISO(), amanha = somarDias(hoje, 1)
  const [semana, setSemana] = useState(inicioDaSemana(hoje))
  const [alunos, setAlunos] = useState([])
  const [horarios, setHorarios] = useState(null)
  const [remarcacoes, setRemarcacoes] = useState([])
  const [erro, setErro] = useState('')
  const [novo, setNovo] = useState(null) // {} = novo horário, ou o horário em edição
  const [remarcando, setRemarcando] = useState(null) // atendimento
  const [avisoApp, setAvisoApp] = useState('')

  const carregar = useCallback(async () => {
    const [a, h, r] = await Promise.all([
      supabase.from('alunos').select('id, nome, telefone, status').order('nome'),
      supabase.from('horarios').select('*').order('hora'),
      supabase.from('remarcacoes').select('*').gte('data', somarDias(hoje, -60)),
    ])
    setAlunos(a.data || [])
    if (h.error) { setErro(ERRO_SQL); setHorarios([]); return }
    setHorarios(h.data); setRemarcacoes(r.data || [])
  }, [hoje])
  useEffect(() => { carregar() }, [carregar])

  // Notificação no celular de todos os atendimentos de amanhã (alunos que ativaram no app).
  async function lembrarPeloApp() {
    setAvisoApp('Enviando…')
    const { data, error } = await supabase.functions.invoke('notificacoes', { body: { acao: 'lembretes' } })
    setAvisoApp(error ? 'As notificações ainda não estão ligadas (veja o passo 8 do README).'
      : data.enviadas ? `Lembrete enviado para ${data.enviadas} ${data.enviadas === 1 ? 'celular' : 'celulares'}.` : 'Nenhum desses alunos ativou as notificações no app ainda. Use o WhatsApp.')
  }

  async function desfazer(a) {
    const { error } = await supabase.from('remarcacoes').delete().eq('id', a.remarcacao.id)
    if (error) setErro(`Não foi possível desfazer: ${error.message}`)
    carregar()
  }
  async function desmarcar(a) {
    if (!confirm(`Desmarcar o treino de ${curta(a.data)} às ${a.hora}? Só este dia; o horário fixo continua.`)) return
    const { error } = await supabase.from('remarcacoes').upsert({ horario_id: a.horario.id, data: a.dataOriginal, nova_data: null, nova_hora: null }, { onConflict: 'horario_id,data' })
    if (error) setErro(`Não foi possível desmarcar: ${error.message}`)
    carregar()
  }

  if (!horarios) return <p className="carregando">Carregando…</p>
  const porAluno = new Map(alunos.map((a) => [a.id, a]))
  const fimSemana = somarDias(semana, 6)
  const lista = atendimentos(horarios, remarcacoes, semana < hoje ? semana : hoje, fimSemana > amanha ? fimSemana : amanha)
    .filter((a) => porAluno.get(a.horario.aluno_id)?.status !== 'pausado')
  const daSemana = lista.filter((a) => a.data >= semana && a.data <= fimSemana)
  const deAmanha = lista.filter((a) => a.data === amanha)
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(semana, i))
  const total = daSemana.filter((a) => !a.desmarcado).length

  const Linha = ({ a }) => {
    const aluno = porAluno.get(a.horario.aluno_id)
    if (!aluno) return null
    const zap = linkWhatsApp(aluno.telefone, mensagem(a, aluno, hoje))
    return (
      <div className="item agenda-item" style={{ cursor: 'default', opacity: a.desmarcado ? 0.6 : 1 }}>
        <div className="mono agenda-hora">{a.hora}<div className="meta">{somarMinutos(a.hora, a.horario.duracao || 60)}</div></div>
        <div style={{ minWidth: 0 }}>
          <Link to={`/alunos/${aluno.id}`} className="name" style={{ color: 'inherit', textDecoration: a.desmarcado ? 'line-through' : 'none' }}>{aluno.nome}</Link>
          <div className="meta">
            {[a.horario.local, a.remarcado && `remarcado de ${curta(a.dataOriginal)}`, a.desmarcado && 'desmarcado', a.remarcacao?.motivo].filter(Boolean).join(' · ') || 'horário fixo'}
          </div>
        </div>
        <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
          {zap && <a className="pill pendente" style={{ textDecoration: 'none' }} href={zap} target="_blank" rel="noreferrer">{a.desmarcado || a.remarcado ? 'Avisar' : 'Lembrete'}</a>}
          {a.remarcacao ? <button className="ghost small" onClick={() => desfazer(a)}>Desfazer</button> : (
            <>
              <button className="ghost small" onClick={() => setRemarcando(a)}>Remarcar</button>
              <button className="ghost small" onClick={() => desmarcar(a)}>Desmarcar</button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="row between">
        <div><h1>Agenda</h1><p className="sub">Horários fixos dos alunos presenciais. Remarque um dia sem mudar o horário fixo.</p></div>
        <button className="primary" onClick={() => setNovo({})} disabled={erro === ERRO_SQL}>Novo horário</button>
      </div>
      {erro && <p className="erro">{erro}</p>}

      {deAmanha.length > 0 && (
        <div className="panel" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>
          <div className="row between"><h2>Amanhã, {curta(amanha)}</h2><button className="small" onClick={lembrarPeloApp}>Lembrar todos pelo app</button></div>
          {avisoApp && <p className="meta" style={{ margin: '4px 0 0' }}>{avisoApp}</p>}
          <div className="list">{deAmanha.map((a) => <Linha key={a.chave} a={a} />)}</div>
        </div>
      )}

      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="row" style={{ gap: 6 }}>
          <button className="small" aria-label="Semana anterior" onClick={() => setSemana(somarDias(semana, -7))}>‹</button>
          <strong>{fmtData(semana).slice(0, 5)} a {fmtData(fimSemana).slice(0, 5)}</strong>
          <button className="small" aria-label="Próxima semana" onClick={() => setSemana(somarDias(semana, 7))}>›</button>
          {semana !== inicioDaSemana(hoje) && <button className="link" onClick={() => setSemana(inicioDaSemana(hoje))}>Hoje</button>}
        </div>
        <span className="meta">{total} {total === 1 ? 'atendimento' : 'atendimentos'} na semana</span>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        {dias.map((d) => {
          const doDia = daSemana.filter((a) => a.data === d)
          if (!doDia.length && diaDaSemana(d) === 0) return null
          return (
            <div className="panel" key={d} style={d === hoje ? { borderColor: 'var(--accent)' } : undefined}>
              <h3 style={{ margin: 0 }}>{DIAS_SEMANA[diaDaSemana(d)]} <span className="meta">{fmtData(d).slice(0, 5)}{d === hoje ? ' · hoje' : ''}</span></h3>
              {doDia.length ? <div className="list">{doDia.map((a) => <Linha key={a.chave} a={a} />)}</div> : <p className="meta" style={{ margin: '4px 0 0' }}>Livre</p>}
            </div>
          )
        })}
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2>Horários fixos</h2>
        {horarios.length ? (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Aluno</th><th>Dia</th><th>Hora</th><th className="opcional">Local</th><th /></tr></thead>
              <tbody>
                {horarios.slice().sort((x, y) => x.dia_semana - y.dia_semana || (x.hora < y.hora ? -1 : 1)).map((h) => (
                  <tr key={h.id}>
                    <td>{porAluno.get(h.aluno_id)?.nome || '—'}</td>
                    <td>{DIAS_SEMANA[h.dia_semana]}</td>
                    <td className="mono">{hhmm(h.hora)} · {h.duracao} min</td>
                    <td className="opcional">{h.local || '—'}</td>
                    <td style={{ textAlign: 'right' }}><button className="ghost small" onClick={() => setNovo(h)}>Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="empty">Nenhum horário ainda. Clique em "Novo horário" e marque os dias de cada aluno.</p>}
      </div>

      {novo && <FormHorario horario={novo} alunos={alunos.filter((a) => a.status !== 'pausado')} onFechar={() => setNovo(null)} onSalvo={() => { setNovo(null); carregar() }} />}
      {remarcando && <FormRemarcar atendimento={remarcando} aluno={porAluno.get(remarcando.horario.aluno_id)} onFechar={() => setRemarcando(null)} onSalvo={() => { setRemarcando(null); carregar() }} />}
    </>
  )
}

function FormHorario({ horario: h, alunos, onFechar, onSalvo }) {
  const editando = !!h.id
  const [d, setD] = useState({ aluno: h.aluno_id || '', dias: h.id ? [h.dia_semana] : [], hora: hhmm(h.hora) || '07:00', duracao: String(h.duracao || 60), local: h.local || '' })
  const [erro, setErro] = useState('')
  const campo = (k) => ({ id: `hor-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  const alternarDia = (i) => setD({ ...d, dias: editando ? [i] : d.dias.includes(i) ? d.dias.filter((x) => x !== i) : [...d.dias, i] })

  async function salvar() {
    if (!d.aluno) return setErro('Escolha o aluno.')
    if (!d.dias.length) return setErro('Marque pelo menos um dia.')
    const dados = { aluno_id: d.aluno, hora: d.hora, duracao: Number(d.duracao) || 60, local: d.local.trim() || null }
    const { error } = editando
      ? await supabase.from('horarios').update({ ...dados, dia_semana: d.dias[0] }).eq('id', h.id)
      : await supabase.from('horarios').insert(d.dias.map((dia) => ({ ...dados, dia_semana: dia })))
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    onSalvo()
  }
  async function apagar() {
    if (!confirm('Apagar este horário fixo? As remarcações dele também somem.')) return
    const { error } = await supabase.from('horarios').delete().eq('id', h.id)
    if (error) return setErro(`Não foi possível apagar: ${error.message}`)
    onSalvo()
  }
  return (
    <Modal titulo={editando ? 'Editar horário' : 'Novo horário fixo'} onFechar={onFechar} onSalvar={salvar} erro={erro}>
      <label className="full">Aluno
        <select {...campo('aluno')}><option value="">Escolha o aluno</option>{alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
      </label>
      <div className="full">
        <span className="meta">{editando ? 'Dia da semana' : 'Dias da semana (marque todos os dias que ele treina com você)'}</span>
        <div className="chips" role="group" aria-label="Dias da semana" style={{ marginTop: 6 }}>
          {[1, 2, 3, 4, 5, 6, 0].map((i) => <button type="button" key={i} className={`chip${d.dias.includes(i) ? ' on' : ''}`} aria-pressed={d.dias.includes(i)} onClick={() => alternarDia(i)}>{DIAS_SEMANA[i].slice(0, 3)}</button>)}
        </div>
      </div>
      <label>Hora<input type="time" {...campo('hora')} /></label>
      <label>Duração<select {...campo('duracao')}>{['30', '45', '60', '75', '90', '120'].map((m) => <option key={m} value={m}>{m} min</option>)}</select></label>
      <label className="full">Local<input maxLength={80} placeholder="Opcional. Ex.: Academia X, condomínio do aluno" {...campo('local')} /></label>
      {editando && <div className="full"><button type="button" className="ghost small" style={{ color: 'var(--warn)' }} onClick={apagar}>Apagar horário</button></div>}
    </Modal>
  )
}

function FormRemarcar({ atendimento: a, aluno, onFechar, onSalvo }) {
  const [d, setD] = useState({ data: a.data, hora: a.hora, motivo: '' })
  const [erro, setErro] = useState('')
  const campo = (k) => ({ id: `rem-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  async function salvar() {
    if (!d.data || !d.hora) return setErro('Escolha o novo dia e a hora.')
    const { error } = await supabase.from('remarcacoes').upsert(
      { horario_id: a.horario.id, data: a.dataOriginal, nova_data: d.data, nova_hora: d.hora, motivo: d.motivo.trim() || null },
      { onConflict: 'horario_id,data' })
    if (error) return setErro(`Não foi possível remarcar: ${error.message}`)
    onSalvo()
  }
  return (
    <Modal titulo={`Remarcar ${primeiroNome(aluno?.nome)}`} onFechar={onFechar} onSalvar={salvar} erro={erro} botao="Remarcar">
      <p className="meta full" style={{ margin: 0 }}>Era {curta(a.dataOriginal)} às {a.hora}. Só este dia muda; o horário fixo continua. Depois é só clicar em "Avisar" para mandar no WhatsApp.</p>
      <label>Novo dia<input type="date" {...campo('data')} /></label>
      <label>Nova hora<input type="time" {...campo('hora')} /></label>
      <label className="full">Motivo<input maxLength={200} placeholder="Opcional" {...campo('motivo')} /></label>
    </Modal>
  )
}
