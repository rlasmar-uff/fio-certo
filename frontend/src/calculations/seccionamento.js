import {
  IDR_CORRENTES_PADRONIZADAS,
  IDR_SENSIBILIDADE_ALTA_MA,
  TABELA_MULTIPLICADOR_DISPARO_INSTANTANEO,
} from './constantes.js'

// Anexo C, Tabela C.2 — tensão de contato limite UL em corrente alternada, nas três situações do
// Anexo C (Tabela C.1): situação 1 (caso geral), situação 2 (áreas molhadas, volume 1 de
// banheiro/piscina — NOTA 1 da Tabela C.1) e situação 3 (corpo imerso — NOTA 2: volume 0 de
// banheiro/piscina). As três existem na tabela; qual delas esta função usa é outra decisão, mais
// abaixo.
export const TENSAO_CONTATO_LIMITE_V = { situacao1: 50, situacao2: 25, situacao3: 12 }

// §5.1.2.2.4.3 NOTA — massas em situações distintas no mesmo eletrodo: adota-se o menor UL. O
// volume 1 do banheiro é situação 2 (Anexo C, Tabela C.1 NOTA 1), e numa casa todas as massas
// estão no mesmo eletrodo — então com banheiro vale 25 V.
//
// Por que não cai para 12 V (situação 3, volume 0) mesmo havendo banheiro: o volume 0 só admite
// SELV ≤12V (§9.1.3.1.1) — nenhum outro equipamento pode ficar lá (ver REGRAS_PONTO em
// locaisEspeciais.js, que proíbe tomada/interruptor/luminária/aquecedor no volume 0). E as massas
// de um sistema SELV não são ligadas a condutor de proteção nem a outras massas (§9.1.3.1.1 NOTA
// 1) — não entram no "mesmo eletrodo" que esta função avalia. Ou seja: existe uma massa em
// situação 3 na instalação, mas ela não é uma massa que este cálculo de RA precise cobrir. Se um
// dia esta ferramenta passar a modelar/permitir equipamento de rede no volume 0, esta função
// precisa ser revista antes.
export function tensaoContatoLimite(possuiBanheiro) {
  return possuiBanheiro ? TENSAO_CONTATO_LIMITE_V.situacao2 : TENSAO_CONTATO_LIMITE_V.situacao1
}

// §5.1.2.2.4.2 d) — esquema TN: Zs·Ia ≤ Uo, com Zs no ponto mais distante (Zs máximo).
// Duas formas de atender: pelo disjuntor, com Ia = limite superior da faixa magnética (disparo
// garantido em < 0,1 s, dentro de qualquer tempo da Tabela 25 — o menor é 0,05 s só em Uo 400 V,
// fora do residencial); ou pelo DR, com Ia = IΔn (§6.3.3.2.8, admitido no TN-S e no trecho TN-S
// do TN-C-S). Sem o disparo instantâneo garantido pelo disjuntor e sem DR, fica não verificado:
// o tempo real depende da curva do fabricante (e circuito de distribuição admite até 5 s,
// §5.1.2.2.4.1 c).
export function verificarSeccionamentoTN({ zsOhm, tensaoFaseNeutroV, correnteDisjuntorA, curvaDisjuntor, sensibilidadeDrMA }) {
  if (zsOhm === null || zsOhm === undefined) {
    return {
      verificado: false,
      conforme: null,
      motivo: 'Zs não calculada — faltam a Icc presumida e/ou os comprimentos do ramal e do circuito.',
    }
  }
  const correnteFaltaA = tensaoFaseNeutroV / zsOhm
  const curva = TABELA_MULTIPLICADOR_DISPARO_INSTANTANEO[curvaDisjuntor] ?? TABELA_MULTIPLICADOR_DISPARO_INSTANTANEO.C
  const iaDisjuntorA = correnteDisjuntorA ? curva.max * correnteDisjuntorA : null
  const porDisjuntor = iaDisjuntorA !== null && correnteFaltaA >= iaDisjuntorA
  const zsMaximaDrOhm = sensibilidadeDrMA ? tensaoFaseNeutroV / (sensibilidadeDrMA / 1000) : null
  const porDR = zsMaximaDrOhm !== null && zsOhm <= zsMaximaDrOhm

  const base = { zsOhm, correnteFaltaA, iaDisjuntorA, porDisjuntor, porDR, zsMaximaDrOhm }
  if (porDisjuntor || porDR) return { ...base, verificado: true, conforme: true, motivo: null }
  if (zsMaximaDrOhm !== null) {
    return { ...base, verificado: true, conforme: false, motivo: `Zs = ${zsOhm.toFixed(2)} Ω acima até do limite com DR (${zsMaximaDrOhm.toFixed(0)} Ω).` }
  }
  return {
    ...base,
    verificado: false,
    conforme: null,
    motivo:
      `Corrente de falta fase-PE (${correnteFaltaA.toFixed(0)} A) abaixo do disparo instantâneo garantido ` +
      `(${iaDisjuntorA?.toFixed(0)} A) e sem DR neste trecho — o tempo depende da curva do fabricante.`,
  }
}

