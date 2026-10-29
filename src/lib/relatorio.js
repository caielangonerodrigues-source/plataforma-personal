// Números do relatório mensal de evolução, calculados a partir do que o aluno registrou.
import { cargaMaxima } from './progressao.js'
import { MESES } from './formato.js'

export const nomeDoMes = (mes) => `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`

export function fimDoMes(mes) {
  const [y, m] = mes.split('-').map(Number)
  return `${mes}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
}

// Mês atual e os dois anteriores (AAAA-MM), do mais recente para o mais antigo.
export function mesesRecentes(hoje, n = 3) {
  const [y, m] = hoje.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  })
}

const diff = (a, b, campo) => (a?.[campo] != null && b?.[campo] != null ? Number(a[campo]) - Number(b[campo]) : null)

// registros/checkins/fotos podem vir de antes do mês: só o mês entra nas contas,
// e a carga do mês é comparada com a última sessão anterior a ele.
export function numerosDoMes({ mes, treinos = [], registros = [], checkins = [], avaliacoes = [], fotos = [] }) {
  const ini = `${mes}-01`, fim = fimDoMes(mes)
  const noMes = (d) => d >= ini && d <= fim
  const nomes = new Map(treinos.flatMap((t) => t.exercicios.map((e) => [e.id, e.nome])))
  const doMes = registros.filter((r) => noMes(r.data))
  const dias = new Set([...doMes.map((r) => r.data), ...checkins.filter((c) => noMes(c.data)).map((c) => c.data)])

  const porExercicio = {}
  for (const r of registros) {
    const max = r.troca ? null : cargaMaxima(r.series)
    if (max == null || r.data > fim || !nomes.has(r.exercicio_id)) continue
    ;(porExercicio[r.exercicio_id] ||= []).push({ data: r.data, max })
  }
  const cargas = Object.entries(porExercicio).map(([id, h]) => {
    h.sort((a, b) => (a.data < b.data ? -1 : 1))
    const dentro = h.filter((x) => noMes(x.data))
    if (!dentro.length) return null
    const base = h.filter((x) => x.data < ini).at(-1) || dentro[0]
    const ultima = dentro.at(-1)
    return { nome: nomes.get(id), de: base.max, para: ultima.max, diferenca: ultima.max - base.max }
  }).filter(Boolean).sort((a, b) => b.diferenca - a.diferenca || a.nome.localeCompare(b.nome))

  const avs = avaliacoes.filter((a) => a.data <= fim).slice().sort((a, b) => (a.data < b.data ? -1 : 1))
  const atual = avs.at(-1) || null, anterior = avs.at(-2) || null

  return {
    mes,
    diasTreinados: dias.size,
    checkins: checkins.filter((c) => noMes(c.data)).length,
    exerciciosFeitos: doMes.length,
    trocas: doMes.filter((r) => r.troca).length,
    cargas,
    subiram: cargas.filter((c) => c.diferenca > 0).length,
    avaliacao: atual && {
      data: atual.data, noMes: noMes(atual.data), peso: atual.peso, gordura: atual.gordura, cintura: atual.cintura,
      anterior: anterior?.data || null,
      peso_dif: diff(atual, anterior, 'peso'), gordura_dif: diff(atual, anterior, 'gordura'), cintura_dif: diff(atual, anterior, 'cintura'),
    },
    fotos: fotos.filter((f) => noMes(f.data)).length,
  }
}

const sinal = (v, casas = 1) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: casas })}`

// Linhas curtas com os números, para o relatório e a mensagem de WhatsApp.
export function linhasDosNumeros(n) {
  const kg = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  const l = [`${n.diasTreinados} ${n.diasTreinados === 1 ? 'dia' : 'dias'} de treino${n.checkins ? ` e ${n.checkins} check-in${n.checkins > 1 ? 's' : ''}` : ''}`]
  if (n.subiram) l.push(`Carga subiu em ${n.subiram} ${n.subiram === 1 ? 'exercício' : 'exercícios'}${n.cargas[0]?.diferenca > 0 ? ` (${n.cargas[0].nome}: ${kg(n.cargas[0].de)} → ${kg(n.cargas[0].para)} kg)` : ''}`)
  const a = n.avaliacao
  if (a?.noMes && a.anterior) {
    const partes = [a.peso_dif != null && `peso ${sinal(a.peso_dif)} kg`, a.gordura_dif != null && `gordura ${sinal(a.gordura_dif)} %`, a.cintura_dif != null && `cintura ${sinal(a.cintura_dif)} cm`].filter(Boolean)
    if (partes.length) l.push(`Avaliação: ${partes.join(', ')}`)
  }
  return l
}

// Mensagem padrão quando o personal não usa a IA.
export function mensagemPadrao(primeiroNome, n) {
  return `Oi, ${primeiroNome}! Seu resumo de ${nomeDoMes(n.mes)}:\n\n${linhasDosNumeros(n).map((x) => `• ${x}`).join('\n')}\n\nBora para mais um mês! 💪`
}
