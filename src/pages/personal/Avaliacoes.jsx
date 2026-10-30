import { useState } from 'react'
import { supabase } from '../../supabase.js'
import Modal from '../../components/Modal.jsx'
import Grafico from '../../components/Grafico.jsx'
import Composicao from '../../components/Composicao.jsx'
import FotosEvolucao from '../../components/FotosEvolucao.jsx'
import { DOBRAS, DOBRAS_EXTRAS, PERIMETROS, PROTOCOLOS, calcGordura, classificacao, dobrasDo, idadeDoAluno, imc, massaMagra } from '../../lib/pollock.js'
import { f1, fmtData, hojeISO, num } from '../../lib/formato.js'

const COLUNAS = [['peso', 'Peso kg'], ['gordura', '% gord.'], ['mm', 'M. magra kg'], ['imc', 'IMC'], ['cintura', 'Cintura'], ['quadril', 'Quadril'], ['braco', 'Braço'], ['coxa', 'Coxa']]
const valor = (v, k) => (k === 'imc' ? imc(v) : k === 'mm' ? massaMagra(v) : v[k] == null ? null : Number(v[k]))
const PROT_CURTO = { p7: 'Pollock 7', p3: 'Pollock 3', manual: 'Manual' }

export default function Avaliacoes({ aluno, recarregar }) {
  const [nova, setNova] = useState(false)
  const av = aluno.avaliacoes
  const p = av[0], u = av.at(-1)

  async function excluir(id) {
    await supabase.from('avaliacoes').delete().eq('id', id)
    recarregar()
  }

  return (
    <>
      <div className="row between" style={{ marginBottom: 12 }}>
        <span className="meta">{av.length} avaliação(ões) · perímetros em cm</span>
        <button className="primary small" onClick={() => setNova(true)}>Nova avaliação</button>
      </div>
      <div className="stack">
        {u && <Composicao avaliacao={u} anterior={av.at(-2)} sexo={aluno.sexo} idade={idadeDoAluno(aluno)} />}
        <div className="panel"><Grafico avaliacoes={av} /></div>
        <FotosEvolucao alunoId={aluno.id} podeApagar />
        {av.length > 0 && (
          <div className="panel tablewrap">
            <table>
              <thead><tr><th>Data</th><th>Protocolo</th>{COLUNAS.map(([k, l]) => <th key={k} className="num">{l}</th>)}<th /></tr></thead>
              <tbody>
                {av.map((v) => (
                  <tr key={v.id}>
                    <td className="num" style={{ textAlign: 'left' }}>{fmtData(v.data)}</td>
                    <td>{PROT_CURTO[v.protocolo]}</td>
                    {COLUNAS.map(([k]) => <td key={k} className="num">{f1(valor(v, k))}</td>)}
                    <td><button className="ghost small" aria-label="Excluir avaliação" onClick={() => excluir(v.id)}>✕</button></td>
                  </tr>
                ))}
                {av.length > 1 && (
                  <tr>
                    <td><strong>Variação</strong></td><td />
                    {COLUNAS.map(([k]) => {
                      const a = valor(u, k), b = valor(p, k), d = a == null || b == null ? null : a - b
                      return <td key={k} className="num"><strong>{d > 0 ? '+' : ''}{f1(d)}</strong></td>
                    })}
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {nova && <FormAvaliacao aluno={aluno} onFechar={() => setNova(false)} onSalvo={() => { setNova(false); recarregar() }} />}
    </>
  )
}

export function FormAvaliacao({ aluno, inicial, onFechar, onSalvo }) {
  const ultima = aluno.avaliacoes.at(-1)
  // `inicial` vem de um envio da consultoria online: sem dobras, então protocolo manual.
  const { medidas: medidasIniciais, ...resto } = inicial || {}
  const [d, setD] = useState({ data: hojeISO(), peso: '', altura: ultima?.altura ?? '', protocolo: inicial ? 'manual' : 'p7', gordura: '', ...resto })
  const [dobras, setDobras] = useState({})
  const [medidas, setMedidas] = useState(() => Object.fromEntries(Object.entries(medidasIniciais || {}).map(([k, v]) => [k, String(v ?? '')])))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const campo = (k) => ({ id: `av-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  const chaves = dobrasDo(d.protocolo, aluno.sexo)
  const calc = d.protocolo === 'manual' ? null : calcGordura(d.protocolo, aluno.sexo, aluno.idade, dobras)

  async function salvar() {
    if (!d.peso || !d.altura) return setErro('Peso e altura são obrigatórios para calcular o IMC.')
    if (d.protocolo !== 'manual' && !aluno.idade) return setErro('Cadastre a idade do aluno: ela entra na equação de Pollock.')
    if (d.protocolo !== 'manual' && !calc) return setErro('Preencha todas as dobras do protocolo, em milímetros.')
    setSalvando(true)
    const m = Object.fromEntries(PERIMETROS.map(([k]) => [k, num(medidas[k])]).filter(([, v]) => v != null && !Number.isNaN(v)))
    // Todas as dobras medidas; o cálculo usa só as do protocolo.
    const todas = Object.fromEntries([...DOBRAS, ...DOBRAS_EXTRAS].map(([k]) => [k, num(dobras[k])]).filter(([, v]) => v != null && !Number.isNaN(v)))
    const linha = {
      aluno_id: aluno.id, data: d.data, peso: num(d.peso), altura: num(d.altura), protocolo: d.protocolo,
      dobras: Object.keys(todas).length ? todas : null,
      gordura: calc ? Math.round(calc.gordura * 10) / 10 : num(d.gordura),
      cintura: m.cintura ?? null, quadril: m.quadril ?? null, braco: m.braco_d ?? m.braco_e ?? null, coxa: m.coxa_d ?? m.coxa_e ?? null,
      medidas: Object.keys(m).length ? m : null,
    }
    let r = await supabase.from('avaliacoes').insert(linha).select('id').single()
    // Sem supabase/migracao-avaliacao-medidas.sql não existe a coluna medidas: grava o resto.
    if (r.error && /medidas/.test(r.error.message || '')) { const { medidas: _m, ...sem } = linha; r = await supabase.from('avaliacoes').insert(sem).select('id').single() }
    const { data: salva, error } = r
    setSalvando(false)
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    onSalvo(salva.id)
  }

  return (
    <Modal titulo="Nova avaliação física" botao="Registrar" onFechar={onFechar} onSalvar={salvar} erro={erro} salvando={salvando}>
      <label>Data<input type="date" required {...campo('data')} /></label>
      <label>Peso (kg)<input type="number" step="0.1" required {...campo('peso')} /></label>
      <label>Altura (m)<input type="number" step="0.01" required {...campo('altura')} /></label>
      <label>Protocolo<select {...campo('protocolo')}>{Object.entries(PROTOCOLOS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>

      {d.protocolo === 'manual' ? (
        <>
          <label>% de gordura<input type="number" step="0.1" {...campo('gordura')} /></label>
          <div className="secao">Dobras cutâneas (mm, opcional)</div>
          {[...DOBRAS, ...DOBRAS_EXTRAS].map(([k, l]) => (
            <label key={k}>{l}<input id={`dobra-${k}`} type="number" step="0.5" min="0" value={dobras[k] ?? ''} onChange={(e) => setDobras({ ...dobras, [k]: e.target.value })} /></label>
          ))}
        </>
      ) : (
        <>
          <div className="secao">Dobras cutâneas (mm)</div>
          {DOBRAS.filter(([k]) => chaves.includes(k)).map(([k, l]) => (
            <label key={k}>{l}<input id={`dobra-${k}`} type="number" step="0.5" min="0" value={dobras[k] ?? ''} onChange={(e) => setDobras({ ...dobras, [k]: e.target.value })} /></label>
          ))}
          <p className="meta mono full" style={{ margin: 0 }}>
            {calc
              ? `Soma ${f1(calc.soma)} mm · densidade ${calc.densidade.toFixed(4)} g/ml · ${f1(calc.gordura)}% de gordura · ${classificacao(aluno.sexo, calc.gordura)}`
              : `Preencha as ${chaves.length} dobras para ver o cálculo (${aluno.sexo === 'M' ? 'homem' : 'mulher'}, ${aluno.idade || '?'} anos).`}
          </p>
          <div className="secao">Outras dobras (mm, opcional)</div>
          {[...DOBRAS, ...DOBRAS_EXTRAS].filter(([k]) => !chaves.includes(k)).map(([k, l]) => (
            <label key={k}>{l}<input id={`dobra-${k}`} type="number" step="0.5" min="0" value={dobras[k] ?? ''} onChange={(e) => setDobras({ ...dobras, [k]: e.target.value })} /></label>
          ))}
        </>
      )}

      <div className="secao">Perímetros (cm)</div>
      {PERIMETROS.map(([k, l]) => (
        <label key={k}>{l}<input id={`av-${k}`} type="number" step="0.5" min="0" value={medidas[k] ?? ''} onChange={(e) => setMedidas({ ...medidas, [k]: e.target.value })} /></label>
      ))}
    </Modal>
  )
}
