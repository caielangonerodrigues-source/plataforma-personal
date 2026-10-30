import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { brl } from '../lib/formato.js'

// Área do aluno: link de indicação. Quem chega por ele aparece para o personal como "indicado por".
export default function IndiqueAmigo({ aluno }) {
  const [info, setInfo] = useState(null)
  const [ganhos, setGanhos] = useState([])
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    // O desconto é o do personal do aluno; o link aparece quando alguma página de venda está no ar (como o banner do Início).
    Promise.all([supabase.rpc('indicacao_do_personal'), supabase.rpc('pagina_vendas')])
      .then(([ind, pag]) => setInfo({ desconto: ind.data?.[0]?.desconto ?? null, venda_ativa: !!pag.data?.length }))
    supabase.from('descontos').select('competencia, valor, motivo').eq('aluno_id', aluno.id).then(({ data }) => setGanhos(data || []))
  }, [aluno.id])

  if (!aluno.codigo_indicacao || !info?.venda_ativa) return null
  const link = `${window.location.origin}/consultoria?indicacao=${aluno.codigo_indicacao}`
  const texto = `Treino com o meu personal e recomendo demais! Dá uma olhada: ${link}`
  async function compartilhar() {
    try {
      if (navigator.share) return await navigator.share({ text: texto })
      await navigator.clipboard.writeText(link); setCopiado(true)
    } catch { /* cancelou */ }
  }
  const total = ganhos.reduce((t, g) => t + Number(g.valor), 0)

  return (
    <div className="panel stack" style={{ gap: 10 }}>
      <h2 style={{ margin: 0 }}>Indique um amigo</h2>
      <p style={{ margin: 0 }}>
        {info.desconto ? <>Cada amigo que fechar pelo seu link vale <strong>{brl(info.desconto)} de desconto</strong> na sua mensalidade.</> : 'Mande seu link para quem quer começar a treinar.'}
      </p>
      <div className="row" style={{ gap: 8 }}>
        <code className="mono" style={{ fontSize: 13, padding: '6px 10px', background: 'var(--bg)', borderRadius: 8, overflowWrap: 'anywhere', flex: 1, minWidth: 0 }}>{link}</code>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <a className="botao-link primary" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">Mandar no WhatsApp</a>
        <button onClick={compartilhar}>{copiado ? 'Link copiado' : 'Compartilhar'}</button>
      </div>
      {ganhos.length > 0 && <p className="ok" style={{ margin: 0 }}>Você já ganhou {brl(total)} em descontos com {ganhos.length} {ganhos.length === 1 ? 'indicação' : 'indicações'}. Valeu!</p>}
    </div>
  )
}
