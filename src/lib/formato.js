export const hojeISO = () => new Date().toLocaleDateString('sv-SE') // AAAA-MM-DD no fuso local

export function fmtData(d) {
  if (!d) return '—'
  const [y, m, dd] = d.slice(0, 10).split('-')
  return `${dd}/${m}/${y}`
}

export const diasDesde = (d) => Math.floor((Date.now() - new Date(`${d}T12:00:00`).getTime()) / 864e5)

export function f1(v) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

export const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')))

export const porData = (a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)
export const porOrdem = (a, b) => a.ordem - b.ordem || (a.created_at < b.created_at ? -1 : 1)

export const primeiroNome = (nome) => (nome || '').trim().split(/\s+/)[0]
