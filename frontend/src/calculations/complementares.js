import { CONDICOES_ATERRAMENTO_ENTERRADO, ESQUEMAS_ATERRAMENTO, SECOES_NOMINAIS_MM2 } from './constantes.js'

// Verificações da NBR 5410 que dependem do projeto já dimensionado mas não mudam nenhuma seção
// nem disjuntor: saem como requisito mínimo ("especifique ≥ X") ou como conferência.

// §5.3.4.1 b) — I2 ≤ 1,45·Iz. I2 (corrente convencional de atuação) não vem da NBR 5410: para
// disjuntor IEC 60898 / NBR NM 60898 é 1,45·In (fonte externa, norma de produto). Com isso a
// condição b) equivale a In ≤ Iz — a mesma da alínea a), agora explícita.
export const FATOR_I2_DISJUNTOR = 1.45

export function verificarSobrecarga(correnteDisjuntorA, ampacidadeA) {
  if (!correnteDisjuntorA || !ampacidadeA) return null
  const i2A = FATOR_I2_DISJUNTOR * correnteDisjuntorA
  const limiteA = 1.45 * ampacidadeA
  return { i2A, limiteA, conforme: i2A <= limiteA }
}

// §6.5.4.7 / Tabela 59 — espaço de reserva no quadro, em número de circuitos. "0,15 N" é
// arredondado para cima: não existe fração de espaço, e para cima é o lado seguro.
export function calcularReservaQuadro(numeroCircuitos) {
  if (numeroCircuitos <= 6) return 2
  if (numeroCircuitos <= 12) return 3
  if (numeroCircuitos <= 30) return 4
  return Math.ceil(0.15 * numeroCircuitos)
}

function secaoNominalAcima(secaoMm2) {
  return SECOES_NOMINAIS_MM2.find((secao) => secao >= secaoMm2) ?? null
}

// §6.4.4.1.1 — equipotencialização principal: ≥ metade do maior PE da instalação, mínimo 6 mm²
// (cobre), podendo ser limitada a 25 mm².
export function calcularEquipotencializacaoPrincipal(maiorPeMm2) {
  if (!maiorPeMm2) return null
  return Math.min(25, Math.max(6, secaoNominalAcima(maiorPeMm2 / 2)))
}

// §6.3.5.2.4 a) / Tabela 31 — Up compatível com a categoria II: 1,5 kV em 127/220 V e 2,5 kV em
// 220/380 V. b) / Tabela 49 — Uc ≥ 1,1·Uo nos modos fase-neutro e fase-PE, ≥ Uo no neutro-PE
// (mesmo valor em TT, TN-S e na parte TN-S de um TN-C-S). d) — In ≥ 5 kA por modo; Iimp ≥ 12,5 kA
// por modo contra descarga direta; no esquema de conexão 3 (neutro-PE), In ≥ 10 kA (monofásica)
// ou 20 kA (trifásica). §6.3.5.2.9 — condutor DPS-PE ≥ 4 mm² (16 mm² contra descarga direta) e
// comprimento total das ligações de preferência ≤ 0,5 m.
export function especificarDPS({ tensaoFaseNeutro, numeroFases, exposicaoDescargaDireta }) {
  return {
    upMaximoKV: tensaoFaseNeutro <= 127 ? 1.5 : 2.5,
    ucMinimoFaseV: 1.1 * tensaoFaseNeutro,
    ucMinimoNeutroPeV: tensaoFaseNeutro,
    inMinimoKA: 5,
    inMinimoNeutroPeKA: numeroFases === 3 ? 20 : 10,
    iimpMinimoKA: exposicaoDescargaDireta ? 12.5 : null,
    secaoCondutorPeMm2: exposicaoDescargaDireta ? 16 : 4,
    comprimentoLigacoesM: 0.5,
  }
}

// §6.5.1.2.1 NOTA — partida direta de motor acima de 3,7 kW (5 cv) em instalação ligada à rede
// pública de BT: consultar a distribuidora. A ferramenta só sabe o tipo de carga e a potência, não
// o método de partida — então avisa para todo equipamento indutivo acima do limite.
export const POTENCIA_MOTOR_CONSULTA_DISTRIBUIDORA_W = 3700

