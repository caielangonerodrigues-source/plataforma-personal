// Diário da dieta: quanto o aluno já comeu hoje, quanto falta para as metas e o que dá para comer para fechar.
import { acharAlimento, macrosDoItem, somarItens } from './nutricao.js'

const r1 = (v) => Math.round(v * 10) / 10
export const MACROS = [['kcal', 'Calorias', 'kcal'], ['proteina', 'Proteína', 'g'], ['carboidrato', 'Carboidrato', 'g'], ['gordura', 'Gordura', 'g']]

// Macros de um item do plano: os gravados pelo personal ou, se faltarem, calculados pela tabela.
const doItem = (i) => (i.proteina != null ? i : macrosDoItem(i.alimento, i.gramas) || { kcal: Number(i.kcal) || 0 })

// Metas do dia: as que o personal escreveu ou, sem elas, a soma do plano.
export function metasDaDieta(dieta) {
  const total = somarItens((dieta?.refeicoes || []).flatMap((r) => (r.itens || []).map(doItem)))
  return { kcal: dieta?.calorias ?? total.kcal, proteina: dieta?.proteina ?? total.proteina, carboidrato: dieta?.carboidrato ?? total.carboidrato, gordura: dieta?.gordura ?? total.gordura }
}

// Refeições do plano marcadas (pelos itens do plano) + extras que o aluno anotou.
export function consumoDoDia(dieta, diario) {
  const refeicoes = dieta?.refeicoes || []
  const itens = []
  for (const d of diario || []) {
    if (d.refeicao != null && Array.isArray(d.itens)) itens.push(...d.itens.map(doItem)) // o aluno editou o que comeu
    else if (d.refeicao != null && d.macros) itens.push(d.macros) // editou, sem a coluna itens no banco
    else if (d.refeicao != null) itens.push(...(refeicoes[d.refeicao]?.itens || []).map(doItem))
    else if (d.macros) itens.push(d.macros)
  }
  return somarItens(itens)
}

// Quanto falta de cada macro (negativo = passou).
export function faltando(metas, consumo) {
  return Object.fromEntries(MACROS.map(([k]) => [k, metas[k] ? r1(metas[k] - (consumo[k] || 0)) : null]))
}

// Porções caseiras para sugerir, por macro que está faltando.
const PORCOES = {
  proteina: [['Iogurte grego natural desnatado', 170, '1 pote de iogurte grego', '2 potes de iogurte grego'], ['Whey protein concentrado', 30, '1 scoop de whey', '2 scoops de whey'],
    ['Ovo cozido', 100, '2 ovos cozidos', '4 ovos cozidos'], ['Atum em lata (em água)', 120, '1 lata de atum', '2 latas de atum'],
    ['Peito de frango grelhado', 100, '1 filé de frango', '2 filés de frango'], ['Queijo cottage', 100, '4 colheres de cottage', '8 colheres de cottage']],
  carboidrato: [['Banana prata', 100, '1 banana', '2 bananas'], ['Tapioca (goma hidratada)', 50, '1 tapioca pequena', '2 tapiocas pequenas'], ['Pão francês', 50, '1 pão francês', '2 pães franceses'],
    ['Aveia em flocos', 30, '3 colheres de aveia', '6 colheres de aveia'], ['Batata doce cozida', 150, '1 batata-doce média', '2 batatas-doces médias'], ['Mel', 20, '1 colher de mel', '2 colheres de mel']],
  gordura: [['Pasta de amendoim', 15, '1 colher de pasta de amendoim', '2 colheres de pasta de amendoim'], ['Castanha-do-pará', 10, '2 castanhas-do-pará', '4 castanhas-do-pará'],
    ['Abacate', 100, '½ abacate pequeno', '1 abacate pequeno'], ['Azeite de oliva', 10, '1 colher de azeite na salada', '2 colheres de azeite na salada']],
}
const MINIMO = { proteina: 10, carboidrato: 20, gordura: 6 } // abaixo disso já está bom
const NOME = { proteina: 'proteína', carboidrato: 'carboidrato', gordura: 'gordura' }

// Consumo previsto se o aluno fizer também as refeições do plano que ainda não marcou.
export function consumoPrevisto(dieta, diario) {
  const marcadas = new Set((diario || []).filter((d) => d.refeicao != null).map((d) => d.refeicao))
  const faltam = (dieta?.refeicoes || []).map((r, i) => i).filter((i) => !marcadas.has(i) && dieta.refeicoes[i].itens?.length).map((i) => ({ refeicao: i }))
  return consumoDoDia(dieta, [...(diario || []), ...faltam])
}

