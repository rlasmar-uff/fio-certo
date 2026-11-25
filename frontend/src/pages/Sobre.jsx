import { Link } from 'react-router-dom'
import { GLOSSARIO } from '../conteudo/glossario.js'
import { ROUTES } from '../routes.js'

export default function Sobre() {
  return (
    <section className="sobre">
      <h1>Sobre o projeto</h1>
      <p>
        Este site é desenvolvido como projeto de extensão universitária da disciplina TEE00192 — Circuitos Elétricos
        de Corrente Alternada, com o objetivo de apoiar o dimensionamento de instalações elétricas residenciais com
        base na ABNT NBR 5410:2004 (versão corrigida 17.03.2008).
      </p>
      <p>
        A ferramenta é gratuita, de acesso aberto e roda inteira no navegador: nenhum dado do projeto sai do seu
        computador, a não ser que você exporte o arquivo ou gere um link.
      </p>

      <h2>Escopo e limitações</h2>
      <ul>
        <li>Só instalações residenciais de baixa tensão: monofásica, bifásica e trifásica, condutores de cobre.</li>
        <li>
          Os resultados são de apoio ao estudo e ao pré-dimensionamento. <strong>Não substituem</strong> o projeto
          elétrico assinado por profissional habilitado (ART) nem a conferência em obra.
        </li>
        <li>
          Só o que a NBR 5410 prescreve. O que a norma não traz fica de fora: fator de demanda (a norma manda considerar a
          não-simultaneidade, §4.2.1.1.2, mas não dá tabela — a ferramenta adota a carga cheia), regras de distribuidora,
          preços e marcas.
        </li>
        <li>
          Dados de produto que a norma não tabela mas que o cálculo exige — correntes nominais de disjuntor, diâmetros de
          cabo e eletroduto, resistência e reatância dos condutores — vêm de normas de produto ou de catálogo, identificados
          como tal.
        </li>
        <li>
          O que é e o que não é verificado, cláusula por cláusula, está na página{' '}
          <Link to={ROUTES.conformidade}>Conformidade</Link>.
        </li>
      </ul>

      <h2>Glossário</h2>
      <dl className="glossario">
        {Object.entries(GLOSSARIO).map(([sigla, termo]) => (
          <div key={sigla} id={`termo-${sigla}`}>
            <dt>
              <strong>{sigla}</strong> — {termo.nome}
            </dt>
            <dd>{termo.definicao}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
