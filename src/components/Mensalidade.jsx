import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { situacaoMensalidade } from '../lib/pix.js'
import PixPagamento from './PixPagamento.jsx'
import { pixAutomatico } from '../lib/pixAutomatico.js'
import { MESES, brl, hojeISO } from '../lib/formato.js'
import { linkWhatsApp } from '../lib/whatsapp.js'

// Mensalidade do mês para o aluno: situação, QR Code Pix e copia e cola.
export default function Mensalidade({ aluno }) {
  const [pix, setPix] = useState(undefined)
  const [pago, setPago] = useState(false)
  const hoje = hojeISO(), competencia = hoje.slice(0, 7)

  useEffect(() => {
    supabase.rpc('pix_do_personal').then(({ data }) => setPix(data?.[0] || null))
    const verificar = () => supabase.from('pagamentos').select('id').eq('aluno_id', aluno.id).eq('competencia', competencia).then(({ data }) => setPago(!!data?.length))
    verificar()
    const t = pixAutomatico && setInterval(verificar, 30000) // com o Pix automático, a confirmação chega sozinha
    return () => t && clearInterval(t)
  }, [aluno.id, competencia])

  if (!aluno.valor_mensal || pix === undefined) return null
  const situacao = situacaoMensalidade({ valor: aluno.valor_mensal, diaVencimento: aluno.dia_vencimento, pago, hoje })
  const mes = MESES[Number(competencia.slice(5)) - 1]
  const aviso = linkWhatsApp(pix?.telefone, `Oi! Fiz o Pix da mensalidade de ${mes} (${brl(aluno.valor_mensal)}).`)

  return (
    <div className="panel stack" style={{ gap: 12 }}>
      <div className="row between">
        <h2>Mensalidade de {mes}</h2>
        <span className={`pill ${situacao === 'pago' ? 'ativo' : 'pendente'}`}>{{ pago: 'Paga', aberto: 'Em aberto', atrasado: 'Atrasada' }[situacao]}</span>
      </div>
      <div className="meta">{brl(aluno.valor_mensal)}{aluno.dia_vencimento ? ` · vence todo dia ${aluno.dia_vencimento}` : ''}</div>
      {situacao === 'pago' ? <p className="ok">Pagamento confirmado. Obrigado!</p> : (
        <>
          <PixPagamento alt="QR Code Pix da mensalidade" cobranca={{ tipo: 'mensalidade' }}
            estatico={pix?.pix_chave && { chave: pix.pix_chave, nome: pix.pix_nome || pix.nome || 'Personal', cidade: pix.pix_cidade || 'Brasil', valor: aluno.valor_mensal, descricao: `Mensalidade ${competencia}` }} />
          {aviso && <a className="meta" href={aviso} target="_blank" rel="noreferrer">Avisar no WhatsApp que paguei</a>}
          <p className="meta" style={{ margin: 0 }}>Depois do Pix, a situação muda para "Paga" quando o pagamento for confirmado.</p>
        </>
      )}
    </div>
  )
}
