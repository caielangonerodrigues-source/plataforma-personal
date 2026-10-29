// Biblioteca de exercícios para montar as fichas: grupo muscular, nome e equipamento.
// O personal também cadastra os dele (tabela exercicios_biblioteca), que aparecem junto.

export const GRUPOS = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraço', 'Quadríceps', 'Posterior de coxa', 'Glúteos', 'Panturrilha', 'Abdômen e core', 'Cardio', 'Funcional', 'Mobilidade e alongamento']

const g = (grupo, lista) => lista.map(([nome, equipamento]) => ({ grupo, nome, equipamento }))

export const BIBLIOTECA = [
  ...g('Peito', [
    ['Supino reto com barra', 'Barra'], ['Supino reto com halteres', 'Halteres'], ['Supino inclinado com barra', 'Barra'],
    ['Supino inclinado com halteres', 'Halteres'], ['Supino declinado com barra', 'Barra'], ['Supino declinado com halteres', 'Halteres'],
    ['Supino reto na máquina', 'Máquina'], ['Supino inclinado na máquina', 'Máquina'], ['Supino no Smith', 'Smith'],
    ['Supino inclinado no Smith', 'Smith'], ['Crucifixo reto com halteres', 'Halteres'], ['Crucifixo inclinado com halteres', 'Halteres'],
    ['Crucifixo na máquina (peck deck)', 'Máquina'], ['Crossover polia alta', 'Polia'], ['Crossover polia baixa', 'Polia'],
    ['Crossover polia média', 'Polia'], ['Flexão de braço', 'Peso do corpo'], ['Flexão de braço com joelhos apoiados', 'Peso do corpo'],
    ['Flexão de braço inclinada', 'Peso do corpo'], ['Flexão de braço declinada', 'Peso do corpo'], ['Pullover com halter', 'Halteres'],
    ['Paralelas para peito', 'Peso do corpo'], ['Chest press articulado', 'Máquina'],
  ]),
  ...g('Costas', [
    ['Puxada frontal aberta', 'Polia'], ['Puxada frontal fechada (triângulo)', 'Polia'], ['Puxada frontal supinada', 'Polia'],
    ['Puxada unilateral na polia', 'Polia'], ['Barra fixa pronada', 'Peso do corpo'], ['Barra fixa supinada', 'Peso do corpo'],
    ['Barra fixa no graviton', 'Máquina'], ['Remada baixa com triângulo', 'Polia'], ['Remada baixa aberta', 'Polia'],
    ['Remada curvada com barra pronada', 'Barra'], ['Remada curvada com barra supinada', 'Barra'], ['Remada unilateral com halter (serrote)', 'Halteres'],
    ['Remada cavalinho', 'Barra'], ['Remada articulada', 'Máquina'], ['Remada na máquina', 'Máquina'], ['Remada alta com barra', 'Barra'],
    ['Pulldown com corda', 'Polia'], ['Pulldown com barra reta', 'Polia'], ['Levantamento terra', 'Barra'],
    ['Extensão lombar no banco romano', 'Banco'], ['Superman no solo', 'Peso do corpo'], ['Remada invertida', 'Peso do corpo'],
    ['Encolhimento com barra', 'Barra'], ['Encolhimento com halteres', 'Halteres'],
  ]),
  ...g('Ombros', [
    ['Desenvolvimento com barra', 'Barra'], ['Desenvolvimento com halteres', 'Halteres'], ['Desenvolvimento na máquina', 'Máquina'],
    ['Desenvolvimento no Smith', 'Smith'], ['Desenvolvimento Arnold', 'Halteres'], ['Elevação lateral com halteres', 'Halteres'],
    ['Elevação lateral na polia', 'Polia'], ['Elevação lateral na máquina', 'Máquina'], ['Elevação frontal com halteres', 'Halteres'],
    ['Elevação frontal com barra', 'Barra'], ['Elevação frontal na polia', 'Polia'], ['Crucifixo inverso com halteres', 'Halteres'],
    ['Crucifixo inverso na máquina', 'Máquina'], ['Face pull na polia', 'Polia'], ['Remada alta na polia', 'Polia'],
    ['Rotação externa na polia', 'Polia'], ['Rotação externa com halter deitado', 'Halteres'], ['Desenvolvimento militar em pé', 'Barra'],
  ]),
  ...g('Bíceps', [
    ['Rosca direta com barra', 'Barra'], ['Rosca direta com barra W', 'Barra'], ['Rosca alternada com halteres', 'Halteres'],
    ['Rosca martelo', 'Halteres'], ['Rosca concentrada', 'Halteres'], ['Rosca Scott com barra W', 'Barra'],
    ['Rosca Scott na máquina', 'Máquina'], ['Rosca Scott unilateral com halter', 'Halteres'], ['Rosca na polia baixa', 'Polia'],
    ['Rosca com corda na polia', 'Polia'], ['Rosca inclinada com halteres', 'Halteres'], ['Rosca 21', 'Barra'],
    ['Rosca bíceps na polia alta', 'Polia'], ['Rosca spider', 'Halteres'],
  ]),
  ...g('Tríceps', [
    ['Tríceps na polia com barra', 'Polia'], ['Tríceps corda', 'Polia'], ['Tríceps na polia unilateral', 'Polia'],
    ['Tríceps testa com barra W', 'Barra'], ['Tríceps testa com halteres', 'Halteres'], ['Tríceps francês com halter', 'Halteres'],
    ['Tríceps francês na polia', 'Polia'], ['Tríceps coice com halter', 'Halteres'], ['Tríceps coice na polia', 'Polia'],
    ['Mergulho no banco', 'Banco'], ['Paralelas para tríceps', 'Peso do corpo'], ['Supino fechado', 'Barra'],
    ['Tríceps na máquina', 'Máquina'], ['Flexão de braço fechada (diamante)', 'Peso do corpo'],
  ]),
  ...g('Antebraço', [
    ['Rosca punho com barra', 'Barra'], ['Rosca punho inversa', 'Barra'], ['Rosca inversa com barra', 'Barra'],
    ['Caminhada do fazendeiro', 'Halteres'], ['Rolo de punho', 'Acessório'],
  ]),
  ...g('Quadríceps', [
    ['Agachamento livre com barra', 'Barra'], ['Agachamento frontal', 'Barra'], ['Agachamento no Smith', 'Smith'],
    ['Agachamento goblet', 'Halteres'], ['Agachamento sumô com halter', 'Halteres'], ['Agachamento no banco', 'Peso do corpo'],
    ['Agachamento livre (peso do corpo)', 'Peso do corpo'], ['Agachamento búlgaro', 'Halteres'], ['Agachamento hack na máquina', 'Máquina'],
    ['Agachamento pêndulo', 'Máquina'], ['Leg press 45°', 'Máquina'], ['Leg press horizontal', 'Máquina'],
    ['Leg press unilateral', 'Máquina'], ['Cadeira extensora', 'Máquina'], ['Cadeira extensora unilateral', 'Máquina'],
    ['Afundo com halteres', 'Halteres'], ['Afundo no Smith', 'Smith'], ['Avanço caminhando', 'Halteres'],
    ['Passada para trás', 'Halteres'], ['Subida no banco (step-up)', 'Banco'], ['Agachamento na parede (isometria)', 'Peso do corpo'],
    ['Sissy squat', 'Peso do corpo'],
  ]),
  ...g('Posterior de coxa', [
    ['Mesa flexora', 'Máquina'], ['Cadeira flexora', 'Máquina'], ['Flexora em pé unilateral', 'Máquina'],
    ['Stiff com barra', 'Barra'], ['Stiff com halteres', 'Halteres'], ['Levantamento terra romeno', 'Barra'],
    ['Stiff unilateral com halter', 'Halteres'], ['Good morning', 'Barra'], ['Flexão nórdica', 'Peso do corpo'],
    ['Flexão de joelho na bola suíça', 'Bola'],
  ]),
  ...g('Glúteos', [
    ['Elevação pélvica com barra', 'Barra'], ['Elevação pélvica na máquina', 'Máquina'], ['Elevação pélvica unilateral', 'Peso do corpo'],
    ['Ponte de glúteo no solo', 'Peso do corpo'], ['Cadeira abdutora', 'Máquina'], ['Cadeira adutora', 'Máquina'],
    ['Abdução de quadril na polia', 'Polia'], ['Coice na polia (glúteo)', 'Polia'], ['Glúteo na máquina (coice)', 'Máquina'],
    ['Glúteo quatro apoios com caneleira', 'Caneleira'], ['Abdução lateral deitada com caneleira', 'Caneleira'],
    ['Agachamento sumô com barra', 'Barra'], ['Levantamento terra sumô', 'Barra'], ['Pull through na polia', 'Polia'],
    ['Caminhada lateral com mini band', 'Elástico'], ['Ostra com mini band', 'Elástico'],
  ]),
  ...g('Panturrilha', [
    ['Panturrilha em pé na máquina', 'Máquina'], ['Panturrilha sentada', 'Máquina'], ['Panturrilha no leg press', 'Máquina'],
    ['Panturrilha no Smith', 'Smith'], ['Panturrilha unilateral com halter', 'Halteres'], ['Panturrilha no degrau (peso do corpo)', 'Peso do corpo'],
  ]),
  ...g('Abdômen e core', [
    ['Abdominal supra', 'Peso do corpo'], ['Abdominal infra', 'Peso do corpo'], ['Abdominal oblíquo', 'Peso do corpo'],
    ['Abdominal bicicleta', 'Peso do corpo'], ['Abdominal remador', 'Peso do corpo'], ['Abdominal na polia (crunch)', 'Polia'],
    ['Abdominal na máquina', 'Máquina'], ['Elevação de pernas na barra', 'Peso do corpo'], ['Elevação de pernas no banco', 'Banco'],
    ['Prancha frontal', 'Peso do corpo'], ['Prancha lateral', 'Peso do corpo'], ['Prancha com toque no ombro', 'Peso do corpo'],
    ['Dead bug', 'Peso do corpo'], ['Perdigueiro (bird dog)', 'Peso do corpo'], ['Russian twist', 'Anilha'],
    ['Pallof press', 'Polia'], ['Rollout com roda', 'Acessório'], ['Vacuum abdominal', 'Peso do corpo'],
  ]),
  ...g('Cardio', [
    ['Esteira caminhada', 'Esteira'], ['Esteira corrida', 'Esteira'], ['Esteira inclinada', 'Esteira'],
    ['Bicicleta ergométrica', 'Bike'], ['Spinning', 'Bike'], ['Elíptico', 'Elíptico'], ['Escada (simulador)', 'Escada'],
    ['Remo ergômetro', 'Remo'], ['Pular corda', 'Corda'], ['Polichinelo', 'Peso do corpo'], ['Corrida estacionária', 'Peso do corpo'],
    ['HIIT na bike (30s forte / 30s leve)', 'Bike'], ['HIIT na esteira (tiros)', 'Esteira'],
  ]),
  ...g('Funcional', [
    ['Burpee', 'Peso do corpo'], ['Kettlebell swing', 'Kettlebell'], ['Agachamento com salto', 'Peso do corpo'],
    ['Afundo com salto', 'Peso do corpo'], ['Mountain climber', 'Peso do corpo'], ['Thruster', 'Halteres'],
    ['Wall ball', 'Medicine ball'], ['Arremesso de medicine ball no chão (slam)', 'Medicine ball'], ['Corda naval (battle rope)', 'Corda naval'],
    ['Box jump', 'Caixa'], ['Farmer walk', 'Halteres'], ['Turkish get-up', 'Kettlebell'], ['Sprawl', 'Peso do corpo'],
    ['Skipping', 'Peso do corpo'], ['Agilidade na escada de chão', 'Escada de agilidade'], ['Remada no TRX', 'TRX'],
    ['Agachamento no TRX', 'TRX'], ['Flexão no TRX', 'TRX'],
  ]),
  ...g('Mobilidade e alongamento', [
    ['Mobilidade de quadril (90/90)', 'Peso do corpo'], ['Mobilidade de tornozelo na parede', 'Peso do corpo'], ['Mobilidade torácica (rotação em 4 apoios)', 'Peso do corpo'],
    ['Gato e camelo', 'Peso do corpo'], ['Alongamento de posterior de coxa', 'Peso do corpo'], ['Alongamento de quadríceps em pé', 'Peso do corpo'],
    ['Alongamento de flexor de quadril (afundo)', 'Peso do corpo'], ['Alongamento de peitoral na parede', 'Peso do corpo'], ['Postura da criança', 'Peso do corpo'],
    ['Liberação miofascial com rolo (coxa)', 'Rolo'], ['Liberação miofascial com rolo (costas)', 'Rolo'], ['Rotação de ombro com bastão', 'Bastão'],
  ]),
]

