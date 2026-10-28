import { INSTRUTOR, estadoBike, fileirasBikes } from '../lib/spinning.js'

const LEGENDA = [['livre', 'Livre'], ['selecionada', 'Sua escolha'], ['ocupada', 'Ocupada'], ['bloqueada', 'Manutenção']]

// Sala de spinning vista de cima, como o mapa de lugares do cinema (instrutor no meio da primeira fileira).
// `nomes` (só para o personal) mostra quem reservou cada bike.
export default function MapaBikes({ vagas, ocupadas, bloqueadas, selecionada, onEscolher, nomes, todasClicaveis }) {
  return (
    <div className="sala">
      <div className="palco">Frente da sala</div>
      <div className="fileiras">
        {fileirasBikes(vagas).map((fileira, i) => (
          <div className="fileira" key={i}>
            {fileira.map((n) => {
              if (n === INSTRUTOR) return (
                <div key="instrutor" className="bike instrutor" aria-label="Bike do instrutor">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="17" r="4" /><circle cx="18" cy="17" r="4" /><path d="M6 17l5-8h6M11 9l3 8M15 5h3" /></svg>
                  <span className="bike-n" style={{ fontSize: 12, letterSpacing: '.06em' }}>INSTRUTOR</span>
                </div>
              )
              const estado = estadoBike(n, { ocupadas, bloqueadas, selecionada })
              const reserva = nomes?.[n]
              const clicavel = todasClicaveis || estado === 'livre' || estado === 'selecionada'
              return (
                <button key={n} type="button" className={`bike ${estado}${reserva?.status === 'pendente' ? ' pendente' : ''}`}
                  disabled={!clicavel} aria-pressed={estado === 'selecionada'}
                  aria-label={`Bike ${n}: ${reserva ? reserva.nome : { livre: 'livre', ocupada: 'ocupada', bloqueada: 'em manutenção', selecionada: 'selecionada' }[estado]}`}
                  onClick={() => onEscolher?.(n)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="17" r="4" /><circle cx="18" cy="17" r="4" /><path d="M6 17l5-8h6M11 9l3 8M15 5h3" /></svg>
                  <span className="bike-n">{n}</span>
                  {nomes && <span className="bike-nome">{reserva ? reserva.nome.split(' ')[0] : estado === 'bloqueada' ? 'manut.' : ''}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div className="legend" style={{ justifyContent: 'center' }}>
        {(nomes ? [['livre', 'Livre'], ['ocupada pendente', 'Aguardando Pix'], ['ocupada', 'Pago'], ['bloqueada', 'Manutenção']] : LEGENDA).map(([k, l]) => (
          <span key={k}><i className={`sw-bike ${k}`} />{l}</span>
        ))}
      </div>
    </div>
  )
}
