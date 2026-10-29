import test from 'node:test'
import assert from 'node:assert/strict'
import { minhasDatas, situacaoFicha } from './ficha.js'

test('datas do aluno: avaliação, reavaliação e troca de ficha', () => {
  const situacao = situacaoFicha({ treinos: [{ created_at: '2026-10-01T10:00:00Z' }] }, '2026-10-29', 6)
  const d = minhasDatas({ ultimaAvaliacao: '2026-09-15', situacao, hoje: '2026-10-29' })
  assert.deepEqual(d.avaliacao, { data: '2026-09-15', ha: 44 })
  assert.deepEqual(d.reavaliacao, { data: '2026-11-14', em: 16 })
  assert.deepEqual(d.troca, { data: '2026-11-12', em: 14 })
})

test('fase programada manda na troca; sem avaliação, sem reavaliação', () => {
  const d = minhasDatas({ ultimaAvaliacao: null, situacao: null, proximaFase: { nome: 'Fase 2', inicio: '2026-11-23' }, hoje: '2026-10-29' })
  assert.equal(d.avaliacao, null)
  assert.equal(d.reavaliacao, null)
  assert.deepEqual(d.troca, { data: '2026-11-23', em: 25, fase: 'Fase 2' })
})

test('reavaliação atrasada fica negativa', () => {
  assert.equal(minhasDatas({ ultimaAvaliacao: '2026-07-01', hoje: '2026-10-29' }).reavaliacao.em, -60)
})
