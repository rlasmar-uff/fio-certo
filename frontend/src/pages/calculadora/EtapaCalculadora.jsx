import { Link } from 'react-router-dom'
import StepperCalculadora from '../../components/StepperCalculadora.jsx'
import RefNorma from '../../components/RefNorma.jsx'
import { useProjeto } from '../../context/useProjeto.js'
import { ROUTES } from '../../routes.js'

export default function EtapaCalculadora({ titulo, clausulas, referenciaNorma, children }) {
  const { projetoAtivo } = useProjeto()
  return (
    <section className="etapa-calculadora">
      <p className="projeto-atual">
        Projeto: <strong>{projetoAtivo.nome}</strong> · <Link to={ROUTES.projetos}>trocar ou salvar</Link>
      </p>
      <StepperCalculadora />
      <div className="etapa-titulo">
        <h1>{titulo}</h1>
        {referenciaNorma && <RefNorma clausulas={clausulas}>{referenciaNorma}</RefNorma>}
      </div>
      {children}
    </section>
  )
}

// Rodapé padrão das etapas: voltar/avançar. `bloqueio` troca o avançar por uma explicação.
export function AcoesEtapa({ voltar, avancar, rotuloAvancar, bloqueio, children }) {
  return (
    <div className="etapa-acoes">
      {voltar && (
        <Link className="botao-secundario" to={voltar}>
          ← Voltar
        </Link>
      )}
      {avancar &&
        (bloqueio ? (
          <span className="texto-fraco">{bloqueio}</span>
        ) : (
          <Link className="botao-principal" to={avancar}>
            {rotuloAvancar} →
          </Link>
        ))}
      {children}
    </div>
  )
}
