// Músculos que cada exercício trabalha, para o bonequinho (frente e costas).
// Primeiro olha palavras do nome (ex.: "supino", "remada"); se não achar, usa o grupo muscular da biblioteca.
import { grupoDoExercicio, semAcento } from './exercicios.js'

export const MUSCULOS = {
  peito: 'Peito', ombro: 'Ombros', biceps: 'Bíceps', triceps: 'Tríceps', antebraco: 'Antebraço',
  abdomen: 'Abdômen', obliquos: 'Oblíquos', quadriceps: 'Quadríceps', adutores: 'Adutores', panturrilha: 'Panturrilha',
  trapezio: 'Trapézio', dorsais: 'Dorsais', lombar: 'Lombar', gluteos: 'Glúteos', posterior: 'Posterior de coxa',
}

// Regiões de cada músculo, para o bonequinho mostrar o ponto exato (ex.: ombro lateral, glúteo médio).
// Na contagem da semana cada região soma no músculo dela.
export const REGIOES = {
  peito_superior: ['peito', 'Peitoral superior'], peito_medio: ['peito', 'Peitoral médio e inferior'],
  ombro_frontal: ['ombro', 'Ombro frontal'], ombro_lateral: ['ombro', 'Ombro lateral'], ombro_posterior: ['ombro', 'Ombro posterior'],
  trapezio_superior: ['trapezio', 'Trapézio superior'], trapezio_medio: ['trapezio', 'Trapézio médio e inferior'],
  abdomen_superior: ['abdomen', 'Abdômen superior'], abdomen_inferior: ['abdomen', 'Abdômen inferior'],
  gluteo_maximo: ['gluteos', 'Glúteo máximo'], gluteo_medio: ['gluteos', 'Glúteo médio'],
}
export const paiDe = (id) => REGIOES[id]?.[0] || id
export const nomeMusculo = (id) => REGIOES[id]?.[1] || MUSCULOS[id] || id

const DO_GRUPO = {
  Peito: [['peito'], ['triceps', 'ombro']], Costas: [['dorsais'], ['biceps', 'trapezio']], Ombros: [['ombro'], ['trapezio']],
  Bíceps: [['biceps'], ['antebraco']], Tríceps: [['triceps'], []], Antebraço: [['antebraco'], []],
  Quadríceps: [['quadriceps'], ['gluteos']], 'Posterior de coxa': [['posterior'], ['gluteos', 'lombar']], Glúteos: [['gluteos'], ['posterior']],
  Panturrilha: [['panturrilha'], []], 'Abdômen e core': [['abdomen'], ['obliquos']],
  Cardio: [[], ['quadriceps', 'posterior', 'gluteos', 'panturrilha']], Funcional: [['quadriceps', 'gluteos'], ['abdomen', 'ombro']],
}

