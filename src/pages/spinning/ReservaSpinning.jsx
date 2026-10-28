import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import PixPagamento from '../../components/PixPagamento.jsx'
import { linkWhatsApp } from '../../lib/whatsapp.js'
import { brl, primeiroNome } from '../../lib/formato.js'
import { ROTULO_RESERVA, minutosParaPagar, quandoAula } from '../../lib/spinning.js'
import TopoSpinning from './TopoSpinning.jsx'

// "Ingresso" da reserva, aberto pelo link com o código: situação, Pix e cancelamento.
export default function ReservaSpinning() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const codigo = params.get('c') || ''
  const [r, setR] = useState(undefined)
  const [, setTique] = useState(0)

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('minha_reserva', { p_id: id, p_codigo: codigo })
    setR(data?.[0] || null)
  }, [id, codigo])

  useEffect(() => {
    carregar()
    const t = setInterval(() => { setTique((n) => n + 1); carregar() }, 30000)
    return () => clearInterval(t)
  }, [carregar])

  async function cancelar() {
    if (!confirm('Cancelar esta reserva? A bike volta a ficar livre.')) return
    await supabase.rpc('cancelar_minha_reserva', { p_id: id, p_codigo: codigo })
    carregar()
  }

  if (r === undefined) return <div className="solo"><TopoSpinning /><p className="carregando">Carregando…</p></div>
  if (!r) return <div className="solo"><TopoSpinning /><div className="panel empty">Reserva não encontrada. Confira o link que você recebeu.</div></div>

  const { dia, hora } = quandoAula(r.aula_inicio)
  const resta = minutosParaPagar(r.criada)
  const zap = linkWhatsApp(r.personal_telefone, `Oi! Fiz o Pix da bike ${r.bike} no ${r.aula_titulo} de ${dia} às ${hora} (código ${r.codigo}). Nome: ${r.nome}.`)
  const link = `${window.location.origin}/spinning/reserva/${r.id}?c=${r.codigo}`

  return (
    <div className="solo" style={{ maxWidth: 520 }}>
      <TopoSpinning />
      <div className="ingresso">
        <div className="ingresso-topo">
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{r.aula_titulo}</div>
            <div>{dia} · {hora} · {r.aula_duracao} min</div>
            {r.instrutor && <div>com {r.instrutor}</div>}
          </div>
          <div className="bike-grande"><small>BIKE</small>{r.bike}</div>
        </div>
        <div className="ingresso-corpo">
          <div className="row between">
            <span><strong>{r.nome}</strong> <span className="meta mono">#{r.codigo}</span></span>
            <span className={`pill ${{ pago: 'ativo', pendente: 'pendente', cancelada: 'pausado' }[r.status]}`}>{ROTULO_RESERVA[r.status]}</span>
          </div>

          {r.status === 'pago' && <p className="ok">Tudo certo, {primeiroNome(r.nome)}! Sua bike está garantida. Chegue uns 10 minutos antes para regular o banco.</p>}
          {r.status === 'pago' && r.com_pacote && new Date(r.aula_inicio) - Date.now() > 2 * 3600e3 && (
            <button className="link" style={{ color: 'var(--muted)', alignSelf: 'flex-start' }} onClick={cancelar}>Não vou poder ir: cancelar e devolver a aula ao pacote</button>
          )}
          {r.status === 'cancelada' && (
            <>
              <p className="meta" style={{ margin: 0 }}>Esta reserva foi cancelada{Number(r.valor) > 0 ? ' (o Pix não foi feito a tempo ou ela foi cancelada)' : ''}.</p>
              <Link to={`/spinning/${r.aula_id}`}>Escolher outra bike</Link>
            </>
          )}
          {r.status === 'pendente' && (
            <>
              <p style={{ margin: 0 }}>Pague {brl(r.valor)} por Pix em até <strong>{resta} {resta === 1 ? 'minuto' : 'minutos'}</strong>. Depois disso a bike volta a ficar livre.</p>
              <PixPagamento alt="QR Code Pix da reserva" cobranca={{ tipo: 'reserva', id: r.id, codigo: r.codigo }}
                estatico={r.pix_chave && { chave: r.pix_chave, nome: r.pix_nome || r.personal_nome || 'Personal', cidade: r.pix_cidade || 'Brasil', valor: r.valor, txid: r.codigo, descricao: `Spinning bike ${r.bike}` }} />
              <div className="row between">
                {zap && <a href={zap} target="_blank" rel="noreferrer">Avisar no WhatsApp que paguei</a>}
                <button className="link" style={{ color: 'var(--muted)' }} onClick={cancelar}>Cancelar reserva</button>
              </div>
              <p className="meta" style={{ margin: 0 }}>Quando o pagamento for confirmado, esta página muda para "Confirmada".</p>
            </>
          )}
          <p className="meta" style={{ margin: 0, overflowWrap: 'anywhere' }}>Guarde este link para voltar à reserva: {link}</p>
        </div>
      </div>
    </div>
  )
}
