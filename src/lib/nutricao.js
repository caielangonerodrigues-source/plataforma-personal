// Nutrição: tabela de alimentos, gasto calórico e metas de macronutrientes.
import { semAcento } from './exercicios.js'

// Valores aproximados por 100 g (base: Tabela TACO/Unicamp e USDA), alimento pronto para comer.
// [nome, kcal, proteína, carboidrato, gordura]
const TABELA = [
  ['Arroz branco cozido', 128, 2.5, 28.1, 0.2], ['Arroz integral cozido', 124, 2.6, 25.8, 1.0], ['Feijão carioca cozido', 76, 4.8, 13.6, 0.5],
  ['Feijão preto cozido', 77, 4.5, 14.0, 0.5], ['Lentilha cozida', 93, 6.3, 16.3, 0.5], ['Grão-de-bico cozido', 164, 8.9, 27.4, 2.6],
  ['Macarrão cozido', 158, 5.8, 30.9, 0.9], ['Batata inglesa cozida', 52, 1.2, 11.9, 0.1], ['Batata doce cozida', 77, 0.6, 18.4, 0.1],
  ['Mandioca cozida', 125, 0.6, 30.1, 0.3], ['Cuscuz de milho cozido', 113, 2.2, 25.3, 0.7], ['Tapioca (goma hidratada)', 240, 0.1, 59.0, 0.1],
  ['Pão francês', 300, 8.0, 58.6, 3.1], ['Pão de forma integral', 253, 9.4, 49.9, 3.7], ['Pão de queijo assado', 363, 5.1, 34.2, 24.6],
  ['Aveia em flocos', 394, 13.9, 66.6, 8.5], ['Granola', 420, 10.0, 65.0, 13.0], ['Peito de frango grelhado', 159, 32.0, 0, 2.5],
  ['Coxa de frango assada', 215, 26.0, 0, 12.0], ['Patinho grelhado', 219, 35.9, 0, 7.3], ['Carne moída refogada', 212, 26.7, 0, 10.9],
  ['Alcatra grelhada', 241, 31.9, 0, 11.6], ['Tilápia grelhada', 128, 26.2, 0, 2.7], ['Salmão grelhado', 206, 22.1, 0, 12.4],
  ['Atum em lata (em água)', 116, 25.5, 0, 0.8], ['Ovo cozido', 146, 13.3, 0.6, 9.5], ['Clara de ovo cozida', 52, 10.9, 0.7, 0.2],
  ['Tofu', 76, 8.1, 1.9, 4.8], ['Leite integral', 61, 2.9, 4.3, 3.2], ['Leite desnatado', 35, 3.4, 5.0, 0.1],
  ['Iogurte natural integral', 51, 4.1, 1.9, 3.0], ['Iogurte grego natural desnatado', 59, 10.2, 3.6, 0.4], ['Queijo minas frescal', 264, 17.4, 3.2, 20.2],
  ['Queijo cottage', 98, 11.1, 3.4, 4.3], ['Whey protein concentrado', 400, 78.0, 8.0, 6.0], ['Banana prata', 98, 1.3, 26.0, 0.1],
  ['Maçã', 56, 0.3, 15.2, 0], ['Mamão papaia', 40, 0.5, 10.4, 0.1], ['Morango', 30, 0.9, 6.8, 0.3], ['Laranja', 37, 1.0, 8.9, 0.1],
  ['Manga', 72, 0.4, 19.4, 0.2], ['Melancia', 33, 0.9, 8.1, 0], ['Uva', 53, 0.7, 13.6, 0.2], ['Abacate', 96, 1.2, 6.0, 8.4],
  ['Açaí (polpa sem açúcar)', 58, 0.8, 6.2, 3.9], ['Brócolis cozido', 25, 2.1, 4.4, 0.5], ['Alface', 11, 1.3, 1.7, 0.2],
  ['Tomate', 15, 1.1, 3.1, 0.2], ['Cenoura crua', 34, 1.3, 7.7, 0.2], ['Abobrinha cozida', 15, 1.1, 3.0, 0.2], ['Chuchu cozido', 19, 0.4, 4.8, 0],
  ['Azeite de oliva', 884, 0, 0, 100], ['Pasta de amendoim', 588, 25.0, 20.0, 50.0], ['Amendoim torrado', 606, 22.5, 18.7, 54.0],
  ['Castanha-do-pará', 643, 14.5, 15.1, 63.5], ['Mel', 309, 0, 84.0, 0], ['Chocolate 70% cacau', 580, 8.0, 43.0, 42.0],
]
export const ALIMENTOS = TABELA.map(([nome, kcal, proteina, carboidrato, gordura]) => ({ nome, kcal, proteina, carboidrato, gordura }))

