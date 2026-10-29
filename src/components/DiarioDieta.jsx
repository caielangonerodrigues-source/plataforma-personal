import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { ALIMENTOS, somarItens } from '../lib/nutricao.js'
import { MACROS, consumoDoDia, consumoPrevisto, faltando, macrosDoExtra, metasDaDieta, situacaoDoDia, sugestoes } from '../lib/diario.js'
import { reduzirFoto } from '../lib/foto.js'
import { f1, fmtData, num } from '../lib/formato.js'
import { somarDias } from '../lib/comunidade.js'

// Registros do diário de um ou mais dias, com as fotos dos pratos já assinadas.
// `indisponivel` = o personal ainda não rodou o SQL novo.
export function useDiario(alunoId, desde, ate = desde) {
  const [estado, setEstado] = useState({ itens: null, fotos: {}, indisponivel: false })
  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('diario_dieta').select('*').eq('aluno_id', alunoId).gte('data', desde).lte('data', ate).order('created_at')
    if (error) return setEstado({ itens: [], fotos: {}, indisponivel: true })
    const caminhos = data.map((d) => d.foto).filter(Boolean)
    const assinadas = caminhos.length ? (await supabase.storage.from('pratos').createSignedUrls(caminhos, 3600)).data || [] : []
    setEstado({ itens: data, fotos: Object.fromEntries(assinadas.filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl])), indisponivel: false })
  }, [alunoId, desde, ate])
  useEffect(() => { carregar() }, [carregar])
  return { ...estado, carregar }
}

// Contador de macros: barra por macro com quanto já foi e quanto falta.
export function ContadorMacros({ metas, consumo, compacto = false }) {
  const faltam = faltando(metas, consumo)
  return (
    <div className={`contador-macros${compacto ? ' compacto' : ''}`}>
      {MACROS.map(([k, rotulo, un]) => {
        if (!metas[k]) return null
        const pct = Math.min(100, Math.round(((consumo[k] || 0) / metas[k]) * 100))
        const f = faltam[k]
        return (
          <div key={k} className={`macro macro-${k}`}>
            <div className="row between" style={{ gap: 6, flexWrap: 'nowrap' }}>
              <span className="macro-nome">{rotulo}</span>
              <span className="macro-num"><strong>{k === 'kcal' ? Math.round(consumo[k] || 0) : f1(consumo[k] || 0)}</strong> / {metas[k]} {un}</span>
            </div>
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            <div className="meta macro-falta">{f > 0 ? `Faltam ${k === 'kcal' ? Math.round(f) : f1(f)} ${un}` : f < 0 ? `Passou ${k === 'kcal' ? Math.round(-f) : f1(-f)} ${un}` : 'Meta batida'}</div>
          </div>
        )
      })}
    </div>
  )
}

