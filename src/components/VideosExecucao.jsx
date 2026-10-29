import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { quandoFoi } from '../lib/comunidade.js'

const LIMITE_MB = 50
const EXTENSOES = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/x-m4v': 'm4v' }

// Vídeos de execução: o aluno grava o exercício e o personal responde com a correção.
// `personal`: mostra o campo de resposta. `exercicios`: nomes da ficha para o aluno escolher.
export default function VideosExecucao({ aluno, personal = false, exercicios = [] }) {
  const [videos, setVideos] = useState(null)
  const [links, setLinks] = useState({})
  const [indisponivel, setIndisponivel] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('videos_execucao').select('*').eq('aluno_id', aluno.id).order('created_at', { ascending: false })
    if (error) return setIndisponivel(true)
    setVideos(data)
    const caminhos = data.map((v) => v.caminho)
    if (caminhos.length) {
      const { data: assinados } = await supabase.storage.from('execucoes').createSignedUrls(caminhos, 3600)
      setLinks(Object.fromEntries((assinados || []).filter((a) => a.signedUrl).map((a) => [a.path, a.signedUrl])))
    }
  }, [aluno.id])

  useEffect(() => { carregar() }, [carregar])

  async function apagar(v) {
    if (!confirm('Apagar este vídeo?')) return
    await supabase.storage.from('execucoes').remove([v.caminho])
    const { error } = await supabase.from('videos_execucao').delete().eq('id', v.id)
    if (error) setErro(`Não foi possível apagar: ${error.message}`)
    carregar()
  }

  if (indisponivel) return <div className="panel empty">Os vídeos de execução aparecem aqui assim que o personal atualizar o sistema.</div>
  if (!videos) return <p className="carregando">Carregando…</p>
  const pendentes = videos.filter((v) => !v.resposta).length

  return (
    <div className="stack">
      {!personal && <EnviarVideo aluno={aluno} exercicios={exercicios} onEnviado={carregar} />}
      {personal && <p className="meta" style={{ margin: 0 }}>{videos.length ? `${pendentes} vídeo${pendentes === 1 ? '' : 's'} esperando sua avaliação.` : 'O aluno ainda não mandou nenhum vídeo. Ele manda pela área dele, na aba Vídeos.'}</p>}
      {erro && <p className="erro">{erro}</p>}
      {videos.map((v) => (
        <div className="panel stack video-execucao" key={v.id} style={{ gap: 8 }}>
          <div className="row between" style={{ flexWrap: 'nowrap' }}>
            <div style={{ minWidth: 0 }}><div className="name">{v.exercicio}</div><div className="meta">{quandoFoi(v.created_at)}</div></div>
            <span className={`pill ${v.resposta ? 'ativo' : 'pendente'}`}>{v.resposta ? 'Avaliado' : 'Aguardando'}</span>
          </div>
          {links[v.caminho] ? <video src={links[v.caminho]} controls playsInline preload="metadata" /> : <div className="meta">Vídeo indisponível.</div>}
          {v.comentario && <div className="meta" style={{ color: 'var(--ink)' }}>“{v.comentario}”</div>}
          {personal ? <Responder video={v} onSalvo={carregar} /> : v.resposta && (
            <div className="resposta-personal"><strong>Correção do personal</strong><div style={{ whiteSpace: 'pre-line' }}>{v.resposta}</div></div>
          )}
          <div><button className="ghost small" onClick={() => apagar(v)}>Apagar vídeo</button></div>
        </div>
      ))}
    </div>
  )
}

