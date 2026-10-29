import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FRASES_MOTIVACAO, deveMotivar, mensagemMotivacao, nivelMotivacao } from './motivacao.js'

test('marcos de 3, 7, 14, 21 e 30 dias, até 45', () => {
  assert.deepEqual([1, 2, 3, 5, 7, 10, 14, 30, 45, 46].map((d) => nivelMotivacao(d)?.marco ?? null), [null, null, 3, 3, 7, 7, 14, 30, 30, null])
  assert.equal(nivelMotivacao(3).nivel, 'leve'); assert.equal(nivelMotivacao(8).nivel, 'semana'); assert.equal(nivelMotivacao(21).nivel, 'volta')
})

test('uma notificação por marco, mesmo se a função pular um dia', () => {
  assert.equal(deveMotivar(3, null), 'leve')         // nunca avisou
  assert.equal(deveMotivar(4, 1), null)              // avisou ontem, no dia 3
  assert.equal(deveMotivar(4, null), 'leve')         // não rodou no dia 3: avisa no 4
  assert.equal(deveMotivar(7, 4), 'semana')          // avisado no dia 3, chegou o 7
  assert.equal(deveMotivar(9, 1), null)              // avisado no dia 8 (marco 7)
  assert.equal(deveMotivar(2, null), null)
  assert.equal(deveMotivar(60, null), null)
})

test('frase com o primeiro nome e o lugar certo', () => {
  for (const nivel of Object.keys(FRASES_MOTIVACAO)) {
    const m = mensagemMotivacao(nivel, { id: 'a1', nome: 'Mariana Souza', online: false }, '2026-10-29')
    assert.match(m.corpo, /^Mariana,/)
    assert.doesNotMatch(m.corpo, /\{|\}/)
    assert.ok(m.titulo.length <= 80 && m.corpo.length <= 240)
  }
  const todas = (online) => FRASES_MOTIVACAO.leve.map((_, i) => mensagemMotivacao('leve', { id: `x${i}`, nome: 'Ana', online }, '2026-10-29').corpo).join(' ')
  assert.doesNotMatch(todas(true), /academia/)
})

test('a função de notificações usa as mesmas frases', () => {
  const fonte = readFileSync(new URL('../../supabase/functions/notificacoes/index.ts', import.meta.url), 'utf8')
  for (const lista of Object.values(FRASES_MOTIVACAO)) for (const [titulo, corpo] of lista) {
    assert.ok(fonte.includes(titulo) && fonte.includes(corpo), `faltou na função: ${titulo}`)
  }
})
