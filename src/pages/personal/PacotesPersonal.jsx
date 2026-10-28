import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabase.js'
import Modal from '../../components/Modal.jsx'
import { brl, fmtData, hojeISO, num, primeiroNome } from '../../lib/formato.js'
import { linkWhatsApp } from '../../lib/whatsapp.js'

// Pacotes de aulas de spinning: o que está à venda e quem comprou (com saldo).
export default function PacotesPersonal() {
  const [pacotes, setPacotes] = useState(null)
  const [compras, setCompras] = useState([])
  const [modal, setModal] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from('pacotes_spinning').select('*').order('aulas'),
      supabase.from('creditos_spinning').select('*, reservas_spinning(status)').neq('status', 'cancelada').order('created_at', { ascending: false }).limit(200),
    ])
    if (p.error) return setErro(p.error.message)
    setPacotes(p.data)
    setCompras(c.data || [])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function acao(q) {
    const { error } = await q
    setErro(error ? `Não foi possível salvar: ${error.message}` : '')
    carregar()
  }
  async function copiarLink() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/spinning/pacotes`); setCopiado(true) } catch { setCopiado(false) }
  }

  if (!pacotes) return <p className="carregando">{erro || 'Carregando…'}</p>
  const hoje = hojeISO()
  const saldo = (c) => c.aulas - c.reservas_spinning.filter((r) => r.status !== 'cancelada').length
  const ativos = compras.filter((c) => c.status === 'pago' && (!c.validade || c.validade >= hoje) && saldo(c) > 0)

  return (
    <div className="stack">
      <div className="row between">
        <div><p className="sub" style={{ margin: 0 }}>Quem compra um pacote reserva as bikes com o código, sem Pix a cada aula.</p></div>
        <div className="row">
          <button onClick={copiarLink}>{copiado ? 'Link copiado' : 'Copiar link dos pacotes'}</button>
          <button onClick={() => setModal({ tipo: 'venda' })}>Vender no balcão</button>
          <button className="primary" onClick={() => setModal({ tipo: 'pacote' })}>Novo pacote</button>
        </div>
      </div>
      {erro && <p className="erro">{erro}</p>}
      <div className="aulas">
        {pacotes.map((p) => (
          <div key={p.id} className="aula" style={p.ativo ? undefined : { opacity: .55 }}>
            <span className="dia">{p.nome}</span>
            <span className="hora">{p.aulas} aulas</span>
            <span className="meta">{brl(p.valor)} · {brl(p.valor / p.aulas)} por aula · {p.validade_dias} dias</span>
            <button className="small" style={{ alignSelf: 'flex-start' }} onClick={() => acao(supabase.from('pacotes_spinning').update({ ativo: !p.ativo }).eq('id', p.id))}>{p.ativo ? 'Tirar da venda' : 'Voltar à venda'}</button>
          </div>
        ))}
        {pacotes.length === 0 && <div className="panel empty">Crie seu primeiro pacote, por exemplo 10 aulas por R$ 250.</div>}
      </div>

      <div className="panel tablewrap">
        <div className="row between" style={{ marginBottom: 8 }}><h2>Compras</h2><span className="meta">{ativos.length} {ativos.length === 1 ? 'pacote ativo' : 'pacotes ativos'}</span></div>
        {compras.length === 0 ? <p className="empty">Ninguém comprou ainda.</p> : (
          <table>
            <thead><tr><th>Nome</th><th>Código</th><th className="num">Saldo</th><th>Validade</th><th>Situação</th><th /></tr></thead>
            <tbody>
              {compras.map((c) => {
                const vencido = c.status === 'pago' && c.validade && c.validade < hoje
                const zap = linkWhatsApp(c.telefone, c.status === 'pendente'
                  ? `Oi, ${primeiroNome(c.nome)}! Vi seu pedido do pacote de ${c.aulas} aulas (${brl(c.valor)}). Falta o Pix para liberar o saldo.`
                  : `Oi, ${primeiroNome(c.nome)}! Seu pacote de spinning (código ${c.codigo}) tem ${saldo(c)} aulas. Reserve em ${window.location.origin}/spinning`)
                return (
                  <tr key={c.id}>
                    <td><strong>{c.nome}</strong><div className="meta">{c.telefone}</div></td>
                    <td className="mono">{c.codigo}</td>
                    <td className="num">{c.status === 'pago' ? `${saldo(c)}/${c.aulas}` : '—'}</td>
                    <td>{c.validade ? fmtData(c.validade) : '—'}</td>
                    <td><span className={`pill ${c.status === 'pago' && !vencido ? 'ativo' : vencido ? 'pausado' : 'pendente'}`}>{vencido ? 'Vencido' : c.status === 'pago' ? 'Pago' : 'Aguardando Pix'}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {c.status === 'pendente' && <button className="primary small" onClick={() => acao(supabase.from('creditos_spinning').update({ status: 'pago' }).eq('id', c.id))}>Confirmar pagamento</button>}
                      {zap && <a className="meta" style={{ marginLeft: 8 }} href={zap} target="_blank" rel="noreferrer">WhatsApp</a>}
                      {c.status === 'pendente' && <button className="ghost small" onClick={() => confirm(`Cancelar o pedido de ${c.nome}?`) && acao(supabase.from('creditos_spinning').update({ status: 'cancelada' }).eq('id', c.id))}>Cancelar</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      {modal?.tipo === 'pacote' && <FormPacote onFechar={() => setModal(null)} onSalvo={() => { setModal(null); carregar() }} />}
      {modal?.tipo === 'venda' && <FormVenda pacotes={pacotes.filter((p) => p.ativo)} onFechar={() => setModal(null)} onSalvo={() => { setModal(null); carregar() }} />}
    </div>
  )
}

function FormPacote({ onFechar, onSalvo }) {
  const [d, setD] = useState({ nome: '10 aulas', aulas: '10', valor: '250', validade_dias: '90' })
  const [erro, setErro] = useState('')
  const campo = (k) => ({ id: `pacote-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  async function salvar() {
    if (!num(d.aulas) || !num(d.valor)) return setErro('Informe a quantidade de aulas e o valor.')
    const { error } = await supabase.from('pacotes_spinning').insert({ nome: d.nome.trim() || `${d.aulas} aulas`, aulas: num(d.aulas), valor: num(d.valor), validade_dias: num(d.validade_dias) || 90 })
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    onSalvo()
  }
  return (
    <Modal titulo="Novo pacote" botao="Criar pacote" onFechar={onFechar} onSalvar={salvar} erro={erro}>
      <label className="full">Nome<input maxLength={60} {...campo('nome')} /></label>
      <label>Aulas<input inputMode="numeric" {...campo('aulas')} /></label>
      <label>Valor (R$)<input inputMode="decimal" {...campo('valor')} /></label>
      <label>Validade (dias)<input inputMode="numeric" {...campo('validade_dias')} /></label>
      {num(d.aulas) > 0 && num(d.valor) > 0 && <p className="meta full" style={{ margin: 0 }}>Sai a {brl(num(d.valor) / num(d.aulas))} por aula.</p>}
    </Modal>
  )
}

