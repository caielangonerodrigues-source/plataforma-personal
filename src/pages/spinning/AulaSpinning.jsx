import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import MapaBikes from '../../components/MapaBikes.jsx'
import { MINUTOS_PARA_PAGAR, bikesLivres, quandoAula } from '../../lib/spinning.js'
import { brl } from '../../lib/formato.js'
import TopoSpinning, { guardarCodigoPacote, guardarReserva, meuCodigoPacote } from './TopoSpinning.jsx'

// Mapa da sala: a pessoa escolhe a bike e reserva (pagando por Pix ou com o pacote).
// Com a aula lotada, entra na lista de espera.
export default function AulaSpinning() {
  const { aulaId } = useParams()
  const navigate = useNavigate()
  const [aula, setAula] = useState(undefined)
  const [ocupadas, setOcupadas] = useState([])
  const [bike, setBike] = useState(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [pacote, setPacote] = useState(meuCodigoPacote())
  const [comPacote, setComPacote] = useState(!!meuCodigoPacote())
  const [posicao, setPosicao] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const carregar = useCallback(async () => {
    const [a, o] = await Promise.all([
      supabase.from('aulas_spinning').select('*').eq('id', aulaId).maybeSingle(),
      supabase.rpc('bikes_ocupadas', { a: aulaId }),
    ])
    setAula(a.data || null)
    setOcupadas(o.data || [])
    setBike((b) => (o.data || []).includes(b) ? null : b)
  }, [aulaId])

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 20000) // mantém o mapa atualizado enquanto a pessoa escolhe
    return () => clearInterval(t)
  }, [carregar])

  async function reservar(e) {
    e.preventDefault()
    setErro(''); setEnviando(true)
    const usarPacote = comPacote && pago
    const { data, error } = usarPacote
      ? await supabase.rpc('reservar_com_pacote', { p_aula: aulaId, p_bike: bike, p_codigo: pacote })
      : await supabase.rpc('reservar_bike', { p_aula: aulaId, p_bike: bike, p_nome: nome, p_telefone: telefone })
    setEnviando(false)
    if (error) { setErro(error.message); carregar(); return }
    const r = data[0]
    if (usarPacote) guardarCodigoPacote(pacote.trim().toUpperCase())
    guardarReserva({ id: r.id, codigo: r.codigo, aula_id: aulaId })
    navigate(`/spinning/reserva/${r.id}?c=${r.codigo}`)
  }

  async function entrarNaEspera(e) {
    e.preventDefault()
    setErro(''); setEnviando(true)
    const { data, error } = await supabase.rpc('entrar_na_espera', { p_aula: aulaId, p_nome: nome, p_telefone: telefone })
    setEnviando(false)
    if (error) return setErro(error.message)
    setPosicao(data)
  }

  if (aula === undefined) return <div className="solo"><TopoSpinning voltar="/spinning" /><p className="carregando">Carregando…</p></div>
  if (!aula || aula.cancelada) return <div className="solo"><TopoSpinning voltar="/spinning" /><div className="panel empty">Esta aula não existe ou foi cancelada.</div></div>
  const { dia, hora } = quandoAula(aula.inicio)
  const comecou = new Date(aula.inicio) < new Date()
  const pago = Number(aula.valor) > 0
  const lotada = bikesLivres(aula.vagas, ocupadas, aula.bloqueadas) === 0
  const camposContato = (
    <>
      <label>Seu nome<input id="nome" autoComplete="name" required minLength={2} maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} /></label>
      <label>WhatsApp com DDD<input id="telefone" type="tel" autoComplete="tel" inputMode="tel" required placeholder="(11) 98765-4321" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></label>
    </>
  )

  let lado
  if (comecou) lado = <p className="empty">Esta aula já começou.</p>
  else if (lotada) lado = posicao ? (
    <>
      <h2>Você está na fila</h2>
      <p style={{ margin: 0 }}>Você é o <strong>nº {posicao}</strong> da lista de espera. Se uma bike liberar, você recebe uma mensagem no WhatsApp.</p>
      <Link to="/spinning">Ver outros horários</Link>
    </>
  ) : (
    <form className="stack" onSubmit={entrarNaEspera}>
      <h2>Aula lotada</h2>
      <p className="meta" style={{ margin: 0 }}>Entre na lista de espera: se alguém cancelar ou não pagar, você é avisado no WhatsApp pela ordem da fila.</p>
      {camposContato}
      {erro && <p className="erro">{erro}</p>}
      <button className="primary" disabled={enviando}>{enviando ? 'Enviando…' : 'Entrar na lista de espera'}</button>
    </form>
  )
  else if (!bike) lado = (
    <>
      <h2>Escolha sua bike</h2>
      <p className="meta" style={{ margin: 0 }}>Toque numa bike laranja no mapa. As bikes 1 e 2 ficam ao lado do instrutor, na frente.</p>
      {pago && <p className="meta" style={{ margin: 0 }}>Vai fazer várias aulas? <Link to="/spinning/pacotes">Veja os pacotes</Link> e pague menos por aula.</p>}
    </>
  )
  else lado = (
    <form className="stack" onSubmit={reservar}>
      <h2>Bike {bike}</h2>
      {pago && (
        <div className="row" role="radiogroup" aria-label="Forma de pagamento" style={{ gap: 6 }}>
          <button type="button" className={`small${!comPacote ? ' primary' : ''}`} aria-pressed={!comPacote} onClick={() => setComPacote(false)}>Pagar {brl(aula.valor)} no Pix</button>
          <button type="button" className={`small${comPacote ? ' primary' : ''}`} aria-pressed={comPacote} onClick={() => setComPacote(true)}>Usar meu pacote</button>
        </div>
      )}
      {comPacote && pago
        ? <label>Código do pacote<input id="codigo-pacote" required autoCapitalize="characters" placeholder="Ex.: 7F3K9Q2M" value={pacote} onChange={(e) => setPacote(e.target.value)} style={{ fontFamily: 'var(--mono)' }} /></label>
        : camposContato}
      {erro && <p className="erro">{erro}</p>}
      <button className="primary" disabled={enviando}>{enviando ? 'Reservando…' : comPacote && pago ? 'Reservar com o pacote' : pago ? `Reservar e pagar ${brl(aula.valor)}` : 'Reservar bike'}</button>
      {pago && !comPacote && <p className="meta" style={{ margin: 0 }}>A bike fica guardada por {MINUTOS_PARA_PAGAR} minutos esperando o Pix. Sem pagamento, ela volta a ficar livre.</p>}
      {pago && comPacote && <p className="meta" style={{ margin: 0 }}>Desconta uma aula do seu pacote e a reserva já fica confirmada.</p>}
    </form>
  )

  return (
    <div className="solo">
      <TopoSpinning voltar="/spinning" />
      <h1>{aula.titulo} · {hora}</h1>
      <p className="sub">{dia} · {aula.duracao_min} min{aula.instrutor ? ` · com ${aula.instrutor}` : ''} · {pago ? brl(aula.valor) : 'Gratuita'}</p>
      <div className="grid2" style={{ alignItems: 'start' }}>
        <div className="panel">
          <MapaBikes vagas={aula.vagas} ocupadas={ocupadas} bloqueadas={aula.bloqueadas} selecionada={bike} onEscolher={(n) => setBike(n === bike ? null : n)} />
        </div>
        <div className="panel stack">{lado}</div>
      </div>
    </div>
  )
}
