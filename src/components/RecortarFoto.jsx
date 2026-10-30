import { useEffect, useRef, useState } from 'react'

// Enquadrar a foto antes de enviar: arrastar para mover, pinça ou barra para dar zoom.
// proporcao = largura / altura do recorte (1 no avatar, 4/5 no feed); lado = largura final em px.
export default function RecortarFoto({ arquivo, proporcao = 1, redondo = false, lado = 1080, titulo = 'Enquadrar foto', onPronto, onCancelar }) {
  const [img, setImg] = useState(null)
  const [url, setUrl] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState(null) // canto de cima à esquerda da imagem, em px do quadro
  const [salvando, setSalvando] = useState(false)
  const quadro = useRef(null)
  const toques = useRef(new Map())
  const pinca = useRef(null)
  const [W, setW] = useState(320)
  const H = W / proporcao

  useEffect(() => {
    const u = URL.createObjectURL(arquivo)
    setUrl(u); setImg(null)
    return () => URL.revokeObjectURL(u)
  }, [arquivo])
  useEffect(() => {
    const medir = () => setW(Math.min(quadro.current?.parentElement?.clientWidth || 320, 360, (window.innerHeight * 0.55) * proporcao))
    medir(); window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [proporcao])

  const base = img ? Math.max(W / img.naturalWidth, H / img.naturalHeight) : 1
  const s = base * zoom
  const dw = img ? img.naturalWidth * s : 0, dh = img ? img.naturalHeight * s : 0
  const limitar = (p, w = dw, h = dh) => ({ x: Math.min(0, Math.max(W - w, p.x)), y: Math.min(0, Math.max(H - h, p.y)) })
  const atual = pos ? limitar(pos) : { x: (W - dw) / 2, y: (H - dh) / 2 }

  // Zoom mantendo o meio do quadro no mesmo ponto da foto.
  function mudarZoom(z) {
    const novo = Math.min(4, Math.max(1, z))
    const cx = (W / 2 - atual.x) / s, cy = (H / 2 - atual.y) / s
    const ns = base * novo
    setZoom(novo)
    setPos(limitar({ x: W / 2 - cx * ns, y: H / 2 - cy * ns }, img.naturalWidth * ns, img.naturalHeight * ns))
  }

  function baixar(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (toques.current.size === 2) {
      const [a, b] = [...toques.current.values()]
      pinca.current = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    }
  }
  function mover(e) {
    const antes = toques.current.get(e.pointerId)
    if (!antes) return
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (toques.current.size === 2 && pinca.current) {
      const [a, b] = [...toques.current.values()]
      return mudarZoom(pinca.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinca.current.d))
    }
    setPos(limitar({ x: atual.x + e.clientX - antes.x, y: atual.y + e.clientY - antes.y }))
  }
  function soltar(e) {
    toques.current.delete(e.pointerId)
    if (toques.current.size < 2) pinca.current = null
  }

  async function pronto() {
    setSalvando(true)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(Math.min(lado, W / s))
    canvas.height = Math.round(canvas.width / proporcao)
    canvas.getContext('2d').drawImage(img, -atual.x / s, -atual.y / s, W / s, H / s, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85))
    setSalvando(false)
    if (blob) onPronto(blob)
  }

  return (
    <div className="overlay recorte-overlay">
      <div className="modal stack recorte">
        <h2>{titulo}</h2>
        <p className="meta" style={{ margin: 0 }}>Arraste para posicionar e use o zoom para aproximar.</p>
        <div className="recorte-area">
          <div ref={quadro} className={`recorte-quadro${redondo ? ' redondo' : ''}`} style={{ width: W, height: H }}
            onPointerDown={baixar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}
            onWheel={(e) => img && mudarZoom(zoom - e.deltaY * 0.002)}>
            {url && <img src={url} alt="" draggable={false} onLoad={(e) => setImg(e.currentTarget)}
              style={{ width: dw || 'auto', height: dh || 'auto', transform: `translate(${atual.x}px, ${atual.y}px)`, visibility: img ? 'visible' : 'hidden' }} />}
          </div>
        </div>
        <label className="recorte-zoom">
          <span className="meta">Zoom</span>
          <input type="range" min="1" max="4" step="0.01" value={zoom} disabled={!img} onChange={(e) => mudarZoom(Number(e.target.value))} />
        </label>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancelar}>Cancelar</button>
          <button type="button" className="primary" disabled={!img || salvando} onClick={pronto}>{salvando ? 'Preparando…' : 'Usar foto'}</button>
        </div>
      </div>
    </div>
  )
}
