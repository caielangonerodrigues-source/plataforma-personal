import { useState } from 'react'
import { supabase } from '../supabase.js'
import Modal from './Modal.jsx'
import { progressoDesafio } from '../lib/medalhas.js'
import { nomeCurto } from '../lib/comunidade.js'
import { fmtData, hojeISO, num } from '../lib/formato.js'

// Desafios ativos com a barra de progresso e os 3 primeiros da turma.
// `checkins` são os check-ins visíveis (aluno_id, data); `minhasDatas` destaca o aluno logado.
export default function Desafios({ desafios, checkins, membros, minhasDatas, podeGerenciar, recarregar }) {
  const [novo, setNovo] = useState(false)
  const hoje = hojeISO()
  const ativos = desafios.filter((d) => d.fim >= hoje).sort((a, b) => (a.fim < b.fim ? -1 : 1))
  const nomes = Object.fromEntries(membros.map((m) => [m.id, m.nome]))

  async function apagar(id) {
    await supabase.from('desafios').delete().eq('id', id)
    recarregar()
  }

  if (!ativos.length && !podeGerenciar) return null
  return (
    <div className="panel stack" style={{ gap: 12 }}>
      <div className="row between">
        <h2>Desafios</h2>
        {podeGerenciar && <button className="primary small" onClick={() => setNovo(true)}>Novo desafio</button>}
      </div>
      {!ativos.length && <p className="empty">Nenhum desafio ativo. Crie um, como "20 treinos em novembro".</p>}
      {ativos.map((d) => {
        const porAluno = membros
          .map((m) => ({ id: m.id, dias: progressoDesafio(d, checkins.filter((c) => c.aluno_id === m.id).map((c) => c.data)) }))
          .filter((x) => x.dias > 0)
          .sort((a, b) => b.dias - a.dias)
        const meu = minhasDatas ? progressoDesafio(d, minhasDatas) : null
        const concluiram = porAluno.filter((x) => x.dias >= d.meta_dias).length
        return (
          <div key={d.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <div className="row between">
              <div className="name">{d.titulo}</div>
              <span className="meta">{d.inicio > hoje ? `começa ${fmtData(d.inicio)}` : `até ${fmtData(d.fim)}`}</span>
            </div>
            {d.descricao && <p className="meta" style={{ margin: '2px 0 0' }}>{d.descricao}</p>}
            {meu != null && (
              <>
                <div className="meta" style={{ margin: '8px 0 4px' }}>Você: <strong style={{ color: 'var(--ink)' }}>{Math.min(meu, d.meta_dias)} de {d.meta_dias}</strong> dias{meu >= d.meta_dias ? ' · concluído!' : ''}</div>
                <div className="bar"><i style={{ width: `${Math.min(100, (meu / d.meta_dias) * 100)}%` }} /></div>
              </>
            )}
            <div className="meta" style={{ marginTop: 6 }}>
              {porAluno.length ? `Na frente: ${porAluno.slice(0, 3).map((x) => `${nomeCurto(nomes[x.id])} (${x.dias})`).join(', ')}` : 'Ninguém pontuou ainda.'}
              {concluiram > 0 && ` · ${concluiram} concluíram`}
            </div>
            {podeGerenciar && <button className="ghost small" onClick={() => apagar(d.id)}>Apagar desafio</button>}
          </div>
        )
      })}
      {novo && <FormDesafio onFechar={() => setNovo(false)} onSalvo={() => { setNovo(false); recarregar() }} />}
    </div>
  )
}

function FormDesafio({ onFechar, onSalvo }) {
  const hoje = hojeISO()
  const fimDoMes = new Date(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), 0).toLocaleDateString('sv-SE')
  const [d, setD] = useState({ titulo: '', descricao: '', inicio: hoje, fim: fimDoMes, meta: '12' })
  const [erro, setErro] = useState('')
  const campo = (k) => ({ id: `desafio-${k}`, value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) })
  async function salvar() {
    if (!d.titulo.trim()) return setErro('Dê um nome ao desafio.')
    if (d.fim < d.inicio) return setErro('O fim precisa ser depois do início.')
    const { error } = await supabase.from('desafios').insert({ titulo: d.titulo.trim(), descricao: d.descricao.trim() || null, inicio: d.inicio, fim: d.fim, meta_dias: num(d.meta) || 1 })
    if (error) return setErro(`Não foi possível criar: ${error.message}`)
    onSalvo()
  }
  return (
    <Modal titulo="Novo desafio" botao="Criar desafio" onFechar={onFechar} onSalvar={salvar} erro={erro}>
      <label className="full">Nome<input maxLength={80} placeholder="Ex.: 20 treinos em novembro" {...campo('titulo')} /></label>
      <label className="full">Descrição<input maxLength={280} placeholder="Opcional, ex.: quem completar ganha uma aula extra" {...campo('descricao')} /></label>
      <label>Início<input type="date" {...campo('inicio')} /></label>
      <label>Fim<input type="date" {...campo('fim')} /></label>
      <label>Meta (dias com check-in)<input type="number" min="1" max="366" {...campo('meta')} /></label>
    </Modal>
  )
}