export const acharAlimento = (nome) => ALIMENTOS.find((a) => semAcento(a.nome) === semAcento(nome))

const r1 = (v) => Math.round(v * 10) / 10

// Macros de um item pelo peso em gramas, se o alimento estiver na tabela.
export function macrosDoItem(alimento, gramas) {
  const a = acharAlimento(alimento)
  const q = Number(gramas)
  if (!a || !q) return null
  const f = q / 100
  return { kcal: Math.round(a.kcal * f), proteina: r1(a.proteina * f), carboidrato: r1(a.carboidrato * f), gordura: r1(a.gordura * f) }
}

export function somarItens(itens) {
  const t = { kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 }
  for (const i of itens) for (const k of Object.keys(t)) t[k] += Number(i[k]) || 0
  return { kcal: Math.round(t.kcal), proteina: r1(t.proteina), carboidrato: r1(t.carboidrato), gordura: r1(t.gordura) }
}

export const totalDaDieta = (refeicoes) => somarItens((refeicoes || []).flatMap((r) => r.itens || []))

export const ATIVIDADE = [
  ['sedentario', 'Sedentário (pouco ou nenhum exercício)', 1.2],
  ['leve', 'Leve (1 a 3 treinos por semana)', 1.375],
  ['moderado', 'Moderado (3 a 5 treinos por semana)', 1.55],
  ['intenso', 'Intenso (6 a 7 treinos por semana)', 1.725],
  ['muito', 'Muito intenso (2 treinos por dia ou trabalho pesado)', 1.9],
]

// Lê o objetivo escrito no cadastro.
export function tipoObjetivo(objetivo) {
  const o = semAcento(objetivo)
  if (/emagre|perder|perda|defini|secar|gordura|reduzir/.test(o)) return 'emagrecer'
  if (/hipertrof|ganh|massa|muscul|crescer|bulk/.test(o)) return 'ganhar'
  return 'manter'
}

// Taxa metabólica basal: Katch-McArdle quando há % de gordura, senão Mifflin-St Jeor.
export function taxaBasal({ peso, altura, idade, sexo, gordura }) {
  if (!peso) return null
  if (gordura) return Math.round(370 + 21.6 * peso * (1 - gordura / 100))
  if (!altura || !idade) return null
  const cm = altura < 3 ? altura * 100 : altura
  return Math.round(10 * peso + 6.25 * cm - 5 * idade + (sexo === 'M' ? 5 : -161))
}

// Sugestão de metas diárias. Ponto de partida para o profissional ajustar.
export function sugerirMetas({ peso, altura, idade, sexo, gordura, objetivo, atividade = 'moderado' }) {
  const tmb = taxaBasal({ peso, altura, idade, sexo, gordura })
  if (!tmb) return null
  const fator = ATIVIDADE.find(([k]) => k === atividade)?.[2] ?? 1.55
  const gasto = Math.round(tmb * fator)
  const tipo = tipoObjetivo(objetivo)
  const calorias = Math.round((tipo === 'emagrecer' ? gasto * 0.8 : tipo === 'ganhar' ? gasto * 1.1 : gasto) / 10) * 10
  const proteina = Math.round(peso * (tipo === 'manter' ? 1.6 : 2.0))
  const gordura_g = Math.round(Math.max(peso * 0.8, (calorias * 0.2) / 9))
  const carboidrato = Math.max(0, Math.round((calorias - proteina * 4 - gordura_g * 9) / 4))
  return { tmb, gasto, tipo, calorias, proteina, carboidrato, gordura: gordura_g, agua: r1((peso * 35) / 1000) }
}

export const REFEICOES_PADRAO = [
  ['Café da manhã', '07:00'], ['Lanche da manhã', '10:00'], ['Almoço', '12:30'], ['Lanche da tarde', '16:00'], ['Jantar', '19:30'], ['Ceia', '22:00'],
].map(([nome, horario]) => ({ nome, horario, itens: [] }))
