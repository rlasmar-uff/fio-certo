import { Link, useNavigate } from 'react-router-dom'
import EtapaCalculadora, { AcoesEtapa } from './EtapaCalculadora.jsx'
import SecaoProtecaoGeral from './SecaoProtecaoGeral.jsx'
import SecaoComplementares from './SecaoComplementares.jsx'
import { useProjeto } from '../../context/useProjeto.js'
import TabelasResumo from './TabelasResumo.jsx'
import SecaoQuadro from './SecaoQuadro.jsx'
import SecaoMateriais from './SecaoMateriais.jsx'
import CardVeredito from '../../components/CardVeredito.jsx'
import Checklists from '../../components/Checklists.jsx'
import { calcularVeredito, destaquesProjeto } from '../../calculations/veredito.js'
import { montarChecklists } from '../../calculations/checklists.js'
import { ROUTES } from '../../routes.js'

export default function Resultado() {
  const { projeto, calculo, criarProjeto } = useProjeto()
  const navigate = useNavigate()

  if (projeto.comodos.length === 0) {
    return (
      <EtapaCalculadora titulo="Proteção e resultado">
        <p className="placeholder">Nenhum cômodo cadastrado ainda. Volte para a etapa de cômodos para começar.</p>
        <div className="etapa-acoes">
          <Link className="botao-principal" to={ROUTES.comodos}>
            ← Ir para cômodos
          </Link>
        </div>
      </EtapaCalculadora>
    )
  }

  return (
    <EtapaCalculadora
      titulo="Proteção e resultado"
      clausulas="§5.1.3.2.2 · §6.2.6.1.1"
      referenciaNorma="§5.1.3.2.2 (DR), §6.2.6.1.1 (seção mínima do alimentador) — disjuntor geral, DR e DPS na origem da instalação, alimentador (fase, neutro e terra) até o quadro, e o resumo de todos os circuitos."
    >
      <CardVeredito veredito={calcularVeredito(projeto, calculo)} destaques={destaquesProjeto(projeto, calculo)} />

      <SecaoProtecaoGeral />
      <SecaoComplementares />

      <TabelasResumo />
      <SecaoQuadro />
      <SecaoMateriais />

      <h2>Listas de verificação</h2>
      <p className="texto-fraco">Execução, comissionamento e entrega — o que a norma pede e não é cálculo.</p>
      <Checklists grupos={montarChecklists(projeto, calculo)} />

      <AcoesEtapa voltar={ROUTES.dimensionamento}>
        <Link className="botao-principal" to={ROUTES.memorial}>
          Memorial para imprimir / PDF →
        </Link>
        <Link className="botao-secundario" to={ROUTES.comparar}>
          Comparar cenários
        </Link>
        <Link className="botao-secundario" to={ROUTES.consumo}>
          Simular consumo
        </Link>
        <Link className="botao-secundario" to={ROUTES.projetos}>
          Exportar ou compartilhar
        </Link>
        {/* Não apaga nada: o projeto atual continua em "Meus projetos". */}
        <button
          type="button"
          className="botao-texto"
          onClick={() => {
            criarProjeto()
            navigate(ROUTES.instalacao)
          }}
        >
          Começar novo projeto
        </button>
      </AcoesEtapa>
    </EtapaCalculadora>
  )
}
