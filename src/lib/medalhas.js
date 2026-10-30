import { somarDias } from './comunidade.js'
import { cargaMaxima, volume } from './progressao.js'

// Dias distintos com check-in dentro do período do desafio.
export function progressoDesafio(desafio, datas) {
  return new Set(datas.filter((d) => d >= desafio.inicio && d <= desafio.fim)).size
}

export function maiorSequencia(datas) {
  const dias = [...new Set(datas)].sort()
  let maior = 0
  let atual = 0
  dias.forEach((d, i) => {
    atual = i > 0 && somarDias(dias[i - 1], 1) === d ? atual + 1 : 1
    maior = Math.max(maior, atual)
  })
  return maior
}

// Segunda-feira da semana do dia.
const semanaDe = (iso) => somarDias(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7))

// Maior número de semanas seguidas com pelo menos `minimo` dias de treino.
export function semanasSeguidas(datas, minimo = 3) {
  const porSemana = {}
  for (const d of new Set(datas)) porSemana[semanaDe(d)] = (porSemana[semanaDe(d)] || 0) + 1
  const boas = Object.keys(porSemana).filter((s) => porSemana[s] >= minimo).sort()
  let maior = 0
  let atual = 0
  boas.forEach((s, i) => {
    atual = i > 0 && somarDias(boas[i - 1], 7) === s ? atual + 1 : 1
    maior = Math.max(maior, atual)
  })
  return maior
}

// Vezes em que a carga máxima de um exercício passou a melhor anterior.
export function recordes(registros = []) {
  const melhor = {}
  let n = 0
  for (const r of [...registros].filter((r) => !r.troca).sort((a, b) => (a.data < b.data ? -1 : 1))) {
    const max = cargaMaxima(r.series)
    if (max == null) continue
    if (melhor[r.exercicio_id] != null && max > melhor[r.exercicio_id]) n += 1
    melhor[r.exercicio_id] = Math.max(melhor[r.exercicio_id] ?? 0, max)
  }
  return n
}

// Vezes em que o aluno voltou a treinar depois de 14 dias ou mais parado.
export function retornos(datas) {
  const dias = [...new Set(datas)].sort()
  return dias.filter((d, i) => i > 0 && somarDias(dias[i - 1], 14) <= d).length
}

// Meses com pelo menos `minimo` dias de treino.
export function mesesAtivos(datas, minimo = 8) {
  const porMes = {}
  for (const d of new Set(datas)) porMes[d.slice(0, 7)] = (porMes[d.slice(0, 7)] || 0) + 1
  return Object.values(porMes).filter((n) => n >= minimo).length
}

// Dias entre o primeiro e o último treino.
export function diasDeCasa(datas) {
  if (!datas.length) return 0
  const dias = [...datas].sort()
  return Math.round((new Date(`${dias.at(-1)}T12:00:00Z`) - new Date(`${dias[0]}T12:00:00Z`)) / 864e5)
}

export function estatisticas({ datas = [], registros = [], avaliacoes = 0 }) {
  const dias = [...new Set([...datas, ...registros.map((r) => r.data)])]
  const porMes = {}
  for (const d of dias) porMes[d.slice(0, 7)] = (porMes[d.slice(0, 7)] || 0) + 1
  return {
    total: dias.length,
    maiorSequencia: maiorSequencia(dias),
    semanas: semanasSeguidas(dias, 3),
    melhorMes: Math.max(0, ...Object.values(porMes)),
    fimDeSemana: dias.filter((d) => [0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay())).length,
    recordes: recordes(registros),
    avaliacoes,
    toneladas: Math.floor(registros.filter((r) => !r.troca).reduce((t, r) => t + volume(r.series), 0) / 1000),
    exercicios: new Set(registros.filter((r) => !r.troca && r.series?.length).map((r) => r.exercicio_id)).size,
    mesesAtivos: mesesAtivos(dias),
    retornos: retornos(dias),
    diasDeCasa: diasDeCasa(dias),
  }
}

