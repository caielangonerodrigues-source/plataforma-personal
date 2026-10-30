import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blocosDeMetodo, nomeMetodo } from './metodos.js'

test('bi-set junta de 2 em 2 e série gigante junta todos os seguidos', () => {
  const ex = (metodo) => ({ metodo })
  const b = blocosDeMetodo([ex('biset'), ex('biset'), ex('biset'), ex('biset'), ex(null), ex('drop_set'), ex('gigante'), ex('gigante'), ex('gigante'), ex('gigante')])
  assert.deepEqual(b.slice(0, 4).map((x) => `${x.indice}/${x.total}`), ['1/2', '2/2', '1/2', '2/2'])
  assert.equal(b[4], null) // sem método
  assert.equal(b[5], null) // drop set não junta exercícios
  assert.deepEqual(b.slice(6).map((x) => x.indice), [1, 2, 3, 4])
  assert.equal(blocosDeMetodo([ex('triset'), ex(null)])[0], null) // tri-set sozinho não forma bloco
  assert.equal(nomeMetodo('rest_pause'), 'Rest-pause')
  assert.equal(nomeMetodo('xyz'), '')
})
