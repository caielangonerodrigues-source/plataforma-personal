import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { supabase } from '../supabase.js'
import { hojeISO } from '../lib/formato.js'
import { reduzirFoto } from '../lib/foto.js'
import { ESPORTES, GRUPOS_MUSCULACAO, fmtTempo, resumoCardio, resumoMusculacao, resumoTreino, ritmo, tituloMusculacao } from '../lib/social.js'

const OUTRO = 'outro'
const MUSCULACAO = 'musculacao'

// O post ganha um card sozinho: do treino da ficha (exercícios, volume, recordes), de musculação livre (grupos e duração)
// ou de corrida, pedal e caminhada (km, tempo, ritmo).
export default function FormCheckin({ aluno, treinos, registros = [], treinoInicial, onFechar, onFeito }) {
  const [treinoId, setTreinoId] = useState(treinoInicial || treinos[0]?.id || MUSCULACAO)
  const [atividade, setAtividade] = useState('')
  const [grupos, setGrupos] = useState([])
  const [minutos, setMinutos] = useState('')
  const [km, setKm] = useState('')
  const [tempo, setTempo] = useState('')
  const [comentario, setComentario] = useState('')
  const [foto, setFoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  function escolherFoto(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) return setErro('Escolha um arquivo de imagem.')
    setErro(''); setFoto(f); setPreview(URL.createObjectURL(f))
  }

  const hoje = hojeISO()
  const treino = treinos.find((t) => t.id === treinoId)
  const esporte = ESPORTES[treinoId] ? treinoId : null
  const cardio = esporte && resumoCardio(esporte, km, tempo)
  const musculacao = treinoId === MUSCULACAO && resumoMusculacao(grupos, minutos)
  const resumo = treino ? resumoTreino(treino, registros, hoje) : musculacao || cardio || null
  const alternar = (g) => setGrupos((l) => (l.includes(g) ? l.filter((x) => x !== g) : [...l, g]))

  async function salvar() {
    if (esporte && !cardio) return setErro('Coloque a distância (ex.: 5,2) e o tempo (ex.: 28:30).')
    if (treinoId === OUTRO && !atividade.trim()) return setErro('Diga o que você treinou (ex.: aula de spinning, funcional).')
    setSalvando(true); setErro('')
    let caminho = null
    try {
      if (foto) {
        caminho = `${aluno.id}/${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage.from('checkins').upload(caminho, await reduzirFoto(foto), { contentType: 'image/jpeg' })
        if (error) throw error
      }
      const post = {
        aluno_id: aluno.id, data: hoje, treino_id: treino?.id || null,
        titulo: treino ? `Treino ${treino.nome}${treino.foco ? ` · ${treino.foco}` : ''}` : musculacao ? tituloMusculacao(musculacao.grupos) : esporte ? `${ESPORTES[esporte][0]} · ${String(cardio.km).replace('.', ',')} km` : atividade.trim(),
        comentario: comentario.trim() || null, foto: caminho,
      }
      let { error } = await supabase.from('checkins').insert(resumo ? { ...post, resumo } : post)
      if (error && resumo && /resumo/.test(error.message)) ({ error } = await supabase.from('checkins').insert(post)) // SQL novo ainda não rodou
      if (error) throw error
      onFeito()
    } catch (e) {
      if (caminho) await supabase.storage.from('checkins').remove([caminho])
      setErro(`Não foi possível fazer o check-in: ${e.message}`)
      setSalvando(false)
    }
  }

  return (
    <Modal titulo="Check-in de hoje" botao="Publicar check-in" onFechar={onFechar} onSalvar={salvar} erro={erro} salvando={salvando}>
      <label className="full">O que você treinou?
        <select id="checkin-treino" value={treinoId} onChange={(e) => setTreinoId(e.target.value)}>
          {treinos.map((t) => <option key={t.id} value={t.id}>Treino {t.nome}{t.foco ? ` · ${t.foco}` : ''}</option>)}
          <option value={MUSCULACAO}>🏋️ Musculação</option>
          {Object.entries(ESPORTES).map(([k, [nome, icone]]) => <option key={k} value={k}>{icone} {nome}</option>)}
          <option value={OUTRO}>Outra atividade</option>
        </select>
      </label>
      {treinoId === OUTRO && <label className="full">Atividade<input id="checkin-atividade" maxLength={80} placeholder="Ex.: Aula de funcional" value={atividade} onChange={(e) => setAtividade(e.target.value)} /></label>}
      {musculacao && <>
        <div className="full stack" style={{ gap: 6 }}>
          <span className="meta" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>Grupos musculares</span>
          <div className="chips" role="group" aria-label="Grupos treinados">
            {Object.entries(GRUPOS_MUSCULACAO).map(([g, [nome]]) => (
              <button key={g} type="button" className={`chip${grupos.includes(g) ? ' on' : ''}`} aria-pressed={grupos.includes(g)} onClick={() => alternar(g)}>{nome}</button>
            ))}
          </div>
        </div>
        <label>Duração (min)<input id="checkin-minutos" inputMode="numeric" placeholder="60" value={minutos} onChange={(e) => setMinutos(e.target.value)} /></label>
      </>}
      {esporte && <>
        <label>Distância (km)<input id="checkin-km" inputMode="decimal" placeholder="5,2" value={km} onChange={(e) => setKm(e.target.value)} /></label>
        <label>Tempo<input id="checkin-tempo" inputMode="numeric" placeholder="28:30" value={tempo} onChange={(e) => setTempo(e.target.value)} /></label>
        <p className="meta full" style={{ margin: 0 }}>{cardio ? `${esporte === 'bike' ? 'Velocidade média' : 'Ritmo'}: ${ritmo(esporte, cardio.km, cardio.segundos)} · ${fmtTempo(cardio.segundos)}` : 'Use os números do relógio ou do app de corrida. Dá para anexar o print do mapa como foto.'}</p>
      </>}
      {treino && resumo && (
        <p className="meta full" style={{ margin: 0 }}>
          Vai junto no post: {resumo.feitos} de {resumo.total} exercícios{resumo.volume ? ` · ${resumo.volume.toLocaleString('pt-BR')} kg levantados` : ''}{resumo.recordes.length ? ` · ${resumo.recordes.length} recorde${resumo.recordes.length > 1 ? 's' : ''} 💪` : ''}
        </p>
      )}
      <div className="full stack" style={{ gap: 4 }}>
        <span className="meta" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>Foto (opcional)</span>
        <label className="foto-botao">
          <input id="checkin-foto" className="sr" type="file" accept="image/*" onChange={escolherFoto} />
          {foto ? 'Trocar foto' : 'Tirar ou escolher foto'}
        </label>
      </div>
      {preview && <img className="foto-preview full" src={preview} alt="Prévia da foto" />}
      <label className="full">Comentário (opcional)<textarea id="checkin-comentario" rows={3} maxLength={280} placeholder="Como foi o treino?" value={comentario} onChange={(e) => setComentario(e.target.value)} /></label>
      <p className="meta full" style={{ margin: 0 }}>Seu check-in aparece no feed da turma e conta para o ranking do mês.</p>
    </Modal>
  )
}