// §5.1.2.2.4.3 b) — esquema TT: RA·IΔn ≤ UL. A norma não fixa RA; sem medição, mostra o limite.
export function verificarSeccionamentoTT({ resistenciaOhm, sensibilidadeDrMA, ulV }) {
  const raMaximaOhm = ulV / (sensibilidadeDrMA / 1000)
  if (resistenciaOhm === '' || resistenciaOhm === null || resistenciaOhm === undefined) {
    return { verificado: false, conforme: null, raMaximaOhm, ulV, motivo: `Meça RA: precisa ser ≤ ${raMaximaOhm.toFixed(0)} Ω.` }
  }
  const ra = Number(resistenciaOhm)
  const conforme = ra * (sensibilidadeDrMA / 1000) <= ulV
  return {
    verificado: true,
    conforme,
    raMaximaOhm,
    ulV,
    motivo: conforme ? null : `RA = ${ra} Ω × ${sensibilidadeDrMA} mA = ${(ra * sensibilidadeDrMA / 1000).toFixed(1)} V > UL ${ulV} V.`,
  }
}

// §6.3.6.3.2 — seletividade entre DRs em série: montante com IΔn ≥ 3× a de jusante (IEC 61008/61009)
// e característica de não atuação acima da de jusante, atendida com tipo S a montante (NOTA).
export const DRS_MONTANTE = {
  '100-S': { label: 'DR geral 100 mA tipo S', sensibilidadeMA: 100, tipoS: true },
  '300-S': { label: 'DR geral 300 mA tipo S', sensibilidadeMA: 300, tipoS: true },
}

// Corrente nominal do DR de um grupo: a norma só exige que ele seja protegido contra sobrecorrente
// (§6.3.6.2.2). Critério desta ferramenta (engenharia, não cláusula): ≥ soma dos In dos disjuntores
// do grupo — nenhum circuito passa do próprio In sem desarmar — limitada ao In do disjuntor geral,
// que já limita a corrente total.
export function dimensionarDRs({ modoDR, grupoDR = {}, dimensionados, fasesPorCircuito, disjuntorGeralA, drMontante }) {
  if (modoDR !== 'grupos') {
    return {
      modo: 'geral',
      grupos: [],
      montante: null,
      // §6.3.3.2.6 — a fuga normal de todos os circuitos soma num DR único; a norma pede que nenhum
      // DR veja mais de 50% de IΔn em funcionamento normal. Fuga não é calculável aqui.
      avisoIntempestivo: dimensionados.length > 1,
    }
  }

  const porNumero = new Map()
  for (const circuito of dimensionados) {
    const numero = Number(grupoDR[circuito.id]) || 1
    if (!porNumero.has(numero)) porNumero.set(numero, [])
    porNumero.get(numero).push(circuito)
  }

  const grupos = [...porNumero.entries()]
    .sort(([a], [b]) => a - b)
    .map(([numero, circuitos]) => {
      const somaInA = circuitos.reduce((soma, circuito) => soma + (circuito.disjuntorA ?? 0), 0)
      const necessariaA = disjuntorGeralA ? Math.min(somaInA, disjuntorGeralA) : somaInA
      const fases = new Set(circuitos.flatMap((circuito) => fasesPorCircuito[circuito.id] ?? [1]))
      const temNeutro = circuitos.some((circuito) => !circuito.ehFaseFase)
      return {
        numero,
        circuitos: circuitos.map((circuito) => ({ id: circuito.id, nome: circuito.nome })),
        somaInA,
        correnteA: IDR_CORRENTES_PADRONIZADAS.find((corrente) => corrente >= necessariaA) ?? null,
        polos: fases.size + (temNeutro ? 1 : 0),
        sensibilidadeMA: IDR_SENSIBILIDADE_ALTA_MA,
      }
    })

  const tipoMontante = DRS_MONTANTE[drMontante]
  const montante = tipoMontante
    ? {
        ...tipoMontante,
        seletivo: tipoMontante.tipoS && tipoMontante.sensibilidadeMA >= 3 * IDR_SENSIBILIDADE_ALTA_MA,
      }
    : null

  return { modo: 'grupos', grupos, montante, avisoIntempestivo: false }
}
