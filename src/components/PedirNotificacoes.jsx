import { useEffect, useState } from 'react'
import IconeLinha, { ICONES } from './IconeLinha.jsx'
import { ativarNotificacoes, suportado } from '../lib/push.js'

const CHAVE = 'notificacoes-perguntado-em'
const SEMANA = 7 * 24 * 3600e3

// Logo depois de entrar, pergunta uma vez se a pessoa quer receber notificações (se disser "agora não",
// pergunta de novo só depois de uma semana). Só aparece onde o celular deixa ativar e ninguém respondeu ainda.
export default function PedirNotificacoes({ texto }) {
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!suportado() || Notification.permission !== 'default') return
    let ultima = 0
    try { ultima = Number(localStorage.getItem(CHAVE)) || 0 } catch { /* sem armazenamento */ }
    if (Date.now() - ultima < SEMANA) return
    const t = setTimeout(() => setAberto(true), 1500)
    return () => clearTimeout(t)
  }, [])

  function fechar() {
    try { localStorage.setItem(CHAVE, String(Date.now())) } catch { /* sem armazenamento */ }
    setAberto(false)
  }

  async function ativar() {
    setOcupado(true); setErro('')
    try { await ativarNotificacoes(); fechar() } catch (e) { setErro(e.message) }
    setOcupado(false)
  }

  if (!aberto) return null
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="pedir-notif-titulo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal pedir-notificacoes">
        <IconeLinha d={ICONES.sino} tamanho={44} />
        <h2 id="pedir-notif-titulo">Quer receber notificações?</h2>
        <p className="meta">{texto}</p>
        {erro && <p className="erro" style={{ margin: 0 }}>{erro}</p>}
        <button className="primary" disabled={ocupado} onClick={ativar}>{ocupado ? 'Aguarde…' : 'Ativar notificações'}</button>
        <button className="link" onClick={fechar}>Agora não</button>
      </div>
    </div>
  )
}
