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

test('quemReagiu põe você primeiro, depois personais, e usa os nomes', async () => {
  const { quemReagiu } = await import('./reacoes.js')
  const pessoas = { a: { nome: 'Ana Souza' }, p: { nome: 'Caiê L', personal: true }, eu: { nome: 'Eliane R' } }
  const l = quemReagiu([{ user_id: 'a', emoji: '🔥' }, { user_id: 'p', emoji: '💪' }, { user_id: 'x' }, { user_id: 'eu', emoji: '❤️' }], pessoas, 'eu')
  assert.deepEqual(l.map((p) => p.user_id), ['eu', 'p', 'a', 'x'])
  assert.equal(l[0].voce, true)
  assert.equal(l[1].personal, true)
  assert.equal(l[3].nome, 'Aluno')
  assert.equal(l[3].emoji, '❤️')
})

test('curtidoPor resume os nomes', async () => {
  const { curtidoPor } = await import('./reacoes.js')
  assert.equal(curtidoPor([]), '')
  assert.equal(curtidoPor([{ nome: 'Ana' }]), 'Curtido por Ana')
  assert.equal(curtidoPor([{ voce: true, nome: 'X' }, { nome: 'Ana' }]), 'Curtido por você e Ana')
  assert.equal(curtidoPor([{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }]), 'Curtido por A, B e mais 1 pessoa')
  assert.equal(curtidoPor([{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }, { nome: 'D' }]), 'Curtido por A, B e mais 2 pessoas')
})
