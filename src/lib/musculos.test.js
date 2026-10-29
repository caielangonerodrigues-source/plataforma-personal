import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BIBLIOTECA } from './exercicios.js'
import { cargaPorMusculo, faltouNaSemana, musculosDoExercicio } from './musculos.js'

test('cada exercício acende os músculos certos', () => {
  const m = (n) => musculosDoExercicio(n)
  assert.deepEqual(m('Supino reto com barra'), { principais: ['peito'], secundarios: ['triceps', 'ombro'] })
  assert.deepEqual(m('Agachamento livre com barra').principais, ['quadriceps', 'gluteos'])
  assert.deepEqual(m('Tríceps coice com halter').principais, ['triceps'])
  assert.deepEqual(m('Coice na polia (glúteo)').principais, ['gluteos'])
  assert.deepEqual(m('Supino fechado').principais, ['triceps'])
  assert.deepEqual(m('Remada alta com barra').principais, ['ombro', 'trapezio'])
  assert.deepEqual(m('Bicicleta ergométrica').principais, []) // cardio: pernas só como secundário
  assert.deepEqual(m('Rosca martelo').principais, ['biceps', 'antebraco'])
  assert.deepEqual(m('Supino do Caiê (variação)').principais, ['peito']) // nome fora da lista
})

test('todo exercício de força da biblioteca tem músculo principal', () => {
  const semMusculo = BIBLIOTECA.filter((e) => !['Cardio', 'Mobilidade e alongamento'].includes(e.grupo) && !musculosDoExercicio(e.nome).principais.length)
  assert.deepEqual(semMusculo.map((e) => e.nome), [])
})

test('mapa da semana soma principais e meio ponto dos secundários', () => {
  const c = cargaPorMusculo(['Supino reto com barra', 'Supino inclinado com halteres', 'Agachamento livre com barra'])
  assert.equal(c.peito, 2)
  assert.equal(c.triceps, 1)
  assert.equal(c.quadriceps, 1)
  assert.deepEqual(faltouNaSemana(c), ['dorsais', 'posterior', 'abdomen']) // ombro: meio ponto de cada supino
})
