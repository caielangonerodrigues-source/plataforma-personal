import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fotosDaTurma, iniciais, nomeCurto, quandoFoi, ranking, sequencia, somarDias } from './comunidade.js'

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

test('fotos da turma: só com foto e de membro, conta novas sem as minhas', () => {
  const agora = new Date('2026-10-31T12:00:00Z').getTime()
  const feed = [
    { id: 1, aluno_id: 'a', foto: 'f1', created_at: '2026-10-31T11:00:00Z' },
    { id: 2, aluno_id: 'eu', foto: 'f2', created_at: '2026-10-31T10:00:00Z' },
    { id: 3, aluno_id: 'a', foto: null, created_at: '2026-10-31T09:00:00Z' },
    { id: 4, aluno_id: 'fora', foto: 'f4', created_at: '2026-10-31T08:00:00Z' }, // saiu da comunidade
    { id: 5, personal_id: 'p', foto: 'f5', created_at: '2026-10-29T08:00:00Z' },
  ]
  const fotos = { f1: 'u1', f2: 'u2', f4: 'u4', f5: 'u5' }
  const membros = [{ id: 'a' }, { id: 'eu' }]
  const r = fotosDaTurma(feed, membros, fotos, null, 'eu', agora)
  assert.deepEqual(r.lista.map((c) => c.id), [1, 2, 5])
  assert.equal(r.novas, 1) // a de 2 dias atrás e a minha não contam
  assert.equal(r.ultima, '2026-10-31T11:00:00Z')
  assert.equal(fotosDaTurma(feed, membros, fotos, '2026-10-28T00:00:00Z', 'eu', agora).novas, 2)
  assert.equal(fotosDaTurma([], membros, fotos, null, 'eu', agora).ultima, null)
})
