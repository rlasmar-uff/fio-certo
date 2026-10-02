import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Campo from '../../components/Campo.jsx'
import Nota from '../../components/Nota.jsx'
import { validarNumero } from '../../components/validacao.js'
import { useProjeto } from '../../context/useProjeto.js'
import { TIPOS_PONTO_BANHEIRO, verificarPontosBanheiro } from '../../calculations/locaisEspeciais.js'
import { ehPdf, renderizarPaginaPdf } from '../../planta/pdf.js'
import { gerarId } from '../../projetos/estado.js'
import { ROUTES } from '../../routes.js'

const LIMIAR_ARRASTE_PX = 5

// N19 — volumes do banheiro (§9.1.2.1) pela planta: marca a caixa do chuveiro/banheira e os
// pontos elétricos (tomada, interruptor, luminária, aquecedor, outro) com a altura de cada um, e
// classifica cada ponto no volume 0-3 (ou fora de todos). A geometria fica guardada em metros,
// relativa ao canto superior esquerdo da caixa — não à imagem, que nunca é salva (mesmo princípio
// da página Planta). Por isso os campos numéricos abaixo do desenho são a fonte de verdade: dá
// para preencher tudo por eles, sem nunca abrir uma imagem, inclusive por teclado.
export default function VolumesBanheiro() {
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const { projeto, updateComodo } = useProjeto()
  const svgRef = useRef(null)

  const banheiros = projeto.comodos.filter((comodo) => comodo.tipo === 'banheiro')
  const [comodoId, setComodoId] = useState(() => {
    const daUrl = parametros.get('comodo')
    return banheiros.some((comodo) => comodo.id === daUrl) ? daUrl : (banheiros[0]?.id ?? '')
  })
  const comodo = banheiros.find((item) => item.id === comodoId) ?? null

  const [imagem, setImagem] = useState(null)
  const [pdf, setPdf] = useState(null)
  const [modo, setModo] = useState('escala')
  const [pontosEscala, setPontosEscala] = useState([])
  const [distanciaM, setDistanciaM] = useState('')
  const [desenhoCaixa, setDesenhoCaixa] = useState(null)
  const [boxAnchorPx, setBoxAnchorPx] = useState(null)
  const [aviso, setAviso] = useState(null)

  const [boxM, setBoxM] = useState({ wM: 0, hM: 0, baseM: 0 })
  const [pontos, setPontos] = useState([])

  // Carrega a geometria já salva do cômodo (se houver) ao trocar de banheiro — sem imagem: os
  // números continuam editáveis e verificados, só a visualização no desenho fica pendente até o
  // usuário reabrir uma planta e redesenhar a caixa nela.
  useEffect(() => {
    setBoxM(comodo?.geometriaBanheiro ? { wM: Number(comodo.geometriaBanheiro.boxLarguraM) || 0, hM: Number(comodo.geometriaBanheiro.boxProfundidadeM) || 0, baseM: Number(comodo.geometriaBanheiro.boxAlturaBaseM) || 0 } : { wM: 0, hM: 0, baseM: 0 })
    setPontos(comodo?.geometriaBanheiro?.pontos?.map((ponto) => ({ ...ponto })) ?? [])
    setBoxAnchorPx(null)
    setImagem(null)
    setPdf(null)
    setPontosEscala([])
    setModo('escala')
    setAviso(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comodoId])

  useEffect(() => () => imagem && URL.revokeObjectURL(imagem.url), [imagem])

  const pixelsEscala = pontosEscala.length === 2 ? Math.hypot(pontosEscala[1].x - pontosEscala[0].x, pontosEscala[1].y - pontosEscala[0].y) : null
  const metrosPorPixel = pixelsEscala && Number(distanciaM) > 0 ? Number(distanciaM) / pixelsEscala : null

  const resultado = verificarPontosBanheiro({ boxLarguraM: boxM.wM, boxProfundidadeM: boxM.hM, boxAlturaBaseM: boxM.baseM, pontos })
  const resultadoPorId = new Map(resultado.map((item) => [item.id, item]))

  const mostrarImagem = (blob, pdfAberto = null) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      setImagem({ url, largura: img.naturalWidth, altura: img.naturalHeight, elemento: img })
      setPdf(pdfAberto)
      setPontosEscala([])
      setBoxAnchorPx(null)
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
      setPontosEscala((atuais) => (atuais.length >= 2 ? [ponto] : [...atuais, ponto]))
      return
    }
    if (modo === 'caixa') {
      evento.currentTarget.setPointerCapture?.(evento.pointerId)
      setDesenhoCaixa({ inicio: ponto, fim: ponto })
    }
    // modo 'pontos': a adição acontece no soltar, não no pressionar (evita criar 2 ao clicar rápido).
  }
  const aoMover = (evento) => desenhoCaixa && setDesenhoCaixa({ ...desenhoCaixa, fim: pontoDaImagem(evento) })
  const aoSoltar = (evento) => {
    const fim = pontoDaImagem(evento)
    if (modo === 'pontos') {
      if (!metrosPorPixel || !boxAnchorPx) {
        setAviso('Marque a escala e a caixa do chuveiro/banheira antes de marcar pontos.')
        return
      }
      const xM = Math.round((fim.x - boxAnchorPx.x) * metrosPorPixel * 100) / 100
      const yM = Math.round((fim.y - boxAnchorPx.y) * metrosPorPixel * 100) / 100
      setPontos((atuais) => [...atuais, { id: gerarId(), nome: '', tipo: 'tomada', alturaM: '', xM, yM }])
      return
    }
    if (modo !== 'caixa' || !desenhoCaixa) return
    if (!metrosPorPixel) {
      setDesenhoCaixa(null)
      setAviso('Marque a escala antes de desenhar a caixa.')
      return
    }
    const { inicio } = desenhoCaixa
    const retangulo = { x: Math.min(inicio.x, fim.x), y: Math.min(inicio.y, fim.y), w: Math.abs(fim.x - inicio.x), h: Math.abs(fim.y - inicio.y) }
    setDesenhoCaixa(null)
    // Arraste muito pequeno = clique: caixa de tamanho zero (chuveiro sem piso-boxe, Figura 18).
    const pequeno = retangulo.w < LIMIAR_ARRASTE_PX && retangulo.h < LIMIAR_ARRASTE_PX
    const wM = pequeno ? 0 : Math.round(retangulo.w * metrosPorPixel * 100) / 100
    const hM = pequeno ? 0 : Math.round(retangulo.h * metrosPorPixel * 100) / 100
    setBoxAnchorPx({ x: retangulo.x, y: retangulo.y })
    setBoxM((atual) => ({ wM, hM, baseM: atual.baseM }))
    setModo('pontos')
  }

  const atualizarPonto = (id, patch) => setPontos((atuais) => atuais.map((ponto) => (ponto.id === id ? { ...ponto, ...patch } : ponto)))
  const removerPonto = (id) => setPontos((atuais) => atuais.filter((ponto) => ponto.id !== id))
  const adicionarPontoManual = () => setPontos((atuais) => [...atuais, { id: gerarId(), nome: '', tipo: 'tomada', alturaM: '', xM: 0, yM: 0 }])

  const salvar = () => {
    updateComodo(comodoId, { geometriaBanheiro: { boxLarguraM: boxM.wM, boxProfundidadeM: boxM.hM, boxAlturaBaseM: boxM.baseM, pontos } })
    navigate(ROUTES.comodos)
  }
  const removerMarcacao = () => {
    updateComodo(comodoId, { geometriaBanheiro: undefined })
    setBoxM({ wM: 0, hM: 0, baseM: 0 })
    setPontos([])
  }

  const traco = imagem ? Math.max(imagem.largura, imagem.altura) / 400 : 1
  // Anéis dos volumes: soma de Minkowski de um retângulo com um disco de raio r é um retângulo
  // "arredondado" de canto r — a mesma fórmula serve o caso de caixa 0×0 (dá um círculo exato).
  const anelPx = (raioM) => {
    if (!boxAnchorPx || !metrosPorPixel) return null
    const raioPx = raioM / metrosPorPixel
    return { x: boxAnchorPx.x - raioPx, y: boxAnchorPx.y - raioPx, w: boxM.wM / metrosPorPixel + 2 * raioPx, h: boxM.hM / metrosPorPixel + 2 * raioPx, r: raioPx }
  }

  if (banheiros.length === 0) {
    return (
      <section className="etapa-calculadora">
        <p className="projeto-atual">
          <Link to={ROUTES.comodos}>← Voltar aos cômodos</Link>
        </p>
        <h1>Volumes do banheiro</h1>
        <p className="placeholder">Nenhum cômodo do tipo "Banheiro" cadastrado ainda.</p>
      </section>
    )
  }

  return (
    <section className="etapa-calculadora">
      <p className="projeto-atual">
        <Link to={ROUTES.comodos}>← Voltar aos cômodos</Link>
      </p>
      <h1>Volumes do banheiro (§9.1.2.1)</h1>
      <p className="texto-fraco">
        Marque a caixa do chuveiro/banheira e os pontos elétricos (na planta ou direto em metros, abaixo) para a
        ferramenta dizer em que volume cada um cai e se é permitido ali. O arquivo de imagem não sai do seu navegador
        e não fica salvo no projeto — só os números em metros são guardados.
      </p>

      {banheiros.length > 1 && (
        <Campo label="Banheiro">
          <select className="campo" value={comodoId} onChange={(evento) => setComodoId(evento.target.value)}>
            {banheiros.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome || 'Banheiro sem nome'}
              </option>
            ))}
          </select>
        </Campo>
      )}

      <label className="botao-secundario">
        {imagem ? 'Trocar planta…' : 'Abrir planta do banheiro (imagem ou PDF, opcional)…'}
        <input type="file" accept="image/*,application/pdf,.pdf" className="visualmente-oculto" onChange={abrirArquivo} />
      </label>
      {pdf && pdf.paginas > 1 && (
        <Campo label="Página do PDF" ajuda={`O PDF tem ${pdf.paginas} páginas.`}>
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
            <button type="button" className={modo === 'caixa' ? 'botao-principal' : 'botao-secundario'} aria-pressed={modo === 'caixa'} onClick={() => setModo('caixa')}>
              2. Marcar chuveiro/banheira
            </button>
            <button type="button" className={modo === 'pontos' ? 'botao-principal' : 'botao-secundario'} aria-pressed={modo === 'pontos'} onClick={() => setModo('pontos')}>
              3. Marcar pontos
            </button>
          </div>
          <Campo
            label="Distância real entre os dois pontos"
            unidade="m"
            ajuda={pontosEscala.length === 2 ? `${Math.round(pixelsEscala)} px na imagem` : 'Clique em dois pontos da planta com a cota conhecida.'}
            erro={validarNumero(distanciaM, { maiorQueMin: true })}
          >
            <input type="number" inputMode="decimal" min="0" step="0.01" className="campo campo-curto" value={distanciaM} onChange={(evento) => setDistanciaM(evento.target.value)} />
          </Campo>

          <div className="planta-area">
            <svg
              ref={svgRef}
              className={`planta-svg planta-modo-${modo}`}
              viewBox={`0 0 ${imagem.largura} ${imagem.altura}`}
              role="img"
              aria-label="Planta do banheiro"
              onPointerDown={aoPressionar}
              onPointerMove={aoMover}
              onPointerUp={aoSoltar}
            >
              <image href={imagem.url} width={imagem.largura} height={imagem.altura} />

              {[
                { raioM: 3.6, classe: 'planta-anel-36' },
                { raioM: 1.2, classe: 'planta-anel-12' },
                { raioM: 0.6, classe: 'planta-anel-06' },
              ].map(({ raioM, classe }) => {
                const anel = anelPx(raioM)
                if (!anel) return null
                return (
                  <rect
                    key={raioM}
                    className={`planta-anel-volume ${classe}`}
                    x={anel.x}
                    y={anel.y}
                    width={anel.w}
                    height={anel.h}
                    rx={anel.r}
                    ry={anel.r}
                    strokeWidth={traco}
                  />
                )
              })}
              {boxAnchorPx && (
                <rect
                  className="planta-comodo"
                  x={boxAnchorPx.x}
                  y={boxAnchorPx.y}
                  width={metrosPorPixel ? boxM.wM / metrosPorPixel : 0}
                  height={metrosPorPixel ? boxM.hM / metrosPorPixel : 0}
                  strokeWidth={traco * 2}
                />
              )}
              {desenhoCaixa && (
                <rect
                  className="planta-desenho"
                  x={Math.min(desenhoCaixa.inicio.x, desenhoCaixa.fim.x)}
                  y={Math.min(desenhoCaixa.inicio.y, desenhoCaixa.fim.y)}
                  width={Math.abs(desenhoCaixa.fim.x - desenhoCaixa.inicio.x)}
                  height={Math.abs(desenhoCaixa.fim.y - desenhoCaixa.inicio.y)}
                  strokeWidth={traco * 2}
                />
              )}
              {boxAnchorPx &&
                metrosPorPixel &&
                pontos.map((ponto) => {
                  const cx = boxAnchorPx.x + ponto.xM / metrosPorPixel
                  const cy = boxAnchorPx.y + ponto.yM / metrosPorPixel
                  const item = resultadoPorId.get(ponto.id)
                  const classe = !item ? 'planta-ponto-pendente' : item.conforme === false ? 'planta-ponto-alerta' : 'planta-ponto-ok'
                  return (
                    <g key={ponto.id}>
                      <circle className={`planta-ponto ${classe}`} cx={cx} cy={cy} r={traco * 4} />
                      <text x={cx + traco * 6} y={cy + traco * 4} fontSize={traco * 12}>
                        {ponto.nome || TIPOS_PONTO_BANHEIRO[ponto.tipo]}
                      </text>
                    </g>
                  )
                })}
              {pontosEscala.map((ponto, indice) => (
                <circle key={indice} className="planta-ponto" cx={ponto.x} cy={ponto.y} r={traco * 4} />
              ))}
              {pontosEscala.length === 2 && (
                <line className="planta-escala" x1={pontosEscala[0].x} y1={pontosEscala[0].y} x2={pontosEscala[1].x} y2={pontosEscala[1].y} strokeWidth={traco * 2} />
              )}
            </svg>
          </div>
        </>
      )}

      <div className="secao-comodo">
        <h2 className="secao-titulo">Caixa do chuveiro/banheira</h2>
        <div className="grade-campos">
          <Campo label="Largura" unidade="m" ajuda="0 = sem caixa definida (chuveiro aberto, Figura 18 da norma).">
            <input type="number" inputMode="decimal" min="0" step="0.05" className="campo" value={boxM.wM} onChange={(evento) => setBoxM((atual) => ({ ...atual, wM: Number(evento.target.value) || 0 }))} />
          </Campo>
          <Campo label="Profundidade" unidade="m">
            <input type="number" inputMode="decimal" min="0" step="0.05" className="campo" value={boxM.hM} onChange={(evento) => setBoxM((atual) => ({ ...atual, hM: Number(evento.target.value) || 0 }))} />
          </Campo>
          <Campo
            label="Altura da base acima do piso"
            unidade="m"
            ajuda="0 = piso-boxe/chuveiro ao nível do piso (caso comum). Só preencha para banheira elevada — muda o teto do volume 1 (§9.1.2.1 b), medido do fundo da banheira, não do piso do banheiro)."
          >
            <input type="number" inputMode="decimal" min="0" step="0.05" className="campo" value={boxM.baseM} onChange={(evento) => setBoxM((atual) => ({ ...atual, baseM: Number(evento.target.value) || 0 }))} />
          </Campo>
        </div>
      </div>

      <div className="secao-comodo">
        <h2 className="secao-titulo">Pontos elétricos</h2>
        {pontos.length === 0 && <p className="texto-fraco">Nenhum ponto marcado ainda.</p>}
        {pontos.length > 0 && (
          <ul className="lista-planta">
            {pontos.map((ponto) => {
              const item = resultadoPorId.get(ponto.id)
              return (
                <li key={ponto.id}>
                  <div className="grade-campos">
                    <Campo label="Nome">
                      <input type="text" placeholder={TIPOS_PONTO_BANHEIRO[ponto.tipo]} className="campo" value={ponto.nome} onChange={(evento) => atualizarPonto(ponto.id, { nome: evento.target.value })} />
                    </Campo>
                    <Campo label="Tipo">
                      <select className="campo" value={ponto.tipo} onChange={(evento) => atualizarPonto(ponto.id, { tipo: evento.target.value })}>
                        {Object.entries(TIPOS_PONTO_BANHEIRO).map(([chave, label]) => (
                          <option key={chave} value={chave}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Campo>
                    <Campo label="Altura" unidade="m" erro={validarNumero(ponto.alturaM, { obrigatorio: true, maiorQueMin: true })}>
                      <input type="number" inputMode="decimal" min="0" step="0.05" className="campo" value={ponto.alturaM} onChange={(evento) => atualizarPonto(ponto.id, { alturaM: evento.target.value })} />
                    </Campo>
                    <Campo label="X (a partir da caixa)" unidade="m">
                      <input type="number" inputMode="decimal" step="0.05" className="campo" value={ponto.xM} onChange={(evento) => atualizarPonto(ponto.id, { xM: Number(evento.target.value) || 0 })} />
                    </Campo>
                    <Campo label="Y (a partir da caixa)" unidade="m">
                      <input type="number" inputMode="decimal" step="0.05" className="campo" value={ponto.yM} onChange={(evento) => atualizarPonto(ponto.id, { yM: Number(evento.target.value) || 0 })} />
                    </Campo>
                  </div>
                  <p className="texto-fraco">
                    {item ? (
                      <>
                        <strong>{item.volume === null ? 'fora dos volumes' : `volume ${item.volume}`}</strong> ·{' '}
                        <span className={`etiqueta-status ${item.conforme ? 'ok' : 'alerta'}`}>{item.conforme ? 'conforme' : 'não conforme'}</span>
                        {item.motivo && ` — ${item.motivo}`} ({item.clausula})
                      </>
                    ) : (
                      'Informe a altura para classificar o volume.'
                    )}
                  </p>
                  <div className="cartao-projeto-acoes">
                    <button type="button" className="botao-texto botao-perigo" onClick={() => removerPonto(ponto.id)}>
                      Remover {ponto.nome || TIPOS_PONTO_BANHEIRO[ponto.tipo]}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <button type="button" className="botao-texto" onClick={adicionarPontoManual}>
          + Adicionar ponto (por número, sem desenhar)
        </button>
      </div>

      <div className="etapa-acoes">
        <button type="button" className="botao-principal" onClick={salvar}>
          Salvar geometria em "{comodo?.nome || 'Banheiro'}" →
        </button>
        {comodo?.geometriaBanheiro && (
          <button type="button" className="botao-texto botao-perigo" onClick={removerMarcacao}>
            Remover marcação deste banheiro
          </button>
        )}
      </div>

      <Nota titulo="Por que não dá pra confiar cegamente no volume 2?">
        As Figuras 16-18 da norma desenham o volume 2 também como uma faixa entre 2,25 m e 3 m de altura, bem em cima
        do volume 1 — essa faixa não dá pra reproduzir por texto, só por imagem. A ferramenta trata essa faixa como
        volume 2 (a leitura mais restritiva, nunca a mais permissiva), então nunca deixa de aplicar uma proibição que
        valha de verdade — no pior caso, mostra uma a mais.
      </Nota>
    </section>
  )
}
