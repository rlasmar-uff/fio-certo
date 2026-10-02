import { Link } from 'react-router-dom'
import { ETAPAS_CALCULADORA } from '../routes.js'

const TITULO = {
  alerta: 'Há não conformidades',
  atencao: 'Faltam dados para verificar tudo',
  ok: 'Tudo o que a ferramenta verifica está conforme',
}
const ICONE = {
  ok: <path d="M5 13l4 4L19 7" />,
  atencao: (
    <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  alerta: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.01" />
    </>
  ),
}
const ROTA = Object.fromEntries(ETAPAS_CALCULADORA.map((etapa) => [etapa.chave, etapa]))

function Lista({ itens, variante, noMemorial }) {
  return (
    <ul className="veredito-lista">
      {itens.map((item) => (
        <li key={item.texto}>
          <span className={`etiqueta-status ${variante}`}>{variante === 'alerta' ? 'não conforme' : 'pendente'}</span>{' '}
          {item.texto}
          {!noMemorial && (
            <>
              {' — '}
              <Link to={ROTA[item.etapa].path}>resolver em {ROTA[item.etapa].label}</Link>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

// Topo do Resultado: estado geral, o que resolver e onde, e os números principais.
export default function CardVeredito({ veredito, destaques, noMemorial = false }) {
  return (
    <section className={`card-veredito card-veredito-${veredito.estado}`} aria-labelledby="titulo-veredito">
      <div className="veredito-cabecalho">
        <span className="veredito-icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {ICONE[veredito.estado]}
          </svg>
        </span>
        <h2 id="titulo-veredito">{TITULO[veredito.estado]}</h2>
      </div>
      <dl className="fatos">
        {destaques.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      {veredito.problemas.length > 0 && <Lista itens={veredito.problemas} variante="alerta" noMemorial={noMemorial} />}
      {veredito.pendencias.length > 0 && <Lista itens={veredito.pendencias} variante="atencao" noMemorial={noMemorial} />}
      <p className="texto-fraco">
        Resultado de apoio ao projeto, com base na NBR 5410. Não substitui o projeto e a ART de um profissional habilitado.
      </p>
    </section>
  )
}
