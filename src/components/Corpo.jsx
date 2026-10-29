// Bonequinho de frente e de costas com os músculos acesos.
// Cada músculo é desenhado do lado esquerdo e espelhado para o direito.
// `principais`/`secundarios`: ids de MUSCULOS; ou `intensidade`: { id: 0..1 } para o mapa da semana.
import { useId } from 'react'
import { MUSCULOS } from '../lib/musculos.js'

// Silhueta (neutra) e músculos de cada vista, em coordenadas de 0 a 100 (largura) × 0 a 218 (altura).
// Só o lado esquerdo; cada músculo pode ter várias partes (ex.: os gomos do abdômen, as cabeças do quadríceps).
const SILHUETA = [
  'M50.6 3C44.5 3 41.5 7.5 41.5 13.5c0 5 1.5 9 3.5 11l.2 4C42 30.5 36 31.5 30 33c-7 1.5-11 5-12 11-1 6-2 12-3.5 18-1 4-1.5 7-2 10-1.5 8-3 16-4 24l-1 7c-2 2-3 5-2.7 8 .2 3 1.7 5 3.2 5s2.5-2 3-5l.5-6 .5-2c2.5-8 5.5-17 7.5-25 1-4 2-7 3-10 2-5 4-11 5.5-17l3.5-1c1.5 8 2 16 3 24s1 14-.5 20c-2 6-3.5 14-3.5 22 0 12 2 24 4 34-1.5 5-3 12-2.5 19 .5 9 3 21 4 31-1.5 3-2.5 5.5-1.5 7l8.5.5c.5-2.5-.5-5-1-7.5.5-10 3.5-22 4-32 .5-7-.5-13-.2-18 1.2-10 2.7-22 3.2-32l.4-10 1.2-2z',
]
const ANTEBRACO = [
  'M13 72.6c2.4-1 5-1.2 7.2-.8-1.6 6.2-4.2 12.2-6.8 18.2-1.4 4-2.8 8.6-4 12.6l-1.2-.2c.6-6.6 1.6-14 2.8-20.6.6-3.4 1.2-6.6 2-9.2z',
  'M21.6 72.2c.4 2.4 0 4.8-.8 7.2-1.8 5.6-4.2 11.6-6.4 17.2-1 2.4-1.8 4.6-2.6 6.4l-1.4-.2c1.2-4.8 2.8-10.2 4.6-15.2 1.8-5.2 4-10.6 6.6-15.4z',
]
const OMBRO = ['M31 33.2c-6.5.8-11.5 3.8-12.6 9.8-.6 4-.8 8-1 11 2.2-5 5.6-9 10.2-11.4 1.4-3 2.4-6.2 3.4-9.4z']
const FRENTE = {
  trapezio: ['M45.2 28.4c-3.2 2.2-8.8 3.4-13.6 4.4 4.8 1 10 .8 14-.8z'],
  ombro: OMBRO,
  peito: ['M50 35.2c-6-1.6-13-1.6-18.4-.4-2 3-3 6.2-3.2 9.6 2 5.2 5.6 8.6 11.2 9.6 3.8.6 7.4 0 10.4-1.2z'],
  biceps: ['M17.6 56c2.2-5.4 5.8-10 10.4-12.4.4 5.4-.6 11.4-2.6 16.4-1.2 3.4-2.8 6.4-4.8 8.4-2.2.6-5-.4-5.8-2.4.6-3.6 1.6-7 2.8-10z'],
  antebraco: ANTEBRACO,
  abdomen: [
    'M43.4 56.6c2-.8 4.2-1 6.2-1v7h-6.8c0-2 .2-4 .6-6z', 'M42.8 63.6h6.8v7.4h-6.8z', 'M42.8 72h6.8v7.6h-6.8z',
    'M43 80.6h6.6v20c-2.6-.6-4.2-3-5-6.4-1-4.6-1.6-9-1.6-13.6z',
  ],
  obliquos: ['M41.6 55.6c-3-.2-6-1-8.6-2.4.8 6.8 1.4 13.8 2 20.8.6 7 .8 13 2.6 18 1.4 2.4 3 4 4.2 4.4-.4-7.4-.6-14.4-.6-21.4 0-6.6 0-13 .4-19.4z'],
  quadriceps: [
    'M32.4 101c-1.6 7-1.8 15-1.4 23 .6 10 2.4 18 5.2 25 1-7 .8-14 .2-21-.8-10-1.8-19-4-27z',
    'M35.4 101.6c3.6 4.4 6.8 10.4 8.2 17.4 1.4 7.6 1 15.6-.8 22.6-.8 3.4-2.2 6.4-4 8-1-8-.8-16-1.2-24-.4-8-1-16-2.2-24z',
    'M46.8 127c1 5.4 1.2 11 0 16-.8 3.4-2.6 5.8-5 6.6.2-3.4 1.4-6.8 2.6-10.2 1-4 1.8-8.2 2.4-12.4z',
  ],
  adutores: ['M44.4 104.6c1.6-.8 3.4-.6 5 .2l-.4 7.2c-.6 6-1.4 12-2.6 16.4-1.2-6-2-12-2.2-18 0-2 0-4 .2-5.8z'],
  panturrilha: [
    'M33.8 154.6c1.6 5.4 2.4 11.4 2.6 17.4.2 6-.4 12-1.4 17.6-1.4-5.6-2.2-11.6-2.4-17.6 0-6 .4-12 1.2-17.4z',
    'M37.6 156c1.8 6 2.4 12 2.2 18-.2 6-1.2 12-2.2 17-.6-7-.8-14-.6-21 .1-5 .2-10 .6-14z',
    'M45.4 154.6c.8 5.4.6 11.4-.4 17.4-.8 5-2 9.6-3.4 13.6-.6-6-.4-12 .4-17.6.8-5 2-9.4 3.4-13.4z',
  ],
}
const COSTAS = {
  trapezio: ['M50 24v38c-2.6-5-5-10.4-8-15.4-2.2-3.6-5-7-8.4-10-1-1.2-.8-2.6.4-3.2 3.8-1 8-2.6 10.8-4.6l.6-4.4z'],
  ombro: OMBRO,
  triceps: ['M17.6 56c2.2-5.4 5.8-10 10.4-12.4.6 5.6 0 11.4-1.8 16.8-1.2 3.4-2.8 6.2-4.8 8.2-2.4.6-5.4-.4-6.6-2.6.6-3.6 1.6-7 2.8-10z'],
  antebraco: ANTEBRACO,
  dorsais: ['M32.8 38.4c3.2 3 6.2 6.6 8.8 10.4 2.8 4.2 5.4 8.8 8.4 13.6v16c-3.4.2-7 1-9.6 2.6-2.4-3.6-3.8-8-4.8-12.4-1.2-6-2-12.2-2.8-18.6-.4-4-.4-7.8 0-11.6z'],
  lombar: ['M50 79.6v15.8c-2.8.4-5.6 1.2-8 2.4-.8-4.6-1-9.2-.6-14 2.4-2.4 5.4-3.8 8.6-4.2z'],
  gluteos: ['M50 97v23.6c-5 1.4-10.4 1-15-1.6-2.2-4.8-2.6-10.2-1.6-15.4 2.8-4 9-6.2 16.6-6.6z'],
  posterior: [
    'M32.6 122c2.4 1.4 5.2 2 8 2.2-.2 7-.8 14-1.8 20.6-.6 3.2-1.6 5.8-2.8 7.2-1.8-4-3-8.4-3.6-13-.6-5.6-.4-11.4.2-17z',
    'M42 124.2c2.4 0 4.6-.4 6.8-1.2-.6 6.8-1.4 13.6-2.6 19.8-.6 3.4-1.8 6.4-3.2 8.8-1.6-3.6-1.8-7.6-1.8-11.6.2-5.4.4-10.6.8-15.8z',
  ],
  panturrilha: [
    'M33.6 155c2.2-1 4.8-1 6.6.2.4 6.2 0 12.2-1.2 17.8-.6 3.2-1.6 6-2.8 8-1.6-3-2.6-6.6-3-10.6-.4-5-.2-10.2.4-15.4z',
    'M41.6 155.4c1.6-.8 3.2-.8 4.4 0 .4 5.2 0 10.4-1 15.2-.6 3.2-1.6 6.4-3 9-.6-3.6-.8-7.2-.8-10.8 0-4.6 0-9 .4-13.4z',
  ],
}