function EnviarVideo({ aluno, exercicios, onEnviado }) {
  const nomes = [...new Set(exercicios)]
  const [exercicio, setExercicio] = useState(nomes[0] || '')
  const [outro, setOutro] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const nome = (exercicio === '__outro' || !nomes.length ? outro : exercicio).trim()

  function escolher(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!EXTENSOES[f.type]) return setErro('Escolha um vídeo do celular (MP4 ou MOV).')
    if (f.size > LIMITE_MB * 1048576) return setErro(`O vídeo passou de ${LIMITE_MB} MB. Grave de 20 a 40 segundos, só a execução.`)
    setErro(''); setArquivo(f)
  }

  async function enviar(e) {
    e.preventDefault()
    if (!nome) return setErro('Diga qual exercício está no vídeo.')
    if (!arquivo) return setErro('Escolha o vídeo.')
    setEnviando(true); setErro('')
    const caminho = `${aluno.id}/${crypto.randomUUID()}.${EXTENSOES[arquivo.type]}`
    const up = await supabase.storage.from('execucoes').upload(caminho, arquivo, { contentType: arquivo.type })
    const ins = up.error ? up : await supabase.from('videos_execucao').insert({ aluno_id: aluno.id, exercicio: nome.slice(0, 80), caminho, comentario: comentario.trim() || null })
    setEnviando(false)
    if (ins.error) {
      if (!up.error) await supabase.storage.from('execucoes').remove([caminho])
      return setErro(`Não foi possível enviar: ${ins.error.message}`)
    }
    setArquivo(null); setComentario(''); setOutro(''); onEnviado()
  }

  return (
    <form className="panel form" onSubmit={enviar}>
      <div className="secao full" style={{ marginTop: 0 }}>Mandar vídeo para avaliação</div>
      <p className="meta full" style={{ margin: 0 }}>Grave de lado, mostrando o corpo inteiro, de 20 a 40 segundos. Seu personal assiste e te responde com a correção.</p>
      {nomes.length > 0 && (
        <label className="full">Exercício
          <select value={exercicio} onChange={(e) => setExercicio(e.target.value)}>
            {nomes.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value="__outro">Outro exercício</option>
          </select>
        </label>
      )}
      {(exercicio === '__outro' || !nomes.length) && <label className="full">Qual exercício?<input maxLength={80} placeholder="Ex.: Levantamento terra" value={outro} onChange={(e) => setOutro(e.target.value)} /></label>}
      <label className="foto-botao full">
        <input className="sr" type="file" accept="video/*" onChange={escolher} />
        {arquivo ? `🎬 ${arquivo.name.slice(0, 30)} · ${(arquivo.size / 1048576).toFixed(1).replace('.', ',')} MB (trocar)` : '🎬 Gravar ou escolher vídeo'}
      </label>
      <label className="full">Dúvida ou comentário (opcional)<textarea rows={2} maxLength={280} placeholder="Ex.: sinto o joelho na descida" value={comentario} onChange={(e) => setComentario(e.target.value)} /></label>
      {erro && <p className="erro full" style={{ margin: 0 }}>{erro}</p>}
      <div className="full"><button className="primary" disabled={enviando}>{enviando ? 'Enviando vídeo…' : 'Enviar para o personal'}</button></div>
    </form>
  )
}

function Responder({ video, onSalvo }) {
  const [texto, setTexto] = useState(video.resposta || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const { error } = await supabase.from('videos_execucao').update({ resposta: texto.trim() || null, respondido_em: texto.trim() ? new Date().toISOString() : null }).eq('id', video.id)
    setSalvando(false)
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    setErro(''); onSalvo()
  }
  return (
    <form className="stack" style={{ gap: 6 }} onSubmit={salvar}>
      <textarea rows={3} maxLength={1000} aria-label="Correção para o aluno" placeholder="Ex.: Ótima amplitude! Só segure o joelho alinhado com o pé na descida." value={texto} onChange={(e) => setTexto(e.target.value)} />
      {erro && <p className="erro" style={{ margin: 0 }}>{erro}</p>}
      <div><button className="primary small" disabled={salvando || texto.trim() === (video.resposta || '')}>{salvando ? 'Salvando…' : video.resposta ? 'Atualizar correção' : 'Enviar correção'}</button></div>
    </form>
  )
}
