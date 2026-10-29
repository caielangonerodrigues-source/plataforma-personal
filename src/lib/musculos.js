// Músculos que cada exercício trabalha, para o bonequinho (frente e costas).
// Primeiro olha palavras do nome (ex.: "supino", "remada"); se não achar, usa o grupo muscular da biblioteca.
import { grupoDoExercicio, semAcento } from './exercicios.js'

export const MUSCULOS = {
  peito: 'Peito', ombro: 'Ombros', biceps: 'Bíceps', triceps: 'Tríceps', antebraco: 'Antebraço',
  abdomen: 'Abdômen', obliquos: 'Oblíquos', quadriceps: 'Quadríceps', adutores: 'Adutores', panturrilha: 'Panturrilha',
  trapezio: 'Trapézio', dorsais: 'Dorsais', lombar: 'Lombar', gluteos: 'Glúteos', posterior: 'Posterior de coxa',
}

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
  [['crucifixo inverso'], ['ombro'], ['trapezio']],
  [['pullover'], ['peito', 'dorsais'], ['triceps']],
  [['supino'], ['peito'], ['triceps', 'ombro']],
  [['crucifixo'], ['peito'], ['ombro']],
  [['crossover'], ['peito'], ['ombro']],
  [['peck'], ['peito'], ['ombro']],
  [['chest press'], ['peito'], ['triceps', 'ombro']],
  [['paralelas para peito'], ['peito'], ['triceps', 'ombro']],
  [['flexao de braco'], ['peito'], ['triceps', 'ombro', 'abdomen']],
  [['flexao no trx'], ['peito'], ['triceps', 'abdomen']],
  [['remada alta'], ['ombro', 'trapezio'], ['biceps']],
  [['remada'], ['dorsais', 'trapezio'], ['biceps', 'ombro']],
  [['puxada'], ['dorsais'], ['biceps', 'trapezio']],
  [['barra fixa'], ['dorsais'], ['biceps', 'antebraco']],
  [['pulldown'], ['dorsais'], ['triceps']],
  [['terra romeno'], ['posterior', 'gluteos'], ['lombar']],
  [['terra sumo'], ['gluteos', 'adutores'], ['posterior', 'lombar', 'quadriceps']],
  [['levantamento terra'], ['posterior', 'gluteos', 'lombar'], ['quadriceps', 'trapezio', 'antebraco']],
  [['lombar'], ['lombar'], ['gluteos']],
  [['superman'], ['lombar'], ['gluteos']],
  [['encolhimento'], ['trapezio'], ['antebraco']],
  [['face pull'], ['ombro'], ['trapezio']],
  [['desenvolvimento'], ['ombro'], ['triceps', 'trapezio']],
  [['elevacao lateral'], ['ombro'], ['trapezio']],
  [['elevacao frontal'], ['ombro'], []],
  [['rotacao externa'], ['ombro'], []],
  [['rosca punho'], ['antebraco'], []],
  [['rosca inversa'], ['antebraco'], ['biceps']],
  [['rosca martelo'], ['biceps', 'antebraco'], []],
  [['rosca'], ['biceps'], ['antebraco']],
  [['triceps'], ['triceps'], []],
  [['mergulho'], ['triceps'], ['peito', 'ombro']],
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
  [['abdutora'], ['gluteos'], []],
  [['abducao'], ['gluteos'], []],
  [['elevacao pelvica'], ['gluteos'], ['posterior']],
  [['ponte'], ['gluteos'], ['posterior', 'lombar']],
  [['pull through'], ['gluteos', 'posterior'], ['lombar']],
  [['kettlebell swing'], ['gluteos', 'posterior'], ['lombar', 'ombro', 'abdomen']],
  [['coice'], ['gluteos'], ['posterior']],
  [['gluteo'], ['gluteos'], ['posterior']],
  [['mini band'], ['gluteos'], []],
  [['panturrilha'], ['panturrilha'], []],
  [['obliquo'], ['obliquos'], ['abdomen']],
  [['abdominal bicicleta'], ['abdomen', 'obliquos'], []],
  [['corda naval'], ['ombro'], ['abdomen', 'biceps', 'antebraco']],
  [['russian'], ['obliquos'], ['abdomen']],
  [['prancha lateral'], ['obliquos'], ['abdomen']],
  [['pallof'], ['obliquos'], ['abdomen']],
  [['abdominal'], ['abdomen'], ['obliquos']],
  [['prancha'], ['abdomen'], ['obliquos', 'ombro']],
  [['elevacao de pernas'], ['abdomen'], ['obliquos']],
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
  const foco = FOCO.find(([palavras]) => palavras.every((p) => texto.includes(p)))?.[1] || (ativo && MUSCULOS[ativo])
  return { principais: unicos(principais), secundarios: unicos(secundarios).filter((m) => !principais.includes(m)), ativo, foco }
}

// Mapa da semana: quantas vezes cada músculo foi trabalhado como principal (secundário conta meio).
// exercicios: nomes dos exercícios feitos (um por registro).
export function cargaPorMusculo(exercicios) {
  const conta = {}
  for (const nome of exercicios) {
    const { principais, secundarios } = musculosDoExercicio(nome)
    for (const m of principais) conta[m] = (conta[m] || 0) + 1
    for (const m of secundarios) conta[m] = (conta[m] || 0) + 0.5
  }
  return conta
}

// Grupos grandes que ficaram sem treino na semana (para a dica "faltou").
const GRANDES = ['peito', 'dorsais', 'ombro', 'quadriceps', 'posterior', 'gluteos', 'abdomen']
export const faltouNaSemana = (conta) => GRANDES.filter((m) => !(conta[m] >= 1))