// Aba Dieta do aluno: marca as refeições, foto do prato, extras, contador e dicas para fechar os macros.
export default function DiarioDieta({ aluno, dieta, hoje }) {
  const diario = useDiario(aluno.id, hoje)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(null)
  const [extra, setExtra] = useState({ alimento: '', gramas: '' })
  if (!diario.itens) return <p className="carregando">Carregando…</p>
  if (diario.indisponivel) return <p className="meta">O diário da dieta (marcar refeições e contar os macros) aparece aqui assim que seu personal atualizar o sistema.</p>

  const refeicoes = dieta.refeicoes || []
  const feitas = diario.itens.filter((d) => d.refeicao != null)
  const extras = diario.itens.filter((d) => d.refeicao == null)
  const doPlano = refeicoes.map((r, i) => ({ r, i })).filter(({ r }) => r.itens?.length)
  const metas = metasDaDieta(dieta)
  const consumo = consumoDoDia(dieta, diario.itens)
  const faltam = faltando(metas, consumo)
  const situacao = situacaoDoDia(faltam, feitas.length, doPlano.length)
  const pendentes = doPlano.length - feitas.length
  // Com refeições ainda por fazer, as dicas olham o que vai faltar mesmo depois delas.
  const dicas = sugestoes(pendentes > 0 ? faltando(metas, consumoPrevisto(dieta, diario.itens)) : faltam)
  const registro = (i) => feitas.find((d) => d.refeicao === i)

  async function rodar(chave, fn) {
    setOcupado(chave); setErro('')
    try { const { error } = await fn(); if (error) throw error } catch { setErro('Não foi possível salvar agora. Verifique a internet e tente de novo.') }
    setOcupado(null); diario.carregar()
  }
  const marcar = (i, feita) => rodar(`r${i}`, () => (feita
    ? supabase.from('diario_dieta').insert({ aluno_id: aluno.id, data: hoje, refeicao: i })
    : supabase.from('diario_dieta').delete().eq('id', registro(i).id)))
  async function foto(i, arquivo) {
    if (!arquivo) return
    await rodar(`f${i}`, async () => {
      const caminho = `${aluno.id}/${crypto.randomUUID()}.jpg`
      const up = await supabase.storage.from('pratos').upload(caminho, await reduzirFoto(arquivo, 1080, 0.8), { contentType: 'image/jpeg' })
      if (up.error) return up
      const atual = registro(i)
      if (atual?.foto) await supabase.storage.from('pratos').remove([atual.foto])
      return atual
        ? supabase.from('diario_dieta').update({ foto: caminho }).eq('id', atual.id)
        : supabase.from('diario_dieta').insert({ aluno_id: aluno.id, data: hoje, refeicao: i, foto: caminho })
    })
  }
  const anotar = (alimento, gramas, macros) => rodar('extra', () => supabase.from('diario_dieta').insert({ aluno_id: aluno.id, data: hoje, alimento, gramas, macros }))
  function anotarExtra(e) {
    e.preventDefault()
    const alimento = extra.alimento.trim()
    if (!alimento) return
    anotar(alimento, num(extra.gramas) || null, macrosDoExtra(alimento, num(extra.gramas)))
    setExtra({ alimento: '', gramas: '' })
  }

  return (
    <div className="stack">
      <div className="panel stack" style={{ gap: 12 }}>
        <div className="row between"><h2 style={{ margin: 0 }}>Hoje</h2><span className="meta">{feitas.length} de {doPlano.length} refeições</span></div>
        <ContadorMacros metas={metas} consumo={consumo} />
        {situacao && <div className={`situacao-dieta ${situacao.tipo}`}>{situacao.texto}</div>}
        {dicas.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            <div className="meta" style={{ fontWeight: 600 }}>💡 {pendentes > 0 ? 'Mesmo com as refeições que faltam, ainda sobra espaço. Um lanche ajuda a fechar:' : 'Para bater a meta hoje, você pode comer:'}</div>
            {dicas.map((d) => (
              <div key={d.macro} className="dica-macro">
                <span style={{ flex: 1, minWidth: 0 }}>{d.texto}</span>
                <button className="small" disabled={ocupado === 'extra'} onClick={() => anotar(d.alimento, d.gramas, d.macros)}>Comi ✓</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {erro && <p className="erro">{erro}</p>}

      {doPlano.map(({ r, i }) => {
        const reg = registro(i)
        const t = somarItens(r.itens)
        return (
          <div className={`panel refeicao${reg ? ' feita' : ''}`} key={i}>
            <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <label className="refeicao-check">
                <input type="checkbox" checked={!!reg} disabled={ocupado === `r${i}`} onChange={(e) => marcar(i, e.target.checked)} />
                <span><span className="name">{r.horario && <span className="mono" style={{ color: 'var(--accent)', marginRight: 8 }}>{r.horario}</span>}{r.nome}</span>{t.kcal > 0 && <span className="meta"> · {t.kcal} kcal</span>}</span>
              </label>
              <label className={`botao-foto-prato${ocupado === `f${i}` ? ' enviando' : ''}`} title="Foto do prato">
                <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { foto(i, e.target.files?.[0]); e.target.value = '' }} />
                {ocupado === `f${i}` ? '…' : '📷'}<span className="so-computador"> Foto</span>
              </label>
            </div>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {r.itens.map((it, j) => <li key={j}>{it.alimento}{(it.quantidade || it.gramas) && <span className="meta"> · {[it.quantidade, it.gramas && `${f1(it.gramas)} g`].filter(Boolean).join(', ')}</span>}</li>)}
            </ul>
            {r.obs && <p className="meta" style={{ margin: '6px 0 0' }}>{r.obs}</p>}
            {reg?.foto && diario.fotos[reg.foto] && <img className="foto-prato" src={diario.fotos[reg.foto]} alt={`Prato do ${r.nome}`} loading="lazy" />}
          </div>
        )
      })}

      <div className="panel stack" style={{ gap: 10 }}>
        <h3 style={{ margin: 0 }}>Comeu algo fora do plano?</h3>
        <p className="meta" style={{ margin: 0 }}>Anote aqui para o contador ficar certo. Sem culpa: seu personal usa isso para ajustar a dieta.</p>
        <datalist id="alimentos-diario">{ALIMENTOS.map((a) => <option key={a.nome} value={a.nome} />)}</datalist>
        <form className="row" style={{ gap: 8, flexWrap: 'nowrap' }} onSubmit={anotarExtra}>
          <input list="alimentos-diario" aria-label="Alimento" placeholder="Ex.: Banana prata" style={{ flex: 1, minWidth: 0 }} value={extra.alimento} onChange={(e) => setExtra({ ...extra, alimento: e.target.value })} maxLength={80} />
          <input aria-label="Gramas" placeholder="g" inputMode="decimal" style={{ width: 70 }} value={extra.gramas} onChange={(e) => setExtra({ ...extra, gramas: e.target.value })} />
          <button className="primary small" disabled={!extra.alimento.trim() || ocupado === 'extra'}>Anotar</button>
        </form>
        {extras.map((x) => (
          <div key={x.id} className="row between" style={{ flexWrap: 'nowrap' }}>
            <span style={{ minWidth: 0 }}>{x.alimento}{x.gramas ? <span className="meta"> · {f1(x.gramas)} g</span> : null}<span className="meta"> · {x.macros ? `${x.macros.kcal} kcal` : 'fora da tabela, não entra na conta'}</span></span>
            <button className="ghost small" aria-label={`Tirar ${x.alimento}`} onClick={() => rodar(`x${x.id}`, () => supabase.from('diario_dieta').delete().eq('id', x.id))}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Para o personal: como o aluno seguiu a dieta nos últimos 7 dias.
export function DiarioDoAluno({ aluno, dieta, hoje }) {
  const desde = somarDias(hoje, -6)
  const diario = useDiario(aluno.id, desde, hoje)
  if (!diario.itens || diario.indisponivel || !dieta) return null
  const metas = metasDaDieta(dieta)
  const totalRefeicoes = (dieta.refeicoes || []).filter((r) => r.itens?.length).length
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(hoje, -i)).filter((d) => diario.itens.some((x) => x.data === d))
  return (
    <div className="panel stack" style={{ gap: 10 }}>
      <div className="row between"><h2 style={{ margin: 0 }}>Diário da dieta</h2><span className="meta">registrou em {dias.length} dos últimos 7 dias</span></div>
      {!diario.itens.length && <p className="meta" style={{ margin: 0 }}>O aluno ainda não marcou nenhuma refeição.</p>}
      {dias.map((d) => {
        const doDia = diario.itens.filter((x) => x.data === d)
        const c = consumoDoDia(dieta, doDia)
        const feitas = doDia.filter((x) => x.refeicao != null).length
        const fotos = doDia.filter((x) => x.foto && diario.fotos[x.foto])
        return (
          <div key={d} className="dia-diario">
            <div className="row between" style={{ flexWrap: 'nowrap' }}>
              <strong>{d === hoje ? 'Hoje' : fmtData(d).slice(0, 5)}</strong>
              <span className="meta">{feitas}/{totalRefeicoes} refeições · {c.kcal}{metas.kcal ? ` de ${metas.kcal}` : ''} kcal · P {f1(c.proteina)} g</span>
            </div>
            {fotos.length > 0 && (
              <div className="row" style={{ gap: 6, marginTop: 6 }}>
                {fotos.map((x) => <a key={x.id} href={diario.fotos[x.foto]} target="_blank" rel="noreferrer"><img className="miniatura-prato" src={diario.fotos[x.foto]} alt={`Prato de ${fmtData(d)}`} loading="lazy" /></a>)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