// [palavras (todas precisam aparecer), principais, secundários]. A primeira regra que bate vale.
const REGRAS = [
  [['supino fechado'], ['triceps'], ['peito', 'ombro']],
  [['flexao', 'fechada'], ['triceps'], ['peito']],
  [['crucifixo inverso'], ['ombro_posterior'], ['trapezio_medio']],
  [['pullover'], ['peito', 'dorsais'], ['triceps']],
  [['supino inclinado'], ['peito_superior'], ['ombro_frontal', 'triceps']],
  [['supino declinado'], ['peito_medio'], ['triceps']],
  [['supino'], ['peito'], ['triceps', 'ombro_frontal']],
  [['crucifixo inclinado'], ['peito_superior'], ['ombro_frontal']],
  [['crucifixo declinado'], ['peito_medio'], []],
  [['crucifixo'], ['peito'], ['ombro_frontal']],
  [['crossover polia baixa'], ['peito_superior'], ['ombro_frontal']],
  [['crossover polia alta'], ['peito_medio'], ['ombro_frontal']],
  [['crossover'], ['peito'], ['ombro_frontal']],
  [['peck'], ['peito'], ['ombro_frontal']],
  [['chest press'], ['peito'], ['triceps', 'ombro_frontal']],
  [['paralelas para peito'], ['peito_medio'], ['triceps', 'ombro_frontal']],
  [['flexao de braco', 'declinada'], ['peito_superior'], ['triceps', 'ombro_frontal', 'abdomen']],
  [['flexao de braco', 'pes elevados'], ['peito_superior'], ['triceps', 'ombro_frontal', 'abdomen']],
  [['flexao de braco'], ['peito'], ['triceps', 'ombro_frontal', 'abdomen']],
  [['flexao no trx'], ['peito'], ['triceps', 'abdomen']],
  [['remada alta'], ['ombro_lateral', 'trapezio_superior'], ['biceps']],
  [['remada'], ['dorsais', 'trapezio_medio'], ['biceps', 'ombro_posterior']],
  [['puxada'], ['dorsais'], ['biceps', 'trapezio_medio']],
  [['barra fixa'], ['dorsais'], ['biceps', 'antebraco']],
  [['pulldown'], ['dorsais'], ['triceps']],
  [['terra romeno'], ['posterior', 'gluteos'], ['lombar']],
  [['terra sumo'], ['gluteos', 'adutores'], ['posterior', 'lombar', 'quadriceps']],
  [['levantamento terra'], ['posterior', 'gluteos', 'lombar'], ['quadriceps', 'trapezio', 'antebraco']],
  [['lombar'], ['lombar'], ['gluteos']],
  [['superman'], ['lombar'], ['gluteos']],
  [['encolhimento'], ['trapezio_superior'], ['antebraco']],
  [['face pull'], ['ombro_posterior'], ['trapezio_medio']],
  [['desenvolvimento'], ['ombro_frontal', 'ombro_lateral'], ['triceps', 'trapezio_superior']],
  [['landmine'], ['ombro_frontal', 'peito_superior'], ['triceps']],
  [['pike'], ['ombro_frontal'], ['triceps', 'trapezio_superior']],
  [['elevacao lateral'], ['ombro_lateral'], ['trapezio_superior']],
  [['elevacao em y'], ['ombro_lateral', 'trapezio_medio'], ['ombro_posterior']],
  [['elevacao frontal'], ['ombro_frontal'], ['peito_superior']],
  [['rotacao externa'], ['ombro_posterior'], []],
  [['rosca punho'], ['antebraco'], []],
  [['rosca inversa'], ['antebraco'], ['biceps']],
  [['rosca martelo'], ['biceps', 'antebraco'], []],
  [['rosca'], ['biceps'], ['antebraco']],
  [['triceps'], ['triceps'], []],
  [['mergulho'], ['triceps'], ['peito_medio', 'ombro_frontal']],
  [['fazendeiro'], ['antebraco', 'trapezio'], ['abdomen']],
  [['farmer'], ['antebraco', 'trapezio'], ['abdomen']],
  [['cadeira extensora'], ['quadriceps'], []],
  [['sissy'], ['quadriceps'], []],
  [['agachamento sumo'], ['gluteos', 'adutores'], ['quadriceps', 'posterior']],
  [['bulgaro'], ['quadriceps', 'gluteos'], ['posterior', 'adutores']],
  [['agachamento'], ['quadriceps', 'gluteos'], ['posterior', 'adutores', 'abdomen']],
  [['leg press'], ['quadriceps', 'gluteos'], ['posterior', 'adutores']],
  [['afundo'], ['quadriceps', 'gluteos'], ['posterior', 'adutores']],
  [['avanco'], ['quadriceps', 'gluteos'], ['posterior', 'adutores']],
  [['passada'], ['quadriceps', 'gluteos'], ['posterior']],
  [['step'], ['quadriceps', 'gluteos'], ['posterior']],
  [['thruster'], ['quadriceps', 'gluteos', 'ombro'], ['triceps', 'abdomen']],
  [['wall ball'], ['quadriceps', 'gluteos', 'ombro'], ['abdomen']],
  [['flexora'], ['posterior'], ['panturrilha']],
  [['stiff'], ['posterior', 'gluteos'], ['lombar']],
  [['good morning'], ['posterior', 'lombar'], ['gluteos']],
  [['nordica'], ['posterior'], []],
  [['flexao de joelho'], ['posterior'], ['gluteos']],
  [['adutora'], ['adutores'], []],
  [['abdutora'], ['gluteo_medio'], []],
  [['abducao'], ['gluteo_medio'], []],
  [['ostra'], ['gluteo_medio'], []],
  [['caminhada lateral'], ['gluteo_medio'], ['gluteo_maximo']],
  [['step-up lateral'], ['gluteo_medio', 'quadriceps'], ['gluteo_maximo']],
  [['elevacao pelvica'], ['gluteo_maximo'], ['posterior', 'gluteo_medio']],
  [['ponte'], ['gluteo_maximo'], ['posterior', 'lombar']],
  [['frog pump'], ['gluteo_maximo'], ['gluteo_medio']],
  [['pull through'], ['gluteos', 'posterior'], ['lombar']],
  [['kettlebell swing'], ['gluteos', 'posterior'], ['lombar', 'ombro', 'abdomen']],
  [['coice'], ['gluteo_maximo'], ['posterior']],
  [['gluteo'], ['gluteos'], ['posterior']],
  [['mini band'], ['gluteo_medio'], []],
  [['panturrilha'], ['panturrilha'], []],
  [['obliquo'], ['obliquos'], ['abdomen']],
  [['abdominal bicicleta'], ['abdomen', 'obliquos'], []],
  [['abdominal infra'], ['abdomen_inferior'], ['obliquos']],
  [['abdominal supra'], ['abdomen_superior'], ['obliquos']],
  [['abdominal canivete'], ['abdomen_superior', 'abdomen_inferior'], ['obliquos']],
  [['elevacao de joelhos'], ['abdomen_inferior'], ['obliquos']],
  [['abdominal tesoura'], ['abdomen_inferior'], []],
  [['toque no calcanhar'], ['obliquos'], ['abdomen_superior']],
  [['lenhador'], ['obliquos'], ['abdomen']],
  [['corda naval'], ['ombro'], ['abdomen', 'biceps', 'antebraco']],
  [['russian'], ['obliquos'], ['abdomen']],
  [['prancha lateral'], ['obliquos'], ['abdomen']],
  [['pallof'], ['obliquos'], ['abdomen']],
  [['abdominal'], ['abdomen'], ['obliquos']],
  [['prancha'], ['abdomen'], ['obliquos', 'ombro']],
  [['elevacao de pernas'], ['abdomen_inferior'], ['obliquos']],
  [['rollout'], ['abdomen'], ['dorsais', 'ombro']],
  [['mountain climber'], ['abdomen'], ['quadriceps', 'ombro']],
  [['burpee'], ['quadriceps', 'peito'], ['ombro', 'triceps', 'abdomen', 'gluteos']],
  [['remo ergometro'], ['dorsais', 'quadriceps'], ['biceps', 'posterior', 'gluteos']],
]

