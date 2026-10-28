import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cargaMaxima, historicoPorExercicio, ultimaSessao, volume } from './progressao.js'

test('carga máxima e volume ignoram valores vazios', () => {
  const s = [{ carga: 30, reps: 12 }, { carga: '35', reps: 10 }, { carga: '', reps: 8 }]
  assert.equal(cargaMaxima(s), 35)
  assert.equal(volume(s), 30 * 12 + 35 * 10)
  assert.equal(cargaMaxima([]), null)
})

test('histórico por exercício em ordem e última sessão antes de hoje', () => {
  const regs = [
    { exercicio_id: 'a', data: '2026-10-20', series: [{ carga: 32, reps: 10 }] },
    { exercicio_id: 'a', data: '2026-10-13', series: [{ carga: 30, reps: 12 }] },
    { exercicio_id: 'a', data: '2026-10-28', series: [{ carga: 34, reps: 8 }] },
    { exercicio_id: 'b', data: '2026-10-20', series: null },
  ]
  const h = historicoPorExercicio(regs)
  assert.deepEqual(h.a.map((x) => x.max), [30, 32, 34])
  assert.equal(h.b, undefined)
  assert.equal(ultimaSessao(regs, 'a', '2026-10-28').data, '2026-10-20')
})
