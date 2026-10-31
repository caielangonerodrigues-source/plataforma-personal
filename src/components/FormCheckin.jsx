import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { supabase } from '../supabase.js'
import { hojeISO } from '../lib/formato.js'
import { reduzirFoto } from '../lib/foto.js'
import { lugarDoCheckin, posicaoAtual } from '../lib/localizacao.js'
import IconeLinha, { ICONES } from './IconeLinha.jsx'
import RecortarFoto from './RecortarFoto.jsx'
import { APARELHOS_CARDIO, ESPORTES, GRUPOS_MUSCULACAO, fmtTempo, resumoCardio, resumoCardioLivre, resumoMusculacao, resumoTreino, ritmo, tituloCardioLivre, tituloMusculacao } from '../lib/social.js'

const OUTRO = 'outro'
const CHAVE_LOCAL = 'checkin-local' // o aluno escolhe uma vez se mostra onde treinou
const lerLocalLigado = () => { try { return localStorage.getItem(CHAVE_LOCAL) !== '0' } catch { return true } }
const MUSCULACAO = 'musculacao'
const CARDIO = 'cardio'

// O post ganha um card sozinho: do treino da ficha (exercícios, volume, recordes), de musculação livre (grupos e duração)
// de cardio na academia (aparelho e duração) ou de corrida, pedal e caminhada (km, tempo, ritmo).
export default function FormCheckin({ aluno, treinos, registros = [], treinoInicial, onFechar, onFeito }) {
  const [treinoId, setTreinoId] = useState(treinoInicial || treinos[0]?.id || MUSCULACAO)
  const [atividade, setAtividade] = useState('')
  const [grupos, setGrupos] = useState([])
  const [aparelho, setAparelho] = useState('')
  const [minutos, setMinutos] = useState('')
  const [km, setKm] = useState('')
  const [tempo, setTempo] = useState('')
  const [comentario, setComentario] = useState('')
  const [foto, setFoto] = useState(null)
  const [recortando, setRecortando] = useState(null)
  const [preview, setPreview] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [comLocal, setComLocal] = useState(lerLocalLigado)
  const [local, setLocal] = useState({ estado: 'buscando' }) // buscando | ok (nome) | erro (msg)

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  // Localização: perto da academia vira "Corpo Atlético"; fora, bairro e cidade. Busca ao abrir, para o aluno ver antes de postar.
  useEffect(() => {
    try { localStorage.setItem(CHAVE_LOCAL, comLocal ? '1' : '0') } catch { /* sem armazenamento */ }
    if (!comLocal) return
    let ativo = true
    setLocal({ estado: 'buscando' })
    Promise.all([posicaoAtual(), supabase.rpc('local_da_academia')])
      .then(([ponto, academia]) => lugarDoCheckin(ponto, academia.data?.[0]))
      .then((nome) => ativo && setLocal(nome ? { estado: 'ok', nome } : { estado: 'erro', msg: 'Não achamos o nome deste lugar.' }))
      .catch((e) => ativo && setLocal({ estado: 'erro', msg: e.message }))
    return () => { ativo = false }
  }, [comLocal])

  function escolherFoto(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) return setErro('Escolha um arquivo de imagem.')
    setErro(''); setRecortando(f)
  }

  // Enquadrada em 4:5, o mesmo formato do feed.
  function usarFoto(blob) {
    setRecortando(null); setFoto(blob); setPreview(URL.createObjectURL(blob))
  }

  const hoje = hojeISO()
  const treino = treinos.find((t) => t.id === treinoId)
  const esporte = ESPORTES[treinoId] ? treinoId : null
  const cardio = esporte && resumoCardio(esporte, km, tempo)
  const musculacao = treinoId === MUSCULACAO && resumoMusculacao(grupos, minutos)
  const cardioLivre = treinoId === CARDIO ? resumoCardioLivre(aparelho, minutos) : null
  const resumo = treino ? resumoTreino(treino, registros, hoje) : musculacao || cardioLivre || cardio || null
  const alternar = (g) => setGrupos((l) => (l.includes(g) ? l.filter((x) => x !== g) : [...l, g]))

  async function salvar() {
    if (esporte && !cardio) return setErro('Coloque a distância (ex.: 5,2) e o tempo (ex.: 28:30).')
    if (treinoId === CARDIO && !cardioLivre) return setErro('Coloque quantos minutos de cardio você fez (ex.: 30).')
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
        titulo: treino ? `Treino ${treino.nome}${treino.foco ? ` · ${treino.foco}` : ''}` : musculacao ? tituloMusculacao(musculacao.grupos) : cardioLivre ? tituloCardioLivre(cardioLivre) : esporte ? `${ESPORTES[esporte][0]} · ${String(cardio.km).replace('.', ',')} km` : atividade.trim(),
        comentario: comentario.trim() || null, foto: caminho,
      }
      if (comLocal && local.estado === 'ok') post.local = local.nome
      let { error } = await supabase.from('checkins').insert(resumo ? { ...post, resumo } : post)
      if (error && post.local && /local/.test(error.message)) { delete post.local; ({ error } = await supabase.from('checkins').insert(resumo ? { ...post, resumo } : post)) } // SQL da localização ainda não rodou
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
          <option value={MUSCULACAO}>Musculação</option>
          <option value={CARDIO}>Cardio</option>
          {Object.entries(ESPORTES).map(([k, [nome]]) => <option key={k} value={k}>{nome}</option>)}
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
      {treinoId === CARDIO && <>
        <div className="full stack" style={{ gap: 6 }}>
          <span className="meta" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>Aparelho (opcional)</span>
          <div className="chips" role="group" aria-label="Aparelho do cardio">
            {Object.entries(APARELHOS_CARDIO).map(([k, nome]) => (
              <button key={k} type="button" className={`chip${aparelho === k ? ' on' : ''}`} aria-pressed={aparelho === k} onClick={() => setAparelho(aparelho === k ? '' : k)}>{nome}</button>
            ))}
          </div>
        </div>
        <label>Duração (min)<input id="checkin-minutos-cardio" inputMode="numeric" placeholder="30" value={minutos} onChange={(e) => setMinutos(e.target.value)} /></label>
      </>}
      {esporte && <>
        <label>Distância (km)<input id="checkin-km" inputMode="decimal" placeholder="5,2" value={km} onChange={(e) => setKm(e.target.value)} /></label>
        <label>Tempo<input id="checkin-tempo" inputMode="numeric" placeholder="28:30" value={tempo} onChange={(e) => setTempo(e.target.value)} /></label>
        <p className="meta full" style={{ margin: 0 }}>{cardio ? `${esporte === 'bike' ? 'Velocidade média' : 'Ritmo'}: ${ritmo(esporte, cardio.km, cardio.segundos)} · ${fmtTempo(cardio.segundos)}` : 'Use os números do relógio ou do app de corrida. Dá para anexar o print do mapa como foto.'}</p>
      </>}
      {treino && resumo && (
        <p className="meta full" style={{ margin: 0 }}>
          Vai junto no post: {resumo.feitos} de {resumo.total} exercícios{resumo.volume ? ` · ${resumo.volume.toLocaleString('pt-BR')} kg levantados` : ''}{resumo.recordes.length ? ` · ${resumo.recordes.length} recorde${resumo.recordes.length > 1 ? 's' : ''}` : ''}
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
      {recortando && <RecortarFoto arquivo={recortando} proporcao={4 / 5} onPronto={usarFoto} onCancelar={() => setRecortando(null)} />}
      <div className="full checkin-local">
        <label className="checkbox"><input id="checkin-com-local" type="checkbox" checked={comLocal} onChange={(e) => setComLocal(e.target.checked)} />Mostrar onde treinei</label>
        {comLocal && (
          <span className="meta">
            <IconeLinha d={ICONES.pino} tamanho={16} traco={1.8} />
            {local.estado === 'buscando' ? 'Buscando sua localização…' : local.estado === 'ok' ? local.nome : local.msg}
          </span>
        )}
      </div>
      <label className="full">Comentário (opcional)<textarea id="checkin-comentario" rows={3} maxLength={280} placeholder="Como foi o treino?" value={comentario} onChange={(e) => setComentario(e.target.value)} /></label>
      <p className="meta full" style={{ margin: 0 }}>Seu check-in aparece no feed da turma e conta para o ranking do mês.</p>
    </Modal>
  )
}
