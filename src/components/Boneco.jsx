// O bonequinho da Corpo Atlético (pose de bíceps do logo antigo, redesenhado em silhueta).
// Desenhado numa caixa de 100 x 140. `corte` é a cor das linhas dos músculos (a cor do fundo).
export const BONECO_CORPO = [
  'M55 18 L63 18 L64 25 L55 25 Z',
  'M19 24 Q19 14 26 8 Q30 3 35 2 Q41 1 41.5 6 Q42 10 38 12 Q34 14 33 18 Q37 13 43 15 Q48 17 50 22 L55 23 L62 23 Q71 21 77 25 Q83 29 82 38 Q84 46 84 54 Q84 61 81 67 L78 74 Q77 79 73 78 Q70 76 72 71 L74 63 Q75 56 73 50 Q71 58 67 70 Q71 76 71 84 Q72 95 70 104 L68 111 Q71 120 69 128 L68 133 Q73 134 74 137 L62 138 Q61 130 62 124 Q61 117 62 110 Q61 100 59 92 L57 91 Q55 99 52 106 Q55 115 58 124 L60 132 Q63 133 64 136 L53 137 Q51 128 47 120 Q43 112 44 104 Q45 94 49 85 Q50 78 52 71 Q48 62 46 54 Q45 46 45 40 Q38 38 30 36 Q20 34 19 24 Z',
]
export const BONECO_DETALHES = [
  'M45 40 Q47 33 52 30',
  'M53 35 Q60 40 69 36',
  'M76 32 Q73 38 74 46',
  'M34 25 Q38 21 44 22',
  'M60 98 Q62 106 63 110',
  'M49 96 Q50 104 49 108',
]

export default function Boneco({ cor = 'currentColor', corte = 'var(--surface)', altura = 140, ...resto }) {
  return (
    <svg width={altura * 100 / 140} height={altura} viewBox="0 0 100 140" aria-hidden="true" {...resto}>
      <ellipse cx="59" cy="12.5" rx="7" ry="8.3" fill={cor} />
      {BONECO_CORPO.map((d) => <path key={d} d={d} fill={cor} />)}
      <g fill="none" stroke={corte} strokeWidth="1.5" strokeLinecap="round">{BONECO_DETALHES.map((d) => <path key={d} d={d} />)}</g>
    </svg>
  )
}
