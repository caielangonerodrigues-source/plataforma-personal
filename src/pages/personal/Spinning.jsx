import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabase.js'
import Modal from '../../components/Modal.jsx'
import MapaBikes from '../../components/MapaBikes.jsx'
import { ROTULO_RESERVA, inicioISO, quandoAula, repetirSemanal } from '../../lib/spinning.js'
import { brl, hojeISO, num, primeiroNome } from '../../lib/formato.js'
import { linkWhatsApp } from '../../lib/whatsapp.js'
import PacotesPersonal from './PacotesPersonal.jsx'
import { AjudaDaPagina } from '../../components/ComoFunciona.jsx'

export default function Spinning() {
  const [aba, setAba] = useState('aulas')
  return (
    <>
      <h1>Spinning</h1>
      <AjudaDaPagina />
      <div className="tabs" role="tablist" style={{ marginTop: 8 }}>
        {[['aulas', 'Aulas'], ['pacotes', 'Pacotes']].map(([k, l]) => <button key={k} className="tab" role="tab" aria-selected={aba === k} onClick={() => setAba(k)}>{l}</button>)}
      </div>
      {aba === 'aulas' ? <Aulas /> : <PacotesPersonal />}
    </>
  )
}

function Aulas() {
  const [aulas, setAulas] = useState(null)
  const [aulaId, setAulaId] = useState(null)
  const [reservas, setReservas] = useState([])
  const [bike, setBike] = useState(null)
  const [nova, setNova] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const desde = new Date(Date.now() - 864e5).toISOString()
    const { data, error } = await supabase.from('aulas_spinning').select('*, reservas_spinning(id, aula_id, bike, nome, telefone, status, codigo, created_at, aluno_id, credito_id), espera_spinning(id, nome, telefone, avisado_em, created_at)')
      .gte('inicio', desde).order('inicio').limit(60)
    if (error) return setErro(error.message)
    // Pendentes com mais de 30 min já não seguram a bike (o banco libera ao consultar).
    const valida = (r) => r.status === 'pago' || (r.status === 'pendente' && Date.now() - new Date(r.created_at) < 30 * 60000)
    const lista = data.map((a) => ({ ...a, ativas: a.reservas_spinning.filter(valida) }))
    setAulas(lista)
    setAulaId((id) => id && lista.some((a) => a.id === id) ? id : lista.find((a) => !a.cancelada && new Date(a.inicio) > Date.now() - 3600e3)?.id || null)
  }, [])

  useEffect(() => { carregar() }, [carregar])
  const aula = aulas?.find((a) => a.id === aulaId)
  useEffect(() => { setReservas(aula?.ativas || []); setBike(null) }, [aula])

  async function acao(promessa) {
    const { error } = await promessa
    if (error) setErro(`Não foi possível salvar: ${error.message}`); else setErro('')
    carregar()
  }

  async function copiarLink() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/spinning`); setCopiado(true) } catch { setCopiado(false) }
  }

  if (!aulas) return <p className="carregando">{erro || 'Carregando…'}</p>
  const porBike = Object.fromEntries(reservas.map((r) => [r.bike, r]))
  const selecionada = bike && porBike[bike]
  const pagos = reservas.filter((r) => r.status === 'pago')
  const recebido = pagos.length * Number(aula?.valor || 0)

  return (
    <>
      <div className="row between">
        <div><p className="sub">Aulas com {aula?.vagas || 14} bikes. Qualquer pessoa reserva pelo link público, sem login.</p></div>
        <div className="row">
          <button onClick={copiarLink}>{copiado ? 'Link copiado' : 'Copiar link de reservas'}</button>
          <button className="primary" onClick={() => setNova(true)}>Nova aula</button>
        </div>
      </div>
      {erro && <p className="erro" style={{ marginBottom: 12 }}>{erro}</p>}
      {aulas.length === 0 ? <div className="panel empty">Nenhuma aula marcada. Crie a primeira em "Nova aula".</div> : (
        <div className="aulas" style={{ marginBottom: 20 }}>
          {aulas.map((a) => {
            const { dia, hora } = quandoAula(a.inicio)
            return (
              <button key={a.id} className="aula" aria-current={a.id === aulaId} onClick={() => setAulaId(a.id)} style={a.cancelada ? { opacity: .55 } : undefined}>
                <span className="dia">{dia}</span>
                <span className="hora">{hora}</span>
                <span className="meta">{a.titulo}{a.instrutor ? ` · ${a.instrutor}` : ''}</span>
                {a.cancelada ? <span className="pill pausado" style={{ alignSelf: 'flex-start' }}>Cancelada</span>
                  : <span className="meta"><strong style={{ color: 'var(--ink)' }}>{a.ativas.length}/{a.vagas - a.bloqueadas.length}</strong> reservadas · {a.ativas.filter((r) => r.status === 'pendente').length} aguardando Pix</span>}
              </button>
            )
          })}
        </div>
      )}

      {aula && (
        <div className="grid2" style={{ alignItems: 'start' }}>
          <div className="panel stack">
            <div className="row between">
              <h2>{aula.titulo} · {quandoAula(aula.inicio).hora}</h2>
              <span className="meta">{Number(aula.valor) ? `${brl(aula.valor)} · recebido ${brl(recebido)}` : 'Gratuita'}</span>
            </div>
            <MapaBikes vagas={aula.vagas} ocupadas={reservas.map((r) => r.bike)} bloqueadas={aula.bloqueadas} nomes={porBike}
              selecionada={bike} todasClicaveis onEscolher={(n) => setBike(n === bike ? null : n)} />
            <p className="meta" style={{ margin: 0 }}>Toque numa bike para confirmar o pagamento, cancelar, reservar para alguém ou colocar em manutenção.</p>
          </div>

          <div className="stack">
            {bike && (
              <div className="panel stack" style={{ gap: 10, borderColor: 'var(--accent)' }}>
                <h2>Bike {bike}</h2>
                {selecionada ? (
                  <BikeReservada r={selecionada} aula={aula} onAcao={acao} />
                ) : aula.bloqueadas.includes(bike) ? (
                  <button onClick={() => acao(supabase.from('aulas_spinning').update({ bloqueadas: aula.bloqueadas.filter((b) => b !== bike) }).eq('id', aula.id))}>Tirar da manutenção</button>
                ) : (
                  <BikeLivre bike={bike} aula={aula} onAcao={acao} />
                )}
              </div>
            )}
            <div className="panel">
              <h2 style={{ marginBottom: 8 }}>Reservas ({reservas.length})</h2>
              {reservas.length === 0 ? <p className="empty">Ninguém reservou ainda.</p> : (
                <div className="list">
                  {[...reservas].sort((a, b) => a.bike - b.bike).map((r) => (
                    <button key={r.id} className="item" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', borderRadius: 0, textAlign: 'left', fontWeight: 400 }} onClick={() => setBike(r.bike)}>
                      <span><span className="mono" style={{ marginRight: 10 }}>{String(r.bike).padStart(2, '0')}</span><span className="name">{r.nome}</span>{r.aluno_id && <span className="meta"> · aluno</span>}</span>
                      <span className={`pill ${r.status === 'pago' ? 'ativo' : 'pendente'}`}>{r.status === 'pago' ? 'Pago' : 'Aguardando Pix'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {aula.espera_spinning.length > 0 && <ListaEspera aula={aula} livres={aula.vagas - aula.bloqueadas.length - reservas.length} onAcao={acao} />}
            {!aula.cancelada && new Date(aula.inicio) > new Date() && (
              <button className="ghost" style={{ alignSelf: 'flex-start' }} onClick={() => confirm('Cancelar esta aula? Ela some da página de reservas. Avise quem reservou pelo WhatsApp.') && acao(supabase.from('aulas_spinning').update({ cancelada: true }).eq('id', aula.id))}>Cancelar aula</button>
            )}
          </div>
        </div>
      )}

      {nova && <NovaAula onFechar={() => setNova(false)} onSalva={() => { setNova(false); carregar() }} />}
    </>
  )
}

function ListaEspera({ aula, livres, onAcao }) {
  const { dia, hora } = quandoAula(aula.inicio)
  const fila = [...aula.espera_spinning].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  const link = `${window.location.origin}/spinning/${aula.id}`
  return (
    <div className="panel">
      <div className="row between"><h2>Lista de espera ({fila.length})</h2>{livres > 0 && <span className="pill ativo">{livres} {livres === 1 ? 'bike livre' : 'bikes livres'}</span>}</div>
      <p className="meta" style={{ margin: '4px 0 8px' }}>{livres > 0 ? 'Liberou bike: avise o próximo da fila.' : 'Quando alguém cancelar ou não pagar, avise o próximo da fila.'}</p>
      <div className="list">
        {fila.map((e, i) => {
          const zap = linkWhatsApp(e.telefone, `Oi, ${primeiroNome(e.nome)}! Liberou uma bike no ${aula.titulo} de ${dia} às ${hora}. Reserve rápido pelo link: ${link}`)
          return (
            <div key={e.id} className="item" style={{ cursor: 'default' }}>
              <span><span className="mono" style={{ marginRight: 10 }}>{i + 1}º</span><span className="name">{e.nome}</span>{e.avisado_em && <span className="meta"> · avisado</span>}</span>
              <span className="row" style={{ gap: 6 }}>
                {zap && <a className={`pill ${e.avisado_em ? 'pausado' : 'pendente'}`} style={{ textDecoration: 'none' }} href={zap} target="_blank" rel="noreferrer"
                  onClick={() => !e.avisado_em && onAcao(supabase.from('espera_spinning').update({ avisado_em: new Date().toISOString() }).eq('id', e.id))}>Avisar no WhatsApp</a>}
                <button className="ghost small" aria-label={`Tirar ${e.nome} da fila`} onClick={() => onAcao(supabase.from('espera_spinning').delete().eq('id', e.id))}>✕</button>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BikeReservada({ r, aula, onAcao }) {
  const { dia, hora } = quandoAula(aula.inicio)
  const zap = linkWhatsApp(r.telefone, r.status === 'pago'
    ? `Oi, ${primeiroNome(r.nome)}! Sua bike ${r.bike} no ${aula.titulo} de ${dia} às ${hora} está confirmada. Até lá!`
    : `Oi, ${primeiroNome(r.nome)}! Vi sua reserva da bike ${r.bike} no ${aula.titulo} de ${dia} às ${hora}. Falta o Pix para garantir a vaga.`)
  return (
    <>
      <div><strong>{r.nome}</strong> <span className="meta mono">#{r.codigo}</span></div>
      <div className="meta">{r.telefone} · {ROTULO_RESERVA[r.status]}{r.credito_id ? ' · pago com pacote' : ''}</div>
      <div className="row">
        {r.status === 'pendente' && <button className="primary small" onClick={() => onAcao(supabase.from('reservas_spinning').update({ status: 'pago' }).eq('id', r.id))}>Confirmar pagamento</button>}
        {r.status === 'pago' && <button className="small" onClick={() => onAcao(supabase.from('reservas_spinning').update({ status: 'pendente', created_at: new Date().toISOString() }).eq('id', r.id))}>Desfazer pagamento</button>}
        {zap && <a className="meta" href={zap} target="_blank" rel="noreferrer">WhatsApp</a>}
        <button className="ghost small" onClick={() => confirm(`Cancelar a reserva de ${r.nome}?`) && onAcao(supabase.from('reservas_spinning').update({ status: 'cancelada' }).eq('id', r.id))}>Cancelar reserva</button>
      </div>
    </>
  )
}

function BikeLivre({ bike, aula, onAcao }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  return (
    <>
      <p className="meta" style={{ margin: 0 }}>Livre. Reserve para alguém que pagou na hora ou coloque em manutenção.</p>
      <div className="form">
        <label>Nome<input id="bike-nome" value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label>WhatsApp<input id="bike-tel" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></label>
      </div>
      <div className="row">
        <button className="primary small" disabled={nome.trim().length < 2 || telefone.replace(/\D/g, '').length < 8}
          onClick={() => onAcao(supabase.from('reservas_spinning').insert({ aula_id: aula.id, bike, nome: nome.trim(), telefone: telefone.trim(), status: 'pago' }))}>Reservar (já pago)</button>
        <button className="small" onClick={() => onAcao(supabase.from('aulas_spinning').update({ bloqueadas: [...aula.bloqueadas, bike] }).eq('id', aula.id))}>Manutenção</button>
      </div>
    </>
  )
}

function NovaAula({ onFechar, onSalva }) {
  const [f, setF] = useState({ titulo: 'Spinning', instrutor: '', data: hojeISO(), hora: '07:00', duracao_min: '45', valor: '25', vagas: '14', semanas: '0' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const muda = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function salvar() {
    const inicio = inicioISO(f.data, f.hora)
    if (new Date(inicio) < new Date()) return setErro('Escolha uma data e hora no futuro.')
    setSalvando(true)
    const base = { titulo: f.titulo.trim() || 'Spinning', instrutor: f.instrutor.trim() || null, duracao_min: num(f.duracao_min) || 45, valor: num(f.valor) || 0, vagas: num(f.vagas) || 14 }
    const { error } = await supabase.from('aulas_spinning').insert(repetirSemanal(inicio, Number(f.semanas)).map((i) => ({ ...base, inicio: i })))
    setSalvando(false)
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    onSalva()
  }

  return (
    <Modal titulo="Nova aula de spinning" onFechar={onFechar} onSalvar={salvar} erro={erro} salvando={salvando} botao="Criar aula">
      <label>Nome da aula<input id="aula-titulo" maxLength={60} value={f.titulo} onChange={muda('titulo')} /></label>
      <label>Instrutor<input id="aula-instrutor" maxLength={60} value={f.instrutor} onChange={muda('instrutor')} /></label>
      <label>Data<input id="aula-data" type="date" required value={f.data} onChange={muda('data')} /></label>
      <label>Hora<input id="aula-hora" type="time" required value={f.hora} onChange={muda('hora')} /></label>
      <label>Duração (min)<input id="aula-duracao" inputMode="numeric" value={f.duracao_min} onChange={muda('duracao_min')} /></label>
      <label>Valor (R$, 0 = grátis)<input id="aula-valor" inputMode="decimal" value={f.valor} onChange={muda('valor')} /></label>
      <label>Bikes<input id="aula-vagas" inputMode="numeric" value={f.vagas} onChange={muda('vagas')} /></label>
      <label>Repetir toda semana
        <select id="aula-semanas" value={f.semanas} onChange={muda('semanas')}>
          <option value="0">Não repetir</option>
          {[3, 7, 11].map((n) => <option key={n} value={n}>Por {n + 1} semanas</option>)}
        </select>
      </label>
    </Modal>
  )
}
