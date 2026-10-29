import test from 'node:test'
import assert from 'node:assert/strict'
import { mmss, segundosDescanso } from './descanso.js'
import { alunosSumidos, diasEntre, mensalidadesAtrasadas } from './atencao.js'
import { atendimentos, inicioDaSemana, proximoAtendimento } from './agenda.js'
import { alternativas, grupoDoExercicio } from './exercicios.js'
import { historicoPorExercicio, ultimaSessao } from './progressao.js'

test('descanso escrito na ficha vira segundos', () => {
  assert.equal(segundosDescanso('60s'), 60)
  assert.equal(segundosDescanso('90 seg'), 90)
  assert.equal(segundosDescanso('1 min'), 60)
  assert.equal(segundosDescanso('2 min'), 120)
  assert.equal(segundosDescanso('1min30'), 90)
  assert.equal(segundosDescanso("1'30"), 90)
  assert.equal(segundosDescanso('1:30'), 90)
  assert.equal(segundosDescanso('2-3 min'), 120)
  assert.equal(segundosDescanso('45-60s'), 45)
  assert.equal(segundosDescanso('1,5 min'), 90)
  assert.equal(segundosDescanso('90'), 90)
  assert.equal(segundosDescanso('2'), 120)
  assert.equal(segundosDescanso(''), 60)
  assert.equal(segundosDescanso(null, 45), 45)
  assert.equal(mmss(75), '1:15')
  assert.equal(mmss(5), '0:05')
})

test('aluno sumido: 7 dias ou mais sem treino ou check-in', () => {
  const alunos = [
    { id: 'a', nome: 'Ana', status: 'ativo', treinos: [{}], inicio: '2026-01-01' },
    { id: 'b', nome: 'Bia', status: 'ativo', treinos: [{}], inicio: '2026-01-01' },
    { id: 'c', nome: 'Caio', status: 'pausado', treinos: [{}], inicio: '2026-01-01' },
    { id: 'd', nome: 'Duda', status: 'ativo', treinos: [], inicio: '2026-01-01' },
    { id: 'e', nome: 'Edu', status: 'ativo', treinos: [{}], inicio: '2026-10-27' },
    { id: 'f', nome: 'Fê', status: 'ativo', treinos: [{}], inicio: '2026-10-01' },
  ]
  const atividades = [{ aluno_id: 'a', data: '2026-10-28' }, { aluno_id: 'b', data: '2026-10-10' }, { aluno_id: 'b', data: '2026-10-20' }]
  const s = alunosSumidos(alunos, atividades, '2026-10-29')
  assert.deepEqual(s.map((x) => [x.aluno.id, x.dias, x.ultimo]), [['f', 28, null], ['b', 9, '2026-10-20']])
  assert.equal(diasEntre('2026-10-01', '2026-11-01'), 31)
})

test('mensalidade atrasada só depois do vencimento e sem pagamento', () => {
  const alunos = [
    { id: 'a', status: 'ativo', valor_mensal: 200, dia_vencimento: 10 },
    { id: 'b', status: 'ativo', valor_mensal: 200, dia_vencimento: 10 },
    { id: 'c', status: 'ativo', valor_mensal: 200, dia_vencimento: 30 },
    { id: 'd', status: 'ativo', valor_mensal: null, dia_vencimento: 5 },
  ]
  assert.deepEqual(mensalidadesAtrasadas(alunos, [{ aluno_id: 'b' }], '2026-10-29').map((a) => a.id), ['a'])
})

test('agenda aplica remarcações e desmarcações', () => {
  const horarios = [{ id: 'h1', aluno_id: 'a', dia_semana: 1, hora: '07:00:00' }, { id: 'h2', aluno_id: 'b', dia_semana: 3, hora: '18:00' }]
  assert.equal(inicioDaSemana('2026-10-29'), '2026-10-26')
  assert.equal(inicioDaSemana('2026-10-26'), '2026-10-26')
  assert.equal(inicioDaSemana('2026-11-01'), '2026-10-26')
  const semana = atendimentos(horarios, [], '2026-10-26', '2026-11-01')
  assert.deepEqual(semana.map((a) => [a.data, a.hora, a.horario.id]), [['2026-10-26', '07:00', 'h1'], ['2026-10-28', '18:00', 'h2']])
  const rem = [
    { horario_id: 'h1', data: '2026-10-26', nova_data: '2026-10-27', nova_hora: '08:30' },
    { horario_id: 'h2', data: '2026-10-28', nova_data: null },
  ]
  const com = atendimentos(horarios, rem, '2026-10-26', '2026-11-01')
  assert.deepEqual(com.map((a) => [a.data, a.hora, !!a.remarcado, !!a.desmarcado]), [['2026-10-27', '08:30', true, false], ['2026-10-28', '18:00', false, true]])
  assert.equal(proximoAtendimento(horarios, rem, '2026-10-28').data, '2026-11-02')
  assert.equal(proximoAtendimento(horarios, [], '2026-10-26', '06:00').data, '2026-10-26')
  assert.equal(proximoAtendimento(horarios, [], '2026-10-26', '07:30').data, '2026-10-28')
})

