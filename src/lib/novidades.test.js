import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estatisticas, medalhas, proximaMedalha, recordes, semanasSeguidas } from './medalhas.js'
import { fichasParaTrocar, inicioDaFicha, situacaoFicha } from './ficha.js'

const d = (n) => `2026-10-${String(n).padStart(2, '0')}`

test('semanas seguidas com 3 treinos ou mais', () => {
  // 05/10 é segunda. Semanas de 05, 12 e 26 (a de 19 tem só 2 dias).
  const datas = [5, 6, 7, 12, 14, 16, 19, 20, 26, 27, 28].map(d)
  assert.equal(semanasSeguidas(datas, 3), 2)
  assert.equal(semanasSeguidas([], 3), 0)
})

test('recordes contam só quando a carga passa a melhor anterior', () => {
  const s = (carga) => [{ carga, reps: 10 }]
  const regs = [
    { exercicio_id: 'a', data: d(1), series: s(20) },
    { exercicio_id: 'a', data: d(3), series: s(22) },
    { exercicio_id: 'a', data: d(5), series: s(21) },
    { exercicio_id: 'a', data: d(7), series: s(25), troca: 'Leg press' },
    { exercicio_id: 'a', data: d(9), series: s(24) },
    { exercicio_id: 'b', data: d(2), series: s(10) },
  ]
  assert.equal(recordes(regs), 2)
})

test('estatísticas juntam check-ins e treinos marcados', () => {
  const st = estatisticas({ datas: [d(10), d(11)], registros: [{ exercicio_id: 'a', data: d(11) }, { exercicio_id: 'a', data: d(17) }], avaliacoes: 2 })
  assert.equal(st.total, 3)
  assert.equal(st.maiorSequencia, 2)
  assert.equal(st.fimDeSemana, 3) // 10 (sábado), 11 (domingo) e 17 (sábado)
  assert.equal(st.avaliacoes, 2)
})

test('medalhas mostram progresso e a próxima', () => {
  const datas = Array.from({ length: 8 }, (_, i) => d(i + 1))
  const lista = medalhas({ datas }, [])
  const m = Object.fromEntries(lista.map((x) => [x.id, x]))
  assert.equal(m.semana.ganhou, true)
  assert.equal(m.dez.ganhou, false)
  assert.equal(m.dez.valor, 8)
  assert.equal(proximaMedalha(lista).id, 'dez')
  assert.ok(lista.length >= 20)
})

test('idade da ficha e quem precisa trocar', () => {
  const hoje = '2026-10-29'
  const ficha = (criada, extra = {}) => ({ id: criada, status: 'ativo', treinos: [{ created_at: `${criada}T10:00:00Z` }], ...extra })
  assert.equal(inicioDaFicha(ficha('2026-09-01', { ficha_renovada_em: '2026-10-01' })), '2026-10-01')
  assert.equal(situacaoFicha(ficha('2026-09-10'), hoje, 6).vencida, true)
  assert.equal(situacaoFicha({ treinos: [] }, hoje), null)
  const lista = fichasParaTrocar([
    ficha('2026-09-10'),                    // 49 dias: vencida
    ficha('2026-09-20'),                    // 39 dias: vence em 3
    ficha('2026-10-20'),                    // nova
    ficha('2026-08-01', { status: 'pausado' }),
    ficha('2026-08-02'),                    // tem fase programada
  ], hoje, 6, new Set(['2026-08-02']))
  assert.deepEqual(lista.map((x) => x.aluno.id), ['2026-09-10', '2026-09-20'])
  assert.equal(lista[1].faltam, 3)
})
