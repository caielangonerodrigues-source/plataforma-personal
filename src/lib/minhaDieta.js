// "Monte sua dieta" (estilo MyFitnessPal): o aluno anota o que comeu em cada refeição e vê quanto sobra da meta.
// Restante = Meta − Alimentos + Exercício.
import { acharAlimento, macrosDoItem, somarItens, sugerirMetas } from './nutricao.js'
import { metasDaDieta } from './diario.js'

export const REFEICOES_LIVRES = [['cafe', 'Café da manhã'], ['almoco', 'Almoço'], ['lanches', 'Lanches'], ['jantar', 'Jantar']]

const r1 = (v) => Math.round(v * 10) / 10
const META_PADRAO = { kcal: 2000, proteina: 120, carboidrato: 230, gordura: 65 }

// Meta do dia, nesta ordem: a que o aluno escolheu, a do plano do personal, a calculada pelo peso e altura, ou 2000 kcal.
export function metaDoDia({ propria, dieta, aluno, idade }) {
  if (propria?.kcal) return { ...propria, origem: 'propria' }
  if (dieta) {
    const m = metasDaDieta(dieta)
    if (m.kcal) return { ...m, origem: 'personal' }
  }
  const s = aluno && sugerirMetas({ peso: Number(aluno.peso) || null, altura: Number(aluno.altura) || null, idade, sexo: aluno.sexo, objetivo: aluno.objetivo })
  if (s) return { kcal: s.calorias, proteina: s.proteina, carboidrato: s.carboidrato, gordura: s.gordura, origem: 'calculada' }
  return { ...META_PADRAO, origem: 'padrao' }
}

// Meta só de calorias: proteína, carbo e gordura saem na proporção 25% / 50% / 25%.
export function metaPorCalorias(kcal) {
  const k = Math.round(Number(kcal) || 0)
  if (k < 800 || k > 6000) return null
  return { kcal: k, proteina: Math.round((k * 0.25) / 4), carboidrato: Math.round((k * 0.5) / 4), gordura: Math.round((k * 0.25) / 9) }
}

// Macros de um alimento pela quantidade. Fora da tabela: só as calorias que o aluno digitou.
export function macrosDoAlimento(nome, gramas, kcalManual) {
  if (acharAlimento(nome)) return macrosDoItem(nome, gramas)
  const k = Math.round(Number(kcalManual) || 0)
  return k > 0 ? { kcal: k, proteina: 0, carboidrato: 0, gordura: 0 } : null
}

// Totais do dia: por refeição, comido no dia todo, exercício e quanto ainda resta.
export function resumoDoDia(registros, meta) {
  const comida = (registros || []).filter((r) => r.refeicao !== 'exercicio')
  const porRefeicao = Object.fromEntries(REFEICOES_LIVRES.map(([k]) => [k, somarItens(comida.filter((r) => r.refeicao === k).map((r) => r.macros || {}))]))
  const comido = somarItens(comida.map((r) => r.macros || {}))
  const exercicio = Math.round((registros || []).filter((r) => r.refeicao === 'exercicio').reduce((t, r) => t + (Number(r.macros?.kcal) || 0), 0))
  const restante = Math.round(meta.kcal - comido.kcal + exercicio)
  return { porRefeicao, comido, exercicio, restante }
}

// Parte de cada macro nas calorias do dia (para a pizza de P/C/G).
export function divisaoMacros(t) {
  const p = t.proteina * 4, c = t.carboidrato * 4, g = t.gordura * 9
  const total = p + c + g
  if (!total) return { proteina: 0, carboidrato: 0, gordura: 0 }
  return { proteina: Math.round((p / total) * 100), carboidrato: Math.round((c / total) * 100), gordura: Math.round((g / total) * 100) }
}

// Unidade da medida caseira, para contar em unidades em vez de gramas ("3 ovos", "2 fatias", "4 colheres de sopa").
// "2 ovos" (110 g) vira { singular: 'ovo', plural: 'ovos', gramas: 55 }.
const singularDe = (w) => (/(r|z)es$/.test(w) ? w.slice(0, -2) : /(ões|ães)$/.test(w) ? `${w.slice(0, -3)}ão` : w.replace(/s$/, ''))
const PLURAIS = { pão: 'pães' }
const pluralDe = (w) => PLURAIS[w] || (/[rz]$/.test(w) ? `${w}es` : /ão$/.test(w) ? `${w.slice(0, -2)}ões` : /[aeiouáéíóúâêô]$/.test(w) ? `${w}s` : w)
const mudarAteDe = (texto, f) => { let parou = false; return texto.split(' ').map((w) => { if (w === 'de' || w === 'da' || w === 'do') parou = true; return parou ? w : f(w) }).join(' ') }
export function unidadeDaMedida(medida, gramas) {
  const m = String(medida || '').trim().match(/^(½|\d+\/\d+|\d+(?:[.,]\d+)?)\s+(.+)$/)
  if (!m || !gramas) return null
  const n = m[1] === '½' ? 0.5 : m[1].includes('/') ? Number(m[1].split('/')[0]) / Number(m[1].split('/')[1]) : Number(m[1].replace(',', '.'))
  if (!n) return null
  const singular = n > 1 ? mudarAteDe(m[2], singularDe) : m[2]
  return { singular, plural: mudarAteDe(singular, pluralDe), gramas: r1(gramas / n) }
}
const fmtQtd = (q) => String(r1(q)).replace('.', ',')
export const textoQuantidade = (q, u) => `${fmtQtd(q)} ${q > 0 && q <= 1 ? u.singular : u.plural}`
// "3 ovos" a partir dos gramas gravados, quando dá um número redondo (múltiplo de ½).
export function quantidadeDosGramas(gramas, u) {
  if (!u || !gramas) return null
  const q = gramas / u.gramas
  return Math.abs(q * 2 - Math.round(q * 2)) < 0.05 && q >= 0.5 ? Math.round(q * 2) / 2 : null
}

// Gramas a partir das porções (medida caseira) e vice-versa.
export const gramasDasPorcoes = (porcoes, gramasDaMedida) => r1((Number(String(porcoes).replace(',', '.')) || 0) * gramasDaMedida)
export const porcoesDosGramas = (gramas, gramasDaMedida) => (gramasDaMedida ? r1((Number(gramas) || 0) / gramasDaMedida) : 0)

// Itens de uma refeição de outro dia, prontos para gravar em outra data ("Copiar de ontem").
export const copiarRefeicao = (registros, refeicao, alunoId, data) =>
  (registros || []).filter((r) => r.refeicao === refeicao).map(({ alimento, gramas, macros }) => ({ aluno_id: alunoId, data, refeicao, alimento, gramas, macros }))

// Últimos alimentos usados, sem repetir, do mais novo para o mais velho.
export function lembrarRecente(lista, nome, maximo = 12) {
  return [nome, ...(lista || []).filter((n) => n !== nome)].slice(0, maximo)
}
