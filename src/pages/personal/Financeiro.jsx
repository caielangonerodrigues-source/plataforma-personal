import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase.js'
import { MESES, brl, hojeISO, primeiroNome } from '../../lib/formato.js'
import { situacaoMensalidade } from '../../lib/pix.js'
import { linkWhatsApp } from '../../lib/whatsapp.js'
import { AjudaDaPagina } from '../../components/ComoFunciona.jsx'

const ROTULO = { pago: 'Pago', aberto: 'Em aberto', atrasado: 'Atrasado' }

export default function Financeiro() {
  const hoje = hojeISO()
  const [competencia, setCompetencia] = useState(hoje.slice(0, 7))
  const [alunos, setAlunos] = useState(null)
  const [pagos, setPagos] = useState({})
  const [descontos, setDescontos] = useState({}) // { aluno_id: total do mês } (indique um amigo)
  const [temPix, setTemPix] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const [a, p, me, d] = await Promise.all([
      supabase.from('alunos').select('id, nome, telefone, status, valor_mensal, dia_vencimento').not('valor_mensal', 'is', null).neq('status', 'pausado').order('nome'),
      supabase.from('pagamentos').select('id, aluno_id, valor, pago_em').eq('competencia', competencia),
      supabase.from('personais').select('pix_chave').maybeSingle(),
      supabase.from('descontos').select('aluno_id, valor').eq('competencia', competencia),
    ])
    if (a.error) return setErro(a.error.message)
    setAlunos(a.data)
    setPagos(Object.fromEntries((p.data || []).map((x) => [x.aluno_id, x])))
    setTemPix(!!me.data?.pix_chave)
    const tot = {}
    for (const x of d.data || []) tot[x.aluno_id] = (tot[x.aluno_id] || 0) + Number(x.valor)
    setDescontos(tot)
  }, [competencia])

  useEffect(() => { carregar() }, [carregar])

  async function alternar(aluno) {
    const pago = pagos[aluno.id]
    const { error } = pago
      ? await supabase.from('pagamentos').delete().eq('id', pago.id)
      : await supabase.from('pagamentos').insert({ aluno_id: aluno.id, competencia, valor: aluno.valor, pago_em: hoje })
    if (error) setErro(`Não foi possível salvar: ${error.message}`)
    carregar()
  }

  if (!alunos) return <p className="carregando">{erro || 'Carregando…'}</p>
  const mes = MESES[Number(competencia.slice(5)) - 1]
  const atual = competencia === hoje.slice(0, 7)
  const linhas = alunos.map((a) => ({
    ...a,
    desconto: descontos[a.id] || 0,
    valor: Math.max(0, Number(a.valor_mensal) - (descontos[a.id] || 0)),
    situacao: situacaoMensalidade({ valor: a.valor_mensal, diaVencimento: a.dia_vencimento, pago: !!pagos[a.id], hoje: atual ? hoje : `${competencia}-31` }),
  }))
  const recebido = linhas.filter((l) => l.situacao === 'pago').reduce((t, l) => t + Number(pagos[l.id].valor ?? l.valor), 0)
  const aReceber = linhas.filter((l) => l.situacao !== 'pago').reduce((t, l) => t + l.valor, 0)
  const atrasados = linhas.filter((l) => l.situacao === 'atrasado').length
  const mudarMes = (n) => {
    const [y, m] = competencia.split('-').map(Number)
    const d = new Date(y, m - 1 + n, 1)
    setCompetencia(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <>
      <div className="row between">
        <div><h1>Financeiro</h1><p className="sub">Mensalidades por Pix, sem taxa. Você confirma quem pagou.</p></div>
        <div className="row" style={{ gap: 6 }}>
          <button className="small" aria-label="Mês anterior" onClick={() => mudarMes(-1)}>‹</button>
          <strong style={{ minWidth: 120, textAlign: 'center', textTransform: 'capitalize' }}>{mes} {competencia.slice(0, 4)}</strong>
          <button className="small" aria-label="Próximo mês" onClick={() => mudarMes(1)}>›</button>
        </div>
      </div>
      <AjudaDaPagina />
      {!temPix && <div className="panel" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>Cadastre sua chave Pix em <Link to="/configuracoes">Configurações</Link> para os alunos verem o QR Code da mensalidade.</div>}
      <div className="kpis" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="panel kpi"><div className="n" style={{ fontSize: 28 }}>{brl(recebido)}</div><div className="l">Recebido</div></div>
        <div className="panel kpi"><div className="n" style={{ fontSize: 28 }}>{brl(aReceber)}</div><div className="l">A receber</div></div>
        <div className="panel kpi"><div className="n" style={{ fontSize: 32, color: atrasados ? 'var(--warn)' : undefined }}>{atrasados}</div><div className="l">Atrasados</div></div>
      </div>
      {erro && <p className="erro">{erro}</p>}
      <div className="panel tablewrap">
        <table>
          <thead><tr><th>Aluno</th><th className="num">Valor</th><th className="num">Vence</th><th>Situação</th><th /></tr></thead>
          <tbody>
            {linhas.map((l) => {
              const zap = linkWhatsApp(l.telefone, l.situacao === 'atrasado'
                ? `Oi, ${primeiroNome(l.nome)}! A mensalidade de ${mes} (${brl(l.valor)}) venceu dia ${l.dia_vencimento}. O Pix está na área do aluno, em Conta. Qualquer dúvida me chama!`
                : `Oi, ${primeiroNome(l.nome)}! Lembrete da mensalidade de ${mes}: ${brl(l.valor)}${l.dia_vencimento ? `, vence dia ${l.dia_vencimento}` : ''}. O Pix está na área do aluno, em Conta.`)
              return (
                <tr key={l.id}>
                  <td><Link to={`/alunos/${l.id}`}>{l.nome}</Link></td>
                  <td className="num">{brl(l.valor)}{l.desconto > 0 && <div className="meta">−{brl(l.desconto)} indicação</div>}</td>
                  <td className="num">{l.dia_vencimento ? `dia ${l.dia_vencimento}` : '—'}</td>
                  <td><span className={`pill ${l.situacao === 'pago' ? 'ativo' : 'pendente'}`}>{ROTULO[l.situacao]}</span></td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {l.situacao !== 'pago' && zap && <a className="meta" style={{ marginRight: 12 }} href={zap} target="_blank" rel="noreferrer">Cobrar no WhatsApp</a>}
                    <button className="small" onClick={() => alternar(l)}>{l.situacao === 'pago' ? 'Desfazer' : 'Marcar pago'}</button>
                  </td>
                </tr>
              )
            })}
            {!linhas.length && <tr><td colSpan="5" className="empty">Nenhum aluno com mensalidade. Defina o valor no cadastro do aluno.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