// Músculo mais ativo, com o nome anatômico (a primeira regra que bate vale). Sem regra: o grupo principal.
const FOCO = [
  [['supino inclinado'], 'Peitoral (parte de cima)'], [['supino declinado'], 'Peitoral (parte de baixo)'],
  [['supino fechado'], 'Tríceps braquial'], [['flexao', 'fechada'], 'Tríceps braquial'],
  [['crucifixo inverso'], 'Deltoide posterior'], [['face pull'], 'Deltoide posterior'],
  [['pullover'], 'Grande dorsal e peitoral'], [['supino'], 'Peitoral maior'], [['crucifixo'], 'Peitoral maior'],
  [['crossover'], 'Peitoral maior'], [['peck'], 'Peitoral maior'], [['flexao de braco'], 'Peitoral maior'],
  [['remada alta'], 'Deltoide lateral e trapézio'], [['remada'], 'Grande dorsal e romboides'],
  [['puxada'], 'Grande dorsal'], [['barra fixa'], 'Grande dorsal'], [['pulldown'], 'Grande dorsal'],
  [['terra romeno'], 'Isquiotibiais'], [['terra sumo'], 'Glúteo máximo e adutores'], [['levantamento terra'], 'Glúteo máximo e isquiotibiais'],
  [['encolhimento'], 'Trapézio superior'], [['desenvolvimento'], 'Deltoide anterior'],
  [['elevacao lateral'], 'Deltoide lateral'], [['elevacao frontal'], 'Deltoide anterior'], [['rotacao externa'], 'Manguito rotador'],
  [['rosca punho'], 'Flexores do punho'], [['rosca inversa'], 'Braquiorradial'], [['rosca martelo'], 'Braquial e braquiorradial'],
  [['rosca concentrada'], 'Bíceps (pico)'], [['rosca scott'], 'Bíceps (parte de baixo)'], [['rosca'], 'Bíceps braquial'],
  [['triceps testa'], 'Tríceps (cabeça longa)'], [['triceps frances'], 'Tríceps (cabeça longa)'], [['triceps'], 'Tríceps (cabeça lateral)'],
  [['mergulho'], 'Tríceps e peitoral de baixo'],
  [['cadeira extensora'], 'Reto femoral e vastos'], [['agachamento sumo'], 'Adutores e glúteo máximo'], [['bulgaro'], 'Glúteo máximo e quadríceps'],
  [['agachamento'], 'Quadríceps (vastos)'], [['leg press'], 'Quadríceps (vastos)'], [['hack'], 'Quadríceps (vastos)'],
  [['afundo'], 'Glúteo máximo e quadríceps'], [['avanco'], 'Glúteo máximo e quadríceps'], [['passada'], 'Glúteo máximo e quadríceps'],
  [['flexora'], 'Bíceps femoral'], [['stiff'], 'Isquiotibiais'], [['good morning'], 'Isquiotibiais e eretores'],
  [['adutora'], 'Adutores da coxa'], [['abdutora'], 'Glúteo médio'], [['abducao'], 'Glúteo médio'], [['mini band'], 'Glúteo médio'],
  [['elevacao pelvica'], 'Glúteo máximo'], [['ponte'], 'Glúteo máximo'], [['coice'], 'Glúteo máximo'],
  [['panturrilha sentad'], 'Sóleo'], [['panturrilha'], 'Gastrocnêmio'],
  [['lombar'], 'Eretores da espinha'], [['superman'], 'Eretores da espinha'],
  [['obliquo'], 'Oblíquos'], [['russian'], 'Oblíquos'], [['prancha lateral'], 'Oblíquos'], [['pallof'], 'Oblíquos'],
  [['abdominal infra'], 'Reto abdominal (parte de baixo)'], [['abdominal supra'], 'Reto abdominal (parte de cima)'],
  [['elevacao de joelhos'], 'Reto abdominal (parte de baixo)'], [['abdominal tesoura'], 'Reto abdominal (parte de baixo)'],
  [['elevacao em y'], 'Deltoide lateral e trapézio inferior'], [['landmine'], 'Deltoide anterior'], [['pike'], 'Deltoide anterior'],
  [['ostra'], 'Glúteo médio'], [['caminhada lateral'], 'Glúteo médio'], [['frog pump'], 'Glúteo máximo'],
  [['crucifixo inclinado'], 'Peitoral (parte de cima)'], [['crossover polia baixa'], 'Peitoral (parte de cima)'], [['crossover polia alta'], 'Peitoral (parte de baixo)'],
  [['elevacao de pernas'], 'Reto abdominal (parte de baixo)'], [['prancha'], 'Transverso do abdômen'], [['abdominal'], 'Reto abdominal'],
]

