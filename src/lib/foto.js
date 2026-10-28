// Reduz a foto no navegador antes de enviar (economiza o armazenamento gratuito).
export async function reduzirFoto(arquivo, lado = 1280, qualidade = 0.8) {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error('Não foi possível ler a foto.'))), 'image/jpeg', qualidade))
}
