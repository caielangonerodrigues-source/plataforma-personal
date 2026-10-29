import { test } from 'node:test'
import assert from 'node:assert/strict'
import { avisoOfensiva, ofensiva, resumoSemana } from './semana.js'

// 2026-10-26 é segunda; 2026-10-29 é quinta.
const treinos = ['2026-10-05', '2026-10-07', '2026-10-12', '2026-10-14', '2026-10-15', '2026-10-19', '2026-10-21', '2026-10-27']

test('ofensiva conta semanas seguidas com 2 treinos e soma a atual quando bate', () => {
  const o = ofensiva(treinos, '2026-10-29')
  assert.equal(o.naSemana, 1)
  assert.equal(o.semanas, 3) // semanas de 05, 12 e 19; a atual ainda não bateu
  assert.equal(o.falta, 1)
  assert.equal(o.restantes, 4)
  assert.equal(o.emRisco, false)
  assert.equal(ofensiva([...treinos, '2026-10-29'], '2026-10-29').semanas, 4)
})

test('ofensiva fica em risco perto do domingo e perdida quando não dá mais', () => {
  assert.equal(ofensiva(treinos, '2026-11-01').emRisco, true) // domingo, falta 1
  assert.equal(ofensiva(treinos, '2026-10-31').emRisco, true) // sábado, falta 1, restam 2
  const sem = treinos.filter((d) => d !== '2026-10-27')
  assert.equal(ofensiva(sem, '2026-10-31').emRisco, true) // falta 2, restam 2
  assert.equal(ofensiva(sem, '2026-11-01').perdeu, true)
  assert.equal(ofensiva([], '2026-11-01').emRisco, false) // sem ofensiva não há o que perder
})

test('resumo da semana: melhor semana, comparação e nada quando não treinou', () => {
  const r = resumoSemana([...treinos, '2026-10-20', '2026-10-22'], '2026-10-26', 'Ana')
  assert.equal(r.treinos, 4)
  assert.match(r.corpo, /^Ana, você treinou 4x/)
  assert.match(r.corpo, /melhor semana do mês/)
  assert.match(r.corpo, /3 semanas seguidas/)
  assert.match(resumoSemana(treinos, '2026-10-26').corpo, /dá para fazer mais/) // 2 depois de 3
  assert.match(resumoSemana(treinos.filter((d) => d !== '2026-10-15'), '2026-10-26').corpo, /Mesmo ritmo/)
  assert.equal(resumoSemana(treinos, '2026-11-09'), null)
  assert.match(avisoOfensiva(ofensiva(treinos, '2026-11-01')).corpo, /Falta 1 treino hoje/)
})