export function verificacoesComplementares({ projeto, protecaoGeral, dimensionados, numeroFases, tensaoFaseNeutro }) {
  const idsBanheiro = new Set(projeto.comodos.filter((comodo) => comodo.tipo === 'banheiro').map((comodo) => comodo.id))
  const pesCircuitos = dimensionados.map((circuito) => circuito.secaoTerraMm2).filter(Boolean)
  const maiorPeMm2 = Math.max(protecaoGeral.secaoTerraMm2 ?? 0, ...pesCircuitos) || null

  // §6.4.4.1.2 b) massa × elemento condutivo: ≥ metade da condutância do PE da massa; c) nunca abaixo
  // de §6.4.3.1.4 (2,5 mm² com proteção mecânica, 4 mm² sem). No banheiro a massa de maior PE é,
  // na prática, a do chuveiro — usa o maior PE entre os circuitos de equipamento do banheiro.
  const peBanheiro = Math.max(
    0,
    ...dimensionados
      .filter((circuito) => circuito.tipo === 'tue' && idsBanheiro.has(circuito.comodoId))
      .map((circuito) => circuito.secaoTerraMm2 ?? 0),
  )
  const suplementar =
    idsBanheiro.size > 0
      ? {
          massaElementoMm2: peBanheiro ? Math.max(2.5, secaoNominalAcima(peBanheiro / 2)) : 2.5,
          semProtecaoMecanicaMm2: peBanheiro ? Math.max(4, secaoNominalAcima(peBanheiro / 2)) : 4,
        }
      : null

  const esquema = ESQUEMAS_ATERRAMENTO[projeto.esquemaAterramento] ? projeto.esquemaAterramento : null

  // §6.4.3.4.1 — PEN ≥ 10 mm² (cobre). No TN-C-S o trecho PEN é o alimentador até o quadro.
  const pen =
    esquema === 'TN-C-S' && protecaoGeral.secaoNeutroMm2
      ? { secaoMinimaMm2: 10, secaoMm2: protecaoGeral.secaoNeutroMm2, conforme: protecaoGeral.secaoNeutroMm2 >= 10 }
      : null

  // §6.4.1.2.1 — condutor de aterramento dimensionado como condutor de proteção (§6.4.3.1, aqui
  // a Tabela 58 pelo alimentador) e, enterrado, nunca abaixo da Tabela 52.
  const condicao = CONDICOES_ATERRAMENTO_ENTERRADO[projeto.condicaoAterramento] ?? null
  const condutorAterramento = protecaoGeral.secaoTerraMm2
    ? {
        condicao,
        secaoMm2: condicao ? Math.max(protecaoGeral.secaoTerraMm2, condicao.secaoMinimaMm2 ?? 0) : null,
        secaoPeAlimentadorMm2: protecaoGeral.secaoTerraMm2,
      }
    : null

  // O geral enfrenta qualquer tipo de falta: a maior das Icc informadas na origem.
  const iccOrigemA = Math.max(Number(projeto.iccPresumidaA) || 0, (Number(projeto.iccPresumidaA) > 0 && Number(projeto.iccFaseNeutroA)) || 0) || null
  const iccTerminais = dimensionados.map((circuito) => circuito.iccQuadroA).filter((icc) => icc > 0)

  const motores = projeto.comodos.flatMap((comodo) =>
    (comodo.tue ?? [])
      .filter(
        (equipamento) =>
          equipamento.tipoCarga === 'indutiva' && Number(equipamento.potenciaW) > POTENCIA_MOTOR_CONSULTA_DISTRIBUIDORA_W,
      )
      .map((equipamento) => ({ nome: equipamento.nome || 'Equipamento sem nome', comodo: comodo.nome, potenciaW: Number(equipamento.potenciaW) })),
  )

  // §9.5.2.2.1 b) — no mínimo 2 tomadas acima da bancada da pia (cozinhas e análogos).
  const bancadas = projeto.comodos
    .filter((comodo) => comodo.tipo === 'servico')
    .map((comodo) => {
      const informado = comodo.tomadasBancada !== undefined && comodo.tomadasBancada !== ''
      const quantidade = informado ? Number(comodo.tomadasBancada) : null
      return { comodoId: comodo.id, nome: comodo.nome, informado, quantidade, conforme: informado ? quantidade >= 2 : null }
    })

  return {
    esquemaAterramento: esquema,
    // §5.3.5.5.1 — capacidade de interrupção ≥ Icc presumida no ponto de instalação: na origem
    // para o disjuntor geral, no quadro para os dos circuitos terminais (a maior entre eles: o
    // bipolar de um circuito fase-fase vê o curto entre fases).
    capacidadeInterrupcao: iccOrigemA
      ? {
          geralKA: iccOrigemA / 1000,
          terminaisKA: iccTerminais.length ? Math.max(...iccTerminais) / 1000 : protecaoGeral.iccQuadroA ? protecaoGeral.iccQuadroA / 1000 : null,
        }
      : null,
    equipotencializacao: {
      maiorPeMm2,
      principalMm2: calcularEquipotencializacaoPrincipal(maiorPeMm2),
      suplementar,
    },
    reservaQuadro: { circuitos: dimensionados.length, reservaMinima: calcularReservaQuadro(dimensionados.length) },
    dps: especificarDPS({ tensaoFaseNeutro, numeroFases, exposicaoDescargaDireta: projeto.exposicaoDescargaDireta }),
    pen,
    condutorAterramento,
    motores,
    bancadas,
  }
}