// Pacote pago na hora (dinheiro, cartão): já entra com saldo. O código vai para a pessoa no WhatsApp.
function FormVenda({ pacotes, onFechar, onSalvo }) {
  const [d, setD] = useState({ pacote: pacotes[0]?.id || '', nome: '', telefone: '' })
  const [erro, setErro] = useState('')
  const campo = (k) => ({ id: `venda-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  async function salvar() {
    const p = pacotes.find((x) => x.id === d.pacote)
    if (!p) return setErro('Crie um pacote primeiro.')
    if (d.nome.trim().length < 2 || d.telefone.replace(/\D/g, '').length < 10) return setErro('Informe nome e WhatsApp com DDD.')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('creditos_spinning').insert({ pacote_id: p.id, personal_id: user.id, nome: d.nome.trim(), telefone: d.telefone.trim(), aulas: p.aulas, valor: p.valor, status: 'pago' })
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    onSalvo()
  }
  return (
    <Modal titulo="Vender pacote no balcão" botao="Registrar venda" onFechar={onFechar} onSalvar={salvar} erro={erro}>
      <label className="full">Pacote<select {...campo('pacote')}>{pacotes.map((p) => <option key={p.id} value={p.id}>{p.nome} · {brl(p.valor)}</option>)}</select></label>
      <label>Nome<input {...campo('nome')} /></label>
      <label>WhatsApp<input type="tel" {...campo('telefone')} /></label>
      <p className="meta full" style={{ margin: 0 }}>Para quem pagou na hora. O pacote já entra com saldo; mande o código pelo WhatsApp na lista de compras.</p>
    </Modal>
  )
}
