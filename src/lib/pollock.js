// Composição corporal: Jackson & Pollock (densidade) + Siri (% de gordura).

export const DOBRAS = [
  ['peitoral', 'Peitoral'],
  ['axilar', 'Axilar média'],
  ['triceps', 'Tríceps'],
  ['subescapular', 'Subescapular'],
  ['abdominal', 'Abdominal'],
  ['suprailiaca', 'Supra-ilíaca'],
  ['coxa', 'Coxa'],
]
// Dobras que não entram nas equações, só para acompanhar.
export const DOBRAS_EXTRAS = [['biceps', 'Bíceps'], ['panturrilha', 'Panturrilha']]
export const DOBRA_NOME = Object.fromEntries([...DOBRAS, ...DOBRAS_EXTRAS])

// Perímetros da avaliação, em cm (coluna medidas). Cintura, quadril, braço e coxa também vão nas colunas antigas.
export const PERIMETROS = [
  ['pescoco', 'Pescoço'], ['ombros', 'Ombros'], ['peitoral', 'Peitoral'], ['cintura', 'Cintura'], ['abdomen', 'Abdômen'],
  ['quadril', 'Quadril'], ['braco_d', 'Braço dir.'], ['braco_e', 'Braço esq.'], ['antebraco_d', 'Antebraço dir.'], ['antebraco_e', 'Antebraço esq.'],
  ['coxa_d', 'Coxa dir.'], ['coxa_e', 'Coxa esq.'], ['panturrilha_d', 'Panturrilha dir.'], ['panturrilha_e', 'Panturrilha esq.'],
]
// Tronco numa coluna só; membros em direito e esquerdo.
export const PERIMETROS_TRONCO = ['pescoco', 'ombros', 'peitoral', 'cintura', 'abdomen', 'quadril']
export const PERIMETROS_PARES = [['braco', 'Braço'], ['antebraco', 'Antebraço'], ['coxa', 'Coxa'], ['panturrilha', 'Panturrilha']]
export const PERIMETRO_NOME = Object.fromEntries(PERIMETROS)

// Perímetros de uma avaliação: os da coluna medidas ou, nas antigas, os das colunas cintura/quadril/braço/coxa.
export function perimetrosDe(a) {
  if (a?.medidas && Object.keys(a.medidas).length) return a.medidas
  const out = {}
  for (const [k, c] of [['cintura', 'cintura'], ['quadril', 'quadril'], ['braco_d', 'braco'], ['coxa_d', 'coxa']]) if (a?.[c] != null) out[k] = Number(a[c])
  return out
}

export const PROTOCOLOS = {
  p7: 'Pollock 7 dobras',
  p3: 'Pollock 3 dobras',
  manual: 'Informado manualmente',
}

// Dobras usadas por protocolo; o Pollock 3 muda conforme o sexo.
export function dobrasDo(protocolo, sexo) {
  if (protocolo === 'p7') return DOBRAS.map(([k]) => k)
  if (protocolo === 'p3') return sexo === 'M' ? ['peitoral', 'abdominal', 'coxa'] : ['triceps', 'suprailiaca', 'coxa']
  return []
}

const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')))

// dobras: { peitoral: 10, ... } em milímetros. Retorna null se faltar dado.
export function calcGordura(protocolo, sexo, idade, dobras) {
  const vals = dobrasDo(protocolo, sexo).map((k) => num(dobras?.[k]))
  if (!vals.length || !idade || vals.some((v) => v == null || Number.isNaN(v))) return null
  const S = vals.reduce((s, v) => s + v, 0)
  const S2 = S * S
  let D
  if (protocolo === 'p7') {
    D = sexo === 'M'
      ? 1.112 - 0.00043499 * S + 0.00000055 * S2 - 0.00028826 * idade
      : 1.097 - 0.00046971 * S + 0.00000056 * S2 - 0.00012828 * idade
  } else {
    D = sexo === 'M'
      ? 1.10938 - 0.0008267 * S + 0.0000016 * S2 - 0.0002574 * idade
      : 1.0994921 - 0.0009929 * S + 0.0000023 * S2 - 0.0001392 * idade
  }
  return { soma: S, densidade: D, gordura: (4.95 / D - 4.5) * 100 }
}

// Faixas de referência do ACE (American Council on Exercise).
export function classificacao(sexo, gordura) {
  if (gordura == null) return null
  const faixas = sexo === 'M'
    ? [[6, 'Essencial'], [14, 'Atleta'], [18, 'Boa forma'], [25, 'Média'], [Infinity, 'Acima do ideal']]
    : [[14, 'Essencial'], [21, 'Atleta'], [25, 'Boa forma'], [32, 'Média'], [Infinity, 'Acima do ideal']]
  return faixas.find(([lim]) => gordura < lim)[1]
}

export const imc = (a) => (a?.peso && a?.altura ? a.peso / (a.altura * a.altura) : null)
export const massaMagra = (a) => (a?.peso && a?.gordura != null ? a.peso * (1 - a.gordura / 100) : null)
export const massaGorda = (a) => (a?.peso && a?.gordura != null ? (a.peso * a.gordura) / 100 : null)

// Faixa ideal de % de gordura por sexo e idade (referência da média saudável para a faixa etária, ACSM).
const FAIXA_IDEAL = {
  M: [[30, 11, 15], [40, 15, 19], [50, 17, 21], [60, 19, 22], [Infinity, 20, 23]],
  F: [[30, 16, 20], [40, 17, 21], [50, 20, 24], [60, 23, 27], [Infinity, 24, 28]],
}
export function faixaIdeal(sexo, idade) {
  if (!idade || !FAIXA_IDEAL[sexo]) return null
  const [, min, max] = FAIXA_IDEAL[sexo].find(([ate]) => idade < ate)
  return { min, max }
}

// Peso ideal mantendo a massa magra de hoje: massa magra / (1 - % ideal).
export function pesoIdeal(a, faixa) {
  const mm = massaMagra(a)
  if (mm == null || !faixa) return null
  return { min: mm / (1 - faixa.min / 100), max: mm / (1 - faixa.max / 100) }
}

// Resultado da gordura comparada com a faixa ideal da idade.
export function resultadoGordura(gordura, faixa) {
  if (gordura == null || !faixa) return null
  const g = Number(gordura)
  if (g < faixa.min) return 'Abaixo do ideal'
  if (g <= faixa.max) return 'Ideal'
  if (g <= faixa.max + 3) return 'Na média'
  return 'Acima da média'
}

// Idade do aluno: pela data de nascimento quando houver, senão a idade do cadastro.
export function idadeDoAluno(aluno, hoje = new Date().toISOString().slice(0, 10)) {
  const n = aluno?.data_nascimento
  if (!/^\d{4}-\d{2}-\d{2}/.test(n || '')) return aluno?.idade || null
  return Number(hoje.slice(0, 4)) - Number(n.slice(0, 4)) - (hoje.slice(5, 10) < n.slice(5, 10) ? 1 : 0)
}
