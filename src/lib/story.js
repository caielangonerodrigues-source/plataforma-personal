// Card de story do Instagram (1080×1920) com a marca da academia: recorde, medalha ou resumo do mês.
import { cargaMaxima } from './progressao.js'
import { BONECO_LARGURA, BONECO_PATH } from './boneco.js'
import { f1 } from './formato.js'

// Último recorde de carga: { exercicio_id, carga, anterior, data }.
export function ultimoRecorde(registros = []) {
  const melhor = {}
  let ultimo = null
  for (const r of [...registros].filter((r) => !r.troca).sort((a, b) => (a.data < b.data ? -1 : 1))) {
    const max = cargaMaxima(r.series)
    if (max == null) continue
    if (melhor[r.exercicio_id] != null && max > melhor[r.exercicio_id]) {
      ultimo = { exercicio_id: r.exercicio_id, carga: max, anterior: melhor[r.exercicio_id], data: r.data }
    }
    melhor[r.exercicio_id] = Math.max(melhor[r.exercicio_id] ?? 0, max)
  }
  return ultimo
}

// Textos de cada tipo de card.
export function conteudoStory(tipo, d) {
  if (tipo === 'mes') return { rotulo: `Meu ${d.mes}`, numero: String(d.treinos), unidade: d.treinos === 1 ? 'treino' : 'treinos', linha: d.sequencia > 1 ? `🔥 ${d.sequencia} dias seguidos` : 'Bora pro próximo!' }
  if (tipo === 'medalha') return { rotulo: 'Nova medalha', numero: d.icone, unidade: d.titulo, linha: d.descricao }
  return { rotulo: 'Novo recorde', numero: f1(d.carga), unidade: `kg · ${d.exercicio}`, linha: `Antes: ${f1(d.anterior)} kg` }
}

const LARANJA = '#fc4c02'
const ESCURO = '#161618'

function quebrar(ctx, texto, largura) {
  const linhas = []
  let atual = ''
  for (const p of String(texto).split(/\s+/)) {
    const teste = atual ? `${atual} ${p}` : p
    if (ctx.measureText(teste).width > largura && atual) { linhas.push(atual); atual = p } else atual = teste
  }
  if (atual) linhas.push(atual)
  return linhas
}

// Desenha no canvas e devolve um Blob PNG.
export async function gerarStory(tipo, dados, nome) {
  try { await Promise.all(['700 120px "Barlow Condensed"', '600 40px Figtree'].map((f) => document.fonts.load(f))) } catch { /* usa a fonte reserva */ }
  const c = document.createElement('canvas')
  c.width = 1080; c.height = 1920
  const ctx = c.getContext('2d')
  const { rotulo, numero, unidade, linha } = conteudoStory(tipo, dados)
  const display = (peso, px) => `${peso} ${px}px "Barlow Condensed", "Arial Narrow", sans-serif`
  const corpo = (peso, px) => `${peso} ${px}px Figtree, system-ui, sans-serif`

  ctx.fillStyle = LARANJA
  ctx.fillRect(0, 0, 1080, 1920)
  ctx.fillStyle = 'rgba(255,255,255,.10)'
  ctx.beginPath(); ctx.arc(900, 420, 520, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,.08)'
  ctx.beginPath(); ctx.arc(120, 1700, 420, 0, Math.PI * 2); ctx.fill()

  // Logo: selo escuro com o bonequinho + nome
  ctx.fillStyle = ESCURO
  ctx.beginPath(); ctx.arc(150, 190, 80, 0, Math.PI * 2); ctx.fill()
  ctx.save()
  const escala = 132 / 140
  ctx.translate(150 - (BONECO_LARGURA * escala) / 2, 190 - 66)
  ctx.scale(escala, escala)
  ctx.fillStyle = '#fff'
  ctx.fill(new Path2D(BONECO_PATH), 'evenodd')
  ctx.restore()
  ctx.fillStyle = '#fff'
  ctx.font = display(700, 76)
  ctx.textBaseline = 'middle'
  ctx.fillText('CORPO ATLÉTICO', 260, 196)
  ctx.fillStyle = ESCURO
  ctx.fillText('.', 260 + ctx.measureText('CORPO ATLÉTICO').width, 196)

  // Rótulo
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = ESCURO
  const larguraRotulo = (ctx.font = display(700, 64), ctx.measureText(rotulo.toUpperCase()).width + 80)
  ctx.beginPath(); ctx.roundRect(540 - larguraRotulo / 2, 640, larguraRotulo, 104, 52); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillText(rotulo.toUpperCase(), 540, 715)

  // Número grande (ou o emoji da medalha)
  ctx.fillStyle = '#fff'
  const emoji = tipo === 'medalha'
  ctx.font = emoji ? '300px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' : display(700, numero.length > 4 ? 300 : 380)
  ctx.fillText(numero, 540, emoji ? 1130 : 1150)

  ctx.font = display(700, 92)
  quebrar(ctx, unidade.toUpperCase(), 900).slice(0, 2).forEach((l, i) => ctx.fillText(l, 540, 1290 + i * 96))
  ctx.font = corpo(600, 46)
  ctx.fillStyle = 'rgba(255,255,255,.92)'
  quebrar(ctx, linha, 880).slice(0, 2).forEach((l, i) => ctx.fillText(l, 540, 1500 + i * 58))

  // Rodapé
  ctx.fillStyle = ESCURO
  ctx.font = display(700, 60)
  ctx.fillText(String(nome || '').toUpperCase(), 540, 1760)
  ctx.font = corpo(500, 34)
  ctx.fillStyle = 'rgba(255,255,255,.85)'
  ctx.fillText('Treino registrado no app da Corpo Atlético', 540, 1820)

  return new Promise((ok) => c.toBlob(ok, 'image/png'))
}

// Abre o compartilhar do celular (Instagram aparece na lista); no computador, baixa a imagem.
export async function compartilharImagem(blob, nomeArquivo = 'corpo-atletico.png') {
  const arquivo = new File([blob], nomeArquivo, { type: 'image/png' })
  if (navigator.canShare?.({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo] }); return 'compartilhado' } catch (e) { if (e?.name === 'AbortError') return 'cancelado' }
  }
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: nomeArquivo })
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'baixado'
}
