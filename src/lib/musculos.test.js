import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BIBLIOTECA } from './exercicios.js'
import { cargaPorMusculo, faltouNaSemana, musculosDoExercicio } from './musculos.js'

test('cada exercício acende os músculos certos', () => {
  const m = (n) => musculosDoExercicio(n)
  assert.deepEqual(m('Supino reto com barra'), { principais: ['peito'], secundarios: ['triceps', 'ombro_frontal'], ativo: 'peito', foco: 'Peitoral maior' })
  assert.deepEqual(m('Agachamento livre com barra').principais, ['quadriceps', 'gluteos'])
  assert.deepEqual(m('Tríceps coice com halter').principais, ['triceps'])
  assert.deepEqual(m('Coice na polia (glúteo)').principais, ['gluteo_maximo'])
  assert.deepEqual(m('Supino fechado').principais, ['triceps'])
  assert.deepEqual(m('Remada alta com barra').principais, ['ombro_lateral', 'trapezio_superior'])
  assert.deepEqual(m('Bicicleta ergométrica').principais, []) // cardio: pernas só como secundário
  assert.deepEqual(m('Rosca martelo').principais, ['biceps', 'antebraco'])
  assert.deepEqual(m('Supino do Caiê (variação)').principais, ['peito']) // nome fora da lista
})

test('músculo mais ativo de cada exercício', () => {
  const m = (n) => musculosDoExercicio(n)
  assert.equal(m('Supino inclinado com halteres').foco, 'Peitoral (parte de cima)')
  assert.equal(m('Elevação lateral com halteres').foco, 'Deltoide lateral')
  assert.equal(m('Panturrilha sentado').foco, 'Sóleo')
  assert.equal(m('Agachamento livre com barra').ativo, 'quadriceps')
  assert.equal(m('Supino do Caiê (variação)').foco, 'Peitoral maior')
  assert.equal(m('Bicicleta ergométrica').foco, null) // cardio: sem músculo principal
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

test('cada exercício mostra a região certa do músculo', () => {
  const p = (n) => musculosDoExercicio(n).principais
  assert.deepEqual(p('Elevação lateral com halteres'), ['ombro_lateral'])
  assert.deepEqual(p('Crucifixo inverso na máquina'), ['ombro_posterior'])
  assert.deepEqual(p('Elevação frontal com halteres'), ['ombro_frontal'])
  assert.deepEqual(p('Supino inclinado com halteres'), ['peito_superior'])
  assert.deepEqual(p('Cadeira abdutora'), ['gluteo_medio'])
  assert.deepEqual(p('Abdominal infra'), ['abdomen_inferior'])
  assert.deepEqual(p('Encolhimento com barra'), ['trapezio_superior'])
})

test('regiões somam no músculo delas no mapa da semana', () => {
  const c = cargaPorMusculo(['Desenvolvimento com halteres', 'Elevação lateral com halteres', 'Cadeira abdutora'])
  assert.equal(c.ombro, 2) // frontal + lateral no mesmo exercício contam uma vez
  assert.equal(c.gluteos, 1)
  assert.equal(c.ombro_lateral, undefined)
})