// Até 3 dicas para fechar o dia, uma por macro que falta, sem estourar muito as calorias que sobram.
export function sugestoes(faltam) {
  if (!faltam) return []
  const sobra = faltam.kcal ?? Infinity
  const lista = []
  for (const macro of ['proteina', 'carboidrato', 'gordura']) {
    const falta = faltam[macro]
    if (falta == null || falta < MINIMO[macro]) continue
    let melhor = null
    for (const [alimento, gramas, uma, duas] of PORCOES[macro]) {
      const m = macrosDoItem(alimento, gramas)
      const vezes = Math.min(2, Math.max(1, Math.round(falta / m[macro])))
      const total = { kcal: m.kcal * vezes, proteina: r1(m.proteina * vezes), carboidrato: r1(m.carboidrato * vezes), gordura: r1(m.gordura * vezes) }
      if (total.kcal > sobra + 80) continue
      const erro = Math.abs(falta - total[macro]) + total.kcal / 40 // perto do que falta e com poucas calorias
      if (!melhor || erro < melhor.erro) melhor = { erro, alimento, gramas: gramas * vezes, porcao: vezes === 2 ? duas : uma, macros: total }
    }
    if (melhor) lista.push({ macro, falta, texto: `Faltam ${Math.round(falta)} g de ${NOME[macro]}: ${melhor.porcao} dá +${Math.round(melhor.macros[macro])} g (${melhor.macros.kcal} kcal).`, alimento: melhor.alimento, gramas: melhor.gramas, macros: melhor.macros })
  }
  return lista
}

// Resumo de uma frase para o topo do diário.
export function situacaoDoDia(faltam, feitas, total) {
  if (!faltam || faltam.kcal == null) return null
  if (faltam.kcal < -150) return { tipo: 'passou', texto: `Você passou ${Math.round(-faltam.kcal)} kcal da meta hoje. Sem culpa: amanhã segue o plano e capriche na água e nos vegetais.` }
  const ok = ['proteina', 'carboidrato', 'gordura'].every((k) => faltam[k] == null || faltam[k] < MINIMO[k])
  if (ok && feitas > 0) return { tipo: 'bateu', texto: 'Macros do dia batidos! 🎯 Mandou bem.' }
  if (feitas >= total && total > 0) return { tipo: 'faltou', texto: 'Você fez todas as refeições, mas ainda falta um pouco. Que tal um lanche para fechar o dia?' }
  return null
}

// Macros de um extra digitado pelo aluno (só se o alimento estiver na tabela).
export const macrosDoExtra = (alimento, gramas) => (acharAlimento(alimento) ? macrosDoItem(alimento, gramas) : null)

// Uma linha da refeição que o aluno editou ("comi diferente"). Alimento da tabela: macros pelo peso.
// Alimento do plano fora da tabela: os macros que o personal gravou, na proporção dos gramas.
export function macrosEditados({ alimento, gramas, base }) {
  const g = Number(gramas)
  const tabela = macrosDoItem(alimento, g)
  if (tabela) return tabela
  if (!base || base.alimento !== alimento) return null
  const m = doItem(base)
  const f = g && Number(base.gramas) ? g / Number(base.gramas) : 1
  return { kcal: Math.round((Number(m.kcal) || 0) * f), proteina: r1((Number(m.proteina) || 0) * f), carboidrato: r1((Number(m.carboidrato) || 0) * f), gordura: r1((Number(m.gordura) || 0) * f) }
}

// Rascunho para editar uma refeição: o que já foi editado ou os itens do plano.
export const rascunhoDaRefeicao = (refeicao, registro) =>
  (Array.isArray(registro?.itens) ? registro.itens : refeicao.itens || []).map((it) => ({ alimento: it.alimento, gramas: it.gramas ?? '', quantidade: it.quantidade || '', base: it }))

// Itens para gravar no diário (só o que importa, para caber no banco).
export function itensEditados(rascunho) {
  return rascunho.filter((it) => String(it.alimento || '').trim()).map((it) => {
    const alimento = String(it.alimento).trim().slice(0, 80)
    const gramas = Number(String(it.gramas).replace(',', '.')) || null
    const igual = it.base?.alimento === alimento && Number(it.base?.gramas) === gramas
    const m = macrosEditados({ alimento, gramas, base: it.base })
    return { alimento, gramas, ...(igual && it.quantidade ? { quantidade: String(it.quantidade).slice(0, 40) } : {}), ...(m || { kcal: 0, proteina: 0, carboidrato: 0, gordura: 0, fora: true }) }
  })
}
