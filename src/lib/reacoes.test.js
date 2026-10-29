import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EMOJIS, resumirReacoes, acaoReacao } from './reacoes.js'

test('resumirReacoes conta por emoji na ordem fixa e acha a minha', () => {
  const r = resumirReacoes([
    { user_id: 'a', emoji: '🔥' }, { user_id: 'b', emoji: '❤️' }, { user_id: 'c', emoji: '🔥' }, { user_id: 'eu', emoji: '💪' },
  ], 'eu')
  assert.deepEqual(r.lista, [{ emoji: '❤️', total: 1 }, { emoji: '🔥', total: 2 }, { emoji: '💪', total: 1 }])
  assert.equal(r.minha, '💪')
  assert.equal(r.total, 4)
})

test('curtidas antigas sem emoji contam como coração', () => {
  const r = resumirReacoes([{ user_id: 'eu' }, { user_id: 'x', emoji: 'abc' }], 'eu')
  assert.deepEqual(r.lista, [{ emoji: EMOJIS[0], total: 2 }])
  assert.equal(r.minha, '❤️')
})

test('sem reações', () => {
  assert.deepEqual(resumirReacoes([], 'eu'), { lista: [], minha: null, total: 0 })
})

test('acaoReacao: colocar, trocar e tirar', () => {
  assert.equal(acaoReacao(null, '🔥'), 'colocar')
  assert.equal(acaoReacao('❤️', '🔥'), 'trocar')
  assert.equal(acaoReacao('🔥', '🔥'), 'tirar')
})
