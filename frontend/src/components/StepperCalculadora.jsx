import { NavLink, useLocation } from 'react-router-dom'
import { ETAPAS_CALCULADORA } from '../routes.js'
import { useProgresso } from '../hooks/useProgresso.js'

const MARCA = { ok: '✓', erro: '!' }
const DESCRICAO = { ok: 'pronta', erro: 'com problema', pendente: 'pendente' }

export default function StepperCalculadora() {
  const progresso = useProgresso()
  const { pathname } = useLocation()
  const indiceAtual = ETAPAS_CALCULADORA.findIndex((etapa) => etapa.path === pathname)
  const prontas = ETAPAS_CALCULADORA.filter((etapa) => progresso[etapa.chave].status === 'ok').length

  return (
    <nav aria-label="Etapas" className="stepper-nav">
      <p className="stepper-resumo">
        Etapa {indiceAtual + 1} de {ETAPAS_CALCULADORA.length}
        <span className="stepper-barra" aria-hidden="true">
          <span style={{ width: `${(prontas / ETAPAS_CALCULADORA.length) * 100}%` }} />
        </span>
      </p>
      <ol className="stepper">
        {ETAPAS_CALCULADORA.map((etapa, indice) => {
          const { status, falta } = progresso[etapa.chave]
          return (
            <li key={etapa.path}>
              <NavLink to={etapa.path} className={`stepper-${status}`} title={falta ?? undefined}>
                <span className="stepper-numero" aria-hidden="true">
                  {MARCA[status] ?? indice + 1}
                </span>
                <span className="stepper-texto">
                  <span className="stepper-label">{etapa.label}</span>
                  {falta && <span className="stepper-falta">{falta}</span>}
                  <span className="sr-only">
                    {' '}
                    — etapa {indice + 1}, {DESCRICAO[status]}
                  </span>
                </span>
              </NavLink>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
