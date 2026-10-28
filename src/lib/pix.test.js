import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crc16, pixCopiaECola, situacaoMensalidade } from './pix.js'

test('CRC16 do exemplo do manual do BR Code', () => {
  const semCrc = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304'
  assert.equal(crc16(semCrc), '1D3D')
})

test('monta o copia e cola com valor e nome sem acento', () => {
  const p = pixCopiaECola({ chave: 'caie@exemplo.com', nome: 'Caiê Langone', cidade: 'São Paulo', valor: 250 })
  assert.ok(p.startsWith('000201'))
  assert.ok(p.includes('0014br.gov.bcb.pix0116caie@exemplo.com'))
  assert.ok(p.includes('5406250.00'))
  assert.ok(p.includes('5912CAIE LANGONE6009SAO PAULO'))
  assert.equal(p.slice(-4), crc16(p.slice(0, -4)))
})

test('situação da mensalidade', () => {
  assert.equal(situacaoMensalidade({ valor: 250, diaVencimento: 10, pago: false, hoje: '2026-10-28' }), 'atrasado')
  assert.equal(situacaoMensalidade({ valor: 250, diaVencimento: 30, pago: false, hoje: '2026-10-05' }), 'aberto')
  assert.equal(situacaoMensalidade({ valor: 250, diaVencimento: 10, pago: true, hoje: '2026-10-28' }), 'pago')
  assert.equal(situacaoMensalidade({ valor: null, diaVencimento: 10, pago: false, hoje: '2026-10-28' }), null)
})

test('chave longa descarta a descrição para caber no campo 26', () => {
  const chave = 'a'.repeat(77)
  const p = pixCopiaECola({ chave, nome: 'X', cidade: 'Y', descricao: 'Mensalidade 2026-11' })
  assert.ok(!p.includes('Mensalidade'))
  assert.ok(p.includes(`26${String(14 + 4 + 4 + 77).padStart(2, '0')}`))
})
