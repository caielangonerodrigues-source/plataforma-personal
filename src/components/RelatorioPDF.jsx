import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabase.js'
import { SimboloCA } from './Logo.jsx'
import { f1, fmtData } from '../lib/formato.js'
import { fimDoMes, nomeDoMes } from '../lib/relatorio.js'

const sinal = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${f1(v)}`)

// Botão "Baixar PDF": abre o relatório do mês numa folha pronta para salvar em PDF ou imprimir
// (no celular: Compartilhar › Imprimir › Salvar PDF; no computador: Salvar como PDF).
export default function BotaoPDF({ alunoId, nome, mes, numeros, conteudo = {}, className = 'small' }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button type="button" className={className} onClick={() => setAberto(true)} disabled={!numeros}>📄 Baixar PDF</button>
      {aberto && <FolhaRelatorio alunoId={alunoId} nome={nome} mes={mes} numeros={numeros} conteudo={conteudo} onFechar={() => setAberto(false)} />}
    </>
  )
}

function FolhaRelatorio({ alunoId, nome, mes, numeros: n, conteudo, onFechar }) {
  const [fotos, setFotos] = useState(null) // { antes, depois } da foto de frente
  useEffect(() => {
    document.body.classList.add('imprimindo-relatorio')
    return () => document.body.classList.remove('imprimindo-relatorio')
  }, [])
  useEffect(() => {
    let ativo = true
    supabase.from('fotos_evolucao').select('data, caminho').eq('aluno_id', alunoId).eq('angulo', 'frente').lte('data', fimDoMes(mes)).order('data')
      .then(async ({ data }) => {
        const lista = data || []
        if (lista.length < 1) return ativo && setFotos({})
        const escolhidas = lista.length > 1 ? [lista[0], lista.at(-1)] : [lista[0]]
        const { data: urls } = await supabase.storage.from('evolucao').createSignedUrls(escolhidas.map((f) => f.caminho), 3600)
        if (!ativo) return
        const u = (urls || []).map((x) => x.signedUrl)
        setFotos(escolhidas.length > 1 ? { antes: { ...escolhidas[0], url: u[0] }, depois: { ...escolhidas[1], url: u[1] } } : { depois: { ...escolhidas[0], url: u[0] } })
      }, () => ativo && setFotos({}))
    return () => { ativo = false }
  }, [alunoId, mes])

  const a = n.avaliacao
  const medidas = a ? [['Peso', a.peso, a.peso_dif, 'kg'], ['Gordura', a.gordura, a.gordura_dif, '%'], ['Cintura', a.cintura, a.cintura_dif, 'cm']].filter(([, v]) => v != null) : []
  const lista = (titulo, itens) => itens?.filter(Boolean).length > 0 && (
    <section><h3>{titulo}</h3><ul>{itens.filter(Boolean).map((x, i) => <li key={i}>{x}</li>)}</ul></section>
  )

  return createPortal(
    <div id="pdf-relatorio" className="pdf-fundo">
      <div className="pdf-barra">
        <button type="button" className="primary" onClick={() => window.print()} disabled={!fotos}>{fotos ? 'Salvar PDF / imprimir' : 'Carregando fotos…'}</button>
        <button type="button" onClick={onFechar}>Fechar</button>
        <span className="meta">No celular: Imprimir › Salvar PDF (ou Compartilhar › Imprimir).</span>
      </div>
      <article className="pdf-folha">
        <header className="pdf-topo">
          <SimboloCA size={46} />
          <div>
            <div className="pdf-marca">Corpo Atlético<span>.</span></div>
            <div className="pdf-sub">Relatório de {nomeDoMes(mes)}</div>
          </div>
        </header>
        <h1>{conteudo.titulo || `Seu mês, ${nome.split(' ')[0]}`}</h1>
        <p className="pdf-nome">{nome}</p>

        <div className="pdf-kpis">
          <div><strong>{n.diasTreinados}</strong><span>dias de treino</span></div>
          <div><strong>{n.checkins ?? 0}</strong><span>check-ins</span></div>
          <div><strong>{n.subiram ?? 0}</strong><span>cargas que subiram</span></div>
          <div><strong>{n.fotos ?? 0}</strong><span>fotos no mês</span></div>
        </div>

        {conteudo.resumo && <p className="pdf-texto">{conteudo.resumo}</p>}
        {lista('Conquistas', conteudo.destaques)}

        {n.cargas?.length > 0 && (
          <section>
            <h3>Cargas</h3>
            <table>
              <thead><tr><th>Exercício</th><th>Antes</th><th>Agora</th><th>Diferença</th></tr></thead>
              <tbody>
                {n.cargas.slice(0, 12).map((c) => (
                  <tr key={c.nome}><td>{c.nome}</td><td>{f1(c.de)} kg</td><td><strong>{f1(c.para)} kg</strong></td><td className={c.diferenca > 0 ? 'sobe' : ''}>{sinal(c.diferenca)} kg</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {medidas.length > 0 && (
          <section>
            <h3>Medidas {a.data && <span className="meta">· avaliação de {fmtData(a.data)}{a.anterior ? `, comparando com ${fmtData(a.anterior)}` : ''}</span>}</h3>
            <table>
              <thead><tr><th /><th>Atual</th><th>Diferença</th></tr></thead>
              <tbody>
                {medidas.map(([r, v, dif, u]) => (
                  <tr key={r}><td>{r}</td><td><strong>{f1(v)} {u}</strong></td><td>{dif == null ? '—' : `${sinal(dif)} ${u}`}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {fotos?.depois && (
          <section>
            <h3>Fotos</h3>
            <div className="pdf-fotos">
              {fotos.antes && <figure><img src={fotos.antes.url} alt="Antes" /><figcaption>{fmtData(fotos.antes.data)}</figcaption></figure>}
              <figure><img src={fotos.depois.url} alt="Agora" /><figcaption>{fmtData(fotos.depois.data)}</figcaption></figure>
            </div>
          </section>
        )}

        {lista('Para melhorar', conteudo.atencao)}
        {conteudo.proximo_mes && <section><h3>Próximo mês</h3><p className="pdf-texto">{conteudo.proximo_mes}</p></section>}
        <footer className="pdf-rodape">Corpo Atlético · relatório gerado pelo app em {fmtData(new Date().toISOString().slice(0, 10))}</footer>
      </article>
    </div>,
    document.body,
  )
}
