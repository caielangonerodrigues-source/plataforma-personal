// Alunos que precisam de atenção no painel: sumidos e com mensalidade atrasada.
import { situacaoMensalidade } from './pix.js'

export const diasEntre = (de, ate) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 864e5)

// Último dia com treino marcado ou check-in de cada aluno: { [aluno_id]: 'AAAA-MM-DD' }.
export function ultimosTreinos(atividades) {
  const mapa = {}
  for (const { aluno_id, data } of atividades) if (!mapa[aluno_id] || data > mapa[aluno_id]) mapa[aluno_id] = data
  return mapa
}

// Alunos ativos com ficha que estão há `dias` ou mais sem treinar (quem nunca treinou conta desde o início).
export function alunosSumidos(alunos, atividades, hoje, dias = 7) {
  const ultimos = ultimosTreinos(atividades)
  return alunos
    .filter((a) => a.status !== 'pausado' && a.treinos?.length)
    .map((a) => {
      const ultimo = ultimos[a.id] || null
      const desde = ultimo || a.inicio || (a.created_at || '').slice(0, 10)
      return { aluno: a, ultimo, dias: desde ? diasEntre(desde, hoje) : null }
    })
    .filter((s) => s.dias != null && s.dias >= dias)
    .sort((x, y) => y.dias - x.dias)
}

// Alunos com a mensalidade deste mês vencida e sem pagamento registrado.
export function mensalidadesAtrasadas(alunos, pagamentos, hoje) {
  const pagos = new Set(pagamentos.map((p) => p.aluno_id))
  return alunos.filter((a) => a.status !== 'pausado' && situacaoMensalidade({ valor: a.valor_mensal, diaVencimento: a.dia_vencimento, pago: pagos.has(a.id), hoje }) === 'atrasado')
}

// Aniversários de hoje até `dias` à frente (29/02 vira 28/02 em ano que não é bissexto).
export function aniversariantes(alunos, hoje, dias = 7) {
  const ano = Number(hoje.slice(0, 4))
  const bissexto = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0
  return alunos
    .filter((a) => a.status !== 'pausado' && /^\d{4}-\d{2}-\d{2}/.test(a.data_nascimento || ''))
    .map((a) => {
      const md = a.data_nascimento.slice(5, 10)
      const dataEm = (y) => `${y}-${md === '02-29' && !bissexto(y) ? '02-28' : md}`
      let data = dataEm(ano)
      if (data < hoje) data = dataEm(ano + 1)
      return { aluno: a, data, idade: Number(data.slice(0, 4)) - Number(a.data_nascimento.slice(0, 4)), em: diasEntre(hoje, data) }
    })
    .filter((x) => x.em <= dias)
    .sort((x, y) => x.em - y.em)
}
