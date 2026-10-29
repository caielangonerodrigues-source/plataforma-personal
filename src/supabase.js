import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configurado = Boolean(url && chave)

// "Lembrar de mim": ligado, a sessão fica no aparelho (localStorage); desligado, some ao fechar o navegador (sessionStorage).
const CHAVE_LEMBRAR = 'lembrar-login'
export function lembrarLogin() {
  try { return localStorage.getItem(CHAVE_LEMBRAR) !== '0' } catch { return true }
}
export function definirLembrar(sim) {
  try { localStorage.setItem(CHAVE_LEMBRAR, sim ? '1' : '0') } catch { /* sem armazenamento */ }
}
const armazenamento = {
  getItem(k) {
    try { return sessionStorage.getItem(k) ?? localStorage.getItem(k) } catch { return null }
  },
  setItem(k, v) {
    try {
      if (lembrarLogin()) { localStorage.setItem(k, v); sessionStorage.removeItem(k) } else { sessionStorage.setItem(k, v); localStorage.removeItem(k) }
    } catch { /* sem armazenamento */ }
  },
  removeItem(k) {
    try { localStorage.removeItem(k); sessionStorage.removeItem(k) } catch { /* sem armazenamento */ }
  },
}

export const supabase = configurado ? createClient(url, chave, { auth: { storage: armazenamento } }) : null

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