const unicos = (l) => [...new Set(l)]

// { principais: ['peito'], secundarios: ['triceps', 'ombro'], ativo: 'peito', foco: 'Peitoral maior' }.
// `ativo` é o grupo mais ativo (o primeiro principal) e `foco`, o nome do músculo que mais trabalha.
export function musculosDoExercicio(nome, lista) {
  const texto = semAcento(nome)
  const regra = REGRAS.find(([palavras]) => palavras.every((p) => texto.includes(p)))
  const [principais, secundarios] = regra ? [regra[1], regra[2]] : DO_GRUPO[grupoDoExercicio(nome, lista)] || [[], []]
  const ativo = principais[0] || null
  const foco = FOCO.find(([palavras]) => palavras.every((p) => texto.includes(p)))?.[1] || (ativo && nomeMusculo(ativo))
  return { principais: unicos(principais), secundarios: unicos(secundarios).filter((m) => !principais.includes(m)), ativo, foco }
}

// Mapa da semana: quantas vezes cada músculo foi trabalhado como principal (secundário conta meio).
// exercicios: nomes dos exercícios feitos (um por registro).
export function cargaPorMusculo(exercicios) {
  const conta = {}
  for (const nome of exercicios) {
    const { principais, secundarios } = musculosDoExercicio(nome)
    // Regiões contam no músculo delas, uma vez por exercício (ombro frontal + lateral = 1 de ombro).
    const p = unicos(principais.map(paiDe))
    const sec = unicos(secundarios.map(paiDe)).filter((m) => !p.includes(m))
    for (const m of p) conta[m] = (conta[m] || 0) + 1
    for (const m of sec) conta[m] = (conta[m] || 0) + 0.5
  }
  return conta
}

// Grupos grandes que ficaram sem treino na semana (para a dica "faltou").
const GRANDES = ['peito', 'dorsais', 'ombro', 'quadriceps', 'posterior', 'gluteos', 'abdomen']
export const faltouNaSemana = (conta) => GRANDES.filter((m) => !(conta[m] >= 1))
