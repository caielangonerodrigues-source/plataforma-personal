import { useEffect, useState } from 'react'
import { ativarNotificacoes, desativarNotificacoes, ehIphone, inscricaoAtual, instalado, suportado } from '../lib/push.js'

// Área do aluno: liga as notificações no celular (lembrete de treino, relatório novo, avisos do personal).
export default function AtivarNotificacoes() {
  const [ativo, setAtivo] = useState(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => { inscricaoAtual().then((s) => setAtivo(!!s)).catch(() => setAtivo(false)) }, [])

  async function alternar() {
    setOcupado(true); setErro('')
    try {
      if (ativo) { await desativarNotificacoes(); setAtivo(false) } else { await ativarNotificacoes(); setAtivo(true) }
    } catch (e) { setErro(e.message) }
    setOcupado(false)
  }

  const iphoneSemApp = ehIphone() && !instalado()
  if (!iphoneSemApp && !suportado()) return null
  return (
    <div className="panel stack" style={{ gap: 8 }}>
      <div className="row between">
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ margin: 0 }}>Notificações no celular</h2>
          <p className="meta" style={{ margin: '2px 0 0' }}>Lembrete do treino com o personal, relatório do mês e avisos.</p>
        </div>
        {!iphoneSemApp && ativo !== null && (
          <button className={ativo ? '' : 'primary'} disabled={ocupado} onClick={alternar}>{ocupado ? 'Aguarde…' : ativo ? 'Desativar' : 'Ativar'}</button>
        )}
      </div>
      {iphoneSemApp && <p className="meta" style={{ margin: 0 }}>No iPhone, primeiro instale o app: toque em Compartilhar e depois em "Adicionar à Tela de Início". Abra pelo ícone e ative aqui.</p>}
      {ativo && <p className="ok" style={{ margin: 0 }}>Ativadas neste celular.</p>}
      {erro && <p className="erro" style={{ margin: 0 }}>{erro}</p>}
    </div>
  )
}
