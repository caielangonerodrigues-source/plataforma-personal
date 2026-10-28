import { useEffect } from 'react'

export default function Modal({ titulo, onFechar, onSalvar, botao = 'Salvar', erro, salvando, children }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <form className="modal stack" onSubmit={(e) => { e.preventDefault(); onSalvar() }}>
        <h2>{titulo}</h2>
        <div className="form">{children}</div>
        {erro && <p className="erro">{erro}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" onClick={onFechar}>Cancelar</button>
          <button className="primary" disabled={salvando}>{salvando ? 'Salvando…' : botao}</button>
        </div>
      </form>
    </div>
  )
}
