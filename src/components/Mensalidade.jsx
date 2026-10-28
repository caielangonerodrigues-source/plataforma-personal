import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../supabase.js'
import { pixCopiaECola, situacaoMensalidade } from '../lib/pix.js'
import { MESES, brl, hojeISO } from '../lib/formato.js'
import { linkWhatsApp } from '../lib/whatsapp.js'


// Mensalidade do mês para o aluno: situação, QR Code Pix e copia e cola.
export default function Mensalidade({ aluno }) {
  const [pix, setPix] = useState(undefined)
  const [pago, setPago] = useState(false)
  const [qr, setQr] = useState('')
  const [copiado, setCopiado] = useState(false)
  const hoje = hojeISO(), competencia = hoje.slice(0, 7)

  useEffect(() => {
    supabase.rpc('pix_do_personal').then(({ data }) => setPix(data?.[0] || null))
    supabase.from('pagamentos').select('id').eq('aluno_id', aluno.id).eq('competencia', competencia).then(({ data }) => setPago(!!data?.length))
  }, [aluno.id, competencia])

  const codigo = pix?.pix_chave && aluno.valor_mensal
    ? pixCopiaECola({ chave: pix.pix_chave, nome: pix.pix_nome || pix.nome || 'Personal', cidade: pix.pix_cidade || 'Brasil', valor: aluno.valor_mensal, descricao: `Mensalidade ${competencia}` })
    : null

  useEffect(() => {
    if (codigo) QRCode.toDataURL(codigo, { margin: 1, width: 360 }).then(setQr)
  }, [codigo])

  if (!aluno.valor_mensal || pix === undefined) return null
  const situacao = situacaoMensalidade({ valor: aluno.valor_mensal, diaVencimento: aluno.dia_vencimento, pago, hoje })
  const mes = MESES[Number(competencia.slice(5)) - 1]
  const aviso = linkWhatsApp(pix?.telefone, `Oi! Fiz o Pix da mensalidade de ${mes} (${brl(aluno.valor_mensal)}).`)

  async function copiar() {
    try { await navigator.clipboard.writeText(codigo); setCopiado(true) } catch { setCopiado(false) }
  }

  return (
    <div className="panel stack" style={{ gap: 12 }}>
      <div className="row between">
        <h2>Mensalidade de {mes}</h2>
        <span className={`pill ${situacao === 'pago' ? 'ativo' : 'pendente'}`}>{{ pago: 'Paga', aberto: 'Em aberto', atrasado: 'Atrasada' }[situacao]}</span>
      </div>
      <div className="meta">{brl(aluno.valor_mensal)}{aluno.dia_vencimento ? ` · vence todo dia ${aluno.dia_vencimento}` : ''}</div>
      {situacao === 'pago' ? <p className="ok">Pagamento confirmado pelo seu personal. Obrigado!</p> : !codigo ? (
        <p className="meta" style={{ margin: 0 }}>Seu personal ainda não cadastrou a chave Pix. Combine o pagamento com ele.</p>
      ) : (
        <>
          {qr && <img src={qr} alt="QR Code Pix da mensalidade" style={{ width: 200, height: 200, alignSelf: 'center', background: '#fff', borderRadius: 8, padding: 6 }} />}
          <label>Pix copia e cola<textarea id="pix-codigo" readOnly rows={3} value={codigo} onFocus={(e) => e.target.select()} style={{ fontFamily: 'var(--mono)', fontSize: 12 }} /></label>
          <div className="row">
            <button className="primary" onClick={copiar}>{copiado ? 'Código copiado' : 'Copiar código Pix'}</button>
            {aviso && <a className="meta" href={aviso} target="_blank" rel="noreferrer">Avisar no WhatsApp que paguei</a>}
          </div>
          <p className="meta" style={{ margin: 0 }}>Depois do Pix, seu personal confirma o pagamento e o status muda para "Paga".</p>
        </>
      )}
    </div>
  )
}
