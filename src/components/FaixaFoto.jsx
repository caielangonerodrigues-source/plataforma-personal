import { useState } from 'react'
import { SLIDES, useFotosDoPersonal } from './HeroEntrada.jsx'

// Faixa de foto no topo das telas de dentro, igual à tela de entrada: foto da academia em preto e branco
// (a primeira que o personal subiu em Academia, ou a padrão), título grande por cima e as ações em laranja.
export default function FaixaFoto({ rotulo, titulo, texto, baixa, children }) {
  const fotos = useFotosDoPersonal()
  const [falhou, setFalhou] = useState(false)
  const foto = (fotos[0] || SLIDES[0]).foto
  return (
    <header className={`faixa-foto${baixa ? ' baixa' : ''}`}>
      {!falhou && <img src={foto} alt="" onError={() => setFalhou(true)} />}
      <div className="faixa-foto-texto">
        {rotulo && <span className="faixa-foto-rotulo">{rotulo}</span>}
        <h1>{titulo}</h1>
        {texto && <p>{texto}</p>}
        {children}
      </div>
    </header>
  )
}

export const saudacao = (hora = new Date().getHours()) => (hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite')