// [grupo, ícone, estatística, [id, título, meta, descrição]...]
const GRUPOS = [
  ['Treinos', '🏋️', 'total', [
    ['primeiro', 'Primeiro treino', 1], ['dez', '10 treinos', 10], ['vinte-cinco', '25 treinos', 25], ['cinquenta', '50 treinos', 50],
    ['cem', '100 treinos', 100], ['duzentos', '200 treinos', 200], ['ano', '365 treinos', 365, 'Um ano inteiro de treinos'],
  ]],
  ['Dias seguidos', '🔥', 'maiorSequencia', [
    ['tres', '3 dias seguidos', 3], ['semana', '7 dias seguidos', 7], ['quinze', '14 dias seguidos', 14], ['mes', '30 dias seguidos', 30],
  ]],
  ['Semanas firmes', '📅', 'semanas', [
    ['semanas-4', '1 mês firme', 4, '4 semanas seguidas treinando 3 vezes ou mais'],
    ['semanas-12', 'Trimestre de ferro', 12, '12 semanas seguidas treinando 3 vezes ou mais'],
    ['semanas-26', 'Meio ano sem falhar', 26, '26 semanas seguidas treinando 3 vezes ou mais'],
  ]],
  ['Mês forte', '🗓️', 'melhorMes', [
    ['mes-12', 'Mês focado', 12, '12 treinos no mesmo mês'], ['mes-20', 'Mês monstro', 20, '20 treinos no mesmo mês'],
  ]],
  ['Fim de semana', '☀️', 'fimDeSemana', [
    ['fds-10', 'Sem folga no sábado', 10, '10 treinos em sábados ou domingos'],
  ]],
  ['Força', '💪', 'recordes', [
    ['recorde-1', 'Primeiro recorde', 1, 'Bateu sua melhor carga em um exercício'],
    ['recorde-10', '10 recordes', 10, 'Bateu sua melhor carga 10 vezes'], ['recorde-50', '50 recordes', 50, 'Bateu sua melhor carga 50 vezes'],
  ]],
  ['Avaliação', '📏', 'avaliacoes', [
    ['avaliacao-2', 'Medindo a evolução', 2, '2 avaliações físicas'], ['avaliacao-4', 'Evolução de verdade', 4, '4 avaliações físicas'],
  ]],
  ['Toneladas', '🏗️', 'toneladas', [
    ['ton-1', 'Primeira tonelada', 1, '1 tonelada levantada somando carga × repetições'],
    ['ton-10', '10 toneladas', 10, '10 toneladas levantadas somando carga × repetições'],
    ['ton-50', '50 toneladas', 50, '50 toneladas levantadas, o peso de um caminhão'],
    ['ton-100', '100 toneladas', 100, '100 toneladas levantadas, o peso de uma baleia azul'],
  ]],
  ['Variedade', '🎯', 'exercicios', [
    ['exercicios-10', 'Repertório', 10, '10 exercícios diferentes registrados'],
    ['exercicios-25', 'Treino completo', 25, '25 exercícios diferentes registrados'],
    ['exercicios-50', 'Mestre da academia', 50, '50 exercícios diferentes registrados'],
  ]],
  ['Meses ativos', '📆', 'mesesAtivos', [
    ['meses-3', '3 meses ativos', 3, '3 meses com 8 treinos ou mais'],
    ['meses-6', '6 meses ativos', 6, '6 meses com 8 treinos ou mais'],
    ['meses-12', '12 meses ativos', 12, '12 meses com 8 treinos ou mais'],
  ]],
  ['Tempo de casa', '❤️', 'diasDeCasa', [
    ['casa-90', '3 meses de casa', 90, '3 meses desde o primeiro treino'],
    ['casa-180', '6 meses de casa', 180, '6 meses desde o primeiro treino'],
    ['casa-365', '1 ano de casa', 365, 'Um ano desde o primeiro treino'],
  ]],
  ['Volta por cima', '⚡', 'retornos', [
    ['volta-1', 'Voltou com tudo', 1, 'Voltou a treinar depois de 2 semanas ou mais parado'],
  ]],
]

// Medalhas de marcos automáticos + desafios concluídos. `dados` pode ser só a lista de datas.
export function medalhas(dados, desafios = []) {
  const s = estatisticas(Array.isArray(dados) ? { datas: dados } : dados)
  const datas = Array.isArray(dados) ? dados : dados.datas || []
  return [
    ...GRUPOS.flatMap(([grupo, icone, chave, lista]) => lista.map(([id, titulo, meta, descricao]) => ({
      id, titulo, grupo, icone, meta, descricao: descricao || titulo, valor: Math.min(s[chave], meta), ganhou: s[chave] >= meta,
    }))),
    ...desafios.map((d) => {
      const valor = progressoDesafio(d, datas)
      return { id: d.id, titulo: d.titulo, grupo: 'Desafios', icone: '🏆', meta: d.meta_dias, descricao: `${d.meta_dias} dias de check-in no desafio`, valor: Math.min(valor, d.meta_dias), ganhou: valor >= d.meta_dias, desafio: true }
    }),
  ]
}

// A medalha que está mais perto de sair (maior porcentagem já feita).
export function proximaMedalha(lista) {
  return lista.filter((m) => !m.ganhou && m.valor > 0).sort((a, b) => b.valor / b.meta - a.valor / a.meta)[0] || lista.find((m) => !m.ganhou)
}
