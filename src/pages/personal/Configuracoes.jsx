import { useEffect, useState } from 'react'
import { supabase } from '../../supabase.js'
import { pixCopiaECola } from '../../lib/pix.js'
import { num } from '../../lib/formato.js'

export default function Configuracoes() {
  const [d, setD] = useState(null)
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase.from('personais').select('*').maybeSingle().then(({ data }) => setD(data))
  }, [])

  if (!d) return <p className="carregando">Carregando…</p>
  const campo = (k) => ({ id: `config-${k}`, value: d[k] ?? '', onChange: (e) => { setAviso(''); setD({ ...d, [k]: e.target.value }) } })

  async function salvar(e) {
    e.preventDefault()
    const { error } = await supabase.from('personais').update({
      nome: d.nome?.trim() || null, telefone: d.telefone?.trim() || null,
      pix_chave: d.pix_chave?.trim() || null, pix_nome: d.pix_nome?.trim() || null, pix_cidade: d.pix_cidade?.trim() || null,
      ...('desconto_indicacao' in d ? { desconto_indicacao: num(d.desconto_indicacao) } : {}),
    }).eq('user_id', d.user_id)
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    setErro(''); setAviso('Configurações salvas.')
  }

  const exemplo = d.pix_chave ? pixCopiaECola({ chave: d.pix_chave, nome: d.pix_nome || d.nome || 'Personal', cidade: d.pix_cidade || 'Brasil', valor: 1 }) : null

  return (
    <>
      <h1>Configurações</h1>
      <p className="sub">Seus dados e a chave Pix das mensalidades.</p>
      <form className="stack" style={{ maxWidth: 640 }} onSubmit={salvar}>
        <div className="panel form">
          <div className="secao" style={{ marginTop: 0 }}>Seus dados</div>
          <label>Nome<input {...campo('nome')} /></label>
          <label>WhatsApp<input placeholder="(11) 98765-4321" {...campo('telefone')} /></label>
          <p className="meta full" style={{ margin: 0 }}>O WhatsApp aparece para o aluno avisar que pagou a mensalidade.</p>
        </div>
        <div className="panel form">
          <div className="secao" style={{ marginTop: 0 }}>Pix</div>
          <label className="full">Chave Pix<input placeholder="CPF, e-mail, celular (+5511...) ou chave aleatória" {...campo('pix_chave')} /></label>
          <label>Nome do recebedor<input maxLength={25} placeholder="Como aparece no banco" {...campo('pix_nome')} /></label>
          <label>Cidade<input maxLength={15} placeholder="Ex.: São Paulo" {...campo('pix_cidade')} /></label>
          <p className="meta full" style={{ margin: 0 }}>
            Celular como chave vai no formato +5511987654321. Teste antes de divulgar: copie o código abaixo (R$ 1,00) e cole no app do seu banco para ver se aparece seu nome.
          </p>
          {exemplo && <textarea id="config-pix-teste" className="full" readOnly rows={3} value={exemplo} onFocus={(e) => e.target.select()} style={{ fontFamily: 'var(--mono)', fontSize: 12 }} />}
        </div>
        {'desconto_indicacao' in d && (
          <div className="panel form">
            <div className="secao" style={{ marginTop: 0 }}>Indique um amigo</div>
            <label>Desconto por indicação (R$)<input type="number" min="0" step="0.01" placeholder="Ex.: 30" {...campo('desconto_indicacao')} /></label>
            <p className="meta full" style={{ margin: 0 }}>
              Cada aluno tem um link de indicação na área dele (aba Conta), que leva para a sua página de vendas. Quem chega pelo link aparece em Vendas com "indicado por". Quando a pessoa fecha, você dá o desconto na mensalidade do mês seguinte de quem indicou. A página de vendas precisa estar ativa.
            </p>
          </div>
        )}
        {erro && <p className="erro">{erro}</p>}
        {aviso && <p className="ok">{aviso}</p>}
        <div><button className="primary">Salvar</button></div>
      </form>
    </>
  )
}