const Espelho = ({ partes }) => partes.map((d) => [
  <path key={d} d={d} />,
  <path key={`${d}-d`} d={d} transform="translate(100 0) scale(-1 1)" />,
])

// Volume: cada músculo ganha brilho no meio e sombra nas bordas, mais uma textura leve de fibra;
// a silhueta escurece nas laterais para parecer arredondada.
function Vista({ titulo, musculos, cor, tamanho }) {
  const id = useId().replace(/:/g, '')
  return (
    <figure className="corpo-vista">
      <svg viewBox="0 0 100 218" width={tamanho} height={tamanho * 2.18} aria-hidden="true">
        <defs>
          <radialGradient id={`${id}v`} cx=".45" cy=".4" r=".7">
            <stop offset="0" stopColor="#fff" stopOpacity=".38" />
            <stop offset=".45" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".4" />
          </radialGradient>
          <linearGradient id={`${id}s`} x1="0" x2="50" y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#000" stopOpacity=".22" />
            <stop offset=".55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity=".18" />
          </linearGradient>
          <pattern id={`${id}f`} width="1.3" height="1.3" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
            <rect width=".35" height="1.3" fill="#000" fillOpacity=".13" />
          </pattern>
        </defs>
        <g className="corpo-silhueta"><Espelho partes={SILHUETA} /></g>
        <g fill={`url(#${id}s)`}><Espelho partes={SILHUETA} /></g>
        {Object.entries(musculos).map(([m, partes]) => (
          <g key={m}>
            <g className="corpo-musculo" style={cor(m)}><Espelho partes={partes} /></g>
            <g fill={`url(#${id}f)`}><Espelho partes={partes} /></g>
            <g fill={`url(#${id}v)`}><Espelho partes={partes} /></g>
          </g>
        ))}
      </svg>
      {titulo && <figcaption>{titulo}</figcaption>}
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
