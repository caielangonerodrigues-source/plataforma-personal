import { useState } from 'react'
import { supabase } from '../../supabase.js'
import Modal from '../../components/Modal.jsx'
import Grafico from '../../components/Grafico.jsx'
import Composicao from '../../components/Composicao.jsx'
import { DOBRAS, PROTOCOLOS, calcGordura, classificacao, dobrasDo, imc, massaMagra } from '../../lib/pollock.js'
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
        {u && <Composicao avaliacao={u} sexo={aluno.sexo} />}
        <div className="panel"><Grafico avaliacoes={av} /></div>
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

function FormAvaliacao({ aluno, onFechar, onSalvo }) {
  const ultima = aluno.avaliacoes.at(-1)
  const [d, setD] = useState({ data: hojeISO(), peso: '', altura: ultima?.altura ?? '', protocolo: 'p7', gordura: '', cintura: '', quadril: '', braco: '', coxa: '' })
  const [dobras, setDobras] = useState({})
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
    const { error } = await supabase.from('avaliacoes').insert({
      aluno_id: aluno.id, data: d.data, peso: num(d.peso), altura: num(d.altura), protocolo: d.protocolo,
      dobras: calc ? Object.fromEntries(chaves.map((k) => [k, num(dobras[k])])) : null,
      gordura: calc ? Math.round(calc.gordura * 10) / 10 : num(d.gordura),
      cintura: num(d.cintura), quadril: num(d.quadril), braco: num(d.braco), coxa: num(d.coxa),
    })
    setSalvando(false)
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    onSalvo()
  }

  return (
    <Modal titulo="Nova avaliação física" botao="Registrar" onFechar={onFechar} onSalvar={salvar} erro={erro} salvando={salvando}>
      <label>Data<input type="date" required {...campo('data')} /></label>
      <label>Peso (kg)<input type="number" step="0.1" required {...campo('peso')} /></label>
      <label>Altura (m)<input type="number" step="0.01" required {...campo('altura')} /></label>
      <label>Protocolo<select {...campo('protocolo')}>{Object.entries(PROTOCOLOS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>

      {d.protocolo === 'manual' ? (
        <label>% de gordura<input type="number" step="0.1" {...campo('gordura')} /></label>
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
        </>
      )}

      <div className="secao">Perímetros (cm)</div>
      <label>Cintura<input type="number" step="0.5" {...campo('cintura')} /></label>
      <label>Quadril<input type="number" step="0.5" {...campo('quadril')} /></label>
      <label>Braço<input type="number" step="0.5" {...campo('braco')} /></label>
      <label>Coxa<input type="number" step="0.5" {...campo('coxa')} /></label>
    </Modal>
  )
}
