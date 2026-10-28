// Link do WhatsApp com mensagem pronta. Aceita "(11) 98765-4321" ou "+55 11 98765-4321".
export function linkWhatsApp(telefone, mensagem) {
  let n = String(telefone || '').replace(/\D/g, '')
  if (!n) return null
  if (n.length === 10 || n.length === 11) n = `55${n}`
  return `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}`
}
