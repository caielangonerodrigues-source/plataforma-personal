// Treinos modelo: fichas prontas que o personal aplica em qualquer aluno.

const ex = (nome, series, reps, descanso = '60s', obs = null) => ({ nome, series, reps, carga: '—', descanso, obs, video_url: null })

export const MODELOS_PRONTOS = [
  {
    nome: 'Iniciante · corpo todo', descricao: 'Primeiras semanas, 2 a 3 vezes por semana, foco em técnica.',
    fichas: [
      { nome: 'A', foco: 'Corpo todo', exercicios: [ex('Leg press 45°', 3, '12-15'), ex('Supino reto com halteres', 3, '12'), ex('Puxada frontal', 3, '12'), ex('Cadeira extensora', 2, '15', '45s'), ex('Mesa flexora', 2, '15', '45s'), ex('Prancha', 3, '30s', '30s')] },
      { nome: 'B', foco: 'Corpo todo', exercicios: [ex('Agachamento no banco', 3, '12'), ex('Remada baixa', 3, '12'), ex('Desenvolvimento com halteres', 3, '12'), ex('Elevação pélvica', 3, '15'), ex('Panturrilha em pé', 3, '15', '30s'), ex('Abdominal supra', 3, '15', '30s')] },
    ],
  },
  {
    nome: 'Hipertrofia · ABC', descricao: 'Divisão em 3 treinos para quem já treina há alguns meses.',
    fichas: [
      { nome: 'A', foco: 'Peito, ombro e tríceps', exercicios: [ex('Supino reto', 4, '8-10', '90s'), ex('Supino inclinado com halteres', 3, '10'), ex('Crucifixo', 3, '12'), ex('Desenvolvimento', 3, '10'), ex('Elevação lateral', 3, '12-15', '45s'), ex('Tríceps corda', 3, '12', '45s')] },
      { nome: 'B', foco: 'Costas e bíceps', exercicios: [ex('Puxada frontal', 4, '8-10', '90s'), ex('Remada curvada', 3, '10'), ex('Remada baixa', 3, '12'), ex('Pulldown', 3, '12'), ex('Rosca direta', 3, '10', '45s'), ex('Rosca martelo', 3, '12', '45s')] },
      { nome: 'C', foco: 'Pernas', exercicios: [ex('Agachamento livre', 4, '8-10', '120s'), ex('Leg press 45°', 3, '10-12', '90s'), ex('Cadeira extensora', 3, '12'), ex('Stiff', 3, '10'), ex('Mesa flexora', 3, '12'), ex('Panturrilha em pé', 4, '15', '30s')] },
    ],
  },
  {
    nome: 'Emagrecimento · circuito', descricao: 'Pouco descanso entre exercícios e cardio no fim.',
    fichas: [
      { nome: 'A', foco: 'Inferiores + cardio', exercicios: [ex('Agachamento livre', 3, '15', '30s'), ex('Afundo', 3, '12 cada perna', '30s'), ex('Elevação pélvica', 3, '15', '30s'), ex('Cadeira abdutora', 3, '20', '30s'), ex('Esteira inclinada', 1, '20 min', '—', 'Ritmo de conversa difícil')] },
      { nome: 'B', foco: 'Superiores + core', exercicios: [ex('Flexão de braço', 3, '12', '30s'), ex('Remada baixa', 3, '15', '30s'), ex('Desenvolvimento com halteres', 3, '15', '30s'), ex('Prancha', 3, '40s', '20s'), ex('Bike', 1, '20 min', '—', 'Intervalado: 1 min forte, 1 min leve')] },
    ],
  },
]

// Fichas do aluno no formato de modelo (sem ids, cargas e vídeos mantidos).
export function fichasDoAluno(treinos) {
  return treinos.map((t) => ({
    nome: t.nome, foco: t.foco,
    exercicios: t.exercicios.map(({ nome, series, reps, carga, descanso, obs, video_url }) => ({ nome, series, reps, carga, descanso, obs, video_url })),
  }))
}

// Letras das fichas novas: as do modelo, ou continuando A, B, C... depois das que o aluno já tem.
export function letrasAoAplicar(fichasModelo, existentes) {
  if (!existentes.length) return fichasModelo.map((f) => f.nome)
  const usadas = new Set(existentes.map((t) => t.nome))
  const letras = []
  for (let c = 65; letras.length < fichasModelo.length && c < 91; c++) {
    const l = String.fromCharCode(c)
    if (!usadas.has(l)) letras.push(l)
  }
  return letras
}

export const resumoModelo = (m) => `${m.fichas.length} ${m.fichas.length === 1 ? 'ficha' : 'fichas'} · ${m.fichas.reduce((t, f) => t + f.exercicios.length, 0)} exercícios`
