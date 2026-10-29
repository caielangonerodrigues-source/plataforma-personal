// Ofensiva semanal (semanas seguidas batendo a meta de treinos, como no Strava) e o resumo da semana.
// A mesma regra está copiada em supabase/functions/notificacoes/index.ts (push de risco e resumo de segunda).
import { inicioDaSemana } from './agenda.js'
import { somarDias } from './comunidade.js'

export const META_SEMANAL = 2

const contar = (dias, ini) => { let n = 0; for (let i = 0; i < 7; i++) if (dias.has(somarDias(ini, i))) n++; return n }

// datas: dias com treino ou check-in (AAAA-MM-DD, pode repetir).
// semanas conta as semanas fechadas seguidas com a meta e soma a atual quando ela já bateu.
export function ofensiva(datas, hoje, meta = META_SEMANAL) {
  const dias = new Set(datas)
  const seg = inicioDaSemana(hoje)
  const naSemana = contar(dias, seg)
  let semanas = 0
  for (let ini = somarDias(seg, -7); semanas < 520 && contar(dias, ini) >= meta; ini = somarDias(ini, -7)) semanas++
  const garantida = naSemana >= meta
  const falta = Math.max(0, meta - naSemana)
  const restantes = 7 - Math.round((Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${seg}T12:00:00Z`)) / 864e5) // contando hoje
  const perdeu = !garantida && semanas > 0 && falta > restantes // não dá mais para bater a meta desta semana
  return {
    semanas: perdeu ? 0 : semanas + (garantida ? 1 : 0), meta, naSemana, falta, restantes, garantida, perdeu,
    // Tem ofensiva em jogo e está ficando sem dias: hora do aviso (ainda dá para salvar).
    emRisco: !garantida && semanas > 0 && falta <= restantes && restantes <= falta + 1,
  }
}

const vezes = (n) => `${n} ${n === 1 ? 'treino' : 'treinos'}`

// Resumo da semana que passou, para o push de segunda. null quando não treinou (aí vale a motivação).
export function resumoSemana(datas, hoje, primeiroNome = '') {
  const dias = new Set(datas)
  const seg = inicioDaSemana(hoje)
  const passada = somarDias(seg, -7)
  const n = contar(dias, passada)
  if (!n) return null
  const antes = [1, 2, 3, 4].map((k) => contar(dias, somarDias(passada, -7 * k)))
  const anterior = antes[0]
  const o = ofensiva(datas, somarDias(seg, -1))
  let corpo
  if (n >= 2 && n > Math.max(...antes)) corpo = 'Sua melhor semana do mês! 🏆'
  else if (n > anterior) corpo = `${n - anterior} a mais que a semana anterior. Bora manter!`
  else if (n === anterior) corpo = 'Mesmo ritmo da semana anterior. Constância é o que dá resultado.'
  else corpo = 'Nesta semana dá para fazer mais. Bora?'
  if (o.semanas >= 2) corpo += ` 🔥 ${o.semanas} semanas seguidas.`
  const nome = primeiroNome ? `${primeiroNome}, você` : 'Você'
  return { titulo: `Sua semana: ${vezes(n)} 💪`, corpo: `${nome} treinou ${n}x na semana passada. ${corpo}`, treinos: n }
}

// Texto do aviso de ofensiva em risco.
export function avisoOfensiva(o) {
  const quando = o.restantes === 1 ? 'hoje' : `até domingo`
  return {
    titulo: `Não perca sua ofensiva de ${o.semanas} ${o.semanas === 1 ? 'semana' : 'semanas'} 🔥`,
    corpo: `Falta${o.falta > 1 ? 'm' : ''} ${vezes(o.falta)} ${quando} para manter a sequência. Bora?`,
  }
}
