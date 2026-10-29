import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configurado = Boolean(url && chave)

export const supabase = configurado ? createClient(url, chave) : null

// Quais logins sociais estão ligados no Supabase (Authentication > Providers): { google: true, apple: false, ... }.
export async function provedoresLigados() {
  if (!configurado) return {}
  try {
    const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: chave } })
    return (await r.json()).external || {}
  } catch {
    return {}
  }
}