// Busca sem acento e sem diferenciar maiúsculas.
export const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function filtrarExercicios(lista, { busca = '', grupo = '' } = {}) {
  const termos = semAcento(busca).split(/\s+/).filter(Boolean)
  return lista.filter((e) => {
    if (grupo && e.grupo !== grupo) return false
    const texto = semAcento(`${e.nome} ${e.grupo} ${e.equipamento || ''}`)
    return termos.every((t) => texto.includes(t))
  })
}

// Exercícios do personal primeiro, sem repetir nomes da biblioteca.
export function juntarBiblioteca(meus = []) {
  const nomes = new Set(meus.map((e) => semAcento(e.nome)))
  return [...meus.map((e) => ({ ...e, meu: true })), ...BIBLIOTECA.filter((e) => !nomes.has(semAcento(e.nome)))]
}

// Link de busca no YouTube para ver a execução de um exercício.
export const buscaVideo = (nome) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${nome} execução`)}`

// Grupo muscular de um exercício da ficha: pelo nome exato na biblioteca ou, se não achar,
// pelo exercício da biblioteca que tem mais palavras em comum (pelo menos a primeira, ex.: "Supino").
export function grupoDoExercicio(nome, lista = BIBLIOTECA) {
  const alvo = semAcento(nome).trim()
  const exato = lista.find((e) => semAcento(e.nome) === alvo)
  if (exato) return exato.grupo
  const palavras = alvo.split(/[^a-z0-9]+/).filter((p) => p.length > 2)
  let melhor = null, pontos = 0
  for (const e of lista) {
    const outras = semAcento(e.nome).split(/[^a-z0-9]+/)
    if (!palavras.length || outras[0] !== palavras[0]) continue
    const p = palavras.filter((x) => outras.includes(x)).length
    if (p > pontos) { melhor = e; pontos = p }
  }
  return melhor?.grupo || null
}

// Variações do mesmo grupo muscular para o aluno trocar quando o aparelho estiver ocupado.
export function alternativas(nome, lista = BIBLIOTECA) {
  const grupo = grupoDoExercicio(nome, lista)
  const alvo = semAcento(nome)
  return grupo ? lista.filter((e) => e.grupo === grupo && semAcento(e.nome) !== alvo) : []
}
