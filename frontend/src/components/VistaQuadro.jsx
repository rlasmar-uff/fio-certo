import { montarQuadro } from '../calculations/quadro.js'
import { ClausulaInfo } from './RefNorma.jsx'

const mm2 = (valor) => `${valor.toLocaleString('pt-BR')} mm²`

// F7 — vista do quadro: posições no trilho (largura proporcional aos polos), reserva da Tabela 59,
// e a identificação de cada circuito (§6.1.5.4).
export default function VistaQuadro({ calculo }) {
  const { posicoes, grupos, numero, modulos } = montarQuadro(calculo)
  const drDoCircuito = new Map(
    grupos.flatMap((grupo) => grupo.circuitos.map((circuito) => [circuito.id, calculo.protecaoGeral.drs?.modo === 'grupos' ? `DR ${grupo.numero}` : 'DR geral'])),
  )
  const circuitos = [...calculo.dimensionados].sort((a, b) => numero.get(a.id) - numero.get(b.id))

  return (
    <div className="vista-quadro">
      <ol className="trilho" aria-label={`Quadro com ${modulos} módulos`}>
        {posicoes.map((posicao, indice) => (
          <li
            key={`${posicao.tipo}-${indice}`}
            className={`modulo modulo-${posicao.tipo}`}
            style={{ '--modulos': posicao.modulos }}
            title={posicao.detalhe}
          >
            <span className="modulo-topo">{posicao.numero ? `C${posicao.numero}` : posicao.tipo === 'reserva' ? 'Res.' : posicao.detalhe}</span>
            <span className="modulo-valor">{posicao.tipo === 'reserva' ? '—' : posicao.rotulo}</span>
          </li>
        ))}
      </ol>
      <p className="texto-fraco">
        {modulos} módulos DIN (1 por polo). Ordem sugerida: geral, DPS, DR e seus circuitos, reserva.
      </p>

      <h3>
        Identificação dos circuitos (§6.1.5.4)
        <ClausulaInfo clausula="§6.1.5.4">
          Cada circuito, disjuntor e DR do quadro deve ser identificado de forma clara e durável — número, função e
          fase(s) que atende — para facilitar manutenção e evitar engano na hora de desligar o circuito errado.
        </ClausulaInfo>
      </h3>
      <div className="tabela-scroll">
        <table className="tabela-resultado tabela-cartoes">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Circuito</th>
              <th>Disjuntor</th>
              <th>Seção</th>
              <th>Fase(s)</th>
              <th>DR</th>
            </tr>
          </thead>
          <tbody>
            {circuitos.map((circuito) => (
              <tr key={circuito.id}>
                <td data-label="Nº">C{numero.get(circuito.id)}</td>
                <td data-label="Circuito" className="celula-quebra">
                  {circuito.nome}
                </td>
                <td data-label="Disjuntor" className="numerico">
                  {circuito.erro ? '—' : `${circuito.disjuntorA} A · ${circuito.polos}P`}
                </td>
                <td data-label="Seção" className="numerico">
                  {circuito.secaoMm2 ? mm2(circuito.secaoMm2) : '—'}
                </td>
                <td data-label="Fase(s)">{(circuito.fases ?? []).map((fase) => `F${fase}`).join(' + ') || '—'}</td>
                <td data-label="DR">{drDoCircuito.get(circuito.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="texto-fraco">
        Afixe no quadro a advertência obrigatória do §6.5.4.10 — o texto está na lista de verificação “Quadro”, abaixo.
      </p>
    </div>
  )
}
