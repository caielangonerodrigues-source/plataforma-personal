import { useEffect, useState } from 'react'

const CHAVE = 'instalar-app-dispensado'
const instalado = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
const ehIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

// Convite para instalar o site na tela inicial (Android: botão; iPhone: instrução do Safari).
export default function InstalarApp() {
  const [evento, setEvento] = useState(null)
  const [dispensado, setDispensado] = useState(() => { try { return localStorage.getItem(CHAVE) === '1' } catch { return false } })

  useEffect(() => {
    const pegar = (e) => { e.preventDefault(); setEvento(e) }
    window.addEventListener('beforeinstallprompt', pegar)
    return () => window.removeEventListener('beforeinstallprompt', pegar)
  }, [])

  if (dispensado || instalado() || (!evento && !ehIphone())) return null
  const fechar = () => { setDispensado(true); try { localStorage.setItem(CHAVE, '1') } catch { /* sem armazenamento */ } }

  return (
    <div className="panel row between" style={{ marginTop: 16 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="name">Instale o app no celular</div>
        <div className="meta">
          {evento ? 'Fica com ícone na tela inicial e abre direto no seu treino.' : 'No Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início".'}
        </div>
      </div>
      <div className="row">
        {evento && <button className="primary small" onClick={async () => { evento.prompt(); await evento.userChoice; setEvento(null) }}>Instalar</button>}
        <button className="ghost small" onClick={fechar}>Agora não</button>
      </div>
    </div>
  )
}
