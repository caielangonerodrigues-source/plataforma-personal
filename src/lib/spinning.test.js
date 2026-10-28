import test from 'node:test'
import assert from 'node:assert/strict'
import { bikesLivres, estadoBike, fileirasBikes, minutosParaPagar, quandoAula, repetirSemanal } from './spinning.js'

test('14 bikes: frente com 1, instrutor e 2, depois fileiras de 3', () => {
  assert.deepEqual(fileirasBikes(14), [[1, 'instrutor', 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14]])
  assert.deepEqual(fileirasBikes(6), [[1, 'instrutor', 2], [3, 4, 5], [6]])
  assert.deepEqual(fileirasBikes(1), [['instrutor', 1]])
})

test('estado da bike: bloqueada vence ocupada, que vence selecionada', () => {
  const ctx = { ocupadas: [2, 3], bloqueadas: [3], selecionada: 4 }
  assert.equal(estadoBike(1, ctx), 'livre')
  assert.equal(estadoBike(2, ctx), 'ocupada')
  assert.equal(estadoBike(3, ctx), 'bloqueada')
  assert.equal(estadoBike(4, ctx), 'selecionada')
  assert.equal(bikesLivres(14, [2, 3], [3, 7]), 11)
})

test('prazo do Pix conta 30 minutos a partir da reserva', () => {
  const criada = '2026-10-28T10:00:00Z'
  assert.equal(minutosParaPagar(criada, '2026-10-28T10:00:00Z'), 30)
  assert.equal(minutosParaPagar(criada, '2026-10-28T10:29:10Z'), 1)
  assert.equal(minutosParaPagar(criada, '2026-10-28T10:45:00Z'), 0)
})

test('repetir semanal mantém o horário', () => {
  const datas = repetirSemanal('2026-11-03T10:00:00.000Z', 2)
  assert.equal(datas.length, 3)
  const horas = datas.map((d) => quandoAula(d).hora)
  assert.ok(horas.every((h) => h === horas[0]))
  assert.equal(new Date(datas[2]) - new Date(datas[0]), 14 * 864e5 + (new Date(datas[2]).getTimezoneOffset() - new Date(datas[0]).getTimezoneOffset()) * 60000)
})
