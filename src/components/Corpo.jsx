// Bonequinho de frente e de costas com os músculos acesos.
// Cada músculo é desenhado do lado esquerdo e espelhado para o direito.
// `principais`/`secundarios`: ids de MUSCULOS; ou `intensidade`: { id: 0..1 } para o mapa da semana.
import { MUSCULOS } from '../lib/musculos.js'

// Silhueta (neutra) e músculos de cada vista, em coordenadas de 0 a 100 (largura) × 0 a 220 (altura).
const SILHUETA = [
  'M50 4a11 12 0 1 1 0 24a11 12 0 1 1 0-24z', // cabeça
  'M44 26h12v8H44z', // pescoço
  'M30 36q20-6 40 0l4 8 1 22-3 30-5 12H33l-5-12-3-30 1-22z', // tronco
  'M26 40q-6 2-8 10l-4 30-3 26q0 6 4 6t4-5l4-24 6-26z', 'M74 40q6 2 8 10l4 30 3 26q0 6-4 6t-4-5l-4-24-6-26z', // braços
  'M33 106h16l-1 50-2 50q-2 6-7 6t-6-6l-2-50z', 'M67 106H51l1 50 2 50q2 6 7 6t6-6l2-50z', // pernas
]

const FRENTE = {
  trapezio: 'M44 33q-6 1-11 5l11-1z',
  ombro: 'M31 38q-7 1-9 9-1 7 3 11 3-8 9-12l1-7z',
  peito: 'M35 42q8-4 14-1v15q-8 3-14-1-3-4-1-9z',
  biceps: 'M23 58q4-4 6 0l1 14q-2 6-5 5-4-1-4-7z',
  antebraco: 'M20 80q4-3 6 1l-2 18q-1 5-4 4-3-1-3-5z',
  abdomen: 'M43 59h6.5v38h-5q-2-1-2-4z',
  obliquos: 'M35 60l6 1v34q-4 0-6-6-2-12 0-29z',
  quadriceps: 'M34 108q6-3 12 2l1 26q-1 16-5 20-5 1-7-5-3-16-1-43z',
  adutores: 'M46 110l3.5 1v24q-2 4-3 1z',
  panturrilha: 'M36 162q4-3 7 1l-1 26q-2 4-4 1-3-12-2-28z',
}
const COSTAS = {
  trapezio: 'M50 30l-8 4-10 4 9 4 9 22z',
  ombro: 'M31 38q-7 1-9 9-1 7 3 11 3-8 9-12l1-7z',
  dorsais: 'M34 46l8 2 8 18v16q-6-2-10-8-6-8-7-18z',
  triceps: 'M23 56q4-4 7 0l0 16q-2 6-5 5-4-1-4-7z',
  antebraco: 'M20 80q4-3 6 1l-2 18q-1 5-4 4-3-1-3-5z',
  lombar: 'M42 84q4 3 8 3v12h-7q-2-6-1-15z',
  gluteos: 'M34 102q7-4 15 0v14q-8 4-15 0-2-7 0-14z',
  posterior: 'M35 120q6-3 11 1l-1 24q-1 12-5 13-4 0-5-6-2-16 0-32z',
  panturrilha: 'M35 160q5-4 9 1l-1 18q-2 8-5 7-4-1-4-8-1-10 1-18z',
}

function Vista({ titulo, musculos, cor, tamanho }) {
  return (
    <figure className="corpo-vista">
      <svg viewBox="0 0 100 218" width={tamanho} height={tamanho * 2.18} aria-hidden="true">
        <g className="corpo-silhueta">{SILHUETA.map((d) => <path key={d} d={d} />)}</g>
        {Object.entries(musculos).map(([id, d]) => (
          <g key={id} className="corpo-musculo" style={cor(id)}>
            <path d={d} />
            <path d={d} transform="translate(100 0) scale(-1 1)" />
          </g>
        ))}
      </svg>
      <figcaption>{titulo}</figcaption>
    </figure>
  )
}

export default function Corpo({ principais = [], secundarios = [], intensidade, tamanho = 70, legenda = true }) {
  const nivel = (id) => (intensidade ? Math.min(1, intensidade[id] || 0) : principais.includes(id) ? 1 : secundarios.includes(id) ? 0.45 : 0)
  const cor = (id) => {
    const n = nivel(id)
    return n > 0 ? { fill: 'var(--accent)', fillOpacity: 0.25 + 0.75 * n } : undefined
  }
  const nomes = (l) => l.map((m) => MUSCULOS[m]).join(', ')
  const rotulo = intensidade ? 'Músculos treinados' : `Trabalha: ${nomes(principais)}${secundarios.length ? `. Ajuda: ${nomes(secundarios)}` : ''}`
  return (
    <div className="corpo" role="img" aria-label={rotulo}>
      <div className="corpo-vistas">
        <Vista titulo="Frente" musculos={FRENTE} cor={cor} tamanho={tamanho} />
        <Vista titulo="Costas" musculos={COSTAS} cor={cor} tamanho={tamanho} />
      </div>
      {legenda && !intensidade && (principais.length > 0 || secundarios.length > 0) && (
        <div className="corpo-legenda">
          {principais.length > 0 && <span><i className="forte" />{nomes(principais)}</span>}
          {secundarios.length > 0 && <span><i className="fraco" />{nomes(secundarios)}</span>}
        </div>
      )}
    </div>
  )
}

// Versão pequena para a lista de exercícios: só a vista onde está o músculo principal.
export function CorpoMini({ principais = [], secundarios = [], tamanho = 26, onClick }) {
  const naFrente = principais.some((m) => m in FRENTE && !(m in COSTAS)) || !principais.some((m) => m in COSTAS)
  const cor = (id) => (principais.includes(id) ? { fill: 'var(--accent)', fillOpacity: 1 } : secundarios.includes(id) ? { fill: 'var(--accent)', fillOpacity: 0.45 } : undefined)
  const nomes = principais.map((m) => MUSCULOS[m]).join(', ')
  if (!principais.length && !secundarios.length) return null
  return (
    <button type="button" className="corpo-mini" onClick={onClick} aria-label={`Músculos: ${nomes || 'ver'}`} title={nomes}>
      <Vista titulo="" musculos={naFrente ? FRENTE : COSTAS} cor={cor} tamanho={tamanho} />
    </button>
  )
}
