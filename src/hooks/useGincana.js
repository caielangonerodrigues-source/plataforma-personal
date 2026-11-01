import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { hojeISO } from '../lib/formato.js'
import { somarDias } from '../lib/comunidade.js'

// Check-ins de alunos desde `desde`, em páginas de 1000 (limite do Supabase por consulta).
export async function checkinsDesde(desde) {
  const todos = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from('checkins').select('aluno_id, data').not('aluno_id', 'is', null).gte('data', desde).range(de, de + 999)
    if (error) throw error
    todos.push(...data)
    if (data.length < 1000) return todos
  }
}

// Gincanas da turma (as que acabaram há mais de 60 dias saem), provas, quem cumpriu e os check-ins do prazo.
// `semSql`: o SQL da gincana (supabase/migracao-gincana.sql) ainda não rodou.
export function useGincana() {
  const [estado, setEstado] = useState({ gincanas: null, provas: [], pontos: [], checkins: [], semSql: false })
  const carregar = useCallback(async () => {
    const g = await supabase.from('gincanas').select('*').gte('fim', somarDias(hojeISO(), -60)).order('inicio')
    if (g.error) return setEstado({ gincanas: [], provas: [], pontos: [], checkins: [], semSql: true })
    const ids = g.data.map((x) => x.id)
    if (!ids.length) return setEstado({ gincanas: [], provas: [], pontos: [], checkins: [], semSql: false })
    const p = await supabase.from('gincana_provas').select('*').in('gincana_id', ids).order('created_at')
    const provaIds = (p.data || []).map((x) => x.id)
    const [pts, chk] = await Promise.all([
      provaIds.length ? supabase.from('gincana_pontos').select('*').in('prova_id', provaIds) : { data: [] },
      checkinsDesde(g.data.map((x) => x.inicio).sort()[0]).catch(() => []),
    ])
    setEstado({ gincanas: g.data, provas: p.data || [], pontos: pts.data || [], checkins: chk, semSql: false })
  }, [])
  useEffect(() => { carregar() }, [carregar])
  return { ...estado, carregar }
}
