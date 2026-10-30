import { useEffect, useState } from 'react'
import { supabase } from '../../supabase.js'
import { pixCopiaECola } from '../../lib/pix.js'
import { num } from '../../lib/formato.js'
import AtivarNotificacoes from '../../components/AtivarNotificacoes.jsx'
import EditarAvatar from '../../components/EditarAvatar.jsx'
import { AjudaDaPagina } from '../../components/ComoFunciona.jsx'

export default function Configuracoes() {
  const [d, setD] = useState(null) // cadastro da academia (o do dono)
  const [eu, setEu] = useState(null) // perfil de quem está logado
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    Promise.all([supabase.from('personais').select('*').maybeSingle(), supabase.rpc('meu_perfil')]).then(([academia, perfil]) => {
      setD(academia.data)
      // Sem supabase/migracao-perfil-equipe.sql, segue como antes: o cadastro único é o perfil.
      const p = perfil.error ? null : perfil.data?.[0]
      setEu(p || (academia.data && { ...academia.data, dono: true, antigo: true }))
    })
  }, [])

  if (!d || !eu) return <p className="carregando">Carregando…</p>
  const campo = (k) => ({ id: `config-${k}`, value: d[k] ?? '', onChange: (e) => { setAviso(''); setD({ ...d, [k]: e.target.value }) } })
  const meu = (k) => ({ id: `config-${k}`, value: eu[k] ?? '', onChange: (e) => { setAviso(''); setEu({ ...eu, [k]: e.target.value }) } })

  async function salvar(e) {
    e.preventDefault()
    const perfil = eu.antigo
      ? { error: null, dados: { nome: eu.nome?.trim() || null, telefone: eu.telefone?.trim() || null } }
      : await supabase.rpc('salvar_meu_perfil', { p_nome: eu.nome || '', p_telefone: eu.telefone || '' })
    if (perfil.error) return setErro(`Não foi possível salvar: ${perfil.error.message}`)
    const { error } = await supabase.from('personais').update({
      ...(perfil.dados || {}),
      ...(eu.dono ? { pix_chave: d.pix_chave?.trim() || null, pix_nome: d.pix_nome?.trim() || null, pix_cidade: d.pix_cidade?.trim() || null } : {}),
      ...('desconto_indicacao' in d ? { desconto_indicacao: num(d.desconto_indicacao) } : {}),
      ...('motivacao_auto' in d ? { motivacao_auto: !!d.motivacao_auto } : {}),
      ...('trocar_ficha_semanas' in d ? { trocar_ficha_semanas: Math.min(26, Math.max(2, Math.round(num(d.trocar_ficha_semanas)) || 6)) } : {}),
    }).eq('user_id', d.user_id)
    if (error) return setErro(`Não foi possível salvar: ${error.message}`)
    setErro(''); setAviso('Configurações salvas.')
  }

  const exemplo = d.pix_chave ? pixCopiaECola({ chave: d.pix_chave, nome: d.pix_nome || d.nome || 'Personal', cidade: d.pix_cidade || 'Brasil', valor: 1 }) : null

  return (
    <>
      <h1>Configurações</h1>
      <p className="sub">{eu.dono ? 'Seus dados e a chave Pix das mensalidades.' : 'Seu perfil e as regras da academia.'}</p>
      <AjudaDaPagina />
      <div style={{ maxWidth: 640, marginBottom: 12 }}><EditarAvatar personal={eu} onMudou={(avatar) => setEu({ ...eu, avatar })} /></div>
      <form className="stack" style={{ maxWidth: 640 }} onSubmit={salvar}>
        <div className="panel form">
          <div className="secao" style={{ marginTop: 0 }}>Seus dados</div>
          <label>Nome<input {...meu('nome')} /></label>
          <label>WhatsApp<input placeholder="(11) 98765-4321" {...meu('telefone')} /></label>
          {eu.dono && <p className="meta full" style={{ margin: 0 }}>O WhatsApp aparece para o aluno avisar que pagou a mensalidade.</p>}
        </div>
        {!eu.dono && <p className="meta" style={{ margin: 0 }}>A chave Pix das mensalidades é da academia e só {d.nome || 'o dono da conta'} muda. As regras abaixo valem para toda a equipe.</p>}
        {eu.dono && <div className="panel form">
          <div className="secao" style={{ marginTop: 0 }}>Pix</div>
          <label className="full">Chave Pix<input placeholder="CPF, e-mail, celular (+5511...) ou chave aleatória" {...campo('pix_chave')} /></label>
          <label>Nome do recebedor<input maxLength={25} placeholder="Como aparece no banco" {...campo('pix_nome')} /></label>
          <label>Cidade<input maxLength={15} placeholder="Ex.: São Paulo" {...campo('pix_cidade')} /></label>
          <p className="meta full" style={{ margin: 0 }}>
            Celular como chave vai no formato +5511987654321. Teste antes de divulgar: copie o código abaixo (R$ 1,00) e cole no app do seu banco para ver se aparece seu nome.
          </p>
          {exemplo && <textarea id="config-pix-teste" className="full" readOnly rows={3} value={exemplo} onFocus={(e) => e.target.select()} style={{ fontFamily: 'var(--mono)', fontSize: 12 }} />}
        </div>}
        {'motivacao_auto' in d && (
          <div className="panel form">
            <div className="secao" style={{ marginTop: 0 }}>Motivação automática</div>
            <label className="full lembrar" style={{ alignItems: 'flex-start' }}>
              <input type="checkbox" checked={!!d.motivacao_auto} onChange={(e) => { setAviso(''); setD({ ...d, motivacao_auto: e.target.checked }) }} style={{ width: 'auto', marginTop: 4 }} />
              <span>Mandar uma frase de motivação para o aluno que está sem treinar</span>
            </label>
            <p className="meta full" style={{ margin: 0 }}>
              Vai no celular do aluno (se ele ativou as notificações) quando chega a 3, 7, 14, 21 e 30 dias sem marcar treino nem check-in. Exemplo: "Mariana, 3 dias sem treino já dá saudade. Hoje é um ótimo dia para voltar!"
            </p>
          </div>
        )}
        {'trocar_ficha_semanas' in d && (
          <div className="panel form">
            <div className="secao" style={{ marginTop: 0 }}>Troca de ficha</div>
            <label>Trocar a ficha a cada (semanas)<input type="number" min="2" max="26" {...campo('trocar_ficha_semanas')} /></label>
            <p className="meta full" style={{ margin: 0 }}>
              Quando a ficha de um aluno passa desse prazo, ela aparece no Painel em "Fichas para trocar", o aluno vê o aviso na área dele e os dois recebem uma notificação no celular (se ativaram). Criar uma ficha nova, programar uma fase ou tocar em "Já revisei" zera a contagem.
            </p>
          </div>
        )}
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
      <div style={{ maxWidth: 640, marginTop: 16 }}>
        <AtivarNotificacoes texto="Mensagens dos alunos, ficha para trocar e outros avisos, neste celular." />
      </div>
    </>
  )
}
