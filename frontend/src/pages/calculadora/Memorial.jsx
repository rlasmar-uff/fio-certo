import { Link } from 'react-router-dom'
import SecaoProtecaoGeral from './SecaoProtecaoGeral.jsx'
import SecaoComplementares from './SecaoComplementares.jsx'
import TabelasResumo from './TabelasResumo.jsx'
import SecaoQuadro from './SecaoQuadro.jsx'
import SecaoMateriais from './SecaoMateriais.jsx'
import CardVeredito from '../../components/CardVeredito.jsx'
import Checklists from '../../components/Checklists.jsx'
import { useProjeto } from '../../context/useProjeto.js'
import { calcularVeredito, destaquesProjeto } from '../../calculations/veredito.js'
import { montarChecklists } from '../../calculations/checklists.js'
import { ESQUEMAS_ATERRAMENTO, TIPOS_INSTALACAO } from '../../calculations/constantes.js'
import { ROUTES } from '../../routes.js'

// Memorial técnico para imprimir ou salvar em PDF pelo próprio navegador: o Resultado sem a
// navegação, com cabeçalho de identificação e todas as listas abertas.
export default function Memorial() {
  const { projeto, calculo, projetoAtivo } = useProjeto()
  const { configInstalacao } = calculo
  const data = new Date().toLocaleDateString('pt-BR')

  if (projeto.comodos.length === 0) {
    return (
      <section className="etapa-calculadora">
        <h1>Memorial técnico</h1>
        <p className="placeholder">Nenhum cômodo cadastrado ainda.</p>
        <Link to={ROUTES.comodos}>← Ir para cômodos</Link>
      </section>
    )
  }

  return (
    <article className="etapa-calculadora memorial">
      <div className="etapa-acoes memorial-acoes">
        <Link className="botao-secundario" to={ROUTES.resultado}>
          ← Voltar ao resultado
        </Link>
        <button type="button" className="botao-principal" onClick={() => window.print()}>
          Imprimir / salvar em PDF
        </button>
      </div>

      <header className="memorial-cabecalho">
        <h1>Memorial técnico da instalação elétrica</h1>
        <dl className="fatos">
          <div>
            <dt>Projeto</dt>
            <dd>{projetoAtivo.nome}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{data}</dd>
          </div>
          <div>
            <dt>Instalação</dt>
            <dd>
              {TIPOS_INSTALACAO[projeto.tipoInstalacao].label} ·{' '}
              {[configInstalacao.tensaoFaseNeutro, configInstalacao.tensaoFaseFase].filter(Boolean).join('/')} V
            </dd>
          </div>
          <div>
            <dt>Esquema de aterramento</dt>
            <dd>{ESQUEMAS_ATERRAMENTO[projeto.esquemaAterramento] ? projeto.esquemaAterramento : 'não declarado'}</dd>
          </div>
          <div>
            <dt>Referência</dt>
            <dd>ABNT NBR 5410:2004</dd>
          </div>
        </dl>
        <p className="memorial-aviso">
          Documento de apoio gerado pela calculadora Fio Certo, com base na NBR 5410. Não substitui o projeto
          elétrico nem a Anotação de Responsabilidade Técnica (ART) de um profissional habilitado.
        </p>
      </header>

      <CardVeredito veredito={calcularVeredito(projeto, calculo)} destaques={destaquesProjeto(projeto, calculo)} noMemorial />
      <SecaoProtecaoGeral />
      <SecaoComplementares />
      <TabelasResumo />
      <SecaoQuadro />
      <SecaoMateriais editavel={false} />
      <h2>Listas de verificação</h2>
      <Checklists grupos={montarChecklists(projeto, calculo)} abertos />
    </article>
  )
}
