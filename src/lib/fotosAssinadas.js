import { supabase } from '../supabase.js'

// Links assinados guardados por foto: a cada recarga do feed (reação, comentário, voltar para a aba) o link
// continua o mesmo, então o navegador usa a foto que já baixou em vez de baixar tudo de novo.
const VALIDADE = 6 * 3600 // segundos
const MARGEM = 30 * 60 * 1000 // renova quando falta menos de meia hora
const CHAVE = 'fotos-assinadas'
let cache = null

function ler() {
  if (cache) return cache
  try { cache = JSON.parse(sessionStorage.getItem(CHAVE)) || {} } catch { cache = {} }
  return cache
}

function gravar() {
  try { sessionStorage.setItem(CHAVE, JSON.stringify(cache)) } catch { /* sem armazenamento */ }
}

// Mesmo formato do createSignedUrls do Supabase ({ data: [{ path, signedUrl }] }), mas só assina o que falta.
export async function assinarFotos(bucket, caminhos) {
  const c = ler()
  const agora = Date.now()
  const faltam = [...new Set(caminhos)].filter((p) => !(c[`${bucket}/${p}`]?.ate - agora > MARGEM))
  if (faltam.length) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(faltam, VALIDADE)
    if (error) return { data: [], error }
    for (const f of data || []) if (f.signedUrl) c[`${bucket}/${f.path}`] = { url: f.signedUrl, ate: agora + VALIDADE * 1000 }
    for (const k of Object.keys(c)) if (c[k].ate < agora) delete c[k]
    gravar()
  }
  return { data: caminhos.filter((p) => c[`${bucket}/${p}`]).map((p) => ({ path: p, signedUrl: c[`${bucket}/${p}`].url })) }
}
