import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import Modal from './Modal.jsx'
import { Podio, ListaRanking } from './PodioRanking.jsx'
import IconeLinha, { ICONES } from './IconeLinha.jsx'
import { fmtData, hojeISO, num, primeiroNome } from '../lib/formato.js'
import { assinarFotos } from '../lib/fotosAssinadas.js'

const plural = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`
const linkDoConvite = (codigo) => `${window.location.origin}/?desafio=${codigo}`

// Desafio entre amigos (estilo GymRats): o aluno cria, manda o link e cada um disputa dias de treino no prazo.
// `convite`: código que veio no link (?desafio=...), mostra o cartão para entrar.
export default function DesafiosAmigos({ meuAlunoId, fotos, convite, onConviteUsado, onIndisponivel }) {
  const [lista, setLista] = useState(null)
  const [escolhido, setEscolhido] = useState(null)
  const [placar, setPlacar] = useState(null)
  const [fotosAmigos, setFotosAmigos] = useState({})
  const [criando, setCriando] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [convidado, setConvidado] = useState(null) // dados do convite antes de entrar
  const [copiado, setCopiado] = useState(false)
  const hoje = hojeISO()

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('desafios_amigos').select('*').order('fim', { ascending: false })
    if (error) { setLista([]); onIndisponivel?.(); return }
    setLista(data)
  }, [onIndisponivel])
  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (!convite) return
    supabase.rpc('convite_do_desafio', { p_codigo: convite }).then(({ data, error }) => {
      setConvidado(error || !data?.[0] ? { erro: 'Convite não encontrado. Confira o link com quem te convidou.' } : { ...data[0], codigo: convite })
    })
  }, [convite])

  const ativos = (lista || []).filter((d) => d.fim >= hoje)
  const d = (lista || []).find((x) => x.id === escolhido) || ativos.sort((a, b) => (a.fim < b.fim ? -1 : 1))[0] || lista?.[0]

  useEffect(() => {
    if (!d) return
    setPlacar(null)
    supabase.rpc('placar_desafio_amigos', { p_desafio: d.id }).then(async ({ data }) => {
      const linhas = (data || []).map((r) => ({ id: r.aluno_id, nome: r.nome, avatar: r.avatar, valor: r.dias, rotulo: plural(r.dias) }))
        .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR'))
      setPlacar(linhas)
      const caminhos = linhas.map((r) => r.avatar).filter((a) => a && !a.startsWith('p:') && !fotos?.[a])
      if (caminhos.length) {
        const { data: assinadas } = await assinarFotos('avatares', caminhos)
        setFotosAmigos(Object.fromEntries((assinadas || []).filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl])))
      }
    })
  }, [d?.id, fotos])

  async function entrar(cod) {
    setErro('')
    const { data, error } = await supabase.rpc('entrar_no_desafio', { p_codigo: cod })
    if (error) return setErro(error.message.includes('Convite') || error.message.includes('50') ? error.message : 'Não foi possível entrar. Confira o código.')
    setConvidado(null)
    setCodigo('')
    onConviteUsado?.()
    setEscolhido(data)
    carregar()
  }
  async function convidar() {
    const texto = `Bora treinar comigo? Entra no meu desafio "${d.titulo}" no app da Corpo Atlético: ${linkDoConvite(d.codigo)}`
    try {
      if (navigator.share) return await navigator.share({ text: texto })
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch { /* cancelou */ }
  }
  async function sair() {
    const criador = d.criador_id === meuAlunoId
    if (!window.confirm(criador ? `Apagar o desafio "${d.titulo}" para todo mundo?` : `Sair do desafio "${d.titulo}"?`)) return
    if (criador) await supabase.from('desafios_amigos').delete().eq('id', d.id)
    else await supabase.from('desafios_amigos_membros').delete().eq('desafio_id', d.id).eq('aluno_id', meuAlunoId)
    setEscolhido(null)
    carregar()
  }

  if (!lista) return <p className="carregando">Carregando…</p>
  const todasFotos = { ...fotos, ...fotosAmigos }
  const minhaPos = placar ? placar.findIndex((r) => r.id === meuAlunoId) : -1
  const meus = placar?.[minhaPos]?.valor || 0
  const quando = d && (d.inicio > hoje ? `Começa ${fmtData(d.inicio).slice(0, 5)}` : d.fim < hoje ? `Terminou ${fmtData(d.fim).slice(0, 5)}` : `Até ${fmtData(d.fim).slice(0, 5)}`)

  return (
    <div className="stack desafios-amigos">
      {convidado && (
        <div className="convite-desafio">
          {convidado.erro ? <p className="meta" style={{ margin: 0 }}>{convidado.erro}</p> : <>
            <span className="atalho-rotulo">Convite</span>
            <strong>{primeiroNome(convidado.criador)} te chamou para o desafio "{convidado.titulo}"</strong>
            <span className="meta">{fmtData(convidado.inicio).slice(0, 5)} a {fmtData(convidado.fim).slice(0, 5)} · {convidado.membros} {convidado.membros === 1 ? 'pessoa' : 'pessoas'}</span>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <button className="primary" onClick={() => entrar(convidado.codigo)}>Entrar no desafio</button>
              <button className="ghost" onClick={() => { setConvidado(null); onConviteUsado?.() }}>Agora não</button>
            </div>
          </>}
        </div>
      )}

      <div className="row between" style={{ gap: 8 }}>
        {lista.length > 1 ? (
          <div className="segmentos" role="tablist" style={{ margin: 0, flex: 1 }}>
            {lista.map((x) => <button key={x.id} role="tab" aria-pressed={x.id === d?.id} aria-selected={x.id === d?.id} onClick={() => setEscolhido(x.id)}>{x.titulo}</button>)}
          </div>
        ) : <span />}
        {lista.length > 0 && <button className="primary small" onClick={() => setCriando(true)}>Criar desafio</button>}
      </div>

      {!d && (
        <div className="gincana-vazia">
          <IconeLinha d={ICONES.trofeu} tamanho={36} />
          <h3>Desafie seus amigos</h3>
          <p className="meta">Crie um desafio com prazo, mande o link para os amigos e vejam quem treina mais dias. Cada check-in conta.</p>
          <button className="primary" onClick={() => setCriando(true)}>Criar desafio</button>
        </div>
      )}

      {d && (
        <>
          <div className="gincana-topo">
            <span className="atalho-rotulo">Desafio entre amigos · {quando}</span>
            <h3>{d.titulo}</h3>
            {d.descricao && <p className="meta">{d.descricao}</p>}
            <p className="meta">Quem fizer mais dias de check-in de {fmtData(d.inicio).slice(0, 5)} a {fmtData(d.fim).slice(0, 5)} vence{d.meta_dias ? ` · meta: ${plural(d.meta_dias)}` : ''}.</p>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              {d.fim >= hoje && <button className="primary small" onClick={convidar}>{copiado ? 'Link copiado!' : 'Convidar amigos'}</button>}
              <button className="ghost small" onClick={sair}>{d.criador_id === meuAlunoId ? 'Apagar desafio' : 'Sair do desafio'}</button>
            </div>
          </div>

          {d.meta_dias && minhaPos >= 0 && (
            <div>
              <div className="meta" style={{ marginBottom: 4 }}>Você: <strong style={{ color: 'var(--ink)' }}>{Math.min(meus, d.meta_dias)} de {d.meta_dias}</strong> dias{meus >= d.meta_dias ? ' · meta batida!' : ''}</div>
              <div className="bar"><i style={{ width: `${Math.min(100, (meus / d.meta_dias) * 100)}%` }} /></div>
            </div>
          )}

          {!placar ? <p className="carregando">Carregando…</p> : <>
            {placar.length < 2 && <p className="meta" style={{ margin: 0 }}>Só você por enquanto. Toque em <strong>Convidar amigos</strong> e mande o link no WhatsApp.</p>}
            <Podio linhas={placar} fotos={todasFotos} euId={meuAlunoId} />
            <ListaRanking linhas={placar} fotos={todasFotos} euId={meuAlunoId} unidade={(n) => (n === 1 ? 'dia' : 'dias')} />
          </>}
        </>
      )}

      <form className="row entrar-codigo" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) entrar(codigo) }}>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Tem um código de convite?" aria-label="Código do convite" maxLength={20} style={{ flex: 1, minWidth: 0 }} />
        <button disabled={!codigo.trim()}>Entrar</button>
      </form>
      {erro && <p className="erro">{erro}</p>}

      {criando && <FormDesafioAmigos meuAlunoId={meuAlunoId} onFechar={() => setCriando(false)} onSalvo={(id) => { setCriando(false); setEscolhido(id); carregar() }} />}
    </div>
  )
}

function FormDesafioAmigos({ meuAlunoId, onFechar, onSalvo }) {
  const hoje = hojeISO()
  const daqui30 = new Date(Date.now() + 29 * 86400000).toLocaleDateString('sv-SE')
  const [d, setD] = useState({ titulo: '', descricao: '', inicio: hoje, fim: daqui30, meta: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const campo = (k) => ({ id: `desafio-amigos-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  async function salvar() {
    if (!d.titulo.trim()) return setErro('Dê um nome ao desafio.')
    if (d.fim < d.inicio) return setErro('O fim precisa ser depois do início.')
    setSalvando(true)
    const meta = num(d.meta)
    const { data, error } = await supabase.from('desafios_amigos')
      .insert({ criador_id: meuAlunoId, titulo: d.titulo.trim(), descricao: d.descricao.trim() || null, inicio: d.inicio, fim: d.fim, meta_dias: meta > 0 ? Math.min(366, meta) : null })
      .select('id').single()
    setSalvando(false)
    if (error) return setErro(`Não foi possível criar: ${error.message}`)
    onSalvo(data.id)
  }
  return (
    <Modal titulo="Criar desafio" botao="Criar e convidar" onFechar={onFechar} onSalvar={salvar} erro={erro} salvando={salvando}>
      <label className="full">Nome<input maxLength={60} placeholder="Ex.: 30 dias sem falhar" {...campo('titulo')} /></label>
      <label className="full">Descrição<input maxLength={200} placeholder="Opcional, ex.: quem perder paga o açaí" {...campo('descricao')} /></label>
      <label>Início<input type="date" {...campo('inicio')} /></label>
      <label>Fim<input type="date" {...campo('fim')} /></label>
      <label>Meta de dias (opcional)<input type="number" min="1" max="366" placeholder="Ex.: 20" {...campo('meta')} /></label>
    </Modal>
  )
}
