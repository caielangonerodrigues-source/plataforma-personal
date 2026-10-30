import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase.js'
import { AVATARES, lerAvatar } from '../lib/avatar.js'
import Avatar, { IconeAvatar } from './Avatar.jsx'
import RecortarFoto from './RecortarFoto.jsx'

// Tirar uma foto ou escolher um avatar pronto (aparece na comunidade). Serve para o aluno e, com `personal`,
// para o personal (a foto vai para a pasta dele e o banco salva em personais).
export default function EditarAvatar({ aluno, personal, onMudou }) {
  const dono = personal ? { id: personal.user_id, nome: personal.nome, avatar: personal.avatar } : aluno
  const rpc = personal ? 'definir_avatar_personal' : 'definir_avatar'
  const [avatar, setAvatar] = useState(dono.avatar || null)
  const [fotos, setFotos] = useState({})
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [recortando, setRecortando] = useState(null) // foto escolhida, antes de enquadrar
  const camera = useRef(null)
  const galeria = useRef(null)
  const atual = lerAvatar(avatar)

  useEffect(() => {
    if (atual?.tipo !== 'foto' || fotos[atual.caminho]) return
    supabase.storage.from('avatares').createSignedUrl(atual.caminho, 3600).then(({ data }) => data && setFotos((f) => ({ ...f, [atual.caminho]: data.signedUrl })))
  }, [atual, fotos])

  async function salvar(novo) {
    setOcupado(true); setErro('')
    const { error } = await supabase.rpc(rpc, { p_avatar: novo })
    if (error) {
      setOcupado(false)
      return setErro(error.message.includes(rpc) ? (personal ? 'Falta rodar o SQL do avatar do personal (README, passo 14).' : 'Peça ao seu personal para atualizar o sistema.') : 'Não foi possível salvar. Tente de novo.')
    }
    const antigo = lerAvatar(avatar)
    if (antigo?.tipo === 'foto' && antigo.caminho !== novo) await supabase.storage.from('avatares').remove([antigo.caminho])
    setAvatar(novo); setOcupado(false); onMudou?.(novo)
  }

  function escolherFoto(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (arquivo) setRecortando(arquivo)
  }

  // Foto já enquadrada em quadrado de 400px (avatar não precisa de mais).
  async function enviarFoto(blob) {
    setRecortando(null)
    setOcupado(true); setErro('')
    try {
      const caminho = `${dono.id}/${crypto.randomUUID()}.jpg`
      const { error } = await supabase.storage.from('avatares').upload(caminho, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      setFotos((f) => ({ ...f, [caminho]: URL.createObjectURL(blob) }))
      await salvar(caminho)
    } catch {
      setOcupado(false)
      setErro('Não foi possível enviar a foto. Tente de novo.')
    }
  }

  return (
    <div className="panel stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 14, flexWrap: 'nowrap' }}>
        <Avatar nome={dono.nome} avatar={avatar} fotos={fotos} tamanho={72} />
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0 }}>Seu avatar</h2>
          <p className="meta" style={{ margin: '2px 0 0' }}>{personal ? 'Aparece nas suas fotos e comentários na comunidade.' : 'Aparece no feed, nos comentários e no ranking da comunidade.'}</p>
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="primary" disabled={ocupado} onClick={() => camera.current.click()}>Tirar foto</button>
        <button disabled={ocupado} onClick={() => galeria.current.click()}>Escolher da galeria</button>
        {avatar && <button className="ghost" disabled={ocupado} onClick={() => salvar(null)}>Remover</button>}
        <input ref={camera} type="file" accept="image/*" capture="user" hidden onChange={escolherFoto} />
        <input ref={galeria} type="file" accept="image/*" hidden onChange={escolherFoto} />
      </div>
      <div>
        <div className="meta" style={{ marginBottom: 6 }}>Ou escolha um avatar pronto:</div>
        <div className="avatares-prontos" role="group" aria-label="Avatares prontos">
          {AVATARES.map(([nome, icone], i) => (
            <button key={i} type="button" aria-label={`Avatar ${nome}`} title={nome} aria-pressed={avatar === `p:${i}`} disabled={ocupado} onClick={() => salvar(`p:${i}`)}><IconeAvatar chave={icone} tamanho={46} /></button>
          ))}
        </div>
      </div>
      {ocupado && <p className="meta" style={{ margin: 0 }}>Salvando…</p>}
      {erro && <p className="erro" style={{ margin: 0 }}>{erro}</p>}
      {recortando && <RecortarFoto arquivo={recortando} proporcao={1} redondo lado={400} titulo="Enquadrar seu avatar" onPronto={enviarFoto} onCancelar={() => setRecortando(null)} />}
    </div>
  )
}
