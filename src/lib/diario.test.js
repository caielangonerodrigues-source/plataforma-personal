import test from 'node:test'
import assert from 'node:assert/strict'
import { consumoDoDia, consumoPrevisto, faltando, metasDaDieta, situacaoDoDia, sugestoes } from './diario.js'

const dieta = {
  calorias: 2000, proteina: 150, carboidrato: 200, gordura: 60,
  refeicoes: [
    { nome: 'Café', itens: [{ alimento: 'Ovo cozido', gramas: 100 }, { alimento: 'Pão francês', gramas: 50 }] },
    { nome: 'Almoço', itens: [{ alimento: 'Arroz branco cozido', gramas: 150 }, { alimento: 'Peito de frango grelhado', gramas: 150 }] },
  ],
}

test('consumo soma as refeições marcadas e os extras', () => {
  const c = consumoDoDia(dieta, [{ refeicao: 0 }, { alimento: 'Banana', macros: { kcal: 98, proteina: 1.3, carboidrato: 26, gordura: 0.1 } }])
  assert.equal(c.kcal, 146 + 150 + 98)
  assert.equal(c.proteina, 13.3 + 4 + 1.3)
})

test('faltando usa as metas do personal', () => {
  const f = faltando(metasDaDieta(dieta), { kcal: 500, proteina: 50, carboidrato: 50, gordura: 20 })
  assert.deepEqual(f, { kcal: 1500, proteina: 100, carboidrato: 150, gordura: 40 })
})

test('sem metas escritas, usa a soma do plano', () => {
  const m = metasDaDieta({ refeicoes: dieta.refeicoes })
  assert.ok(m.proteina > 60 && m.proteina < 70)
})

test('sugestões cobrem o macro que falta sem estourar as calorias', () => {
  const s = sugestoes({ kcal: 400, proteina: 30, carboidrato: 5, gordura: 2 })
  assert.equal(s.length, 1)
  assert.equal(s[0].macro, 'proteina')
  assert.ok(s[0].macros.proteina >= 15)
  assert.ok(s[0].macros.kcal <= 480)
  assert.match(s[0].texto, /Faltam 30 g de proteína/)
})

test('sem nada faltando, sem sugestões', () => {
  assert.deepEqual(sugestoes({ kcal: 50, proteina: 5, carboidrato: 10, gordura: 2 }), [])
})

test('situação do dia', () => {
  assert.equal(situacaoDoDia({ kcal: -300, proteina: 0, carboidrato: 0, gordura: 0 }, 3, 5).tipo, 'passou')
  assert.equal(situacaoDoDia({ kcal: 20, proteina: 4, carboidrato: 10, gordura: 1 }, 5, 5).tipo, 'bateu')
  assert.equal(situacaoDoDia({ kcal: 400, proteina: 30, carboidrato: 40, gordura: 10 }, 5, 5).tipo, 'faltou')
  assert.equal(situacaoDoDia({ kcal: 800, proteina: 60, carboidrato: 90, gordura: 20 }, 2, 5), null)
})

test('previsto conta as refeições do plano que faltam marcar', () => {
  const p = consumoPrevisto(dieta, [{ refeicao: 0 }])
  assert.equal(p.kcal, consumoDoDia(dieta, [{ refeicao: 0 }, { refeicao: 1 }]).kcal)
})

test('duas porções usam o plural certo', () => {
  const s = sugestoes({ kcal: 900, proteina: 60, carboidrato: 0, gordura: 0 })
  assert.doesNotMatch(s[0].texto, /2×/)
})
