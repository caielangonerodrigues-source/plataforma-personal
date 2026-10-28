// Spinning: disposição das bikes na sala, horários das aulas e prazo do Pix.

export const MINUTOS_PARA_PAGAR = 30

export const INSTRUTOR = 'instrutor'

// Sala vista de cima, como num cinema. Na frente ficam a bike 1, a do instrutor (no meio)
// e a bike 2; atrás, fileiras de 3.
export function fileirasBikes(vagas, porFileira = 3) {
  const frente = vagas >= 2 ? [1, INSTRUTOR, 2] : vagas === 1 ? [INSTRUTOR, 1] : [INSTRUTOR]
  const fileiras = [frente]
  for (let n = 3; n <= vagas; n += porFileira) {
    fileiras.push(Array.from({ length: Math.min(porFileira, vagas - n + 1) }, (_, i) => n + i))
  }
  return fileiras
}

export function estadoBike(n, { ocupadas = [], bloqueadas = [], selecionada } = {}) {
  if (bloqueadas.includes(n)) return 'bloqueada'
  if (ocupadas.includes(n)) return 'ocupada'
  return n === selecionada ? 'selecionada' : 'livre'
}

export const bikesLivres = (vagas, ocupadas = [], bloqueadas = []) =>
  fileirasBikes(vagas).flat().filter((n) => n !== INSTRUTOR && !ocupadas.includes(n) && !bloqueadas.includes(n)).length

// Minutos que faltam para a reserva pendente expirar (0 quando já expirou).
export function minutosParaPagar(criada, agora = new Date()) {
  const fim = new Date(criada).getTime() + MINUTOS_PARA_PAGAR * 60000
  return Math.max(0, Math.ceil((fim - new Date(agora).getTime()) / 60000))
}

// Data e hora digitadas no formulário (horário local) para gravar no banco.
export const inicioISO = (data, hora) => new Date(`${data}T${hora}:00`).toISOString()

// Mesma aula repetida toda semana: a primeira e mais `semanas` datas.
export function repetirSemanal(inicio, semanas) {
  const d = new Date(inicio)
  return Array.from({ length: semanas + 1 }, (_, i) => {
    const x = new Date(d)
    x.setDate(d.getDate() + 7 * i)
    return x.toISOString()
  })
}

const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export function quandoAula(inicio) {
  const d = new Date(inicio)
  const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0'), mi = String(d.getMinutes()).padStart(2, '0')
  return { dia: `${SEMANA[d.getDay()]}, ${dd}/${mm}`, hora: `${hh}:${mi}` }
}

export const ROTULO_RESERVA = { pendente: 'Aguardando Pix', pago: 'Confirmada', cancelada: 'Cancelada' }