test('troca de exercício acha o grupo e variações', () => {
  assert.equal(grupoDoExercicio('Supino reto com barra'), 'Peito')
  assert.equal(grupoDoExercicio('supino reto barra'), 'Peito')
  assert.equal(grupoDoExercicio('Exercício inventado'), null)
  const alt = alternativas('Puxada frontal aberta')
  assert.ok(alt.length > 5 && alt.every((e) => e.grupo === 'Costas' && e.nome !== 'Puxada frontal aberta'))
})

test('cargas de um dia com troca não entram na evolução do exercício', () => {
  const regs = [
    { exercicio_id: 'x', data: '2026-10-01', series: [{ carga: 40, reps: 10 }] },
    { exercicio_id: 'x', data: '2026-10-08', series: [{ carga: 20, reps: 10 }], troca: 'Supino com halteres' },
  ]
  assert.equal(historicoPorExercicio(regs).x.length, 1)
  assert.equal(ultimaSessao(regs, 'x', '2026-10-29').data, '2026-10-01')
})

test('números do relatório do mês', async () => {
  const { mesesRecentes, numerosDoMes, fimDoMes, nomeDoMes } = await import('./relatorio.js')
  assert.deepEqual(mesesRecentes('2026-01-15'), ['2026-01', '2025-12', '2025-11'])
  assert.equal(fimDoMes('2026-02'), '2026-02-28')
  assert.equal(nomeDoMes('2026-10'), 'outubro de 2026')
  const treinos = [{ exercicios: [{ id: 'x', nome: 'Agachamento' }, { id: 'y', nome: 'Supino' }] }]
  const registros = [
    { exercicio_id: 'x', data: '2026-09-25', series: [{ carga: 40, reps: 10 }] },
    { exercicio_id: 'x', data: '2026-10-05', series: [{ carga: 45, reps: 10 }] },
    { exercicio_id: 'x', data: '2026-10-20', series: [{ carga: 50, reps: 8 }] },
    { exercicio_id: 'y', data: '2026-10-05', series: [{ carga: 30, reps: 10 }] },
    { exercicio_id: 'y', data: '2026-10-12', series: [{ carga: 10, reps: 10 }], troca: 'Flexão' },
    { exercicio_id: 'x', data: '2026-11-01', series: [{ carga: 60, reps: 8 }] },
  ]
  const n = numerosDoMes({
    mes: '2026-10', treinos, registros,
    checkins: [{ data: '2026-10-05' }, { data: '2026-10-28' }, { data: '2026-09-01' }],
    avaliacoes: [{ data: '2026-08-01', peso: 80, gordura: 20, cintura: 90 }, { data: '2026-10-10', peso: 78.5, gordura: 18, cintura: null }],
    fotos: [{ data: '2026-10-10' }, { data: '2026-10-10' }],
  })
  assert.equal(n.diasTreinados, 4)
  assert.equal(n.checkins, 2)
  assert.equal(n.trocas, 1)
  assert.deepEqual(n.cargas, [{ nome: 'Agachamento', de: 40, para: 50, diferenca: 10 }, { nome: 'Supino', de: 30, para: 30, diferenca: 0 }])
  assert.equal(n.subiram, 1)
  assert.equal(n.avaliacao.peso_dif, -1.5)
  assert.equal(n.avaliacao.cintura_dif, null)
  assert.equal(n.fotos, 2)
})

test('mensagem padrão do relatório', async () => {
  const { mensagemPadrao } = await import('./relatorio.js')
  const n = { mes: '2026-10', diasTreinados: 12, checkins: 1, subiram: 2, cargas: [{ nome: 'Agachamento', de: 40, para: 50, diferenca: 10 }], avaliacao: { noMes: true, anterior: '2026-08-01', peso_dif: -1.5, gordura_dif: null, cintura_dif: 2 } }
  assert.equal(mensagemPadrao('Ana', n), 'Oi, Ana! Seu resumo de outubro de 2026:\n\n• 12 dias de treino e 1 check-in\n• Carga subiu em 2 exercícios (Agachamento: 40 → 50 kg)\n• Avaliação: peso −1,5 kg, cintura +2 cm\n\nBora para mais um mês! 💪')
})
