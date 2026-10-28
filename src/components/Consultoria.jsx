import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import Modal from './Modal.jsx'
import { FormAvaliacao } from '../pages/personal/Avaliacoes.jsx'
import { reduzirFoto } from '../lib/foto.js'
import { COMO_MEDIR, MEDIDAS, NOTAS, compararMedidas, limparMedidas, paraAvaliacao } from '../lib/consultoria.js'
import { f1, fmtData, hojeISO, num, primeiroNome } from '../lib/formato.js'
import { linkWhatsApp } from '../lib/whatsapp.js'

const ANGULOS = [['frente', 'Frente'], ['lado', 'Lado'], ['costas', 'Costas']]

// Consultoria online. O aluno envia peso, medidas, fotos e como foi a semana;
// o personal (`personal`) lê, compara com o envio anterior, responde e registra como avaliação.
export default function Consultoria({ aluno, personal, onAvaliacao }) {
  const [envios, setEnvios] = useState(null)
  const [fotos, setFotos] = useState([])
  const [urls, setUrls] = useState({})
  const [aberto, setAberto] = useState(null)
  const [novo, setNovo] = useState(false)

  const carregar = useCallback(async () => {
    const [e, f] = await Promise.all([
      supabase.from('envios_consultoria').select('*').eq('aluno_id', aluno.id).order('data', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('fotos_evolucao').select('*').eq('aluno_id', aluno.id).order('data'),
    ])
    setEnvios(e.data || [])
    setFotos(f.data || [])
    setAberto((id) => id ?? e.data?.[0]?.id ?? null)
    const caminhos = (f.data || []).map((x) => x.caminho)
    if (caminhos.length) {
      const { data } = await supabase.storage.from('evolucao').createSignedUrls(caminhos, 3600)
      setUrls(Object.fromEntries((data || []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl])))
    }
  }, [aluno.id])

  useEffect(() => { carregar() }, [carregar])

  if (!envios) return <p className="carregando">Carregando…</p>
  const pendentes = envios.filter((e) => !e.resposta).length

  return (
    <div className="stack">
      {!personal && (
        <div className="checkin-cta" style={{ marginTop: 0 }}>
          <p>{envios.length ? `Último envio em ${fmtData(envios[0].data)}. Mande o próximo no dia combinado com seu personal.` : 'Envie suas medidas e fotos para seu personal acompanhar sua evolução.'}</p>
          <button onClick={() => setNovo(true)}>Enviar atualização</button>
        </div>
      )}
      {personal && pendentes > 0 && <p className="meta" style={{ margin: 0 }}>{pendentes === 1 ? '1 envio esperando sua resposta.' : `${pendentes} envios esperando sua resposta.`}</p>}
      {envios.length === 0 && <div className="panel empty">{personal ? `${primeiroNome(aluno.nome)} ainda não enviou nenhuma atualização.` : 'Nenhum envio ainda.'}</div>}
      {envios.map((e, i) => (
        <Envio key={e.id} envio={e} anterior={envios[i + 1]} aberto={aberto === e.id} onAbrir={() => setAberto(aberto === e.id ? null : e.id)}
          fotos={fotos} urls={urls} aluno={aluno} personal={personal} onMudou={() => { carregar(); onAvaliacao?.() }} />
      ))}
      {novo && <NovoEnvio aluno={aluno} ultimo={envios[0]} onFechar={() => setNovo(false)} onEnviado={() => { setNovo(false); setAberto(null); carregar() }} />}
    </div>
  )
}

