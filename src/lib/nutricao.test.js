import test from 'node:test'
import assert from 'node:assert/strict'
import { macrosDoItem, somarItens, sugerirMetas, taxaBasal, tipoObjetivo, totalDaDieta } from './nutricao.js'
import { BIBLIOTECA, GRUPOS, filtrarExercicios, juntarBiblioteca } from './exercicios.js'

test('taxa basal: Mifflin sem gordura, Katch-McArdle com gordura', () => {
  assert.equal(taxaBasal({ peso: 80, altura: 1.8, idade: 30, sexo: 'M' }), 1780)
  assert.equal(taxaBasal({ peso: 60, altura: 165, idade: 25, sexo: 'F' }), 1345)
  assert.equal(taxaBasal({ peso: 80, gordura: 20 }), 1752)
  assert.equal(taxaBasal({ peso: 80 }), null)
})

test('objetivo escrito vira tipo', () => {
  assert.equal(tipoObjetivo('Emagrecimento'), 'emagrecer')
  assert.equal(tipoObjetivo('Hipertrofia'), 'ganhar')
  assert.equal(tipoObjetivo('Ganho de massa'), 'ganhar')
  assert.equal(tipoObjetivo('Saúde e condicionamento'), 'manter')
})

test('metas fecham as calorias', () => {
  const m = sugerirMetas({ peso: 80, altura: 1.8, idade: 30, sexo: 'M', objetivo: 'emagrecer', atividade: 'moderado' })
  assert.equal(m.gasto, 2759)
  assert.equal(m.calorias, 2210)
  assert.equal(m.proteina, 160)
  assert.ok(Math.abs(m.proteina * 4 + m.carboidrato * 4 + m.gordura * 9 - m.calorias) < 10)
  assert.equal(m.agua, 2.8)
})

test('macros do item pela tabela', () => {
  assert.deepEqual(macrosDoItem('arroz branco cozido', 150), { kcal: 192, proteina: 3.8, carboidrato: 42.2, gordura: 0.3 })
  assert.equal(macrosDoItem('comida desconhecida', 100), null)
  assert.deepEqual(somarItens([{ kcal: 100, proteina: 10 }, { kcal: 50.4, proteina: 2.25, gordura: 1 }]), { kcal: 150, proteina: 12.3, carboidrato: 0, gordura: 1 })
  assert.equal(totalDaDieta([{ itens: [{ kcal: 100 }] }, { itens: [{ kcal: 20 }] }]).kcal, 120)
})

test('biblioteca de exercícios', () => {
  assert.ok(BIBLIOTECA.length > 200)
  assert.ok(BIBLIOTECA.every((e) => GRUPOS.includes(e.grupo)))
  assert.equal(new Set(BIBLIOTECA.map((e) => e.nome)).size, BIBLIOTECA.length, 'nomes repetidos')
  assert.ok(filtrarExercicios(BIBLIOTECA, { busca: 'supino halter' }).every((e) => /Supino/.test(e.nome)))
  assert.ok(filtrarExercicios(BIBLIOTECA, { busca: 'eleVACAO pelvica' }).length >= 3)
  assert.ok(filtrarExercicios(BIBLIOTECA, { grupo: 'Glúteos' }).every((e) => e.grupo === 'Glúteos'))
  const junta = juntarBiblioteca([{ nome: 'Leg press 45°', grupo: 'Quadríceps', video_url: 'https://x' }])
  assert.equal(junta.filter((e) => e.nome === 'Leg press 45°').length, 1)
  assert.equal(junta[0].meu, true)
})

test('modelos de dieta usam só alimentos da tabela e se ajustam à meta', async () => {
  const { MODELOS_DIETA, aplicarModeloDieta, totalDaDieta: total, acharAlimento: achar } = await import('./nutricao.js')
  for (const m of MODELOS_DIETA) {
    for (const r of m.refeicoes) for (const i of r.itens) assert.ok(achar(i.alimento), `${m.nome}: ${i.alimento}`)
    const base = total(aplicarModeloDieta(m, null))
    assert.ok(base.kcal > 1400 && base.kcal < 2800, `${m.nome}: ${base.kcal}`)
    const ajustada = total(aplicarModeloDieta(m, 1600))
    assert.ok(Math.abs(ajustada.kcal - 1600) < 120, `${m.nome} 1600: ${ajustada.kcal}`)
  }
})
