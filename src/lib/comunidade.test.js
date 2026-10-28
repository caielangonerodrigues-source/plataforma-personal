import { test } from 'node:test'
import assert from 'node:assert/strict'
import { iniciais, nomeCurto, quandoFoi, ranking, sequencia, somarDias } from './comunidade.js'

test('somarDias atravessa mês e ano', () => {
  assert.equal(somarDias('2026-03-01', -1), '2026-02-28')
  assert.equal(somarDias('2026-12-31', 1), '2027-01-01')
})

test('sequência conta a partir de hoje ou de ontem', () => {
  assert.equal(sequencia(['2026-10-28', '2026-10-27', '2026-10-26', '2026-10-24'], '2026-10-28'), 3)
  assert.equal(sequencia(['2026-10-27', '2026-10-26'], '2026-10-28'), 2) // ainda não treinou hoje
  assert.equal(sequencia(['2026-10-26'], '2026-10-28'), 0)
  assert.equal(sequencia(['2026-10-28', '2026-10-28'], '2026-10-28'), 1) // dois check-ins no mesmo dia
})

test('ranking conta dias distintos e desempata pelo nome', () => {
  const membros = [{ id: 'a', nome: 'Rafael' }, { id: 'b', nome: 'Ana' }, { id: 'c', nome: 'Bia' }]
  const checkins = [
    { aluno_id: 'a', data: '2026-10-01' }, { aluno_id: 'a', data: '2026-10-01' },
    { aluno_id: 'b', data: '2026-10-02' }, { aluno_id: 'z', data: '2026-10-02' },
  ]
  assert.deepEqual(ranking(checkins, membros).map((r) => [r.nome, r.dias]), [['Ana', 1], ['Rafael', 1], ['Bia', 0]])
})

test('nomes e tempo relativo', () => {
  assert.equal(nomeCurto('Mariana Costa Silva'), 'Mariana S.')
  assert.equal(nomeCurto('Mariana'), 'Mariana')
  assert.equal(iniciais('mariana costa'), 'MC')
  const agora = new Date('2026-10-28T15:00:00Z').getTime()
  assert.equal(quandoFoi('2026-10-28T14:50:00Z', agora), 'há 10 min')
  assert.equal(quandoFoi('2026-10-28T10:00:00Z', agora), 'há 5 h')
  assert.equal(quandoFoi('2026-10-27T10:00:00Z', agora), 'ontem')
})
