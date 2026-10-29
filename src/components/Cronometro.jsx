import { useEffect, useState } from 'react'
import { mmss } from '../lib/descanso.js'

let audio = null
// O navegador só deixa tocar som depois de um toque: chame isto no clique que inicia o descanso.
export function prepararSom() {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)()
    if (audio.state === 'suspended') audio.resume()
  } catch { audio = null }
}

function apitar() {
  try { navigator.vibrate?.([300, 150, 300, 150, 300]) } catch { /* sem vibração */ }
  if (!audio) return
  ;[0, 0.35, 0.7].forEach((t) => {
    const o = audio.createOscillator(), g = audio.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.25, audio.currentTime + t)
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + t + 0.25)
    o.connect(g).connect(audio.destination)
    o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.3)
  })
}

// Barra fixa no rodapé com a contagem do descanso. Usa o horário de término, então
// continua certo mesmo se a tela apagar ou o aluno trocar de aba.
export default function Cronometro({ descanso, onFechar }) {
  const [fim, setFim] = useState(() => Date.now() + descanso.segundos * 1000)
  const [agora, setAgora] = useState(Date.now())
  const restante = Math.ceil((fim - agora) / 1000)
  const acabou = restante <= 0

  useEffect(() => { setFim(Date.now() + descanso.segundos * 1000); setAgora(Date.now()) }, [descanso])
  useEffect(() => {
    if (acabou) return
    const t = setInterval(() => setAgora(Date.now()), 250)
    return () => clearInterval(t)
  }, [acabou])
  useEffect(() => {
    if (!acabou) return
    apitar()
    const t = setTimeout(onFechar, 6000)
    return () => clearTimeout(t)
  }, [acabou, onFechar])

  const pct = Math.min(100, Math.max(0, (restante / descanso.segundos) * 100))
  return (
    <div className={`cronometro${acabou ? ' fim' : ''}`} role="timer" aria-live={acabou ? 'assertive' : 'off'}>
      <div className="cron-barra"><i style={{ width: `${pct}%` }} /></div>
      <div className="row between" style={{ flexWrap: 'nowrap' }}>
        <div style={{ minWidth: 0 }}>
          <div className="cron-rotulo">{acabou ? 'Descanso acabou' : `Descanso${descanso.serie ? ` · ${descanso.serie}` : ''}`}</div>
          <div className="cron-nome">{acabou ? 'Bora para a próxima série!' : descanso.nome}</div>
        </div>
        {!acabou && <div className="cron-tempo">{mmss(restante)}</div>}
        <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
          {!acabou && <button className="small" aria-label="Tirar 15 segundos" onClick={() => setFim(fim - 15000)}>−15</button>}
          {!acabou && <button className="small" aria-label="Mais 15 segundos" onClick={() => setFim(fim + 15000)}>+15</button>}
          <button className="small" onClick={onFechar}>{acabou ? 'Fechar' : 'Pular'}</button>
        </div>
      </div>
    </div>
  )
}
