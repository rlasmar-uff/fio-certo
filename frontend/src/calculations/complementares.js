import { CONDICOES_ATERRAMENTO_ENTERRADO, ESQUEMAS_ATERRAMENTO, LINHAS_DISJUNTOR, SECOES_NOMINAIS_MM2 } from './constantes.js'

// Verificações da NBR 5410 que dependem do projeto já dimensionado mas não mudam nenhuma seção
// nem disjuntor: saem como requisito mínimo ("especifique ≥ X") ou como conferência.

// §5.3.4.1 b) — I2 ≤ 1,45·Iz. I2 (corrente convencional de atuação) não vem da NBR 5410: para
// disjuntor IEC 60898 / NBR NM 60898 é 1,45·In (fonte externa, norma de produto). Com isso a
// condição b) equivale a In ≤ Iz — a mesma da alínea a), agora explícita.
export const FATOR_I2_DISJUNTOR = 1.45

// I₂/I_n é característica do DISPOSITIVO, da sua norma de produto (S7 §2.1): 1,45 para disjuntor conforme a
// NBR NM 60898; para fusível gG (I₂ > 1,45·I_n) ou outro dispositivo, informa-se a relação do fabricante — sem
// ela a alínea b não pode ser verificada. `prolongada`: sobrecarga que possa durar mais de 100 h em 12 meses ou
// 500 h na vida do condutor → vale I₂ ≤ I_z no lugar de I₂ ≤ 1,45·I_z (5.3.4.1, nota).
export function verificarSobrecarga(correnteDisjuntorA, ampacidadeA, { relacaoI2In = FATOR_I2_DISJUNTOR, prolongada = false } = {}) {
  if (!correnteDisjuntorA || !ampacidadeA) return null
  if (!(Number(relacaoI2In) > 0)) return { i2A: null, limiteA: null, conforme: null, relacaoI2In: null, prolongada }
  const i2A = Number(relacaoI2In) * correnteDisjuntorA
  const limiteA = (prolongada ? 1 : 1.45) * ampacidadeA
  return { i2A, limiteA, conforme: i2A <= limiteA, relacaoI2In: Number(relacaoI2In), prolongada }
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
// Esquema de conexão dos DPS (figura 13, 6.3.5.2.6 b; S8 §5.3): 1 = cada fase ao BEP/barra PE (linha sem neutro
// ou neutro aterrado no BEP: TN-C e TN-C-S); 2 = cada fase e o neutro ao PE (TT, IT com neutro, ou linha que já
// entra em TN-S); 3 = cada fase ao neutro e o neutro ao PE (mesmos casos do 2; OBRIGATÓRIO no TT quando o DPS
// fica a montante do DR). Sem esquema de aterramento declarado, não há como escolher.
export function esquemaConexaoDPS({ esquemaAterramento, dpsMontanteDoDR = false }) {
  if (esquemaAterramento === 'TT') return dpsMontanteDoDR ? { esquema: 3, obrigatorio: true } : { esquema: 2, obrigatorio: false, alternativo: 3 }
  if (esquemaAterramento === 'TN-C-S') return { esquema: 1, obrigatorio: false }
  if (esquemaAterramento === 'TN-S') return { esquema: 2, obrigatorio: false, alternativo: 3 }
  return null
}

// §6.3.5.2.4 a) / Tabela 31 — Up compatível com a categoria II: 1,5 kV em 127/220 V e 2,5 kV em 220/380 V.
// b) / Tabela 49 — Uc ≥ 1,1·Uo entre fase e neutro/PE (fase-PEN no TN-C), ≥ Uo entre neutro e PE (TT e TN-S).
// d) — In ≥ 5 kA por modo (8/20 µs); Iimp ≥ 12,5 kA por modo contra descarga direta (sem cálculo pela IEC 61312-1);
// no esquema 3 (neutro-PE): In ≥ 10 kA (monofásica) ou 20 kA (trifásica) e, contra descarga direta, Iimp ≥ 25 kA
// (monofásica) ou 50 kA (trifásica). e) — suportabilidade ≥ Icc presumida e, entre neutro e PE, corrente
// subsequente ≥ 100 A em TN e TT. §6.3.5.2.9 — condutor DPS-PE ≥ 4 mm² (16 mm² contra descarga direta), ligações
// as mais curtas possíveis (total, de preferência, ≤ 0,5 m); o dispositivo contra sobrecorrente associado tem In
// ≤ ao indicado pelo fabricante do DPS e o estado do DPS deve ser indicado. DPS a jusante de um DR: o DR suporta
// surtos de pelo menos 3 kA (8/20 µs), como o tipo S (6.3.5.2.6 b).
export function especificarDPS({ tensaoFaseNeutro, numeroFases, exposicaoDescargaDireta, esquemaAterramento = '', dpsMontanteDoDR = false }) {
  const conexao = esquemaConexaoDPS({ esquemaAterramento, dpsMontanteDoDR })
  const esquema3 = conexao?.esquema === 3
  const modos = []
  if (conexao?.esquema === 1) modos.push('cada fase ao BEP/barra PE (PEN no TN-C)')
  else if (conexao?.esquema === 2) modos.push('cada fase ao PE', 'neutro ao PE')
  else if (conexao?.esquema === 3) modos.push('cada fase ao neutro', 'neutro ao PE')
  return {
    upMaximoKV: tensaoFaseNeutro <= 127 ? 1.5 : 2.5,
    ucMinimoFaseV: 1.1 * tensaoFaseNeutro,
    ucMinimoNeutroPeV: tensaoFaseNeutro,
    inMinimoKA: 5,
    inMinimoNeutroPeKA: numeroFases === 3 ? 20 : 10,
    iimpMinimoKA: exposicaoDescargaDireta ? 12.5 : null,
    iimpMinimoNeutroPeKA: exposicaoDescargaDireta ? (numeroFases === 3 ? 50 : 25) : null,
    correnteSubsequenteMinimaA: 100,
    secaoCondutorPeMm2: exposicaoDescargaDireta ? 16 : 4,
    comprimentoLigacoesM: 0.5,
    esquemaConexao: conexao,
    modos,
    esquema3,
    drDeveSuportar3kA: !dpsMontanteDoDR,
    localizacao:
      'No ponto de entrada da linha ou no quadro de distribuição principal, o mais próximo possível da entrada (6.3.5.2.1); em instalação existente de uso individual, junto à caixa de medição se ela estiver a até 10 m do ponto de entrada e sua barra PE for ligada ao BEP.',
    associado: 'O dispositivo contra sobrecorrente associado ao DPS tem corrente nominal ≤ à indicada pelo fabricante do DPS; o estado do DPS deve ser indicado (6.3.5.2.5, 6.3.5.2.8).',
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
    // §5.3.5.5.1 — Icn do dispositivo ≥ Icc presumida: a Icn vem da linha de disjuntores escolhida ou do valor
    // informado; sem Icc ou sem Icn, a comparação fica pendente (S7 §2).
    capacidadeInterrupcao: iccOrigemA
      ? (() => {
          const geralKA = iccOrigemA / 1000
          const terminaisKA = iccTerminais.length ? Math.max(...iccTerminais) / 1000 : protecaoGeral.iccQuadroA ? protecaoGeral.iccQuadroA / 1000 : null
          const icnInformado = Number(projeto.icnDisjuntorKA)
          const icnKA = LINHAS_DISJUNTOR[projeto.linhaDisjuntor]?.icnKA ?? (icnInformado > 0 ? icnInformado : null)
          return { geralKA, terminaisKA, icnKA, conforme: icnKA === null ? null : Math.max(geralKA, terminaisKA ?? 0) <= icnKA }
        })()
      : null,
    equipotencializacao: {
      maiorPeMm2,
      principalMm2: calcularEquipotencializacaoPrincipal(maiorPeMm2),
      suplementar,
    },
    reservaQuadro: { circuitos: dimensionados.length, reservaMinima: calcularReservaQuadro(dimensionados.length) },
    dps: especificarDPS({ tensaoFaseNeutro, numeroFases, exposicaoDescargaDireta: projeto.exposicaoDescargaDireta, esquemaAterramento: projeto.esquemaAterramento, dpsMontanteDoDR: projeto.dpsMontanteDoDR }),
    pen,
    condutorAterramento,
    motores,
    bancadas,
  }
}
