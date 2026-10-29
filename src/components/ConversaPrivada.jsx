import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase.js'
import { quandoFoi } from '../lib/comunidade.js'
import { avisarInteracao } from '../lib/push.js'

// Conversa particular entre o aluno e o personal. Mensagens novas chegam na hora (Realtime)
// e, a cada 20 segundos, o chat confere de novo. Ao abrir, marca como lidas as mensagens da outra pessoa.
export default function ConversaPrivada({ alunoId, eu, com, onLidas }) {
  const [mensagens, setMensagens] = useState(null)
  const [indisponivel, setIndisponivel] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const lista = useRef(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('mensagens_privadas').select('*').eq('aluno_id', alunoId).order('created_at', { ascending: false }).limit(200)
    if (error) return setIndisponivel(true)
    setMensagens(data.reverse())
    if (data.some((m) => !m.lida_em && m.user_id !== eu)) { await supabase.rpc('marcar_lidas', { p_aluno: alunoId }); onLidas?.() }
  }, [alunoId, eu])

  useEffect(() => {
    carregar()
    const canal = supabase.channel(`conversa-${alunoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_privadas', filter: `aluno_id=eq.${alunoId}` }, () => carregar())
      .subscribe()
    const t = setInterval(carregar, 20000)
    return () => { clearInterval(t); supabase.removeChannel(canal) }
  }, [carregar, alunoId])

  const total = mensagens?.length
  useEffect(() => { if (lista.current) lista.current.scrollTop = lista.current.scrollHeight }, [total])

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim()) return
    setEnviando(true)
    const { error } = await supabase.from('mensagens_privadas').insert({ aluno_id: alunoId, texto: texto.trim() })
    setEnviando(false)
    if (error) return setErro('Não foi possível enviar agora. Tente de novo.')
    setErro(''); setTexto(''); carregar()
    avisarInteracao('mensagem', { aluno_id: alunoId }, 60000) // no máximo um aviso por minuto
  }

  if (indisponivel) return <div className="panel empty">As mensagens aparecem aqui assim que o personal atualizar o sistema.</div>
  if (!mensagens) return <p className="carregando">Carregando…</p>
  const ultimaMinhaLida = [...mensagens].reverse().find((m) => m.user_id === eu)

  return (
    <div className="panel chat">
      <div className="chat-lista" aria-live="polite" ref={lista}>
        {mensagens.map((m, i) => {
          const minha = m.user_id === eu
          const seguida = i > 0 && mensagens[i - 1].user_id === m.user_id
          return (
            <div key={m.id} className={`chat-msg${minha ? ' minha' : ''}${seguida ? ' seguida' : ''}`}>
              <div className="chat-balao">
                <div style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{m.texto}</div>
                <div className="chat-hora">{quandoFoi(m.created_at)}{minha && m.id === ultimaMinhaLida?.id && m.lida_em && <span>· visto</span>}</div>
              </div>
            </div>
          )
        })}
        {!mensagens.length && <p className="empty">Nenhuma mensagem ainda. Mande sua dúvida para {com}: só vocês dois veem esta conversa.</p>}
      </div>
      <form className="chat-form" onSubmit={enviar}>
        <input aria-label={`Mensagem para ${com}`} maxLength={1000} placeholder={`Mensagem para ${com}…`} value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button className="primary" disabled={enviando || !texto.trim()}>{enviando ? '…' : 'Enviar'}</button>
      </form>
      {erro && <p className="erro" style={{ margin: '8px 10px' }}>{erro}</p>}
    </div>
  )
}
