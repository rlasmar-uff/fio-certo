import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Campo from '../../components/Campo.jsx'
import Nota from '../../components/Nota.jsx'
import { validarNumero } from '../../components/validacao.js'
import { useProjeto } from '../../context/useProjeto.js'
import { TIPOS_COMODO } from '../../calculations/constantes.js'
import { detectarComodos, medirRetangulo } from '../../planta/detectar.js'
import { ehPdf, renderizarPaginaPdf } from '../../planta/pdf.js'
import { gerarId } from '../../projetos/estado.js'
import { ROUTES } from '../../routes.js'

const LADO_MAXIMO_DETECCAO_PX = 800
const PORTA_PADRAO_M = 1
const decimal = (valor) => valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

// F9 — cômodos a partir da planta: imagem de fundo, escala por dois pontos de distância conhecida
// e retângulos desenhados (ou sugeridos pela detecção automática, F15). A imagem fica só na
// memória desta tela — não vai para o projeto salvo nem para o link.
export default function Planta() {
  const navigate = useNavigate()
  const { importarComodos } = useProjeto()
  const svgRef = useRef(null)
  const [imagem, setImagem] = useState(null)
  const [modo, setModo] = useState('escala')
  const [pontos, setPontos] = useState([])
  const [distanciaM, setDistanciaM] = useState('')
  const [retangulos, setRetangulos] = useState([])
  const [desenho, setDesenho] = useState(null)
  const [portaM, setPortaM] = useState(String(PORTA_PADRAO_M))
  const [aviso, setAviso] = useState(null)
  const [pdf, setPdf] = useState(null)

  useEffect(() => () => imagem && URL.revokeObjectURL(imagem.url), [imagem])

  const pixelsEscala = pontos.length === 2 ? Math.hypot(pontos[1].x - pontos[0].x, pontos[1].y - pontos[0].y) : null
  const metrosPorPixel = pixelsEscala && Number(distanciaM) > 0 ? Number(distanciaM) / pixelsEscala : null
  const confirmados = retangulos.filter((retangulo) => !retangulo.sugestao)

  const mostrarImagem = (blob, pdfAberto = null) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      setImagem({ url, largura: img.naturalWidth, altura: img.naturalHeight, elemento: img })
      setPdf(pdfAberto)
      setPontos([])
      setRetangulos([])
      setModo('escala')
      setAviso(null)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setAviso('Não deu para abrir esse arquivo. Use PNG, JPG ou PDF.')
    }
    img.src = url
  }

  const abrirPdf = async (arquivo, pagina) => {
    setAviso('Abrindo o PDF…')
    try {
      const { blob, paginas } = await renderizarPaginaPdf(arquivo, pagina)
      mostrarImagem(blob, { arquivo, pagina: Math.min(pagina, paginas), paginas })
    } catch {
      setAviso('Não deu para abrir esse PDF. Se ele tiver senha, exporte a página como PNG ou JPG.')
    }
  }

  const abrirArquivo = (evento) => {
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return
    if (ehPdf(arquivo)) abrirPdf(arquivo, 1)
    else mostrarImagem(arquivo)
  }

  const pontoDaImagem = (evento) => {
    const caixa = svgRef.current.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(imagem.largura, ((evento.clientX - caixa.left) * imagem.largura) / caixa.width)),
      y: Math.max(0, Math.min(imagem.altura, ((evento.clientY - caixa.top) * imagem.altura) / caixa.height)),
    }
  }

  const aoPressionar = (evento) => {
    const ponto = pontoDaImagem(evento)
    if (modo === 'escala') {
      setPontos((atuais) => (atuais.length >= 2 ? [ponto] : [...atuais, ponto]))
      return
    }
    evento.currentTarget.setPointerCapture?.(evento.pointerId)
    setDesenho({ inicio: ponto, fim: ponto })
  }
  const aoMover = (evento) => desenho && setDesenho({ ...desenho, fim: pontoDaImagem(evento) })
  // O fim vem do próprio evento de soltar: num arraste rápido pode não haver "move" nenhum antes.
  const aoSoltar = (evento) => {
    if (!desenho) return
    const { inicio } = desenho
    const fim = pontoDaImagem(evento)
    const retangulo = { x: Math.min(inicio.x, fim.x), y: Math.min(inicio.y, fim.y), w: Math.abs(fim.x - inicio.x), h: Math.abs(fim.y - inicio.y) }
    setDesenho(null)
    if (retangulo.w < 5 || retangulo.h < 5) return
    setRetangulos((atuais) => [...atuais, { ...retangulo, id: gerarId(), nome: `Cômodo ${atuais.length + 1}`, tipo: 'social', sugestao: false }])
  }

  const detectar = () => {
    const fator = Math.min(1, LADO_MAXIMO_DETECCAO_PX / Math.max(imagem.largura, imagem.altura))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(imagem.largura * fator)
    canvas.height = Math.round(imagem.altura * fator)
    const contexto = canvas.getContext('2d', { willReadFrequently: true })
    contexto.fillStyle = '#fff'
    contexto.fillRect(0, 0, canvas.width, canvas.height)
    contexto.drawImage(imagem.elemento, 0, 0, canvas.width, canvas.height)
    // Metade da maior porta, em pixels da imagem reduzida; sem escala, 1,2% do lado maior.
    const raio = metrosPorPixel ? (Number(portaM) || PORTA_PADRAO_M) / 2 / metrosPorPixel * fator : 0.012 * Math.max(canvas.width, canvas.height)
    const achados = detectarComodos(contexto.getImageData(0, 0, canvas.width, canvas.height), { raioFechamentoPx: Math.ceil(raio) })
    setRetangulos((atuais) => [
      ...atuais.filter((retangulo) => !retangulo.sugestao),
      ...achados.map((achado, indice) => ({
        id: gerarId(),
        x: achado.x / fator,
        y: achado.y / fator,
        w: achado.w / fator,
        h: achado.h / fator,
        nome: `Sugestão ${indice + 1}`,
        tipo: 'social',
        sugestao: true,
        retangular: achado.retangular,
      })),
    ])
    setAviso(achados.length ? `${achados.length} sugestão(ões). Confira cada uma antes de usar.` : 'Nenhum cômodo reconhecido. Desenhe à mão.')
  }

  const atualizar = (id, patch) => setRetangulos((atuais) => atuais.map((retangulo) => (retangulo.id === id ? { ...retangulo, ...patch } : retangulo)))
  const remover = (id) => setRetangulos((atuais) => atuais.filter((retangulo) => retangulo.id !== id))

  const criar = () => {
    importarComodos(
      confirmados.map((retangulo) => {
        const { areaM2, perimetroM } = medirRetangulo(retangulo, metrosPorPixel)
        return { nome: retangulo.nome, tipo: retangulo.tipo, area: String(Math.round(areaM2 * 100) / 100), perimetro: String(Math.round(perimetroM * 100) / 100) }
      }),
    )
    navigate(ROUTES.comodos)
  }

  const traco = imagem ? Math.max(imagem.largura, imagem.altura) / 400 : 1

  return (
    <section className="etapa-calculadora">
      <p className="projeto-atual">
        <Link to={ROUTES.comodos}>← Voltar aos cômodos</Link>
      </p>
      <h1>Cômodos a partir da planta</h1>
      <p className="texto-fraco">
        Abra a planta (imagem ou PDF), marque dois pontos de distância conhecida para a escala e desenhe um retângulo por
        cômodo. O arquivo não sai do seu navegador e não fica salvo no projeto.
      </p>

      <label className="botao-secundario">
        {imagem ? 'Trocar planta…' : 'Abrir planta (imagem ou PDF)…'}
        <input type="file" accept="image/*,application/pdf,.pdf" className="visualmente-oculto" onChange={abrirArquivo} />
      </label>
      {pdf && pdf.paginas > 1 && (
        <Campo label="Página do PDF" ajuda={`O PDF tem ${pdf.paginas} páginas. Trocar de página apaga a escala e os retângulos.`}>
          <select className="campo campo-curto" value={pdf.pagina} onChange={(evento) => abrirPdf(pdf.arquivo, Number(evento.target.value))}>
            {Array.from({ length: pdf.paginas }, (_, indice) => (
              <option key={indice} value={indice + 1}>
                {indice + 1}
              </option>
            ))}
          </select>
        </Campo>
      )}
      {aviso && (
        <p className="etiqueta-status atencao" role="status">
          {aviso}
        </p>
      )}

      {imagem && (
        <>
          <div className="modos-planta" role="group" aria-label="O que o clique faz">
            <button type="button" className={modo === 'escala' ? 'botao-principal' : 'botao-secundario'} aria-pressed={modo === 'escala'} onClick={() => setModo('escala')}>
              1. Marcar escala
            </button>
            <button type="button" className={modo === 'comodo' ? 'botao-principal' : 'botao-secundario'} aria-pressed={modo === 'comodo'} onClick={() => setModo('comodo')}>
              2. Desenhar cômodo
            </button>
            <button type="button" className="botao-secundario" onClick={detectar}>
              Detectar cômodos (experimental)
            </button>
          </div>

          <div className="grade-campos">
            <Campo
              label="Distância real entre os dois pontos"
              unidade="m"
              ajuda={pontos.length === 2 ? `${Math.round(pixelsEscala)} px na imagem` : 'Clique em dois pontos da planta com a cota conhecida.'}
              erro={validarNumero(distanciaM, { maiorQueMin: true })}
            >
              <input type="number" inputMode="decimal" min="0" step="0.01" className="campo" value={distanciaM} onChange={(evento) => setDistanciaM(evento.target.value)} />
            </Campo>
            <Campo label="Maior vão de porta" unidade="m" ajuda="A detecção fecha vãos até essa largura para separar os cômodos.">
              <input type="number" inputMode="decimal" min="0" step="0.1" className="campo" value={portaM} onChange={(evento) => setPortaM(evento.target.value)} />
            </Campo>
          </div>

          <div className="planta-area">
            <svg
              ref={svgRef}
              className={`planta-svg planta-modo-${modo}`}
              viewBox={`0 0 ${imagem.largura} ${imagem.altura}`}
              role="img"
              aria-label={`Planta com ${retangulos.length} retângulo(s)`}
              onPointerDown={aoPressionar}
              onPointerMove={aoMover}
              onPointerUp={aoSoltar}
            >
              <image href={imagem.url} width={imagem.largura} height={imagem.altura} />
              {retangulos.map((retangulo) => (
                <g key={retangulo.id} className={retangulo.sugestao ? 'planta-sugestao' : 'planta-comodo'}>
                  <rect x={retangulo.x} y={retangulo.y} width={retangulo.w} height={retangulo.h} strokeWidth={traco * 2} />
                  <text x={retangulo.x + traco * 4} y={retangulo.y + traco * 14} fontSize={traco * 12}>
                    {retangulo.nome}
                  </text>
                </g>
              ))}
              {desenho && (
                <rect
                  className="planta-desenho"
                  x={Math.min(desenho.inicio.x, desenho.fim.x)}
                  y={Math.min(desenho.inicio.y, desenho.fim.y)}
                  width={Math.abs(desenho.fim.x - desenho.inicio.x)}
                  height={Math.abs(desenho.fim.y - desenho.inicio.y)}
                  strokeWidth={traco * 2}
                />
              )}
              {pontos.map((ponto, indice) => (
                <circle key={indice} className="planta-ponto" cx={ponto.x} cy={ponto.y} r={traco * 4} />
              ))}
              {pontos.length === 2 && (
                <line className="planta-escala" x1={pontos[0].x} y1={pontos[0].y} x2={pontos[1].x} y2={pontos[1].y} strokeWidth={traco * 2} />
              )}
            </svg>
          </div>
          <p className="texto-fraco">Sem mouse ou tela de toque? Cadastre as medidas direto na etapa de Cômodos.</p>

          {retangulos.length > 0 && (
            <ul className="lista-planta">
              {retangulos.map((retangulo) => {
                const medida = metrosPorPixel ? medirRetangulo(retangulo, metrosPorPixel) : null
                return (
                  <li key={retangulo.id} className={retangulo.sugestao ? 'item-sugestao' : undefined}>
                    <div className="grade-campos">
                      <Campo label="Nome do cômodo">
                        <input className="campo" value={retangulo.nome} onChange={(evento) => atualizar(retangulo.id, { nome: evento.target.value })} />
                      </Campo>
                      <Campo label="Tipo">
                        <select className="campo" value={retangulo.tipo} onChange={(evento) => atualizar(retangulo.id, { tipo: evento.target.value })}>
                          {Object.entries(TIPOS_COMODO).map(([chave, tipo]) => (
                            <option key={chave} value={chave}>
                              {tipo.label}
                            </option>
                          ))}
                        </select>
                      </Campo>
                    </div>
                    <p className="texto-fraco">
                      {medida
                        ? `${decimal(medida.larguraM)} × ${decimal(medida.alturaM)} m → ${decimal(medida.areaM2)} m², perímetro ${decimal(medida.perimetroM)} m`
                        : 'Defina a escala para ver as medidas.'}
                      {retangulo.sugestao && retangulo.retangular === false && ' · a região não é retangular: confira a área'}
                    </p>
                    <div className="cartao-projeto-acoes">
                      {retangulo.sugestao && (
                        <button type="button" className="botao-texto" onClick={() => atualizar(retangulo.id, { sugestao: false })}>
                          Usar esta sugestão
                        </button>
                      )}
                      <button type="button" className="botao-texto botao-perigo" onClick={() => remover(retangulo.id)}>
                        Descartar {retangulo.nome}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="etapa-acoes">
            {!metrosPorPixel ? (
              <span className="texto-fraco">Defina a escala para criar os cômodos.</span>
            ) : confirmados.length === 0 ? (
              <span className="texto-fraco">Desenhe ou aceite ao menos um cômodo.</span>
            ) : (
              <button type="button" className="botao-principal" onClick={criar}>
                Criar {confirmados.length} cômodo(s) →
              </button>
            )}
          </div>

          <Nota titulo="Como funciona a detecção automática?">
            Os traços escuros são tratados como parede; os vãos até a largura de porta informada são fechados, e cada região
            clara cercada de parede vira um retângulo sugerido. Funciona melhor em planta limpa, com paredes em traço escuro e
            contínuo. Móveis, cotas e hachuras atrapalham. Toda sugestão precisa ser conferida antes de virar cômodo.
          </Nota>
        </>
      )}
    </section>
  )
}
