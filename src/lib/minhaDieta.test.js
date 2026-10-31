import test from 'node:test'
import assert from 'node:assert/strict'
import { copiarRefeicao, divisaoMacros, gramasDasPorcoes, lembrarRecente, macrosDoAlimento, metaDoDia, metaPorCalorias, porcoesDosGramas, resumoDoDia } from './minhaDieta.js'

test('meta: a do aluno vence a do plano, que vence a calculada', () => {
  const dieta = { calorias: 2200, proteina: 160, carboidrato: 250, gordura: 60, refeicoes: [] }
  const aluno = { peso: 80, altura: 1.8, sexo: 'M', objetivo: 'hipertrofia' }
  assert.equal(metaDoDia({ propria: { kcal: 1800, proteina: 1, carboidrato: 1, gordura: 1 }, dieta, aluno, idade: 30 }).origem, 'propria')
  assert.equal(metaDoDia({ dieta, aluno, idade: 30 }).kcal, 2200)
  assert.equal(metaDoDia({ dieta: null, aluno, idade: 30 }).origem, 'calculada')
  assert.equal(metaDoDia({ dieta: null, aluno: {}, idade: null }).kcal, 2000)
})

test('meta por calorias divide 25/50/25 e recusa valores absurdos', () => {
  assert.deepEqual(metaPorCalorias(2000), { kcal: 2000, proteina: 125, carboidrato: 250, gordura: 56, pct: { proteina: 25, carboidrato: 50, gordura: 25 } })
  assert.equal(metaPorCalorias(300), null)
})

test('alimento da tabela pelos gramas, fora da tabela pelas calorias digitadas', () => {
  assert.equal(macrosDoAlimento('Arroz branco cozido', 200).kcal, 256)
  assert.deepEqual(macrosDoAlimento('Bolo da vó', null, '350'), { kcal: 350, proteina: 0, carboidrato: 0, gordura: 0 })
  assert.equal(macrosDoAlimento('Bolo da vó', null, ''), null)
})

test('restante = meta − alimentos + exercício', () => {
  const r = resumoDoDia([
    { refeicao: 'cafe', macros: { kcal: 400, proteina: 20, carboidrato: 50, gordura: 10 } },
    { refeicao: 'almoco', macros: { kcal: 700, proteina: 40, carboidrato: 80, gordura: 20 } },
    { refeicao: 'exercicio', macros: { kcal: 300 } },
  ], { kcal: 2000 })
  assert.equal(r.comido.kcal, 1100)
  assert.equal(r.porRefeicao.almoco.kcal, 700)
  assert.equal(r.exercicio, 300)
  assert.equal(r.restante, 1200)
})

test('divisão dos macros em % das calorias', () => {
  assert.deepEqual(divisaoMacros({ proteina: 25, carboidrato: 50, gordura: 0 }), { proteina: 33, carboidrato: 67, gordura: 0 })
  assert.deepEqual(divisaoMacros({ proteina: 0, carboidrato: 0, gordura: 0 }), { proteina: 0, carboidrato: 0, gordura: 0 })
})

test('porções e gramas', () => {
  assert.equal(gramasDasPorcoes('1,5', 100), 150)
  assert.equal(porcoesDosGramas(50, 100), 0.5)
})

test('copiar de ontem e recentes', () => {
  const c = copiarRefeicao([{ id: 1, data: '2026-10-30', refeicao: 'cafe', alimento: 'Ovo cozido', gramas: 100, macros: { kcal: 146 } }, { refeicao: 'jantar', alimento: 'X' }], 'cafe', 'a1', '2026-10-31')
  assert.deepEqual(c, [{ aluno_id: 'a1', data: '2026-10-31', refeicao: 'cafe', alimento: 'Ovo cozido', gramas: 100, macros: { kcal: 146 } }])
  assert.deepEqual(lembrarRecente(['A', 'B', 'C'], 'B'), ['B', 'A', 'C'])
})

test('conta em unidades da medida caseira', async () => {
  const { unidadeDaMedida, textoQuantidade, quantidadeDosGramas } = await import('./minhaDieta.js')
  const ovo = unidadeDaMedida('1 ovo', 50)
  assert.equal(textoQuantidade(3, ovo), '3 ovos')
  assert.equal(quantidadeDosGramas(150, ovo), 3)
  assert.deepEqual(unidadeDaMedida('4 colheres de sopa', 100), { singular: 'colher de sopa', plural: 'colheres de sopa', gramas: 25 })
  assert.equal(textoQuantidade(1, unidadeDaMedida('2 pães', 100)), '1 pão')
  assert.equal(textoQuantidade(1.5, unidadeDaMedida('3 fatias', 60)), '1,5 fatias')
  assert.equal(unidadeDaMedida('a gosto', 10), null)
})

test('meta com % escolhida pelo aluno', async () => {
  const { metaPorCalorias } = await import('./minhaDieta.js')
  assert.deepEqual(metaPorCalorias(2000, { proteina: 30, carboidrato: 40, gordura: 30 }), { kcal: 2000, proteina: 150, carboidrato: 200, gordura: 67, pct: { proteina: 30, carboidrato: 40, gordura: 30 } })
  assert.equal(metaPorCalorias(2000, { proteina: 30, carboidrato: 40, gordura: 20 }), null)
})
