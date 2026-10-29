// Bonequinho de frente e de costas com os músculos acesos em laranja.
// Base: ilustração 3D em cinza (public/corpo/<vista>.webp). Cada músculo aceso é a versão laranja
// da mesma ilustração recortada pela máscara do músculo (public/corpo/<vista>-<músculo>.png).
// `principais`/`secundarios`: ids de MUSCULOS; ou `intensidade`: { id: 0..1 } para o mapa da semana.
import { MUSCULOS } from '../lib/musculos.js'

const VISTAS = {
  frente: { largura: 311, altura: 594, musculos: ['peito', 'ombro', 'biceps', 'antebraco', 'trapezio', 'abdomen', 'obliquos', 'quadriceps', 'adutores', 'panturrilha'] },
  costas: { largura: 233, altura: 579, musculos: ['trapezio', 'dorsais', 'ombro', 'triceps', 'antebraco', 'lombar', 'gluteos', 'posterior', 'quadriceps', 'panturrilha'] },
}
const ALTURA = 2.1 // altura da figura em relação ao `tamanho`

function Vista({ lado, titulo, nivel, tamanho }) {
  const v = VISTAS[lado]
  const altura = Math.round(tamanho * ALTURA)
  const largura = Math.round((altura * v.largura) / v.altura)
  return (
    <figure className="corpo-vista">
      <div className="corpo-img" style={{ width: largura, height: altura }}>
        <img src={`/corpo/${lado}.webp`} alt="" draggable="false" />
        {v.musculos.map((m) => {
          const n = nivel(m)
          if (!n) return null
          const mascara = `url(/corpo/${lado}-${m}.png)`
          return <img key={m} src={`/corpo/${lado}-laranja.webp`} alt="" draggable="false" style={{ opacity: 0.3 + 0.7 * n, WebkitMaskImage: mascara, maskImage: mascara }} />
        })}
      </div>
      {titulo && <figcaption>{titulo}</figcaption>}
    </figure>
  )
}

export default function Corpo({ principais = [], secundarios = [], intensidade, tamanho = 70, legenda = true }) {
  const nivel = (id) => (intensidade ? Math.min(1, intensidade[id] || 0) : principais.includes(id) ? 1 : secundarios.includes(id) ? 0.45 : 0)
  const nomes = (l) => l.map((m) => MUSCULOS[m]).join(', ')
  const rotulo = intensidade ? 'Músculos treinados' : `Trabalha: ${nomes(principais)}${secundarios.length ? `. Ajuda: ${nomes(secundarios)}` : ''}`
  return (
    <div className="corpo" role="img" aria-label={rotulo}>
      <div className="corpo-vistas">
        <Vista lado="frente" titulo="Frente" nivel={nivel} tamanho={tamanho} />
        <Vista lado="costas" titulo="Costas" nivel={nivel} tamanho={tamanho} />
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
  const naFrente = (m) => VISTAS.frente.musculos.includes(m)
  const naCostas = (m) => VISTAS.costas.musculos.includes(m)
  const lado = principais.some((m) => naFrente(m) && !naCostas(m)) || !principais.some(naCostas) ? 'frente' : 'costas'
  const nivel = (id) => (principais.includes(id) ? 1 : secundarios.includes(id) ? 0.45 : 0)
  const nomes = principais.map((m) => MUSCULOS[m]).join(', ')
  if (!principais.length && !secundarios.length) return null
  return (
    <button type="button" className="corpo-mini" onClick={onClick} aria-label={`Músculos: ${nomes || 'ver'}`} title={nomes}>
      <Vista lado={lado} titulo="" nivel={nivel} tamanho={tamanho} />
    </button>
  )
}
