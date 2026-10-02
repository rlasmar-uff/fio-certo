import { calcularSecaoTerra } from './constantes.js'
import { verificarCurtoCircuito } from './curtoCircuito.js'
import { verificarSobrecarga } from './complementares.js'

// F8 — instalação existente: em vez de dimensionar, confere a seção e o disjuntor que já estão
// no circuito contra os mesmos critérios do dimensionamento. Reaproveita a trilha de seções
// (`trilhaSecao`: capacidade corrigida e queda de cada seção, nas condições do circuito) — nenhum
// critério novo. O PE instalado é conferido pela Tabela 58 contra a seção instalada, e o
// seccionamento automático é refeito com a seção, o PE e o disjuntor instalados por `seccionar`
// (vem de projeto.js, que conhece o esquema, a Icc e o alimentador; undefined sem esquema).
export function verificarExistente(circuito, existente, { curvaDisjuntor, seccionar } = {}) {
  const secaoMm2 = Number(existente?.secaoMm2)
  const disjuntorA = Number(existente?.disjuntorA)
  const peMm2 = Number(existente?.peMm2)
  if (!(secaoMm2 > 0) || !(disjuntorA > 0)) return null

  const passo = circuito.trilhaSecao?.find((item) => item.secao === secaoMm2) ?? null
  const izA = passo?.ampacidadeCorrigida ?? null
  const itens = []
  const item = (criterio, clausula, ok, detalhe) => itens.push({ criterio, clausula, ok, detalhe })

  item(
    'Seção mínima',
    '§6.2.6.1.1 / Tabela 47',
    secaoMm2 >= circuito.secaoMinimaNormativa,
    `${secaoMm2} mm² (mínimo ${circuito.secaoMinimaNormativa} mm²)`,
  )
  item('Ib ≤ In', '§5.3.4.1 a)', circuito.correnteProjetoA <= disjuntorA, `Ib ${circuito.correnteProjetoA.toFixed(1)} A, In ${disjuntorA} A`)
  item(
    'In ≤ Iz',
    '§5.3.4.1 a)',
    izA === null ? null : disjuntorA <= izA,
    izA === null ? 'capacidade da seção não disponível' : `In ${disjuntorA} A, Iz ${izA.toFixed(1)} A`,
  )
  const sobrecarga = verificarSobrecarga(disjuntorA, izA)
  item(
    'I₂ ≤ 1,45·Iz',
    '§5.3.4.1 b)',
    sobrecarga ? sobrecarga.conforme : null,
    sobrecarga ? `I₂ ${sobrecarga.i2A.toFixed(1)} A, limite ${sobrecarga.limiteA.toFixed(1)} A` : '—',
  )
  item(
    'Queda de tensão',
    '§6.2.7',
    circuito.comprimentoInformado && passo ? passo.atendeQueda : null,
    circuito.comprimentoInformado && passo
      ? `${passo.quedaPercentual.toFixed(2)}% (limite ${circuito.limitePercentual.toFixed(2)}%)`
      : 'falta o comprimento',
  )
  const curto = verificarCurtoCircuito({
    correnteDisjuntorA: disjuntorA,
    curvaDisjuntor,
    iccPresumidaA: circuito.iccQuadroA,
    iccMinimaA: circuito.iccPontaA,
    secaoMm2,
    isolacao: circuito.isolacao,
  })
  item('Curto-circuito', '§5.3.5.5.2 / §6.3.4.3.2', curto.verificado ? curto.conforme : null, curto.verificado ? 'I²t e Ikmin' : curto.motivo)

  const peMinimoMm2 = calcularSecaoTerra(secaoMm2)
  item(
    'Condutor de proteção (PE)',
    'Tabela 58',
    peMm2 > 0 ? peMm2 >= peMinimoMm2 : null,
    peMm2 > 0 ? `${peMm2} mm² (mínimo ${peMinimoMm2} mm² para fase de ${secaoMm2} mm²)` : `não informado (mínimo ${peMinimoMm2} mm²)`,
  )
  const seccionamento = seccionar?.({ secaoMm2, peMm2: peMm2 > 0 ? peMm2 : null, disjuntorA })
  if (seccionamento !== undefined)
    item(
      'Seccionamento automático',
      '§5.1.2.2.4',
      seccionamento?.verificado ? seccionamento.conforme : null,
      seccionamento?.verificado
        ? seccionamento.zsOhm !== undefined
          ? `Zs ${seccionamento.zsOhm.toFixed(2)} Ω, ${seccionamento.porDisjuntor ? 'atua pelo disjuntor' : seccionamento.porDR ? 'atua pelo DR de 30 mA do projeto' : 'não atua'}`
          : 'TT: RA·IΔn ≤ UL, igual ao do projeto'
        : peMm2 > 0
          ? (seccionamento?.motivo ?? 'não verificado')
          : 'falta o PE instalado',
    )

  const falhas = itens.filter((i) => i.ok === false)
  return {
    secaoMm2,
    disjuntorA,
    itens,
    conforme: falhas.length > 0 ? false : itens.every((i) => i.ok === true) ? true : null,
    falhas: falhas.map((i) => i.criterio),
  }
}
