import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { GRADE_PADRAO, WHATSAPP_GRUPO, avisosNovos } from '../lib/academia.js'

const CHAVE_VISTO = 'novidades-vistas-em'

// Grade de aulas, novidades e link do grupo do WhatsApp para a área do aluno.
// Antes do SQL novo, mostra a grade e o grupo padrão da academia e nenhuma novidade.
export function useAcademia() {
  const [aulas, setAulas] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [whatsapp, setWhatsapp] = useState(WHATSAPP_GRUPO)
  const [vistoEm, setVistoEm] = useState(() => { try { return localStorage.getItem(CHAVE_VISTO) } catch { return null } })

  const carregar = useCallback(async () => {
    const [g, a, w] = await Promise.all([
      supabase.from('aulas_grade').select('*').order('hora'),
      supabase.from('avisos').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.rpc('grupo_whatsapp'),
    ])
    setAulas(g.error ? GRADE_PADRAO : g.data || [])
    setAvisos(a.error ? [] : a.data || [])
    if (!w.error) setWhatsapp(w.data || null)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Abriu a aba Novidades: zera o contador.
  function marcarVisto() {
    const agora = new Date().toISOString()
    setVistoEm(agora)
    try { localStorage.setItem(CHAVE_VISTO, agora) } catch { /* sem armazenamento */ }
  }

  return { aulas, avisos, whatsapp, novos: avisosNovos(avisos, vistoEm), vistoEm, marcarVisto, carregar }
}
