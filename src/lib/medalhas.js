import { sequencia } from './comunidade.js'

// Dias distintos com check-in dentro do período do desafio.
export function progressoDesafio(desafio, datas) {
  return new Set(datas.filter((d) => d >= desafio.inicio && d <= desafio.fim)).size
}

const MARCOS = [
  { id: 'primeiro', titulo: 'Primeiro check-in', teste: (s) => s.total >= 1 },
  { id: 'dez', titulo: '10 treinos', teste: (s) => s.total >= 10 },
  { id: 'cinquenta', titulo: '50 treinos', teste: (s) => s.total >= 50 },
  { id: 'cem', titulo: '100 treinos', teste: (s) => s.total >= 100 },
  { id: 'semana', titulo: '7 dias seguidos', teste: (s) => s.maiorSequencia >= 7 },
  { id: 'mes', titulo: '30 dias seguidos', teste: (s) => s.maiorSequencia >= 30 },
]

export function maiorSequencia(datas) {
  const dias = [...new Set(datas)].sort()
  let maior = 0
  for (const d of dias) maior = Math.max(maior, sequencia(dias.filter((x) => x <= d), d))
  return maior
}

// Medalhas de marcos automáticos + desafios concluídos.
export function medalhas(datas, desafios = []) {
  const s = { total: new Set(datas).size, maiorSequencia: maiorSequencia(datas) }
  return [
    ...MARCOS.map((m) => ({ id: m.id, titulo: m.titulo, ganhou: m.teste(s) })),
    ...desafios.map((d) => ({ id: d.id, titulo: d.titulo, ganhou: progressoDesafio(d, datas) >= d.meta_dias, desafio: true })),
  ]
}
