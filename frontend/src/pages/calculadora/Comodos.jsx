import { Link } from 'react-router-dom'
import EtapaCalculadora, { AcoesEtapa } from './EtapaCalculadora.jsx'
import ComodoCard from '../../components/ComodoCard.jsx'
import { useProjeto } from '../../context/useProjeto.js'
import { calcularPrevisaoDeCarga, contarPontos600VA } from '../../calculations/previsaoDeCarga.js'
import { ROUTES } from '../../routes.js'

export default function Comodos() {
  const { projeto, addComodo, setAplicarAlternativa600VA } = useProjeto()
  const { porComodo, totais } = calcularPrevisaoDeCarga(projeto.comodos, projeto.aplicarAlternativa600VA)
  // A opção só faz diferença acima de 6 pontos nos ambientes de 600 VA (§9.5.2.2.2 a)) — abaixo
  // disso, mostrar o checkbox só confundiria sem mudar nada.
  const total600VA = contarPontos600VA(projeto.comodos)

  return (
    <EtapaCalculadora
      titulo="Cômodos e previsão de carga"
      clausulas="§9.5.2"
      referenciaNorma="§9.5.2 — carga mínima de iluminação por área (§9.5.2.1) e número mínimo de pontos de tomada por cômodo (§9.5.2.2). Equipamentos de uso específico (TUE) entram com a potência nominal."
    >
      <div className="lista-comodos">
        {projeto.comodos.length === 0 && (
          <p className="placeholder">Nenhum cômodo cadastrado ainda. Adicione o primeiro abaixo.</p>
        )}
        {projeto.comodos.map((comodo, indice) => (
          <ComodoCard key={comodo.id} comodo={comodo} indice={indice} />
        ))}
      </div>

      <div className="etapa-acoes">
        <button type="button" className="botao-secundario" onClick={addComodo}>
          + Adicionar cômodo
        </button>
        <Link className="botao-texto" to={ROUTES.planta}>
          Medir cômodos na planta (imagem ou PDF) →
        </Link>
      </div>

      {total600VA > 6 && (
        <label className="campo-checkbox">
          <input
            type="checkbox"
            checked={projeto.aplicarAlternativa600VA}
            onChange={(evento) => setAplicarAlternativa600VA(evento.target.checked)}
          />
          Usar a alternativa permissiva do §9.5.2.2.2 a): com mais de 6 pontos de tomada no
          conjunto dos ambientes de 600 VA (banheiros, cozinha, copa, área de serviço — já são{' '}
          {total600VA} neste projeto), a norma <em>admite</em> contar 600 VA até só 2 pontos por
          ambiente, em vez de 3. Reduz a carga prevista; deixe desmarcado para a leitura padrão
          (sempre 3), mais conservadora.
        </label>
      )}

      {porComodo.length > 0 && (
        <div className="tabela-scroll">
          <table className="tabela-resultado tabela-cartoes">
            <thead>
              <tr>
                <th>Cômodo</th>
                <th className="numerico">Área</th>
                <th className="numerico">Iluminação</th>
                <th className="numerico">Tomadas (TUG)</th>
                <th className="numerico">Equipamentos (TUE)</th>
                <th className="numerico">Total</th>
              </tr>
            </thead>
            <tbody>
              {porComodo.map((item) => (
                <tr key={item.comodoId}>
                  <td data-label="Cômodo">{item.nome || '(sem nome)'}</td>
                  <td data-label="Área" className="numerico">{item.area} m²</td>
                  <td data-label="Iluminação" className="numerico">{item.iluminacaoVA} VA</td>
                  <td data-label="Tomadas (TUG)" className="numerico">
                    {item.tugQuantidade} pt · {item.tugVA} VA
                  </td>
                  <td data-label="Equipamentos (TUE)" className="numerico">{Math.round(item.tueVA)} VA</td>
                  <td data-label="Total" className="numerico">
                    <strong>{Math.round(item.totalVA)} VA</strong>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total geral</td>
                <td data-label="Iluminação" className="numerico">{totais.iluminacaoVA} VA</td>
                <td data-label="Tomadas (TUG)" className="numerico">{totais.tugVA} VA</td>
                <td data-label="Equipamentos (TUE)" className="numerico">{Math.round(totais.tueVA)} VA</td>
                <td data-label="Total" className="numerico">
                  <strong>{Math.round(totais.totalVA)} VA</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <AcoesEtapa
        voltar={ROUTES.instalacao}
        avancar={ROUTES.circuitos}
        rotuloAvancar="Avançar para circuitos"
        bloqueio={projeto.comodos.length === 0 ? 'Cadastre ao menos um cômodo para avançar.' : null}
      />
    </EtapaCalculadora>
  )
}
