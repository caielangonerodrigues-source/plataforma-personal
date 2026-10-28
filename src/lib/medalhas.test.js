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
