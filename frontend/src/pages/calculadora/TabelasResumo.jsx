import { useProjeto } from '../../context/useProjeto.js'
import { situacaoCircuito } from '../../calculations/veredito.js'
import { calcularPrevisaoDeCarga } from '../../calculations/previsaoDeCarga.js'

// Tabelas de resumo do Resultado e do Memorial: circuitos e previsão de carga por cômodo.
export default function TabelasResumo() {
  const { projeto, calculo } = useProjeto()
  const { porComodo } = calcularPrevisaoDeCarga(projeto.comodos, projeto.aplicarAlternativa600VA)
  const { dimensionados } = calculo

  return (
    <>
      <h2>Circuitos</h2>
      <div className="tabela-scroll">
        <table className="tabela-resultado tabela-cartoes">
          <thead>
            <tr>
              <th>Circuito</th>
              <th className="numerico">Potência</th>
              <th className="numerico">Disjuntor</th>
              <th className="numerico">Condutor</th>
              <th className="numerico">Terra (PE)</th>
              <th className="numerico">Eletroduto</th>
              <th className="numerico">Queda de tensão</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {dimensionados.map((circuito) => {
              const [variante, texto] = situacaoCircuito(circuito)
              return (
                <tr key={circuito.id}>
                  <td data-label="Circuito">
                    <strong>{circuito.nome}</strong>
                  </td>
                  <td data-label="Potência" className="numerico">{circuito.potenciaVA.toFixed(0)} VA</td>
                  <td data-label="Disjuntor" className="numerico">
                    {circuito.erro ? '—' : `${circuito.disjuntorA} A ${circuito.polos === 2 ? '2P' : '1P'}`}
                  </td>
                  <td data-label="Condutor" className="numerico">{circuito.erro ? '—' : `${circuito.secaoMm2} mm²`}</td>
                  <td data-label="Terra (PE)" className="numerico">
                    {circuito.secaoTerraMm2 ? `${circuito.secaoTerraMm2} mm²` : '—'}
                  </td>
                  <td data-label="Eletroduto" className="numerico">
                    {circuito.eletroduto?.eletrodutoRecomendado
                      ? `${circuito.eletroduto.eletrodutoRecomendado.nominalMm} mm`
                      : '—'}
                  </td>
                  <td data-label="Queda de tensão" className="numerico">
                    {circuito.quedaPercentual === null || circuito.naoVerificado
                      ? '—'
                      : `${circuito.quedaPercentual.toFixed(2)}%`}
                  </td>
                  <td data-label="Situação">
                    <span className={`etiqueta-status ${variante}`}>{texto}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2>Previsão de carga por cômodo</h2>
      <div className="tabela-scroll">
        <table className="tabela-resultado tabela-cartoes">
          <thead>
            <tr>
              <th>Cômodo</th>
              <th className="numerico">Área</th>
              <th className="numerico">Iluminação</th>
              <th className="numerico">Tomadas</th>
              <th className="numerico">Equipamentos</th>
              <th className="numerico">Total</th>
            </tr>
          </thead>
          <tbody>
            {porComodo.map((item) => (
              <tr key={item.comodoId}>
                <td data-label="Cômodo">{item.nome || '(sem nome)'}</td>
                <td data-label="Área" className="numerico">{item.area} m²</td>
                <td data-label="Iluminação" className="numerico">{item.iluminacaoVA} VA</td>
                <td data-label="Tomadas" className="numerico">{item.tugVA} VA</td>
                <td data-label="Equipamentos" className="numerico">{Math.round(item.tueVA)} VA</td>
                <td data-label="Total" className="numerico">
                  <strong>{Math.round(item.totalVA)} VA</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </>
  )
}