function Envio({ envio: e, anterior, aberto, onAbrir, fotos, urls, aluno, personal, onMudou }) {
  const [resposta, setResposta] = useState(e.resposta || '')
  const [avaliando, setAvaliando] = useState(false)
  const [erro, setErro] = useState('')
  const linhas = compararMedidas(e.medidas, anterior?.medidas)
  const dPeso = e.peso != null && anterior?.peso != null ? Math.round((e.peso - anterior.peso) * 10) / 10 : null
  const doDia = ANGULOS.map(([k, l]) => ({ k, l, agora: fotos.find((f) => f.data === e.data && f.angulo === k), antes: fotos.find((f) => f.angulo === k && f.data < e.data) })).filter((x) => x.agora)

  async function responder() {
    const { error } = await supabase.from('envios_consultoria').update({ resposta: resposta.trim() || null, respondido_em: resposta.trim() ? new Date().toISOString() : null }).eq('id', e.id)
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    setErro(''); onMudou()
  }
  async function apagar() {
    if (!confirm('Apagar este envio?')) return
    await supabase.from('envios_consultoria').delete().eq('id', e.id)
    onMudou()
  }
  const zap = personal && e.resposta && linkWhatsApp(aluno.telefone, `Oi, ${primeiroNome(aluno.nome)}! Respondi sua atualização de ${fmtData(e.data)} na plataforma, na aba Consultoria.`)

  return (
    <div className="panel stack" style={{ gap: 12 }}>
      <button className="row between" onClick={onAbrir} aria-expanded={aberto} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }}>
        <span>
          <strong style={{ fontSize: 17 }}>{fmtData(e.data)}</strong>
          <span className="meta"> · {[e.peso != null && `${f1(e.peso)} kg${dPeso != null ? ` (${dPeso > 0 ? '+' : ''}${f1(dPeso)})` : ''}`, linhas.length && `${linhas.length} medidas`, doDia.length && `${doDia.length} fotos`].filter(Boolean).join(' · ')}</span>
        </span>
        <span className={`pill ${e.resposta ? 'ativo' : 'pendente'}`}>{e.resposta ? 'Respondido' : personal ? 'Responder' : 'Aguardando resposta'}</span>
      </button>
      {aberto && (
        <>
          {(e.sono || e.energia || e.dieta || e.treinos_semana != null) && (
            <div className="row" style={{ gap: 8 }}>
              {Object.entries(NOTAS).map(([k, l]) => e[k] && <span key={k} className="post-tag">{l} {e[k]}/5</span>)}
              {e.treinos_semana != null && <span className="post-tag">{e.treinos_semana} treinos na semana</span>}
              {e.gordura != null && <span className="post-tag">{f1(e.gordura)}% gordura (balança)</span>}
            </div>
          )}
          {e.comentario && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>“{e.comentario}”</p>}
          {linhas.length > 0 && (
            <div className="tablewrap">
              <table>
                <thead><tr><th>Medida (cm)</th><th className="num">Agora</th><th className="num">{anterior ? `Desde ${fmtData(anterior.data).slice(0, 5)}` : 'Variação'}</th></tr></thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.chave}><td>{l.rotulo}</td><td className="num">{f1(l.valor)}</td>
                      <td className="num" style={{ color: l.delta < 0 ? 'var(--ok)' : undefined }}>{l.delta == null ? '—' : `${l.delta > 0 ? '+' : ''}${f1(l.delta)}`}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {doDia.length > 0 && (
            <div className="antes-depois">
              {doDia.map(({ k, l, antes, agora }) => (
                <div key={k}>
                  <div className="meta" style={{ fontWeight: 700, marginBottom: 4 }}>{l}</div>
                  <div className="par">
                    {[antes, agora].map((f, i) => f ? (
                      <figure key={i}><img src={urls[f.caminho]} alt={`${l}, ${i ? 'agora' : 'antes'}`} /><figcaption className="meta">{i ? 'Agora' : `Antes · ${fmtData(f.data)}`}</figcaption></figure>
                    ) : <figure key={i} className="sem-foto"><span className="meta">Primeira foto</span></figure>)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {personal ? (
            <>
              <label>Sua resposta<textarea id={`resposta-${e.id}`} rows={4} maxLength={4000} placeholder="Ajustes no treino, na dieta, parabéns pela evolução…" value={resposta} onChange={(ev) => setResposta(ev.target.value)} /></label>
              {erro && <p className="erro">{erro}</p>}
              <div className="row">
                <button className="primary small" onClick={responder} disabled={resposta === (e.resposta || '')}>{e.resposta ? 'Salvar resposta' : 'Enviar resposta'}</button>
                {e.avaliacao_id ? <span className="ok">Registrado nas avaliações</span> : <button className="small" onClick={() => setAvaliando(true)}>Registrar como avaliação</button>}
                {zap && <a className="meta" href={zap} target="_blank" rel="noreferrer">Avisar no WhatsApp</a>}
              </div>
            </>
          ) : e.resposta ? (
            <div style={{ background: 'var(--accent-soft)', borderRadius: 10, padding: '10px 14px' }}>
              <div className="meta" style={{ fontWeight: 700, color: 'var(--accent)' }}>Resposta do seu personal</div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{e.resposta}</p>
            </div>
          ) : <button className="ghost small" style={{ alignSelf: 'flex-start' }} onClick={apagar}>Apagar envio</button>}
        </>
      )}
      {avaliando && (
        <FormAvaliacao aluno={aluno} inicial={paraAvaliacao(e)} onFechar={() => setAvaliando(false)}
          onSalvo={async (id) => { setAvaliando(false); await supabase.from('envios_consultoria').update({ avaliacao_id: id }).eq('id', e.id); onMudou() }} />
      )}
    </div>
  )
}

function NovoEnvio({ aluno, ultimo, onFechar, onEnviado }) {
  const [d, setD] = useState({ peso: '', gordura: '', treinos_semana: '', comentario: '' })
  const [medidas, setMedidas] = useState({})
  const [notas, setNotas] = useState({})
  const [arquivos, setArquivos] = useState({})
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    const m = limparMedidas(medidas)
    if (!d.peso && !Object.keys(m).length && !Object.keys(arquivos).length) return setErro('Preencha pelo menos o peso, uma medida ou uma foto.')
    setSalvando(true); setErro('')
    const data = hojeISO()
    // Fotos primeiro: se alguma falhar, nada é gravado pela metade no envio.
    for (const [angulo, arquivo] of Object.entries(arquivos)) {
      const caminho = `${aluno.id}/${crypto.randomUUID()}.jpg`
      const up = await supabase.storage.from('evolucao').upload(caminho, await reduzirFoto(arquivo, 1600, 0.85), { contentType: 'image/jpeg' })
      const ins = up.error ? up : await supabase.from('fotos_evolucao').insert({ aluno_id: aluno.id, data, angulo, caminho })
      if (ins.error) { setSalvando(false); return setErro(`Não foi possível enviar a foto de ${angulo}. Tente de novo.`) }
    }
    const { error } = await supabase.from('envios_consultoria').insert({
      aluno_id: aluno.id, data, peso: num(d.peso), gordura: num(d.gordura), medidas: m,
      sono: notas.sono || null, energia: notas.energia || null, dieta: notas.dieta || null,
      treinos_semana: num(d.treinos_semana), comentario: d.comentario.trim() || null,
    })
    setSalvando(false)
    if (error) return setErro(`Não foi possível enviar: ${error.message}`)
    onEnviado()
  }

  return (
    <Modal titulo="Atualização para o personal" botao="Enviar" onFechar={onFechar} onSalvar={salvar} erro={erro} salvando={salvando}>
      <p className="meta full" style={{ margin: 0 }}>Meça e pese de manhã, em jejum, depois de ir ao banheiro. Use fita métrica sem apertar a pele.</p>
      <label>Peso (kg)<input id="envio-peso" inputMode="decimal" placeholder={ultimo?.peso ? `último: ${f1(ultimo.peso)}` : ''} value={d.peso} onChange={(e) => setD({ ...d, peso: e.target.value })} /></label>
      <label>% gordura (balança)<input id="envio-gordura" inputMode="decimal" placeholder="opcional" value={d.gordura} onChange={(e) => setD({ ...d, gordura: e.target.value })} /></label>

      <div className="secao">Medidas (cm)</div>
      {MEDIDAS.map(([k, l]) => (
        <label key={k} title={COMO_MEDIR[k]}>{l}
          <input id={`medida-${k}`} inputMode="decimal" placeholder={ultimo?.medidas?.[k] ? `último: ${f1(ultimo.medidas[k])}` : COMO_MEDIR[k] ? COMO_MEDIR[k].split(',')[0] : ''}
            value={medidas[k] ?? ''} onChange={(e) => setMedidas({ ...medidas, [k]: e.target.value })} />
        </label>
      ))}

      <div className="secao">Fotos (mesma luz, mesma roupa e mesmo lugar sempre)</div>
      {ANGULOS.map(([k, l]) => (
        <label key={k} className="foto-botao" style={{ padding: 10 }}>
          <input id={`envio-foto-${k}`} className="sr" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setArquivos({ ...arquivos, [k]: e.target.files[0] })} />
          {arquivos[k] ? `${l} ✓` : `Foto de ${l.toLowerCase()}`}
        </label>
      ))}

      <div className="secao">Como foi a semana (1 = ruim, 5 = ótima)</div>
      {Object.entries(NOTAS).map(([k, l]) => (
        <div key={k} className="full row between" style={{ gap: 8 }}>
          <span style={{ fontWeight: 600 }}>{l}</span>
          <div className="row" style={{ gap: 4 }} role="group" aria-label={l}>
            {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={`small${notas[k] === n ? ' primary' : ''}`} aria-pressed={notas[k] === n} onClick={() => setNotas({ ...notas, [k]: n })}>{n}</button>)}
          </div>
        </div>
      ))}
      <label>Treinos feitos na semana<input id="envio-treinos" inputMode="numeric" value={d.treinos_semana} onChange={(e) => setD({ ...d, treinos_semana: e.target.value })} /></label>
      <label className="full">Comentário<textarea id="envio-comentario" rows={3} maxLength={2000} placeholder="Dores, dificuldades com a dieta, o que quiser contar" value={d.comentario} onChange={(e) => setD({ ...d, comentario: e.target.value })} /></label>
    </Modal>
  )
}
