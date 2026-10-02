import { Link } from 'react-router-dom'
import Campo from '../../components/Campo.jsx'
import { validarNumero } from '../../components/validacao.js'
import { useProjeto } from '../../context/useProjeto.js'
import { simularConsumo } from '../../calculations/consumo.js'
import { ROUTES } from '../../routes.js'

const decimal = (valor, casas = 1) => valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

// F12 — simulador de consumo. Fora do fluxo de 5 etapas: não afeta nenhum dimensionamento.
export default function Consumo() {
  const { projeto, setConsumo, setHorasConsumo } = useProjeto()
  const consumo = projeto.consumo
  const simulacao = simularConsumo(projeto.comodos, consumo)

  return (
    <section className="etapa-calculadora">
      <p className="projeto-atual">
        <Link to={ROUTES.resultado}>← Voltar ao resultado</Link>
      </p>
      <h1>Simulador de consumo</h1>
      <p className="texto-fraco">
        Estimativa de energia no mês: potência × horas de uso por dia × dias. As horas, os dias e a tarifa são seus —
        a ferramenta não presume nenhum. Não é a conta de luz: impostos, bandeiras e taxas não entram.
      </p>

      <div className="grade-campos">
        <Campo label="Dias de uso no mês" erro={validarNumero(consumo.dias, { max: 31 })}>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="31"
            className="campo"
            value={consumo.dias}
            onChange={(evento) => setConsumo({ dias: evento.target.value })}
          />
        </Campo>
        <Campo label="Tarifa" unidade="R$/kWh" ajuda="Opcional. Está na sua conta de luz." erro={validarNumero(consumo.tarifa)}>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="campo"
            value={consumo.tarifa}
            onChange={(evento) => setConsumo({ tarifa: evento.target.value })}
          />
        </Campo>
      </div>

      {simulacao.itens.length === 0 ? (
        <p className="placeholder">
          Nada para simular: cadastre equipamentos ou informe as luminárias dos cômodos (quantidade e potência).
        </p>
      ) : (
        <div className="tabela-scroll">
          <table className="tabela-resultado tabela-cartoes">
            <thead>
              <tr>
                <th>Carga</th>
                <th className="numerico">Potência</th>
                <th>Horas por dia</th>
                <th className="numerico">kWh/mês</th>
              </tr>
            </thead>
            <tbody>
              {simulacao.itens.map((item) => (
                <tr key={item.id}>
                  <td data-label="Carga" className="celula-quebra">
                    {item.nome}
                  </td>
                  <td data-label="Potência" className="numerico">
                    {item.potenciaW.toLocaleString('pt-BR')} W
                  </td>
                  <td data-label="Horas por dia">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="24"
                      step="0.25"
                      className="campo campo-curto"
                      aria-label={`Horas por dia de ${item.nome}`}
                      value={consumo.horas?.[item.id] ?? ''}
                      onChange={(evento) => setHorasConsumo(item.id, evento.target.value)}
                    />
                  </td>
                  <td data-label="kWh/mês" className="numerico">
                    {item.kWhMes === null ? '—' : decimal(item.kWhMes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <dl className="fatos">
        <div>
          <dt>Total no mês</dt>
          <dd>{simulacao.totalKWh === null ? '—' : `${decimal(simulacao.totalKWh)} kWh`}</dd>
        </div>
        <div>
          <dt>Pela tarifa informada</dt>
          <dd>{simulacao.custo === null ? '—' : `R$ ${decimal(simulacao.custo, 2)}`}</dd>
        </div>
      </dl>
      {simulacao.diasMes === null && simulacao.itens.length > 0 && <p className="texto-atencao">Informe os dias de uso no mês.</p>}
      {simulacao.semHoras > 0 && simulacao.diasMes !== null && (
        <p className="texto-fraco">{simulacao.semHoras} carga(s) sem horas informadas ficaram fora do total.</p>
      )}
    </section>
  )
}
