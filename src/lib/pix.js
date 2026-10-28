// Pix "copia e cola" estático (BR Code, padrão EMV do Banco Central).

const campo = (id, valor) => `${id}${String(valor.length).padStart(2, '0')}${valor}`

// Nome e cidade vão sem acento e em maiúsculas, com o limite de tamanho do padrão.
const limpar = (txt, max) => txt.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').trim().toUpperCase().slice(0, max)

export function crc16(payload) {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function pixCopiaECola({ chave, nome, cidade, valor, txid = '***', descricao }) {
  const base = campo('00', 'br.gov.bcb.pix') + campo('01', chave.trim())
  const extra = descricao ? campo('02', descricao.slice(0, 40)) : ''
  const conta = (base + extra).length <= 99 ? base + extra : base // o campo 26 tem no máximo 99 caracteres
  let payload =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    (valor ? campo('54', Number(valor).toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', limpar(nome, 25)) +
    campo('60', limpar(cidade, 15)) +
    campo('62', campo('05', txid.replace(/[^A-Za-z0-9*]/g, '').slice(0, 25) || '***')) +
    '6304'
  payload += crc16(payload)
  return payload
}

// Mensalidade do mês: pago, a vencer ou atrasado.
export function situacaoMensalidade({ valor, diaVencimento, pago, hoje }) {
  if (!valor) return null
  if (pago) return 'pago'
  const dia = Number(hoje.slice(8, 10))
  return diaVencimento && dia > diaVencimento ? 'atrasado' : 'aberto'
}
