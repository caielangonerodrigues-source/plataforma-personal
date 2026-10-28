import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcGordura, classificacao, dobrasDo, imc } from './pollock.js'

test('Pollock 7 dobras, homem de 34 anos', () => {
  const r = calcGordura('p7', 'M', 34, { peitoral: 10, axilar: 12, triceps: 11, subescapular: 15, abdominal: 22, suprailiaca: 14, coxa: 15 })
  assert.equal(r.soma, 99)
  assert.ok(Math.abs(r.densidade - 1.06453) < 0.0001)
  assert.ok(Math.abs(r.gordura - 15.0) < 0.05)
})

test('Pollock 3 dobras, mulher de 29 anos', () => {
  const r = calcGordura('p3', 'F', 29, { triceps: 20, suprailiaca: 18, coxa: 28 })
  assert.equal(r.soma, 66)
  assert.ok(Math.abs(r.gordura - 26.0) < 0.05)
})

test('Pollock 3 usa dobras diferentes por sexo', () => {
  assert.deepEqual(dobrasDo('p3', 'M'), ['peitoral', 'abdominal', 'coxa'])
  assert.deepEqual(dobrasDo('p3', 'F'), ['triceps', 'suprailiaca', 'coxa'])
})

test('falta de dobra ou idade não calcula', () => {
  assert.equal(calcGordura('p3', 'F', 29, { triceps: 20, coxa: 28 }), null)
  assert.equal(calcGordura('p3', 'F', null, { triceps: 20, suprailiaca: 18, coxa: 28 }), null)
})

test('classificação e IMC', () => {
  assert.equal(classificacao('F', 25), 'Média')
  assert.equal(classificacao('M', 15), 'Boa forma')
  assert.ok(Math.abs(imc({ peso: 80.1, altura: 1.78 }) - 25.28) < 0.01)
})
