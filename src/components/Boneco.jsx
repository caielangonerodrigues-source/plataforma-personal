// O bonequinho da Corpo Atlético: o mesmo desenho em linha do logo antigo, vetorizado e limpo para o site.
// Desenhado numa caixa de 77.3 x 140.
import { BONECO_LARGURA, BONECO_PATH } from '../lib/boneco.js'

export { BONECO_LARGURA, BONECO_PATH }

export default function Boneco({ cor = 'currentColor', altura = 140, ...resto }) {
  return (
    <svg width={(altura * BONECO_LARGURA) / 140} height={altura} viewBox={`0 0 ${BONECO_LARGURA} 140`} aria-hidden="true" {...resto}>
      <path fillRule="evenodd" fill={cor} d={BONECO_PATH} />
    </svg>
  )
}
