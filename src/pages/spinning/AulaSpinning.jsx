import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import MapaBikes from '../../components/MapaBikes.jsx'
import { MINUTOS_PARA_PAGAR, quandoAula } from '../../lib/spinning.js'
import { brl } from '../../lib/formato.js'
import TopoSpinning, { guardarReserva } from './TopoSpinning.jsx'

// Mapa da sala: a pessoa escolhe a bike, informa nome e WhatsApp e reserva.
export default function AulaSpinning() {
  const { aulaId } = useParams()
  const navigate = useNavigate()
  const [aula, setAula] = useState(undefined)
  const [ocupadas, setOcupadas] = useState([])
  const [bike, setBike] = useState(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
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
    const { data, error } = await supabase.rpc('reservar_bike', { p_aula: aulaId, p_bike: bike, p_nome: nome, p_telefone: telefone })
    setEnviando(false)
    if (error) { setErro(error.message); carregar(); return }
    const r = data[0]
    guardarReserva({ id: r.id, codigo: r.codigo, aula_id: aulaId })
    navigate(`/spinning/reserva/${r.id}?c=${r.codigo}`)
  }

  if (aula === undefined) return <div className="solo"><TopoSpinning voltar="/spinning" /><p className="carregando">Carregando…</p></div>
  if (!aula || aula.cancelada) return <div className="solo"><TopoSpinning voltar="/spinning" /><div className="panel empty">Esta aula não existe ou foi cancelada.</div></div>
  const { dia, hora } = quandoAula(aula.inicio)
  const comecou = new Date(aula.inicio) < new Date()
  const pago = Number(aula.valor) > 0

  return (
    <div className="solo">
      <TopoSpinning voltar="/spinning" />
      <h1>{aula.titulo} · {hora}</h1>
      <p className="sub">{dia} · {aula.duracao_min} min{aula.instrutor ? ` · com ${aula.instrutor}` : ''} · {pago ? brl(aula.valor) : 'Gratuita'}</p>
      <div className="grid2" style={{ alignItems: 'start' }}>
        <div className="panel">
          <MapaBikes vagas={aula.vagas} ocupadas={ocupadas} bloqueadas={aula.bloqueadas} selecionada={bike} onEscolher={(n) => setBike(n === bike ? null : n)} />
        </div>
        <form className="panel stack" onSubmit={reservar}>
          {comecou ? <p className="empty">Esta aula já começou.</p> : !bike ? (
            <>
              <h2>Escolha sua bike</h2>
              <p className="meta" style={{ margin: 0 }}>Toque numa bike laranja no mapa. A fileira 1 fica de frente para o instrutor.</p>
            </>
          ) : (
            <>
              <h2>Bike {bike}</h2>
              <label>Seu nome<input id="nome" autoComplete="name" required minLength={2} maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} /></label>
              <label>WhatsApp com DDD<input id="telefone" type="tel" autoComplete="tel" inputMode="tel" required placeholder="(11) 98765-4321" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></label>
              {erro && <p className="erro">{erro}</p>}
              <button className="primary" disabled={enviando}>{enviando ? 'Reservando…' : pago ? `Reservar e pagar ${brl(aula.valor)}` : 'Reservar bike'}</button>
              {pago && <p className="meta" style={{ margin: 0 }}>A bike fica guardada por {MINUTOS_PARA_PAGAR} minutos esperando o Pix. Sem pagamento, ela volta a ficar livre.</p>}
            </>
          )}
        </form>
      </div>
    </div>
  )
}
