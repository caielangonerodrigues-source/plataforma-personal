import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { supabase } from '../supabase.js'
import { hojeISO } from '../lib/formato.js'
import { reduzirFoto } from '../lib/foto.js'

const OUTRO = 'outro'

export default function FormCheckin({ aluno, treinos, treinoInicial, onFechar, onFeito }) {
  const [treinoId, setTreinoId] = useState(treinoInicial || treinos[0]?.id || OUTRO)
  const [atividade, setAtividade] = useState('')
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

  async function salvar() {
    const treino = treinos.find((t) => t.id === treinoId)
    if (!treino && !atividade.trim()) return setErro('Diga o que você treinou (ex.: corrida, aula de spinning).')
    setSalvando(true); setErro('')
    let caminho = null
    try {
      if (foto) {
        caminho = `${aluno.id}/${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage.from('checkins').upload(caminho, await reduzirFoto(foto), { contentType: 'image/jpeg' })
        if (error) throw error
      }
      const { error } = await supabase.from('checkins').insert({
        aluno_id: aluno.id, data: hojeISO(), treino_id: treino?.id || null,
        titulo: treino ? `Treino ${treino.nome}${treino.foco ? ` · ${treino.foco}` : ''}` : atividade.trim(),
        comentario: comentario.trim() || null, foto: caminho,
      })
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
          <option value={OUTRO}>Outra atividade</option>
        </select>
      </label>
      {treinoId === OUTRO && <label className="full">Atividade<input id="checkin-atividade" maxLength={80} placeholder="Ex.: Corrida 5 km" value={atividade} onChange={(e) => setAtividade(e.target.value)} /></label>}
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
