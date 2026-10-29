import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { f1, hojeISO, primeiroNome } from '../lib/formato.js'
import { linkWhatsApp } from '../lib/whatsapp.js'
import { pedirIA } from '../lib/ia.js'
import { avisarNoApp } from '../lib/push.js'
import BotaoPDF from './RelatorioPDF.jsx'
import { somarDias } from '../lib/comunidade.js'
import { fimDoMes, linhasDosNumeros, mensagemPadrao, mesesRecentes, nomeDoMes, numerosDoMes } from '../lib/relatorio.js'

const VAZIO = { titulo: '', resumo: '', destaques: [], atencao: [], proximo_mes: '', mensagem: '' }
const ERRO_SQL = 'Rode o arquivo supabase/migracao-melhorias.sql no Supabase para salvar relatórios.'

// Relatório já pronto: números do mês e o texto do personal. Usado no painel e na área do aluno.
export function VerRelatorio({ conteudo, numeros, paraAluno }) {
  const n = numeros
  const lista = (titulo, itens) => itens?.length > 0 && (
    <div><h3 style={{ margin: '0 0 4px' }}>{titulo}</h3><ul style={{ margin: 0, paddingLeft: 20 }}>{itens.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
  )
  return (
    <div className="stack" style={{ gap: 12 }}>
      {conteudo.titulo && <h2 style={{ margin: 0 }}>{conteudo.titulo}</h2>}
      {n && (
        <div className="kpis">
          <div className="panel kpi"><div className="n">{n.diasTreinados}</div><div className="l">Dias de treino</div></div>
          <div className="panel kpi"><div className="n">{n.subiram}</div><div className="l">Cargas que subiram</div></div>
          <div className="panel kpi"><div className="n">{n.avaliacao?.noMes && n.avaliacao.peso_dif != null ? `${n.avaliacao.peso_dif > 0 ? '+' : ''}${f1(n.avaliacao.peso_dif)}` : '—'}</div><div className="l">Peso (kg)</div></div>
          <div className="panel kpi"><div className="n">{n.avaliacao?.noMes && n.avaliacao.gordura_dif != null ? `${n.avaliacao.gordura_dif > 0 ? '+' : ''}${f1(n.avaliacao.gordura_dif)}` : '—'}</div><div className="l">Gordura (%)</div></div>
        </div>
      )}
      {conteudo.resumo && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{conteudo.resumo}</p>}
      {lista(paraAluno ? 'Suas conquistas' : 'Destaques', conteudo.destaques)}
      {lista('Para melhorar', conteudo.atencao)}
      {n?.cargas?.some((c) => c.diferenca > 0) && (
        <div>
          <h3 style={{ margin: '0 0 4px' }}>Cargas que mais subiram</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {n.cargas.filter((c) => c.diferenca > 0).slice(0, 5).map((c) => <li key={c.nome}>{c.nome}: {f1(c.de)} → <strong>{f1(c.para)} kg</strong></li>)}
          </ul>
        </div>
      )}
      {conteudo.proximo_mes && <div><h3 style={{ margin: '0 0 4px' }}>Próximo mês</h3><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{conteudo.proximo_mes}</p></div>}
    </div>
  )
}

// Área do aluno: o relatório mais recente que o personal publicou.
export function RelatoriosAluno({ alunoId, nome = '' }) {
  const [lista, setLista] = useState([])
  const [i, setI] = useState(0)
  useEffect(() => {
    supabase.from('relatorios').select('mes, conteudo').eq('aluno_id', alunoId).eq('publicado', true).order('mes', { ascending: false }).limit(6)
      .then(({ data }) => setLista(data || []))
  }, [alunoId])
  const r = lista[i]
  if (!r) return null
  return (
    <div className="panel stack" style={{ borderColor: 'var(--accent)' }}>
      <div className="row between">
        <span className="meta">Relatório do seu personal · {nomeDoMes(r.mes)}</span>
        <BotaoPDF alunoId={alunoId} nome={nome} mes={r.mes} numeros={r.conteudo.numeros} conteudo={r.conteudo} />
        {lista.length > 1 && (
          <select aria-label="Mês do relatório" value={i} onChange={(e) => setI(Number(e.target.value))} style={{ width: 'auto' }}>
            {lista.map((x, j) => <option key={x.mes} value={j}>{nomeDoMes(x.mes)}</option>)}
          </select>
        )}
      </div>
      <VerRelatorio conteudo={r.conteudo} numeros={r.conteudo.numeros} paraAluno />
    </div>
  )
}

// Personal: monta o relatório do mês (números automáticos + texto escrito à mão ou pela IA).
export default function Relatorio({ aluno }) {
  const hoje = hojeISO()
  const meses = mesesRecentes(hoje)
  const [mes, setMes] = useState(Number(hoje.slice(8, 10)) <= 7 ? meses[1] : meses[0])
  const [numeros, setNumeros] = useState(null)
  const [texto, setTexto] = useState(VAZIO)
  const [salvo, setSalvo] = useState(null) // linha da tabela relatorios
  const [extra, setExtra] = useState('')
  const [estado, setEstado] = useState({})
  const nome = primeiroNome(aluno.nome)

  useEffect(() => {
    let ativo = true
    const ini = `${mes}-01`, fim = fimDoMes(mes)
    setNumeros(null); setEstado({})
    Promise.all([
      supabase.from('registros').select('*').eq('aluno_id', aluno.id).gte('data', somarDias(ini, -90)).lte('data', fim),
      supabase.from('checkins').select('data').eq('aluno_id', aluno.id).gte('data', ini).lte('data', fim),
      supabase.from('fotos_evolucao').select('data').eq('aluno_id', aluno.id).gte('data', ini).lte('data', fim),
      supabase.from('relatorios').select('*').eq('aluno_id', aluno.id).eq('mes', mes).maybeSingle(),
    ]).then(([r, c, f, rel]) => {
      if (!ativo) return
      setNumeros(numerosDoMes({ mes, treinos: aluno.todosTreinos || aluno.treinos, avaliacoes: aluno.avaliacoes, registros: r.data || [], checkins: c.data || [], fotos: f.data || [] }))
      setSalvo(rel.data || null)
      setTexto(rel.data ? { ...VAZIO, ...rel.data.conteudo } : VAZIO)
    })
    return () => { ativo = false }
  }, [aluno, mes])

  async function escreverComIA() {
    setEstado({ carregando: true })
    try {
      const r = await pedirIA({ tipo: 'relatorio', alunoId: aluno.id, pedido: extra, extra: { mes, numeros } })
      setTexto({ ...VAZIO, ...r }); setEstado({})
    } catch (e) {
      setEstado({ erro: e.message })
    }
  }
  async function salvar(publicado) {
    setEstado({ salvando: true })
    const conteudo = { ...texto, destaques: texto.destaques.filter((x) => x.trim()), atencao: texto.atencao.filter((x) => x.trim()), mensagem: texto.mensagem || mensagemPadrao(nome, numeros), numeros }
    const { data, error } = await supabase.from('relatorios')
      .upsert({ aluno_id: aluno.id, mes, conteudo, publicado, updated_at: new Date().toISOString() }, { onConflict: 'aluno_id,mes' }).select().maybeSingle()
    if (error) return setEstado({ erro: /relatorios|schema cache|does not exist/i.test(error.message) ? ERRO_SQL : `Não foi possível salvar: ${error.message}` })
    setSalvo(data); setTexto({ ...VAZIO, ...conteudo })
    if (publicado && !salvo?.publicado) avisarNoApp([aluno.id], 'Seu relatório chegou', `Veja como foi seu mês de ${nomeDoMes(mes).split(' ')[0]} na aba Evolução.`)
    setEstado({ ok: publicado ? `Pronto: ${nome} já vê o relatório na aba Evolução.` : 'Rascunho salvo.' })
  }

  const campo = (k) => ({ id: `rel-${k}`, value: texto[k], onChange: (e) => setTexto({ ...texto, [k]: e.target.value }) })
  const linhas = (k) => ({ id: `rel-${k}`, value: texto[k].join('\n'), onChange: (e) => setTexto({ ...texto, [k]: e.target.value.split('\n') }) })
  const mensagem = texto.mensagem || (numeros ? mensagemPadrao(nome, numeros) : '')
  const zap = linkWhatsApp(aluno.telefone, mensagem)

  return (
    <div className="stack">
      <div className="panel stack">
        <div className="row between">
          <div>
            <h2 style={{ margin: 0 }}>Relatório de {numeros ? nomeDoMes(mes) : '…'}</h2>
            <p className="meta" style={{ margin: '2px 0 0' }}>Os números saem do que {nome} registrou. O texto você escreve ou pede para a IA.</p>
          </div>
          <select id="rel-mes" aria-label="Mês" value={mes} onChange={(e) => setMes(e.target.value)} style={{ width: 'auto' }}>
            {meses.map((m) => <option key={m} value={m}>{nomeDoMes(m)}</option>)}
          </select>
        </div>
        {!numeros ? <p className="carregando">Carregando…</p> : (
          <>
            <ul className="meta" style={{ margin: 0, paddingLeft: 18, color: 'var(--ink)' }}>
              {linhasDosNumeros(numeros).map((l) => <li key={l}>{l}</li>)}
              {numeros.fotos > 0 && <li>{numeros.fotos} foto(s) de evolução no mês</li>}
              {numeros.trocas > 0 && <li>{numeros.trocas} troca(s) de exercício</li>}
              {!numeros.avaliacao?.noMes && <li>Sem avaliação física neste mês</li>}
            </ul>
            <label>O que a IA deve destacar? <span className="meta">(opcional)</span>
              <input id="rel-extra" maxLength={500} placeholder="Ex.: ela voltou de lesão, foco em constância" value={extra} onChange={(e) => setExtra(e.target.value)} />
            </label>
            <div className="row between">
              <span className="meta">{salvo ? (salvo.publicado ? 'Publicado na área do aluno' : 'Rascunho salvo') : 'Ainda não salvo'}</span>
              <BotaoPDF alunoId={aluno.id} nome={aluno.nome} mes={mes} numeros={numeros} conteudo={{ ...texto, destaques: texto.destaques.filter(Boolean), atencao: texto.atencao.filter(Boolean) }} />
              <button className="primary" disabled={estado.carregando} onClick={escreverComIA}>{estado.carregando ? 'A IA está escrevendo…' : texto.resumo ? 'Reescrever com IA' : 'Escrever com IA'}</button>
            </div>
          </>
        )}
      </div>

      {numeros && (
        <div className="panel stack">
          <div className="form">
            <label className="full">Título<input maxLength={80} placeholder={`Seu mês de ${nomeDoMes(mes).split(' ')[0]}`} {...campo('titulo')} /></label>
            <label className="full">Resumo<textarea rows={3} maxLength={1200} {...campo('resumo')} /></label>
            <label className="full">Destaques <span className="meta">(um por linha)</span><textarea rows={3} {...linhas('destaques')} /></label>
            <label className="full">Para melhorar <span className="meta">(um por linha)</span><textarea rows={2} {...linhas('atencao')} /></label>
            <label className="full">Próximo mês<textarea rows={2} maxLength={800} {...campo('proximo_mes')} /></label>
            <label className="full">Mensagem do WhatsApp<textarea rows={6} maxLength={1500} placeholder={numeros ? mensagemPadrao(nome, numeros) : ''} {...campo('mensagem')} /></label>
          </div>
          {estado.erro && <p className="erro">{estado.erro}</p>}
          {estado.ok && <p className="ok">{estado.ok}</p>}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button onClick={() => navigator.clipboard?.writeText(mensagem).then(() => setEstado({ ok: 'Mensagem copiada.' }))}>Copiar mensagem</button>
            {zap ? <a className="botao-link" href={zap} target="_blank" rel="noreferrer">Enviar no WhatsApp</a> : <span className="meta">Sem WhatsApp no cadastro</span>}
            <button disabled={estado.salvando} onClick={() => salvar(false)}>Salvar rascunho</button>
            <button className="primary" disabled={estado.salvando} onClick={() => salvar(true)}>Mostrar na área do aluno</button>
          </div>
        </div>
      )}

      {numeros && (texto.resumo || texto.destaques.some(Boolean)) && (
        <div className="panel">
          <p className="meta" style={{ marginTop: 0 }}>Assim {nome} vai ver:</p>
          <VerRelatorio conteudo={{ ...texto, destaques: texto.destaques.filter(Boolean), atencao: texto.atencao.filter(Boolean) }} numeros={numeros} paraAluno />
        </div>
      )}
    </div>
  )
}
