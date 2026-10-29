import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  GRADE_PADRAO, avisosNovos, codigoDoLink, corDaAula, lembreteMensalidade, limparLinkGrupo, linkCheckinQR,
  montarGrade, ordenarAvisos, placarEquipes, proximaAula,
} from './academia.js'

test('grade da academia: segunda a sexta, horários em ordem', () => {
  const g = montarGrade(GRADE_PADRAO)
  assert.deepEqual(g.dias, [1, 2, 3, 4, 5])
  assert.deepEqual(g.horas, ['07:30', '09:10', '18:10', '19:10', '20:10'])
  const l1810 = g.linhas.find((l) => l.hora === '18:10')
  assert.deepEqual(l1810.celulas.map((c) => c.map((a) => a.nome).join()), ['Jump', 'Aulas variadas', 'Spinning', 'Alongamento', ''])
  // Sábado entra só quando tem aula; hora do banco vem com segundos.
  const comSabado = montarGrade([...GRADE_PADRAO, { id: 'x', dia_semana: 6, hora: '09:00:00', nome: 'Spinning' }])
  assert.deepEqual(comSabado.dias, [1, 2, 3, 4, 5, 6])
  assert.ok(comSabado.horas.includes('09:00'))
})

test('próxima aula: mais tarde hoje, senão nos próximos dias', () => {
  // 29/10/2026 é quinta (dia 4).
  const quinta17h = new Date(2026, 9, 29, 17, 0)
  assert.equal(proximaAula(GRADE_PADRAO, quinta17h).nome, 'Alongamento')
  const quinta21h = new Date(2026, 9, 29, 21, 0)
  const p = proximaAula(GRADE_PADRAO, quinta21h) // sexta não tem: segunda 18:10
  assert.equal(p.nome, 'Jump')
  assert.equal(p.emDias, 4)
  assert.equal(proximaAula([], quinta17h), null)
})

test('a mesma aula tem sempre a mesma cor', () => {
  assert.equal(corDaAula('Pilates'), corDaAula('PILATES'))
})

test('avisos: fixados primeiro e contagem de novos', () => {
  const avisos = [
    { id: 1, fixado: false, created_at: '2026-10-20T10:00:00Z' },
    { id: 2, fixado: true, created_at: '2026-10-01T10:00:00Z' },
    { id: 3, fixado: false, created_at: '2026-10-28T10:00:00Z' },
  ]
  assert.deepEqual(ordenarAvisos(avisos).map((a) => a.id), [2, 3, 1])
  assert.equal(avisosNovos(avisos, null), 3)
  assert.equal(avisosNovos(avisos, '2026-10-21T00:00:00Z'), 1)
})

test('placar das equipes soma os dias de treino de cada membro', () => {
  const equipes = [{ id: 'a', nome: 'Laranja' }, { id: 'b', nome: 'Preta' }]
  const membros = [{ id: 1, equipe_id: 'a' }, { id: 2, equipe_id: 'a' }, { id: 3, equipe_id: 'b' }, { id: 4, equipe_id: null }]
  const checkins = [
    { aluno_id: 1, data: '2026-10-01' }, { aluno_id: 1, data: '2026-10-01' }, { aluno_id: 1, data: '2026-10-02' },
    { aluno_id: 3, data: '2026-10-01' }, { aluno_id: 3, data: '2026-10-02' }, { aluno_id: 3, data: '2026-10-03' },
    { aluno_id: 4, data: '2026-10-01' },
  ]
  const p = placarEquipes(equipes, membros, checkins)
  assert.deepEqual(p.map((e) => [e.nome, e.pontos]), [['Preta', 3], ['Laranja', 2]])
  assert.deepEqual(p[1].membros.map((m) => m.pontos), [2, 0])
})

test('QR code da recepção', () => {
  const link = linkCheckinQR('https://app.com', 'abc123def456')
  assert.equal(link, 'https://app.com/?checkin=abc123def456')
  assert.equal(codigoDoLink(new URL(link).search), 'abc123def456')
  assert.equal(codigoDoLink('?checkin=<script>'), null)
  assert.equal(codigoDoLink(''), null)
})

test('link do grupo sem os parâmetros do WhatsApp', () => {
  assert.equal(limparLinkGrupo('https://chat.whatsapp.com/CV644r1nksrD2zrsOzdOJh?s=cl&p=i&mlu=4'), 'https://chat.whatsapp.com/CV644r1nksrD2zrsOzdOJh')
  assert.equal(limparLinkGrupo('https://evil.com/x'), null)
})

test('lembrete da mensalidade: 2 dias antes, no dia e 3 dias depois', () => {
  assert.equal(lembreteMensalidade(10, '2026-11-08'), 'antes')
  assert.equal(lembreteMensalidade(10, '2026-11-10'), 'hoje')
  assert.equal(lembreteMensalidade(10, '2026-11-13'), 'atrasada')
  assert.equal(lembreteMensalidade(10, '2026-11-11'), null)
  assert.equal(lembreteMensalidade(null, '2026-11-10'), null)
})

test('story: último recorde e textos do card', async () => {
  const { ultimoRecorde, conteudoStory } = await import('./story.js')
  const s = (carga) => [{ carga, reps: 10 }]
  const regs = [
    { exercicio_id: 'a', data: '2026-10-01', series: s(20) },
    { exercicio_id: 'a', data: '2026-10-05', series: s(24) },
    { exercicio_id: 'b', data: '2026-10-03', series: s(40) },
    { exercicio_id: 'b', data: '2026-10-04', series: s(45) },
    { exercicio_id: 'a', data: '2026-10-07', series: s(22) },
  ]
  assert.deepEqual(ultimoRecorde(regs), { exercicio_id: 'a', carga: 24, anterior: 20, data: '2026-10-05' })
  assert.equal(ultimoRecorde([]), null)
  assert.equal(conteudoStory('mes', { mes: 'outubro', treinos: 14, sequencia: 3 }).unidade, 'treinos')
  assert.match(conteudoStory('recorde', { carga: 24, anterior: 20, exercicio: 'Supino' }).unidade, /Supino/)
})
