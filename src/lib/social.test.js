import test from 'node:test'
import assert from 'node:assert/strict'
import { conquistasAtuais, conquistasParaPublicar, fmtTempo, lerTempo, montarFeed, recordesDoDia, resumoCardio, resumoCardioLivre, resumoMusculacao, resumoTreino, ritmo, tituloCardioLivre, tituloMusculacao } from './social.js'

const s = (c, r, n = 3) => Array.from({ length: n }, () => ({ carga: c, reps: r }))
const ficha = { nome: 'A', exercicios: [{ id: 'e1', nome: 'Agachamento' }, { id: 'e2', nome: 'Leg press' }, { id: 'e3', nome: 'Extensora' }] }
const registros = [
  { exercicio_id: 'e1', data: '2026-10-20', series: s(30, 10) },
  { exercicio_id: 'e1', data: '2026-10-29', series: s(35, 10) },
  { exercicio_id: 'e2', data: '2026-10-20', series: s(80, 12) },
  { exercicio_id: 'e2', data: '2026-10-29', series: s(80, 12) },
  { exercicio_id: 'e3', data: '2026-10-29', series: s(25, 12) }, // primeira vez: não é recorde
]

test('recordes do dia só quando passa a melhor anterior', () => {
  assert.deepEqual(recordesDoDia(registros, ficha.exercicios, '2026-10-29'), [{ exercicio_id: 'e1', nome: 'Agachamento', carga: 35 }])
})

test('resumo do treino de hoje', () => {
  assert.deepEqual(resumoTreino(ficha, registros, '2026-10-29'), { tipo: 'treino', feitos: 3, total: 3, series: 9, volume: 35 * 30 + 80 * 36 + 25 * 36, recordes: [{ nome: 'Agachamento', carga: 35 }] })
  assert.equal(resumoTreino(ficha, registros, '2026-10-30'), null)
  assert.equal(resumoTreino(null, registros, '2026-10-29'), null)
})

test('tempo, ritmo e card de corrida', () => {
  assert.equal(lerTempo('32:15'), 1935); assert.equal(lerTempo('1:05:30'), 3930); assert.equal(lerTempo('45'), 2700)
  assert.equal(lerTempo('abc'), null); assert.equal(lerTempo('10:75'), null); assert.equal(lerTempo(''), null)
  assert.equal(fmtTempo(1935), '32:15'); assert.equal(fmtTempo(3930), '1h05')
  assert.equal(ritmo('corrida', 5, 1500), '5:00 /km'); assert.equal(ritmo('bike', 30, 3600), '30,0 km/h')
  assert.deepEqual(resumoCardio('corrida', '5,2', '28:30'), { tipo: 'cardio', esporte: 'corrida', km: 5.2, segundos: 1710 })
  assert.equal(resumoCardio('corrida', '0', '28:30'), null); assert.equal(resumoCardio('natação', '1', '28:30'), null)
})

test('conquistas: primeira vez fica escondida, depois só as novas aparecem', () => {
  const atuais = conquistasAtuais([{ id: 'dez', titulo: '10 treinos', icone: '🏋️', descricao: '10 treinos', ganhou: true }, { id: 'cem', ganhou: false }], [{ exercicio_id: 'e1', nome: 'Agachamento', carga: 35 }], '2026-10-29')
  assert.deepEqual(atuais.map((c) => c.chave), ['medalha:dez', 'recorde:e1:2026-10-29'])
  assert.deepEqual(conquistasParaPublicar(atuais, []).map((c) => c.visivel), [false, false])
  const novas = conquistasParaPublicar(atuais, [{ chave: 'medalha:dez' }])
  assert.deepEqual(novas.map((c) => [c.chave, c.visivel]), [['recorde:e1:2026-10-29', true]])
})

test('feed mistura check-ins e conquistas por data', () => {
  const f = montarFeed([{ id: 'c1', created_at: '2026-10-29T10:00' }], [{ id: 'q1', created_at: '2026-10-29T11:00' }])
  assert.deepEqual(f.map((x) => [x.id, x.tipoItem]), [['q1', 'conquista'], ['c1', 'checkin']])
})

test('check-in de musculação guarda grupos e duração', () => {
  assert.deepEqual(resumoMusculacao(['pernas', 'gluteos', 'pernas', 'xx'], '55'), { tipo: 'musculacao', grupos: ['pernas', 'gluteos'], minutos: 55 })
  assert.equal(resumoMusculacao([], '').minutos, null)
  assert.equal(tituloMusculacao(['peito', 'bracos']), 'Musculação · Peito, Braços')
  assert.equal(tituloMusculacao([]), 'Musculação')
})

test('check-in de cardio guarda aparelho e duração', () => {
  assert.deepEqual(resumoCardioLivre('esteira', '30'), { tipo: 'cardio', esporte: 'cardio', aparelho: 'esteira', minutos: 30 })
  assert.equal(resumoCardioLivre('xx', '20').aparelho, null)
  assert.equal(resumoCardioLivre('esteira', ''), null)
  assert.equal(tituloCardioLivre(resumoCardioLivre('eliptico', '25')), 'Cardio · Elíptico · 25 min')
  assert.equal(tituloCardioLivre(resumoCardioLivre(null, '40')), 'Cardio · 40 min')
})
