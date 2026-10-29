import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import { bikesLivres, quandoAula } from '../../lib/spinning.js'
import { brl } from '../../lib/formato.js'
import TopoSpinning, { minhasReservas } from './TopoSpinning.jsx'

// Página pública: próximas aulas, com vagas livres. Não precisa de login.
// embutido: dentro da área do aluno (aba Spinning), sem o topo da página pública.
export default function AulasSpinning({ embutido = false }) {
  const [aulas, setAulas] = useState(null)
  const [erro, setErro] = useState('')
  const guardadas = minhasReservas()

  useEffect(() => {
    (async () => {
      const ate = new Date(Date.now() + 14 * 864e5).toISOString()
      const { data, error } = await supabase.from('aulas_spinning').select('*').eq('cancelada', false)
        .gte('inicio', new Date().toISOString()).lte('inicio', ate).order('inicio').limit(40)
      if (error) return setErro('Não foi possível carregar as aulas. Tente de novo.')
      const ocupadas = await Promise.all(data.map((a) => supabase.rpc('bikes_ocupadas', { a: a.id }).then((r) => r.data || [])))
      setAulas(data.map((a, i) => ({ ...a, livres: bikesLivres(a.vagas, ocupadas[i], a.bloqueadas) })))
    })()
  }, [])

  // Agrupa por dia para ler como uma grade de horários.
  const dias = []
  for (const a of aulas || []) {
    const { dia } = quandoAula(a.inicio)
    if (dias.at(-1)?.dia !== dia) dias.push({ dia, aulas: [] })
    dias.at(-1).aulas.push(a)
  }

  return (
    <div className={embutido ? undefined : 'solo'}>
      {!embutido && <TopoSpinning />}
      {embutido ? <h2>Aulas de spinning</h2> : <h1>Próximas aulas</h1>}
      <p className="sub">Escolha o horário, depois a sua bike no mapa da sala. O pagamento é por Pix ou com um <Link to="/spinning/pacotes">pacote de aulas</Link>.</p>
      {guardadas.length > 0 && (
        <div className="panel row between" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>
          <span>Você tem {guardadas.length === 1 ? 'uma reserva' : `${guardadas.length} reservas`} neste aparelho.</span>
          <Link to={`/spinning/reserva/${guardadas[0].id}?c=${guardadas[0].codigo}`}>Ver minha reserva</Link>
        </div>
      )}
      {erro && <p className="erro">{erro}</p>}
      {!aulas && !erro && <p className="carregando">Carregando…</p>}
      {aulas?.length === 0 && <div className="panel empty">Nenhuma aula marcada nos próximos 14 dias.</div>}
      <div className="stack">
        {dias.map((d) => (
          <section key={d.dia}>
            <h2 style={{ marginBottom: 10 }}>{d.dia}</h2>
            <div className="aulas">
              {d.aulas.map((a) => (
                <Link key={a.id} to={`/spinning/${a.id}`} className={`aula${a.livres ? '' : ' lotada'}`}>
                  <span className="hora">{quandoAula(a.inicio).hora}</span>
                  <strong>{a.titulo}{a.instrutor ? ` · ${a.instrutor}` : ''}</strong>
                  <span className="meta">{a.duracao_min} min · {Number(a.valor) ? brl(a.valor) : 'Gratuita'}</span>
                  <span className={`pill ${a.livres ? 'ativo' : 'pausado'}`} style={{ alignSelf: 'flex-start' }}>
                    {a.livres ? `${a.livres} ${a.livres === 1 ? 'bike livre' : 'bikes livres'}` : 'Lotada'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
