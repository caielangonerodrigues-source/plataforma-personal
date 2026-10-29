// Cronômetro de descanso: lê o descanso escrito na ficha e formata o tempo.
import { semAcento } from './exercicios.js'

// "60s", "1 min", "1min30", "1'30", "1:30", "2-3 min", "90" → segundos. Sem número, usa o padrão.
export function segundosDescanso(texto, padrao = 60) {
  const t = semAcento(texto).replace(',', '.')
  const limitar = (s) => Math.min(900, Math.max(5, Math.round(s)))
  let m = t.match(/(\d+)\s*(?::|'|´|min\s*e?)\s*(\d{1,2})\b/)
  if (m) return limitar(Number(m[1]) * 60 + Number(m[2]))
  m = t.match(/(\d+(?:\.\d+)?)\s*(?:(?:-|a)\s*\d+(?:\.\d+)?\s*)?(?:min|m\b|')/)
  if (m) return limitar(Number(m[1]) * 60)
  m = t.match(/(\d+)\s*(?:(?:-|a)\s*\d+\s*)?(?:s|seg)/)
  if (m) return limitar(Number(m[1]))
  m = t.match(/(\d+(?:\.\d+)?)/)
  if (m) return limitar(Number(m[1]) <= 10 ? Number(m[1]) * 60 : Number(m[1]))
  return padrao
}

export const mmss = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
