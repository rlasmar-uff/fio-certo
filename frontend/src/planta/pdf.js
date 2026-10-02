// Planta em PDF: renderiza uma página num canvas e devolve como PNG, para a tela da planta tratar
// igual a uma imagem. O pdf.js só é baixado quando alguém abre um PDF.
const LADO_MAIOR_PX = 2400

export const ehPdf = (arquivo) => arquivo.type === 'application/pdf' || /\.pdf$/i.test(arquivo.name)

export async function renderizarPaginaPdf(arquivo, numeroPagina = 1) {
  const [pdfjs, { default: urlWorker }] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = urlWorker
  const carregamento = pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) })
  try {
    const documento = await carregamento.promise
    const pagina = await documento.getPage(Math.min(Math.max(1, numeroPagina), documento.numPages))
    const base = pagina.getViewport({ scale: 1 })
    const viewport = pagina.getViewport({ scale: LADO_MAIOR_PX / Math.max(base.width, base.height) })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const contexto = canvas.getContext('2d')
    contexto.fillStyle = '#fff'
    contexto.fillRect(0, 0, canvas.width, canvas.height)
    await pagina.render({ canvas, canvasContext: contexto, viewport }).promise
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    return { blob, paginas: documento.numPages }
  } finally {
    carregamento.destroy()
  }
}
