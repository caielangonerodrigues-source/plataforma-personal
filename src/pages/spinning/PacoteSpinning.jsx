import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import PixPagamento from '../../components/PixPagamento.jsx'
import { brl, fmtData } from '../../lib/formato.js'
import { linkWhatsApp } from '../../lib/whatsapp.js'
import TopoSpinning, { guardarCodigoPacote } from './TopoSpinning.jsx'

// Situação de um pacote pelo código: Pix (se pendente), saldo e validade.
export default function PacoteSpinning() {
  const { codigo } = useParams()
  const [c, setC] = useState(undefined)

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('meu_pacote', { p_codigo: codigo })
    setC(data?.[0] || null)
    if (data?.[0]) guardarCodigoPacote(data[0].codigo)
  }, [codigo])

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 30000)
    return () => clearInterval(t)
  }, [carregar])

  if (c === undefined) return <div className="solo"><TopoSpinning voltar="/spinning" /><p className="carregando">Carregando…</p></div>
  if (!c) return <div className="solo"><TopoSpinning voltar="/spinning" /><div className="panel empty">Pacote não encontrado. Confira o código.</div></div>
  const vencido = c.status === 'pago' && c.validade && c.validade < new Date().toLocaleDateString('sv-SE')
  const zap = linkWhatsApp(c.personal_telefone, `Oi! Fiz o Pix do pacote de ${c.aulas} aulas de spinning (código ${c.codigo}). Nome: ${c.nome}.`)

  return (
    <div className="solo" style={{ maxWidth: 520 }}>
      <TopoSpinning voltar="/spinning" />
      <div className="ingresso">
        <div className="ingresso-topo">
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{c.pacote_nome || 'Pacote de aulas'}</div>
            <div>{c.nome} · {brl(c.valor)}</div>
          </div>
          <div className="bike-grande"><small>SALDO</small>{c.status === 'pago' ? c.saldo : c.aulas}</div>
        </div>
        <div className="ingresso-corpo">
          <div className="row between">
            <span>Código <strong className="mono" style={{ fontSize: 18 }}>{c.codigo}</strong></span>
            <span className={`pill ${c.status === 'pago' && !vencido ? 'ativo' : c.status === 'pendente' ? 'pendente' : 'pausado'}`}>
              {vencido ? 'Vencido' : { pago: 'Ativo', pendente: 'Aguardando Pix', cancelada: 'Cancelado' }[c.status]}
            </span>
          </div>
          {c.status === 'pago' && (
            <>
              <p style={{ margin: 0 }}>{c.saldo === 1 ? 'Resta 1 aula' : `Restam ${c.saldo} de ${c.aulas} aulas`}{c.validade ? `, válidas até ${fmtData(c.validade)}` : ''}.</p>
              <p className="meta" style={{ margin: 0 }}>Para reservar, escolha a aula e a bike e toque em "Usar meu pacote". Neste aparelho o código já vem preenchido.</p>
              <Link to="/spinning" className="row" style={{ fontWeight: 700 }}>Reservar uma aula ›</Link>
            </>
          )}
          {c.status === 'pendente' && (
            <>
              <p style={{ margin: 0 }}>Pague {brl(c.valor)} por Pix. Quando o pagamento for confirmado, o saldo fica disponível.</p>
              <PixPagamento alt="QR Code Pix do pacote" cobranca={{ tipo: 'pacote', codigo: c.codigo }}
                estatico={c.pix_chave && { chave: c.pix_chave, nome: c.pix_nome || c.personal_nome || 'Personal', cidade: c.pix_cidade || 'Brasil', valor: c.valor, txid: c.codigo, descricao: `Pacote ${c.aulas} aulas` }} />
              {zap && <a href={zap} target="_blank" rel="noreferrer">Avisar no WhatsApp que paguei</a>}
            </>
          )}
          <p className="meta" style={{ margin: 0 }}>Guarde o código {c.codigo}: com ele você reserva de qualquer celular.</p>
        </div>
      </div>
    </div>
  )
}
