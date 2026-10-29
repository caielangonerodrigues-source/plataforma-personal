import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase.js'
import Avatar from './Avatar.jsx'
import { nomeCurto, quandoFoi } from '../lib/comunidade.js'

// Chat da turma: quem participa da comunidade e o personal. Mensagens novas chegam na hora (Realtime),
// e a cada 20 segundos o chat confere de novo, caso a conexão ao vivo caia.
export default function ChatTurma({ dados, podeApagarTudo }) {
  const [mensagens, setMensagens] = useState(null)
  const [indisponivel, setIndisponivel] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const fim = useRef(null)
  const membro = Object.fromEntries(dados.membros.map((m) => [m.id, m]))

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('mensagens_turma').select('*').order('created_at', { ascending: false }).limit(100)
    if (error) return setIndisponivel(true)
    setMensagens(data.reverse())
  }, [])

  useEffect(() => {
    carregar()
    const canal = supabase.channel('chat-turma')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_turma' }, () => carregar())
      .subscribe()
    const t = setInterval(carregar, 20000)
    return () => { clearInterval(t); supabase.removeChannel(canal) }
  }, [carregar])

  const total = mensagens?.length
  useEffect(() => { if (fim.current) fim.current.scrollTop = fim.current.scrollHeight }, [total])

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim()) return
    setEnviando(true)
    const { error } = await supabase.from('mensagens_turma').insert({ texto: texto.trim() })
    setEnviando(false)
    if (error) return setErro('Não foi possível enviar agora. Tente de novo.')
    setErro(''); setTexto(''); carregar()
  }

  async function apagar(id) {
    const { error } = await supabase.from('mensagens_turma').delete().eq('id', id)
    if (error) setErro(`Não foi possível apagar: ${error.message}`)
    carregar()
  }

  if (indisponivel) return <div className="panel empty">O chat da turma aparece aqui assim que o personal atualizar o sistema.</div>
  if (!mensagens) return <p className="carregando">Carregando…</p>

  return (
    <div className="panel chat">
      <div className="chat-lista" aria-live="polite" ref={fim}>
        {mensagens.map((m, i) => {
          const minha = m.user_id === dados.eu
          const quem = m.aluno_id && membro[m.aluno_id]
          const seguida = i > 0 && mensagens[i - 1].user_id === m.user_id
          return (
            <div key={m.id} className={`chat-msg${minha ? ' minha' : ''}${seguida ? ' seguida' : ''}`}>
              {!minha && <span className="chat-avatar">{!seguida && <Avatar nome={m.autor} avatar={quem?.avatar} fotos={dados.fotos} tamanho={30} />}</span>}
              <div className="chat-balao">
                {!minha && !seguida && (
                  <div className="chat-autor">{nomeCurto(m.autor || 'Aluno')}{m.do_personal && <span className="post-tag" style={{ marginLeft: 6 }}>Personal</span>}</div>
                )}
                <div style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{m.texto}</div>
                <div className="chat-hora">
                  {quandoFoi(m.created_at)}
                  {(minha || podeApagarTudo) && <button className="link" onClick={() => apagar(m.id)} aria-label="Apagar mensagem">apagar</button>}
                </div>
              </div>
            </div>
          )
        })}
        {!mensagens.length && <p className="empty">Ninguém falou nada ainda. Mande um "bora treinar" para a turma!</p>}
      </div>
      <form className="chat-form" onSubmit={enviar}>
        <input aria-label="Mensagem para a turma" maxLength={500} placeholder="Mensagem para a turma…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button className="primary" disabled={enviando || !texto.trim()}>{enviando ? '…' : 'Enviar'}</button>
      </form>
      {erro && <p className="erro" style={{ margin: '8px 0 0' }}>{erro}</p>}
    </div>
  )
}
