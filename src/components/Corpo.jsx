// Bonequinho de frente e de costas com os músculos acesos em laranja.
// Estilo chapado (minimalista): a silhueta da ilustração (public/corpo/<vista>.webp) vira um cinza bem claro,
// cada músculo é uma forma chapada recortada pela máscara (public/corpo/<vista>-<músculo>.png), cinza quando
// parado e laranja quando aceso; o mais ativo fica no laranja mais escuro.
// `principais`/`secundarios`: ids de MUSCULOS, com `ativo` (o mais ativo) aceso mais forte e brilhando;
// ou `intensidade`: { id: 0..1 } para o mapa da semana.
import { MUSCULOS } from '../lib/musculos.js'

const VISTAS = {
  frente: { largura: 311, altura: 594, musculos: ['peito', 'ombro', 'biceps', 'antebraco', 'trapezio', 'abdomen', 'obliquos', 'quadriceps', 'adutores', 'panturrilha'] },
  costas: { largura: 233, altura: 579, musculos: ['trapezio', 'dorsais', 'ombro', 'triceps', 'antebraco', 'lombar', 'gluteos', 'posterior', 'quadriceps', 'panturrilha'] },
}
const ALTURA = 2.1 // altura da figura em relação ao `tamanho`

function Vista({ lado, titulo, nivel, ativo, tamanho }) {
  const v = VISTAS[lado]
  const altura = Math.round(tamanho * ALTURA)
  const largura = Math.round((altura * v.largura) / v.altura)
  return (
    <figure className="corpo-vista">
      <div className="corpo-img" style={{ width: largura, height: altura }}>
        <span className="corpo-silhueta" style={{ WebkitMaskImage: `url(/corpo/${lado}.webp)`, maskImage: `url(/corpo/${lado}.webp)` }} />
        {v.musculos.map((m) => {
          const mascara = `url(/corpo/${lado}-${m}.png)`
          return <span key={`base-${m}`} className="corpo-musculo base" style={{ WebkitMaskImage: mascara, maskImage: mascara }} />
        })}
        {v.musculos.map((m) => {
          const n = nivel(m)
          if (!n) return null
          const mascara = `url(/corpo/${lado}-${m}.png)`
          const forte = m === ativo // o mais ativo fica no laranja mais escuro, para o aluno achar o músculo de cara
          return <span key={m} className={`corpo-musculo${forte ? ' ativo' : ''}`} style={{ opacity: forte ? 1 : 0.3 + 0.7 * n, WebkitMaskImage: mascara, maskImage: mascara }} />
        })}
      </div>
      {titulo && <figcaption>{titulo}</figcaption>}
    </figure>
  )
}

// Mais ativo: laranja escuro; outros principais: 0,6; secundários: 0,3. Sem `ativo`, todos os principais ficam fortes.
const nivelDe = (principais, secundarios, ativo) => (id) =>
  id === ativo ? 1 : principais.includes(id) ? (ativo ? 0.6 : 1) : secundarios.includes(id) ? 0.3 : 0

export default function Corpo({ principais = [], secundarios = [], ativo, foco, intensidade, tamanho = 70, legenda = true }) {
  const nivel = intensidade ? (id) => Math.min(1, intensidade[id] || 0) : nivelDe(principais, secundarios, ativo)
  const outros = principais.filter((m) => m !== ativo)
  const nomes = (l) => l.map((m) => MUSCULOS[m]).join(', ')
  const rotulo = intensidade ? 'Músculos treinados' : `${foco ? `Mais ativo: ${foco}. ` : ''}Trabalha: ${nomes(principais)}${secundarios.length ? `. Ajuda: ${nomes(secundarios)}` : ''}`
  return (
    <div className="corpo" role="img" aria-label={rotulo}>
      <div className="corpo-vistas">
        <Vista lado="frente" titulo="Frente" nivel={nivel} ativo={ativo} tamanho={tamanho} />
        <Vista lado="costas" titulo="Costas" nivel={nivel} ativo={ativo} tamanho={tamanho} />
      </div>
      {legenda && !intensidade && (principais.length > 0 || secundarios.length > 0) && (
        <div className="corpo-legenda">
          {ativo && <span className="corpo-foco"><i className="forte" />Mais ativo: <strong>{foco || MUSCULOS[ativo]}</strong></span>}
          {(ativo ? outros : principais).length > 0 && <span><i className="medio" />{ativo ? 'Também trabalha' : 'Trabalha'}: {nomes(ativo ? outros : principais)}</span>}
          {secundarios.length > 0 && <span><i className="fraco" />Ajuda: {nomes(secundarios)}</span>}
        </div>
      )}
    </div>
  )
}

// Versão pequena para a lista de exercícios: só a vista onde está o músculo principal.
export function CorpoMini({ principais = [], secundarios = [], ativo, tamanho = 26, onClick }) {
  // Vista onde o músculo principal aparece melhor: frente, a não ser que só exista nas costas (ou seja o trapézio).
  const chave = ativo || principais[0] || secundarios[0]
  const lado = VISTAS.frente.musculos.includes(chave) && chave !== 'trapezio' ? 'frente' : 'costas'
  const nivel = nivelDe(principais, secundarios, ativo)
  const nomes = principais.map((m) => MUSCULOS[m]).join(', ')
  if (!principais.length && !secundarios.length) return null
  return (
    <button type="button" className="corpo-mini" onClick={onClick} aria-label={`Músculos: ${nomes || 'ver'}`} title={nomes}>
      <Vista lado={lado} titulo="" nivel={nivel} ativo={ativo} tamanho={tamanho} />
    </button>
  )
}
