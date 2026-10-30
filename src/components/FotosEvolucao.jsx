import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import RecortarFoto from './RecortarFoto.jsx'
import { fmtData, hojeISO } from '../lib/formato.js'

const ANGULOS = [['frente', 'Frente'], ['lado', 'Lado'], ['costas', 'Costas']]

// Fotos privadas de evolução, com comparação da primeira com a mais recente de cada ângulo.
export default function FotosEvolucao({ alunoId, podeApagar }) {
  const [fotos, setFotos] = useState(null)
  const [urls, setUrls] = useState({})
  const [angulo, setAngulo] = useState('frente')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [recortando, setRecortando] = useState(null) // foto escolhida, antes de enquadrar

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('fotos_evolucao').select('*').eq('aluno_id', alunoId).order('data')
    setFotos(data || [])
    const caminhos = (data || []).map((f) => f.caminho)
    if (caminhos.length) {
      const { data: assinadas } = await supabase.storage.from('evolucao').createSignedUrls(caminhos, 3600)
      setUrls(Object.fromEntries((assinadas || []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl])))
    }
  }, [alunoId])

  useEffect(() => { carregar() }, [carregar])

  function escolher(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (arquivo) setRecortando(arquivo)
  }

  // Enquadrada em 3:4, para as fotos de antes e depois ficarem lado a lado iguais.
  async function enviar(blob) {
    setRecortando(null)
    setEnviando(true); setErro('')
    const caminho = `${alunoId}/${crypto.randomUUID()}.jpg`
    const up = await supabase.storage.from('evolucao').upload(caminho, blob, { contentType: 'image/jpeg' })
    const ins = up.error ? up : await supabase.from('fotos_evolucao').insert({ aluno_id: alunoId, data: hojeISO(), angulo, caminho })
    if (ins.error) { setErro(`Não foi possível enviar: ${ins.error.message}`); if (!up.error) await supabase.storage.from('evolucao').remove([caminho]) }
    setEnviando(false); carregar()
  }

  async function apagar(f) {
    await supabase.storage.from('evolucao').remove([f.caminho])
    await supabase.from('fotos_evolucao').delete().eq('id', f.id)
    carregar()
  }

  if (!fotos) return <p className="carregando">Carregando…</p>
  const doAngulo = fotos.filter((f) => f.angulo === angulo)
  const primeira = doAngulo[0], ultima = doAngulo.at(-1)

  return (
    <div className="panel stack">
      <div className="row between">
        <h2>Fotos de antes e depois</h2>
        <div className="row" style={{ gap: 6 }}>
          {ANGULOS.map(([k, l]) => <button key={k} className={`small${k === angulo ? ' primary' : ''}`} onClick={() => setAngulo(k)}>{l}</button>)}
        </div>
      </div>
      <p className="meta" style={{ margin: 0 }}>Só você e seu personal veem estas fotos.</p>
      {primeira && ultima && primeira.id !== ultima.id ? (
        <div className="grid2">
          {[primeira, ultima].map((f, i) => (
            <figure key={f.id} style={{ margin: 0 }}>
              <img src={urls[f.caminho]} alt={`${i ? 'Mais recente' : 'Primeira'} foto, ${f.angulo}`} style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 10, background: 'var(--line)' }} />
              <figcaption className="meta">{i ? 'Agora' : 'Antes'} · {fmtData(f.data)}</figcaption>
            </figure>
          ))}
        </div>
      ) : <p className="empty">{doAngulo.length ? 'Envie mais uma foto deste ângulo para comparar antes e depois.' : 'Nenhuma foto deste ângulo ainda.'}</p>}
      {(doAngulo.length > 2 || (podeApagar && doAngulo.length > 0)) && (
        <div className="row" style={{ gap: 8 }}>
          {doAngulo.map((f) => (
            <div key={f.id} style={{ width: 72 }}>
              <img src={urls[f.caminho]} alt={`Foto de ${fmtData(f.data)}`} style={{ width: 72, height: 96, objectFit: 'cover', borderRadius: 6 }} />
              <div className="meta" style={{ fontSize: 11 }}>{fmtData(f.data).slice(0, 5)}</div>
              {podeApagar && <button className="ghost small" onClick={() => apagar(f)}>Apagar</button>}
            </div>
          ))}
        </div>
      )}
      {erro && <p className="erro">{erro}</p>}
      <label className="foto-botao">
        <input id="foto-evolucao" className="sr" type="file" accept="image/*" onChange={escolher} disabled={enviando} />
        {enviando ? 'Enviando…' : `Adicionar foto de ${ANGULOS.find(([k]) => k === angulo)[1].toLowerCase()}`}
      </label>
      {recortando && <RecortarFoto arquivo={recortando} proporcao={3 / 4} lado={1200} onPronto={enviar} onCancelar={() => setRecortando(null)} />}
    </div>
  )
}
