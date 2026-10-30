import { test } from 'node:test'
import assert from 'node:assert/strict'
import { maiorSequencia, medalhas, progressoDesafio } from './medalhas.js'
import { linkWhatsApp } from './whatsapp.js'

const d = (n) => `2026-10-${String(n).padStart(2, '0')}`

test('progresso do desafio conta só dias dentro do período', () => {
  const desafio = { inicio: d(10), fim: d(20), meta_dias: 3 }
  assert.equal(progressoDesafio(desafio, [d(9), d(10), d(10), d(15), d(20), d(21)]), 3)
})

test('maior sequência encontra o melhor trecho', () => {
  assert.equal(maiorSequencia([d(1), d(2), d(3), d(10), d(11)]), 3)
  assert.equal(maiorSequencia([]), 0)
})

test('medalhas de marcos e de desafio', () => {
  const datas = Array.from({ length: 12 }, (_, i) => d(i + 1))
  const m = Object.fromEntries(medalhas(datas, [{ id: 'x', titulo: 'X', inicio: d(1), fim: d(31), meta_dias: 10 }]).map((x) => [x.id, x.ganhou]))
  assert.equal(m.dez, true)
  assert.equal(m.semana, true)
  assert.equal(m.mes, false)
  assert.equal(m.x, true)
})

test('link do WhatsApp com DDI do Brasil', () => {
  assert.equal(linkWhatsApp('(11) 98765-4321', 'Oi'), 'https://wa.me/5511987654321?text=Oi')
  assert.equal(linkWhatsApp('+55 11 98765-4321', 'a b'), 'https://wa.me/5511987654321?text=a%20b')
  assert.equal(linkWhatsApp('', 'x'), null)
})

test('medalhas novas: toneladas, variedade, meses ativos, tempo de casa e volta por cima', () => {
  const registros = [
    { data: '2026-01-05', exercicio_id: 'a', series: [{ carga: 100, reps: 10 }] },
    { data: '2026-01-06', exercicio_id: 'b', series: [{ carga: 50, reps: 10 }], troca: 'outro' },
  ]
  const datas = ['2026-01-05', '2026-01-06', '2026-01-25', ...Array.from({ length: 8 }, (_, i) => `2026-02-${String(i + 1).padStart(2, '0')}`)]
  const m = Object.fromEntries(medalhas({ datas, registros }).map((x) => [x.id, x]))
  assert.equal(m['ton-1'].ganhou, true)
  assert.equal(m['ton-10'].valor, 1)
  assert.equal(m['exercicios-10'].valor, 1)
  assert.equal(m['meses-3'].valor, 1)
  assert.equal(m['volta-1'].ganhou, true)
  assert.equal(m['casa-90'].valor, 34)
})
