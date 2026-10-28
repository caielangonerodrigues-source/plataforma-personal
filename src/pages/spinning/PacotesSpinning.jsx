import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import { brl } from '../../lib/formato.js'
import TopoSpinning, { guardarCodigoPacote, meuCodigoPacote } from './TopoSpinning.jsx'

// Pacotes de aulas à venda. Depois do Pix, o código do pacote reserva aulas sem pagar de novo.
export default function PacotesSpinning() {
  const navigate = useNavigate()
  const [pacotes, setPacotes] = useState(null)
  const [escolhido, setEscolhido] = useState(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const meu = meuCodigoPacote()

  useEffect(() => {
    supabase.from('pacotes_spinning').select('*').eq('ativo', true).order('aulas').then(({ data }) => setPacotes(data || []))
  }, [])

  async function comprar(e) {
    e.preventDefault()
    setErro(''); setEnviando(true)
    const { data, error } = await supabase.rpc('comprar_pacote', { p_pacote: escolhido, p_nome: nome, p_telefone: telefone })
    setEnviando(false)
    if (error) return setErro(error.message)
    guardarCodigoPacote(data[0].codigo)
    navigate(`/spinning/pacote/${data[0].codigo}`)
  }

  const p = pacotes?.find((x) => x.id === escolhido)
  return (
    <div className="solo">
      <TopoSpinning voltar="/spinning" />
      <h1>Pacotes de aulas</h1>
      <p className="sub">Pague uma vez e reserve suas bikes sem Pix a cada aula.</p>
      {meu && <div className="panel row between" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}><span>Você já tem um pacote neste aparelho.</span><Link to={`/spinning/pacote/${meu}`}>Ver saldo</Link></div>}
      {!pacotes ? <p className="carregando">Carregando…</p> : pacotes.length === 0 ? <div className="panel empty">Nenhum pacote à venda no momento.</div> : (
        <div className="aulas" style={{ marginBottom: 20 }}>
          {pacotes.map((x) => (
            <button key={x.id} className="aula" aria-current={x.id === escolhido} onClick={() => setEscolhido(x.id)}>
              <span className="dia">{x.nome}</span>
              <span className="hora">{x.aulas} aulas</span>
              <strong>{brl(x.valor)}</strong>
              <span className="meta">{brl(x.valor / x.aulas)} por aula · vale {x.validade_dias} dias</span>
            </button>
          ))}
        </div>
      )}
      {p && (
        <form className="panel stack" style={{ maxWidth: 480 }} onSubmit={comprar}>
          <h2>{p.nome} · {brl(p.valor)}</h2>
          <label>Seu nome<input id="nome" autoComplete="name" required minLength={2} maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} /></label>
          <label>WhatsApp com DDD<input id="telefone" type="tel" autoComplete="tel" required placeholder="(11) 98765-4321" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></label>
          {erro && <p className="erro">{erro}</p>}
          <button className="primary" disabled={enviando}>{enviando ? 'Aguarde…' : 'Comprar e pagar no Pix'}</button>
          <p className="meta" style={{ margin: 0 }}>A validade começa a contar quando o pagamento for confirmado.</p>
        </form>
      )}
    </div>
  )
}
