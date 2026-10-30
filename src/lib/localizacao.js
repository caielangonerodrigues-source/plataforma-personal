// Localização no check-in: perto da academia vira "Corpo Atlético"; fora dela, o bairro e a cidade
// (OpenStreetMap, sem chave). Só o nome do lugar vai para o post, nunca as coordenadas.
export const NOME_ACADEMIA = 'Corpo Atlético'
export const RAIO_ACADEMIA = 250 // metros

// Distância em metros entre dois pontos (fórmula de haversine).
export function distancia(a, b) {
  const rad = (g) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

export const naAcademia = (ponto, academia) =>
  !!(ponto && academia?.lat != null && academia?.lng != null && distancia(ponto, academia) <= RAIO_ACADEMIA)

// Nome curto do lugar a partir da resposta do Nominatim: "Bairro, Cidade" (ou só a cidade).
export function nomeDoLugar(endereco = {}) {
  const bairro = endereco.suburb || endereco.neighbourhood || endereco.quarter || endereco.city_district
  const cidade = endereco.city || endereco.town || endereco.village || endereco.municipality
  return [bairro, cidade].filter(Boolean).join(', ').slice(0, 80) || null
}

// Pega a posição do celular (pede a permissão na primeira vez).
export function posicaoAtual() {
  return new Promise((ok, falha) => {
    if (!navigator.geolocation) return falha(new Error('Este aparelho não tem localização.'))
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => falha(new Error(e.code === 1 ? 'Localização bloqueada. Libere nas configurações do navegador.' : 'Não foi possível pegar a localização.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  })
}

// Nome do lugar onde o aluno está: a academia, ou bairro e cidade.
export async function lugarDoCheckin(ponto, academia) {
  if (naAcademia(ponto, academia)) return NOME_ACADEMIA
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=pt-BR&lat=${ponto.lat}&lon=${ponto.lng}`)
    return nomeDoLugar((await r.json()).address)
  } catch {
    return null
  }
}
