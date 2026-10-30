import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase.js'
import { AVATARES, lerAvatar } from '../lib/avatar.js'
import Avatar, { IconeAvatar } from './Avatar.jsx'

// Recorta o meio da foto em quadrado e reduz (avatar não precisa de mais que 400px).
async function fotoQuadrada(arquivo, lado = 400) {
  const bitmap = await createImageBitmap(arquivo)
  const menor = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = lado
  canvas.getContext('2d').drawImage(bitmap, (bitmap.width - menor) / 2, (bitmap.height - menor) / 2, menor, menor, 0, 0, lado, lado)
  return new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error('Não foi possível ler a foto.'))), 'image/jpeg', 0.85))
}

// Tirar uma foto ou escolher um avatar pronto (aparece na comunidade). Serve para o aluno e, com `personal`,
// para o personal (a foto vai para a pasta dele e o banco salva em personais).
export default function EditarAvatar({ aluno, personal, onMudou }) {
  const dono = personal ? { id: personal.user_id, nome: personal.nome, avatar: personal.avatar } : aluno
  const rpc = personal ? 'definir_avatar_personal' : 'definir_avatar'
  const [avatar, setAvatar] = useState(dono.avatar || null)
  const [fotos, setFotos] = useState({})
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
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

  async function enviarFoto(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setOcupado(true); setErro('')
    try {
      const blob = await fotoQuadrada(arquivo)
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
        <input ref={camera} type="file" accept="image/*" capture="user" hidden onChange={enviarFoto} />
        <input ref={galeria} type="file" accept="image/*" hidden onChange={enviarFoto} />
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
    </div>
  )
}
