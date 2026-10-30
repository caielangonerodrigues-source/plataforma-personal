import { test } from 'node:test'
import assert from 'node:assert/strict'
import { distancia, naAcademia, nomeDoLugar, NOME_ACADEMIA } from './localizacao.js'

test('distância entre dois pontos em metros', () => {
  const a = { lat: -27.5954, lng: -48.548 }
  assert.equal(Math.round(distancia(a, a)), 0)
  const d = distancia(a, { lat: -27.5954 + 0.001, lng: -48.548 }) // ~111 m
  assert.ok(d > 105 && d < 117, String(d))
})

test('na academia só perto do ponto salvo', () => {
  const academia = { lat: -27.5954, lng: -48.548 }
  assert.equal(naAcademia({ lat: -27.5956, lng: -48.5482 }, academia), true)
  assert.equal(naAcademia({ lat: -27.61, lng: -48.548 }, academia), false)
  assert.equal(naAcademia({ lat: -27.5954, lng: -48.548 }, { lat: null, lng: null }), false)
  assert.equal(naAcademia(null, academia), false)
  assert.equal(NOME_ACADEMIA, 'Corpo Atlético')
})

test('nome do lugar: bairro e cidade', () => {
  assert.equal(nomeDoLugar({ suburb: 'Trindade', city: 'Florianópolis' }), 'Trindade, Florianópolis')
  assert.equal(nomeDoLugar({ town: 'Palhoça' }), 'Palhoça')
  assert.equal(nomeDoLugar({}), null)
  assert.equal(nomeDoLugar(), null)
})
