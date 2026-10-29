// Regras da academia: grade de aulas, novidades, equipes, QR code da recepção e lembrete da mensalidade.

// Link do grupo da academia (vale até o personal trocar em Configurações).
export const WHATSAPP_GRUPO = 'https://chat.whatsapp.com/CV644r1nksrD2zrsOzdOJh'

export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

// Grade da academia (a mesma que o SQL coloca no banco). Aparece enquanto o SQL novo não roda.
export const GRADE_PADRAO = [
  [1, '18:10', 'Jump'], [1, '19:10', 'GAP'], [1, '20:10', 'Pilates'],
  [2, '07:30', 'Funcional'], [2, '09:10', 'Pilates'], [2, '18:10', 'Aulas variadas', 'Verificar o mural'], [2, '19:10', 'Pump'],
  [3, '18:10', 'Spinning'], [3, '19:10', 'SuperJump'],
  [4, '07:30', 'Localizada'], [4, '09:10', 'Pilates'], [4, '18:10', 'Alongamento'], [4, '19:10', 'Fitdance'], [4, '20:10', 'Pilates'],
].map(([dia_semana, hora, nome, obs], i) => ({ id: `padrao-${i}`, dia_semana, hora, nome, obs: obs || null }))

const hhmm = (h) => String(h).slice(0, 5)
export const fmtHora = (h) => hhmm(h).replace(/^0/, '')

// Tabela da grade: linhas = horários, colunas = segunda a sexta (sábado e domingo só se tiver aula).
export function montarGrade(aulas) {
  const dias = [1, 2, 3, 4, 5, ...[6, 0].filter((d) => aulas.some((a) => a.dia_semana === d))]
  const horas = [...new Set(aulas.map((a) => hhmm(a.hora)))].sort()
  const celula = (dia, hora) => aulas.filter((a) => a.dia_semana === dia && hhmm(a.hora) === hora)
  return { dias, horas, linhas: horas.map((hora) => ({ hora, celulas: dias.map((dia) => celula(dia, hora)) })) }
}

// Aulas de um dia, em ordem de horário.
export const aulasDoDia = (aulas, dia) => aulas.filter((a) => a.dia_semana === dia).sort((a, b) => (hhmm(a.hora) < hhmm(b.hora) ? -1 : 1))

// Próxima aula a partir de agora (hoje mais tarde ou nos próximos dias).
export function proximaAula(aulas, agora = new Date()) {
  const hoje = agora.getDay()
  const hora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
  for (let i = 0; i < 7; i++) {
    const dia = (hoje + i) % 7
    const aula = aulasDoDia(aulas, dia).find((a) => i > 0 || hhmm(a.hora) > hora)
    if (aula) return { ...aula, emDias: i }
  }
  return null
}

// Cor de cada aula na grade (a mesma aula tem sempre a mesma cor).
const CORES = ['#fc4c02', '#161618', '#c63d00', '#45454d', '#e8600f', '#2a2a30', '#a83300'] // só tons da marca
export function corDaAula(nome) {
  let h = 0
  for (const c of String(nome).toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return CORES[h % CORES.length]
}

export const TIPOS_AVISO = { novidade: ['Novidade', '✨'], lembrete: ['Lembrete', '⏰'], informacao: ['Informação', 'ℹ️'] }

// Fixados primeiro, depois os mais novos.
export const ordenarAvisos = (avisos) => [...avisos].sort((a, b) => (b.fixado - a.fixado) || (a.created_at < b.created_at ? 1 : -1))

// Quantos avisos chegaram depois da última vez que o aluno abriu a aba.
export const avisosNovos = (avisos, vistoEm) => avisos.filter((a) => !vistoEm || a.created_at > vistoEm).length

// Placar das equipes no mês: cada dia de treino de um membro vale 1 ponto para a equipe.
export function placarEquipes(equipes, membros, checkinsDoMes) {
  const dias = new Map()
  for (const c of checkinsDoMes) {
    if (!dias.has(c.aluno_id)) dias.set(c.aluno_id, new Set())
    dias.get(c.aluno_id).add(c.data)
  }
  return equipes
    .map((e) => {
      const time = membros.filter((m) => m.equipe_id === e.id)
      const lista = time.map((m) => ({ ...m, pontos: dias.get(m.id)?.size || 0 })).sort((a, b) => b.pontos - a.pontos)
      return { ...e, membros: lista, pontos: lista.reduce((t, m) => t + m.pontos, 0) }
    })
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome, 'pt-BR'))
}

// Link do QR code da recepção e leitura do código quando o aluno abre o link.
export const linkCheckinQR = (origem, codigo) => `${origem}/?checkin=${encodeURIComponent(codigo)}`
export function codigoDoLink(busca) {
  const c = new URLSearchParams(busca).get('checkin')
  return c && /^[A-Za-z0-9]{6,40}$/.test(c) ? c : null
}

// Link do grupo aceito pelo banco (sem os parâmetros que o WhatsApp põe no final).
export function limparLinkGrupo(link) {
  const m = String(link || '').trim().match(/^https:\/\/chat\.whatsapp\.com\/([A-Za-z0-9]+)/)
  return m ? `https://chat.whatsapp.com/${m[1]}` : null
}

// Em qual dia mandar o lembrete da mensalidade: 2 dias antes, no dia e 3 dias depois do vencimento.
export function lembreteMensalidade(diaVencimento, hoje) {
  if (!diaVencimento) return null
  const dia = Number(hoje.slice(8, 10))
  if (dia === diaVencimento - 2) return 'antes'
  if (dia === diaVencimento) return 'hoje'
  if (dia === diaVencimento + 3) return 'atrasada'
  return null
}
