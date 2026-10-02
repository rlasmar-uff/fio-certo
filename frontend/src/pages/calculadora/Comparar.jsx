import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Campo from '../../components/Campo.jsx'
import Nota from '../../components/Nota.jsx'
import { useProjeto } from '../../context/useProjeto.js'
import { calcularProjetoCompleto } from '../../calculations/projeto.js'
import { calcularVeredito } from '../../calculations/veredito.js'
import { ISOLACOES, METODOS_INSTALACAO, listarTemperaturasDisponiveis } from '../../calculations/constantes.js'
import { ROUTES } from '../../routes.js'

const ESTADO_VEREDITO = { ok: ['ok', 'conforme'], atencao: ['atencao', 'falta dado'], alerta: ['alerta', 'não conforme'] }
const MANTER = ''

// Cenário = o mesmo projeto com isolação, método de instalação (todos os circuitos) e/ou
// temperatura trocados. Roda o motor inteiro de novo; nada é aproximado.
function aplicarCenario(projeto, cenario, idsCircuitos) {
  const variante = { ...projeto }
  if (cenario.isolacao) {
    variante.isolacaoCondutor = cenario.isolacao
    variante.isolacaoAlimentador = cenario.isolacao
  }
  if (cenario.metodo) variante.metodosInstalacao = Object.fromEntries(idsCircuitos.map((id) => [id, cenario.metodo]))
  if (cenario.temperatura) variante.temperaturaAmbienteC = cenario.temperatura
  return variante
}

function celula(circuito) {
  if (!circuito) return '—'
  if (circuito.erro) return 'sem seção viável'
  return `${circuito.secaoMm2.toLocaleString('pt-BR')} mm² · ${circuito.disjuntorA} A`
}

export default function Comparar() {
  const { projeto, calculo } = useProjeto()
  const [cenario, setCenario] = useState({ isolacao: 'epr', metodo: MANTER, temperatura: MANTER })

  const calculoCenario = useMemo(() => {
    const variante = aplicarCenario(
      projeto,
      cenario,
      calculo.circuitos.map((circuito) => circuito.id),
    )
    const resultado = calcularProjetoCompleto(variante, calculo.configInstalacao)
    return { variante, resultado: { configInstalacao: calculo.configInstalacao, ...resultado } }
  }, [projeto, cenario, calculo])

  if (projeto.comodos.length === 0) {
    return (
      <section className="etapa-calculadora">
        <h1>Comparar cenários</h1>
        <p className="placeholder">Nenhum cômodo cadastrado ainda.</p>
        <Link to={ROUTES.comodos}>← Ir para cômodos</Link>
      </section>
    )
  }

  const b = calculoCenario.resultado
  const porId = new Map(b.dimensionados.map((circuito) => [circuito.id, circuito]))
  const [vA, tA] = ESTADO_VEREDITO[calcularVeredito(projeto, calculo).estado]
  const [vB, tB] = ESTADO_VEREDITO[calcularVeredito(calculoCenario.variante, b).estado]
  const temperaturas = listarTemperaturasDisponiveis({ isolacao: cenario.isolacao || projeto.isolacaoCondutor, enterrado: false })
  const mudou = (a, c) => celula(a) !== celula(c)
  const alimentador = (resultado) =>
    resultado.protecaoGeral.condutorFase.secaoMm2
      ? `${resultado.protecaoGeral.condutorFase.secaoMm2.toLocaleString('pt-BR')} mm² · ${resultado.protecaoGeral.disjuntorGeralA} A`
      : 'sem seção viável'

  return (
    <section className="etapa-calculadora">
      <p className="projeto-atual">
        <Link to={ROUTES.resultado}>← Voltar ao resultado</Link>
      </p>
      <h1>Comparar cenários</h1>
      <p className="texto-fraco">
        O mesmo projeto com outra isolação, outro método de instalação ou outra temperatura, lado a lado. O projeto salvo
        não muda.
      </p>

      <div className="grade-campos">
        <Campo label="Isolação no cenário">
          <select className="campo" value={cenario.isolacao} onChange={(evento) => setCenario({ ...cenario, isolacao: evento.target.value })}>
            <option value={MANTER}>igual ao projeto</option>
            {Object.entries(ISOLACOES).map(([chave, isolacao]) => (
              <option key={chave} value={chave}>
                {isolacao.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Método de instalação (todos os circuitos)">
          <select className="campo" value={cenario.metodo} onChange={(evento) => setCenario({ ...cenario, metodo: evento.target.value })}>
            <option value={MANTER}>igual ao projeto</option>
            {Object.entries(METODOS_INSTALACAO).map(([chave, metodo]) => (
              <option key={chave} value={chave}>
                {metodo.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Temperatura ambiente">
          <select
            className="campo"
            value={cenario.temperatura}
            onChange={(evento) => setCenario({ ...cenario, temperatura: evento.target.value })}
          >
            <option value={MANTER}>igual ao projeto</option>
            {temperaturas.map(({ temperaturaC }) => (
              <option key={temperaturaC} value={temperaturaC}>
                {temperaturaC}°C
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="tabela-scroll">
        <table className="tabela-resultado tabela-cartoes">
          <thead>
            <tr>
              <th>Circuito</th>
              <th>Projeto</th>
              <th>Cenário</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Circuito">
                <strong>Veredito</strong>
              </td>
              <td data-label="Projeto">
                <span className={`etiqueta-status ${vA}`}>{tA}</span>
              </td>
              <td data-label="Cenário">
                <span className={`etiqueta-status ${vB}`}>{tB}</span>
              </td>
            </tr>
            <tr>
              <td data-label="Circuito">Alimentador</td>
              <td data-label="Projeto">{alimentador(calculo)}</td>
              <td data-label="Cenário" className={alimentador(calculo) !== alimentador(b) ? 'celula-mudou' : undefined}>
                {alimentador(b)}
              </td>
            </tr>
            {calculo.dimensionados.map((circuito) => {
              const outro = porId.get(circuito.id)
              return (
                <tr key={circuito.id}>
                  <td data-label="Circuito" className="celula-quebra">
                    {circuito.nome}
                  </td>
                  <td data-label="Projeto">{celula(circuito)}</td>
                  <td data-label="Cenário" className={mudou(circuito, outro) ? 'celula-mudou' : undefined}>
                    {celula(outro)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="texto-fraco">Em destaque, o que muda no cenário.</p>
      <Nota titulo="Por que um circuito pode engrossar com um cabo melhor?">
        Alimentador e circuitos dividem os mesmos 5% de queda de tensão a partir da entrega (§6.2.7.1). Se o cenário deixa o
        alimentador mais fino, ele consome mais desse orçamento, e os circuitos passam a ter menos margem — alguns precisam
        de seção maior. EPR/XLPE também tem resistência maior, porque opera a 90 °C.
      </Nota>
    </section>
  )
}
