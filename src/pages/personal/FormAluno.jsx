import { useState } from 'react'
import Modal from '../../components/Modal.jsx'
import { supabase } from '../../supabase.js'
import { hojeISO, num } from '../../lib/formato.js'

const VAZIO = { nome: '', email: '', telefone: '', sexo: 'F', idade: '', objetivo: '', plano: '', inicio: hojeISO(), status: 'ativo', comunidade: true, valor_mensal: '', dia_vencimento: '' }

export default function FormAluno({ aluno, onFechar, onSalvo }) {
  const [d, setD] = useState(() => (aluno ? { ...VAZIO, ...aluno, idade: aluno.idade ?? '', email: aluno.email ?? '', valor_mensal: aluno.valor_mensal ?? '', dia_vencimento: aluno.dia_vencimento ?? '' } : VAZIO))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const campo = (k) => ({ id: `aluno-${k}`, value: d[k] ?? '', onChange: (e) => setD({ ...d, [k]: e.target.value }) })

  async function salvar() {
    if (!d.nome.trim()) return setErro('Informe o nome do aluno.')
    setSalvando(true); setErro('')
    const dados = {
      nome: d.nome.trim(), email: d.email.trim() || null, telefone: d.telefone, sexo: d.sexo, idade: num(d.idade),
      objetivo: d.objetivo, plano: d.plano, inicio: d.inicio || null, status: d.status, comunidade: d.comunidade,
      valor_mensal: num(d.valor_mensal), dia_vencimento: num(d.dia_vencimento),
    }
    const q = aluno
      ? supabase.from('alunos').update(dados).eq('id', aluno.id).select().single()
      : supabase.from('alunos').insert(dados).select().single()
    const { data, error } = await q
    setSalvando(false)
    if (error) return setErro(error.code === '23505' ? 'Já existe um aluno com este e-mail.' : `Não foi possível salvar: ${error.message}`)
    onSalvo(data)
  }

  return (
    <Modal titulo={aluno ? 'Editar aluno' : 'Novo aluno'} onFechar={onFechar} onSalvar={salvar} erro={erro} salvando={salvando}>
      <label className="full">Nome completo<input required {...campo('nome')} /></label>
      <label>E-mail de acesso<input type="email" placeholder="o aluno entra com ele" {...campo('email')} /></label>
      <label>WhatsApp<input {...campo('telefone')} /></label>
      <label>Sexo<select {...campo('sexo')}><option value="F">Feminino</option><option value="M">Masculino</option></select></label>
      <label>Idade<input type="number" min="5" max="110" {...campo('idade')} /></label>
      <label>Objetivo<input placeholder="Ex.: Hipertrofia" {...campo('objetivo')} /></label>
      <label>Plano<input placeholder="Ex.: 3x por semana" {...campo('plano')} /></label>
      <label>Início<input type="date" {...campo('inicio')} /></label>
      <label>Status<select {...campo('status')}><option value="ativo">Ativo</option><option value="pendente">Pendente</option><option value="pausado">Pausado</option></select></label>
      <label>Mensalidade (R$)<input type="number" min="0" step="0.01" placeholder="Vazio = não cobra" {...campo('valor_mensal')} /></label>
      <label>Dia do vencimento<input type="number" min="1" max="28" {...campo('dia_vencimento')} /></label>
      <label className="full" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, textTransform: 'none', letterSpacing: 0, fontSize: 14, color: 'var(--ink)' }}>
        <input id="aluno-comunidade" type="checkbox" style={{ width: 18, height: 18 }} checked={d.comunidade} onChange={(e) => setD({ ...d, comunidade: e.target.checked })} />
        Participa da comunidade (aparece no feed e no ranking dos colegas)
      </label>
      <p className="meta full" style={{ margin: 0 }}>O aluno cria a senha em "Primeiro acesso" usando este e-mail. Aluno pausado não consegue ver os treinos.</p>
    </Modal>
  )
}
