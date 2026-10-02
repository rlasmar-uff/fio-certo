import { Link, useNavigate } from 'react-router-dom'
import { useProjeto } from '../context/useProjeto.js'
import { useProgresso } from '../hooks/useProgresso.js'
import { casaModelo } from '../projetos/casaModelo.js'
import { ETAPAS_CALCULADORA, ROUTES } from '../routes.js'

const RECURSOS = [
  {
    titulo: 'Mono, bi e trifásico',
    descricao: 'Da previsão de carga ao quadro: circuitos, condutores, queda de tensão, curto-circuito, DR e DPS.',
    icone: (
      <path d="M9 2v4M15 2v4M6 6h12l-1 6a5 5 0 0 1-10 0Z M12 16v3M9 22h6" />
    ),
  },
  {
    titulo: 'Base normativa exposta',
    descricao: 'Cada resultado mostra a cláusula da NBR 5410 aplicada e o que ficou sem verificar.',
    icone: <path d="M7 3h8l4 4v14H7z M9.5 12l2 2 4-4.5" />,
  },
  {
    titulo: 'Gratuito e sem cadastro',
    descricao: 'Roda no navegador, sem login. Os projetos ficam salvos aqui e podem ir para arquivo ou link.',
    icone: <path d="M7 10V7a5 5 0 0 1 9-3 M5 10h14v11H5z" />,
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { projeto, projetoAtivo, criarProjeto } = useProjeto()
  const progresso = useProgresso()
  const comodos = projeto.comodos.length

  return (
    <div className="home">
      <section className="hero">
        <svg className="hero-decorativo" aria-hidden="true" viewBox="0 0 640 560" preserveAspectRatio="xMaxYMid meet">
          <path d="M40 470 H210 V370 H430" />
          <path d="M120 560 V430 H340 V300" />
          <path d="M340 300 H560 V140" />
          <path d="M200 120 H420 V220" />
          <path className="hero-decorativo-acento" d="M430 370 H600" />
          <circle className="hero-decorativo-acento" cx="210" cy="370" r="4" />
          <circle className="hero-decorativo-acento" cx="430" cy="370" r="4" />
          <circle cx="340" cy="300" r="4" />
          <circle cx="560" cy="140" r="4" />
          <circle cx="420" cy="220" r="4" />
          <circle cx="200" cy="120" r="4" />
        </svg>
        <div className="hero-texto">
          <span className="etiqueta">ABNT NBR 5410 · Projeto de extensão</span>
          <h1>
            Dimensionamento elétrico residencial,
            <span className="texto-destaque"> com base na NBR 5410.</span>
          </h1>
          <p>
            Ferramenta gratuita para calcular previsão de carga, circuitos, condutores, queda de tensão e proteção de
            instalações monofásicas, bifásicas e trifásicas.
          </p>
          <div className="hero-acoes">
            {comodos > 0 ? (
              <Link className="botao-principal" to={ROUTES.instalacao}>
                Continuar “{projetoAtivo.nome}” ({comodos} {comodos === 1 ? 'cômodo' : 'cômodos'}) →
              </Link>
            ) : (
              <Link className="botao-principal" to={ROUTES.instalacao}>
                Iniciar dimensionamento →
              </Link>
            )}
            <button
              type="button"
              className="botao-secundario"
              onClick={() => {
                criarProjeto('Casa-modelo (exemplo)', casaModelo())
                navigate(ROUTES.resultado)
              }}
            >
              Ver exemplo
            </button>
            {comodos > 0 && (
              <Link className="botao-secundario" to={ROUTES.projetos}>
                Meus projetos
              </Link>
            )}
          </div>
          <p className="aviso-art">
            Apoio ao estudo e ao pré-dimensionamento. Não substitui o projeto assinado por profissional habilitado
            (ART).
          </p>
        </div>
      </section>

      <section className="grade-recursos">
        {RECURSOS.map((recurso) => (
          <article className="cartao-vidro" key={recurso.titulo}>
            <span className="cartao-vidro-icone" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {recurso.icone}
              </svg>
            </span>
            <h2>{recurso.titulo}</h2>
            <p>{recurso.descricao}</p>
          </article>
        ))}
      </section>

      <section className="fluxo">
        <h2>Como funciona</h2>
        <ol className="fluxo-lista">
          {ETAPAS_CALCULADORA.map((etapa, indice) => {
            const pronta = comodos > 0 && progresso[etapa.chave]?.status === 'ok'
            return (
              <li key={etapa.path}>
                {indice > 0 && <span className="fluxo-linha" aria-hidden="true" />}
                <Link to={etapa.path} className="fluxo-no">
                  <span className={`fluxo-numero${pronta ? ' pronto' : ''}`} aria-hidden="true">
                    {pronta ? '✓' : String(indice + 1).padStart(2, '0')}
                  </span>
                  <span className="fluxo-rotulo">
                    {etapa.label}
                    {pronta && <span className="sr-only"> — pronta</span>}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
