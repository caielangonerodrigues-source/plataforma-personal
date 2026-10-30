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

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// "1 ficha", "3 fichas"; `muitos` para plurais irregulares ("1 aluno ativo" / "2 alunos ativos").
export const plural = (n, um, muitos = `${um}s`) => `${n} ${n === 1 ? um : muitos}`

// Data digitada (dd/mm/aaaa): põe as barras sozinho e converte para AAAA-MM-DD ('' enquanto incompleta ou inválida).
export const mascaraData = (t) => String(t).replace(/\D/g, '').slice(0, 8).replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2')
export function dataBRparaISO(t) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t || '')
  if (!m) return ''
  const [, d, mes, a] = m
  const dt = new Date(Date.UTC(+a, +mes - 1, +d))
  if (dt.getUTCDate() !== +d || dt.getUTCMonth() !== +mes - 1 || +a < 1900) return ''
  return `${a}-${mes}-${d}`
}
export const dataISOparaBR = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.split('-').reverse().join('/') : '')
