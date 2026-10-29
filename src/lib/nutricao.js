// Nutrição: tabela de alimentos, gasto calórico e metas de macronutrientes.
import { semAcento } from './exercicios.js'
import { TABELA_ALIMENTOS } from './alimentos.js'

// Lista completa em src/lib/alimentos.js (por grupo, com medida caseira).
export { CATEGORIAS_ALIMENTOS } from './alimentos.js'
export const ALIMENTOS = TABELA_ALIMENTOS

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

// Modelos prontos de dieta (base entre 1500 e 2600 kcal). Ao aplicar, os gramas são ajustados para a meta de calorias do aluno.
const it = (alimento, gramas, quantidade = '') => ({ alimento, gramas, quantidade })
export const MODELOS_DIETA = [
  { chave: 'emagrecer', nome: 'Emagrecimento', descricao: 'Mais proteína e saciedade, carboidrato moderado.', refeicoes: [
    { nome: 'Café da manhã', horario: '07:00', itens: [it('Ovo cozido', 100, '2 ovos'), it('Pão de forma integral', 50, '2 fatias'), it('Mamão papaia', 150, '1 fatia')] },
    { nome: 'Lanche da manhã', horario: '10:00', itens: [it('Iogurte grego natural desnatado', 170, '1 pote'), it('Morango', 100, '1 xícara')] },
    { nome: 'Almoço', horario: '12:30', itens: [it('Arroz integral cozido', 120, '4 colheres'), it('Feijão carioca cozido', 100, '1 concha'), it('Peito de frango grelhado', 150, '1 filé'), it('Alface', 50, 'à vontade'), it('Azeite de oliva', 5, '1 colher de chá')] },
    { nome: 'Lanche da tarde', horario: '16:00', itens: [it('Whey protein concentrado', 30, '1 scoop'), it('Banana prata', 100, '1 banana')] },
    { nome: 'Jantar', horario: '19:30', itens: [it('Tilápia grelhada', 150, '1 filé'), it('Batata doce cozida', 120, '1 pequena'), it('Brócolis cozido', 100, '1 xícara')] },
    { nome: 'Ceia', horario: '22:00', itens: [it('Queijo cottage', 100, '4 colheres')] },
  ] },
  { chave: 'hipertrofia', nome: 'Hipertrofia', descricao: 'Mais carboidrato para treinar pesado e proteína em todas as refeições.', refeicoes: [
    { nome: 'Café da manhã', horario: '07:00', itens: [it('Ovo cozido', 150, '3 ovos'), it('Pão francês', 50, '1 pão'), it('Aveia em flocos', 40, '4 colheres'), it('Banana prata', 100, '1 banana')] },
    { nome: 'Lanche da manhã', horario: '10:00', itens: [it('Iogurte natural integral', 170, '1 pote'), it('Granola', 30, '3 colheres')] },
    { nome: 'Almoço', horario: '12:30', itens: [it('Arroz branco cozido', 200, '6 colheres'), it('Feijão carioca cozido', 140, '1 concha cheia'), it('Patinho grelhado', 150, '1 bife'), it('Tomate', 80, 'salada'), it('Azeite de oliva', 10, '1 colher')] },
    { nome: 'Pré-treino', horario: '16:00', itens: [it('Tapioca (goma hidratada)', 60, '1 tapioca'), it('Queijo minas frescal', 30, '1 fatia'), it('Mel', 15, '1 colher')] },
    { nome: 'Pós-treino', horario: '18:30', itens: [it('Whey protein concentrado', 30, '1 scoop'), it('Banana prata', 100, '1 banana')] },
    { nome: 'Jantar', horario: '20:00', itens: [it('Macarrão cozido', 150, '1 prato raso'), it('Carne moída refogada', 120, '4 colheres'), it('Abobrinha cozida', 100, '1 xícara')] },
  ] },
  { chave: 'manter', nome: 'Equilibrada', descricao: 'Para manter o peso com comida do dia a dia.', refeicoes: [
    { nome: 'Café da manhã', horario: '07:00', itens: [it('Pão francês', 50, '1 pão'), it('Ovo cozido', 50, '1 ovo'), it('Leite integral', 200, '1 copo'), it('Maçã', 130, '1 maçã')] },
    { nome: 'Almoço', horario: '12:30', itens: [it('Arroz branco cozido', 150, '5 colheres'), it('Feijão preto cozido', 100, '1 concha'), it('Coxa de frango assada', 120, '1 coxa'), it('Cenoura crua', 50, 'salada'), it('Azeite de oliva', 5, '1 colher de chá')] },
    { nome: 'Lanche da tarde', horario: '16:00', itens: [it('Iogurte natural integral', 170, '1 pote'), it('Aveia em flocos', 20, '2 colheres'), it('Banana prata', 100, '1 banana')] },
    { nome: 'Jantar', horario: '19:30', itens: [it('Batata inglesa cozida', 150, '1 média'), it('Alcatra grelhada', 120, '1 bife'), it('Chuchu cozido', 100, '1 xícara')] },
    { nome: 'Ceia', horario: '22:00', itens: [it('Castanha-do-pará', 10, '2 castanhas')] },
  ] },
  { chave: 'lowcarb', nome: 'Low carb', descricao: 'Pouco carboidrato, mais gordura boa e proteína.', refeicoes: [
    { nome: 'Café da manhã', horario: '07:00', itens: [it('Ovo cozido', 150, '3 ovos'), it('Queijo minas frescal', 30, '1 fatia'), it('Abacate', 100, '½ abacate')] },
    { nome: 'Almoço', horario: '12:30', itens: [it('Salmão grelhado', 150, '1 posta'), it('Brócolis cozido', 150, '1 xícara e meia'), it('Alface', 50, 'à vontade'), it('Azeite de oliva', 10, '1 colher')] },
    { nome: 'Lanche da tarde', horario: '16:00', itens: [it('Iogurte grego natural desnatado', 170, '1 pote'), it('Amendoim torrado', 20, '1 punhado')] },
    { nome: 'Jantar', horario: '19:30', itens: [it('Peito de frango grelhado', 150, '1 filé'), it('Abobrinha cozida', 150, '1 xícara e meia'), it('Azeite de oliva', 10, '1 colher')] },
    { nome: 'Ceia', horario: '22:00', itens: [it('Pasta de amendoim', 15, '1 colher')] },
  ] },
  { chave: 'vegetariana', nome: 'Vegetariana', descricao: 'Sem carne, com ovos, laticínios e leguminosas.', refeicoes: [
    { nome: 'Café da manhã', horario: '07:00', itens: [it('Ovo cozido', 100, '2 ovos'), it('Pão de forma integral', 50, '2 fatias'), it('Leite integral', 200, '1 copo')] },
    { nome: 'Almoço', horario: '12:30', itens: [it('Arroz integral cozido', 150, '5 colheres'), it('Lentilha cozida', 150, '1 concha cheia'), it('Tofu', 100, '4 cubos grandes'), it('Tomate', 80, 'salada'), it('Azeite de oliva', 5, '1 colher de chá')] },
    { nome: 'Lanche da tarde', horario: '16:00', itens: [it('Iogurte grego natural desnatado', 170, '1 pote'), it('Granola', 30, '3 colheres')] },
    { nome: 'Jantar', horario: '19:30', itens: [it('Grão-de-bico cozido', 120, '4 colheres'), it('Queijo cottage', 100, '4 colheres'), it('Batata doce cozida', 120, '1 pequena'), it('Brócolis cozido', 100, '1 xícara')] },
    { nome: 'Ceia', horario: '22:00', itens: [it('Castanha-do-pará', 10, '2 castanhas')] },
  ] },
]

// Monta as refeições de um modelo para a meta de calorias (gramas de 5 em 5, com os macros de cada item).
export function aplicarModeloDieta(modelo, calorias) {
  const base = totalDaDieta(modelo.refeicoes.map((r) => ({ itens: r.itens.map((i) => macrosDoItem(i.alimento, i.gramas)) })))
  const fator = calorias && base.kcal ? Math.min(1.8, Math.max(0.6, calorias / base.kcal)) : 1
  return modelo.refeicoes.map((r) => ({
    nome: r.nome, horario: r.horario,
    itens: r.itens.map((i) => {
      const gramas = Math.max(5, Math.round((i.gramas * fator) / 5) * 5)
      return { alimento: i.alimento, quantidade: fator === 1 ? i.quantidade : '', gramas, ...macrosDoItem(i.alimento, gramas) }
    }),
  }))
}
