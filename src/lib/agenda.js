// Agenda dos atendimentos presenciais: horários fixos por semana e remarcações de um dia.
// horario = { id, aluno_id, dia_semana (0 = domingo), hora 'HH:MM', duracao, local }
// remarcacao = { id, horario_id, data (dia original), nova_data, nova_hora } — sem nova_data = desmarcado.
import { somarDias } from './comunidade.js'

export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const diaDaSemana = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay()
export const hhmm = (hora) => String(hora || '').slice(0, 5)

// Segunda-feira da semana do dia.
export const inicioDaSemana = (iso) => somarDias(iso, -((diaDaSemana(iso) + 6) % 7))

// Atendimentos de cada dia entre inicio e fim (inclusive), já com as remarcações aplicadas.
export function atendimentos(horarios, remarcacoes, inicio, fim) {
  const porChave = new Map(remarcacoes.map((r) => [`${r.horario_id}|${r.data}`, r]))
  const porId = new Map(horarios.map((h) => [h.id, h]))
  const lista = []
  for (let dia = inicio; dia <= fim; dia = somarDias(dia, 1)) {
    for (const h of horarios) {
      if (h.dia_semana !== diaDaSemana(dia)) continue
      const r = porChave.get(`${h.id}|${dia}`)
      if (r?.nova_data) continue // aparece no dia novo
      lista.push({ chave: `${h.id}|${dia}`, horario: h, data: dia, dataOriginal: dia, hora: hhmm(h.hora), desmarcado: !!r, remarcacao: r || null })
    }
  }
  for (const r of remarcacoes) {
    const h = porId.get(r.horario_id)
    if (!h || !r.nova_data || r.nova_data < inicio || r.nova_data > fim) continue
    lista.push({ chave: `${h.id}|${r.data}`, horario: h, data: r.nova_data, dataOriginal: r.data, hora: hhmm(r.nova_hora || h.hora), remarcado: true, remarcacao: r })
  }
  return lista.sort((a, b) => (a.data + a.hora < b.data + b.hora ? -1 : a.data + a.hora > b.data + b.hora ? 1 : 0))
}

// Próximo atendimento (não desmarcado) a partir de hoje, olhando até 3 semanas.
export function proximoAtendimento(horarios, remarcacoes, hoje, agora = '00:00') {
  return atendimentos(horarios, remarcacoes, hoje, somarDias(hoje, 21))
    .find((a) => !a.desmarcado && (a.data > hoje || a.hora >= agora)) || null
}
