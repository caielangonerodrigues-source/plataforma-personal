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

test('faixa ideal, peso ideal e resultado para a idade', async () => {
  const { faixaIdeal, pesoIdeal, resultadoGordura } = await import('./pollock.js')
  const f = faixaIdeal('M', 58)
  assert.deepEqual(f, { min: 19, max: 22 })
  const p = pesoIdeal({ peso: 91.5, gordura: 23.23 }, f)
  assert.ok(Math.abs(p.min - 86.77) < 0.05 && Math.abs(p.max - 90.07) < 0.05)
  assert.equal(resultadoGordura(23.23, f), 'Na média')
  assert.equal(resultadoGordura(20, f), 'Ideal')
  assert.equal(resultadoGordura(30, f), 'Acima da média')
  assert.equal(faixaIdeal('M', null), null)
})

test('idade pela data de nascimento ou pelo cadastro', async () => {
  const { idadeDoAluno } = await import('./pollock.js')
  assert.equal(idadeDoAluno({ data_nascimento: '1968-11-02' }, '2026-10-30'), 57)
  assert.equal(idadeDoAluno({ data_nascimento: '1968-10-30' }, '2026-10-30'), 58)
  assert.equal(idadeDoAluno({ idade: 37 }, '2026-10-30'), 37)
})
