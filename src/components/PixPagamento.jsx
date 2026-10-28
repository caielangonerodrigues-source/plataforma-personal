import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { pixCopiaECola } from '../lib/pix.js'
import { gerarPixAutomatico, pixAutomatico } from '../lib/pixAutomatico.js'

// QR Code e copia e cola. Com o Pix automático ligado, a cobrança vem do Mercado Pago
// (confirma sozinha); sem ele, ou se falhar, usa o Pix estático da chave do personal.
export default function PixPagamento({ cobranca, estatico, alt = 'QR Code Pix' }) {
  const [auto, setAuto] = useState(pixAutomatico ? undefined : null)
  const [qr, setQr] = useState('')
  const [copiado, setCopiado] = useState(false)
  const chaveCobranca = JSON.stringify(cobranca)

  useEffect(() => {
    if (!pixAutomatico) return
    let ativo = true
    gerarPixAutomatico(JSON.parse(chaveCobranca)).then((d) => ativo && setAuto(d)).catch(() => ativo && setAuto(null))
    return () => { ativo = false }
  }, [chaveCobranca])

  const fixo = estatico?.chave ? pixCopiaECola(estatico) : null
  const codigo = auto?.copia_e_cola || (auto === null ? fixo : null)

  useEffect(() => {
    if (auto?.qr_base64) setQr(`data:image/png;base64,${auto.qr_base64}`)
    else if (codigo) QRCode.toDataURL(codigo, { margin: 1, width: 360 }).then(setQr)
  }, [auto, codigo])

  async function copiar() {
    try { await navigator.clipboard.writeText(codigo); setCopiado(true) } catch { setCopiado(false) }
  }

  if (auto === undefined) return <p className="carregando" style={{ margin: 0 }}>Gerando o Pix…</p>
  if (!codigo) return <p className="meta" style={{ margin: 0 }}>O Pix ainda não foi cadastrado. Combine o pagamento pelo WhatsApp.</p>
  return (
    <>
      {qr && <img src={qr} alt={alt} style={{ width: 200, height: 200, alignSelf: 'center', background: '#fff', borderRadius: 8, padding: 6 }} />}
      <label>Pix copia e cola<textarea id="pix-codigo" readOnly rows={3} value={codigo} onFocus={(e) => e.target.select()} style={{ fontFamily: 'var(--mono)', fontSize: 12 }} /></label>
      <button className="primary" onClick={copiar}>{copiado ? 'Código copiado' : 'Copiar código Pix'}</button>
      {auto && <p className="ok" style={{ margin: 0 }}>A confirmação é automática: assim que o Pix cair, esta página atualiza.</p>}
    </>
  )
}
