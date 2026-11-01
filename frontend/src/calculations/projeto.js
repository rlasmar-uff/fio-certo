import { balancearFases, calcularCorrentesVetoriais, gerarCircuitos, indicadorDesequilibrio } from './circuitos.js'
import { calcularDemandaProjeto } from './demanda.js'
import { resolverAgrupamentos, secoesDentroDeTresValores } from './agrupamento.js'
import { dimensionarPE } from './condutorProtecao.js'
import { exigenciaDR } from './exigenciaDR.js'
import { dimensionarCircuitos } from './condutores.js'
import { dimensionarProtecaoGeral } from './protecaoGeral.js'
import { dimensionarEletroduto } from './eletroduto.js'
import { avaliarPiscinaESauna, avaliarRequisitosBanheiro } from './locaisEspeciais.js'
import { calcularPrevisaoDeCarga } from './previsaoDeCarga.js'
import { calcularDemandaConcessionaria } from './distribuidoras.js'
import { impedanciaFalta, verificarCurtoCircuito, propagarIccFaseFase, propagarIccTerminal } from './curtoCircuito.js'
import {
  dimensionarDRs,
  tensaoContatoLimite,
  verificarSeccionamentoTN,
  verificarSeccionamentoTT,
} from './seccionamento.js'
import { correntesDaLinha } from './constantes.js'
import { calcularReservaQuadro, verificacoesComplementares, verificarSobrecarga } from './complementares.js'
import { verificarExistente } from './existente.js'
import { ID_PERCURSO_ALIMENTADOR, verificarPercurso } from './percurso.js'
import { IDR_SENSIBILIDADE_ALTA_MA, LIMITE_QUEDA_TERMINAL_PERCENTUAL, limiteQuedaTotal } from './constantes.js'
import { calcularQuedaPercentual } from './quedaDeTensao.js'

// Impedância informada (r e x em Ω/km): só vale com os dois campos numéricos preenchidos.
function impedanciaValida(imp) {
  return imp && imp.rOhmKm !== '' && imp.xOhmKm !== '' && Number.isFinite(Number(imp.rOhmKm)) && Number.isFinite(Number(imp.xOhmKm)) ? imp : null
}

function valorInformado(valor) {
  return valor !== undefined && valor !== null && valor !== ''
}

// Ponto único de cálculo do projeto inteiro, na ordem que a norma exige: primeiro o alimentador
// (§6.2.7.1 c — ele consome parte do orçamento de queda de 5% a partir do ponto de entrega),
// depois os circuitos terminais, com o que sobrou desse orçamento (nunca mais que os 4% do
// §6.2.7.2). Usado pelas 4 páginas que precisam do dimensionamento completo (Condutores,
// QuedaDeTensao, ProtecaoGeral, Resultado) em vez de cada uma recalcular por conta própria —
// evita o alimentador e os circuitos terminais divergirem sobre o orçamento de queda disponível.
export function calcularProjetoCompleto(projeto, configInstalacao) {
  const { numeroFases, tensaoFaseNeutro } = configInstalacao
  // Corrente nominal disponível na linha de disjuntores escolhida (S7 §3), por número de polos.
  const correntesDisjuntor = (polos) => correntesDaLinha(projeto.linhaDisjuntor, polos)

  const circuitos = gerarCircuitos(projeto.comodos, configInstalacao, projeto.aplicarAlternativa600VA, {
    correnteMaximaA: projeto.correnteMaximaCircuitoA,
    circuitoMisto: projeto.circuitoMisto,
  })
  const { cargaPorFase, circuitosComFase, explicacoes } = balancearFases(circuitos, numeroFases, projeto.fasesManuais)
  // S3 §10 — "antes e depois": a distribuição automática × a adotada (com os ajustes do projetista), cada
  // uma com as correntes de fase por soma fasorial e o indicador de dispersão δ; e um cenário sem os
  // equipamentos de uso específico (simultaneidade parcial), só para comparar.
  const correntesDe = (lista) => calcularCorrentesVetoriais(lista, numeroFases, tensaoFaseNeutro).correntePorFaseA
  const automatico = balancearFases(circuitos, numeroFases, {}).circuitosComFase
  const semTue = (lista) => lista.filter((circuito) => circuito.tipo !== 'tue')
  const balanceamento = {
    ajusteManual: Object.keys(projeto.fasesManuais ?? {}).some((id) => circuitosComFase.find((c) => c.id === id)?.decisaoFase?.manual),
    automatico: { correntesA: correntesDe(automatico), ...indicadorDesequilibrio(correntesDe(automatico)) },
    adotado: { correntesA: correntesDe(circuitosComFase), ...indicadorDesequilibrio(correntesDe(circuitosComFase)) },
    semEquipamentos: { correntesA: correntesDe(semTue(circuitosComFase)), ...indicadorDesequilibrio(correntesDe(semTue(circuitosComFase))) },
  }
  const demanda = calcularDemandaProjeto({
    totais: calcularPrevisaoDeCarga(projeto.comodos, projeto.aplicarAlternativa600VA).totais,
    perfil: projeto.perfilDemanda,
    identificacao: { distribuidoraId: projeto.distribuidoraId, documento: projeto.demandaDocumento, revisao: projeto.demandaRevisao, grupo: projeto.demandaGrupo },
  })
  // Cálculo vetorial completo (soma de P/Q por fase, ângulo de 120° entre fases) — substitui a
  // soma escalar de VA (`cargaPorFase`, mantida acima só pra explicar a decisão de balanceamento
  // na UI) como base da corrente que dimensiona o disjuntor geral/alimentador, e é a única forma
  // de calcular a corrente real do NEUTRO (nunca calculada antes). Ver circuitos.js.
  // Tabela 59, NOTA: "a capacidade de reserva deve ser considerada no cálculo do alimentador do
  // respectivo quadro de distribuição". A norma não diz com quantos VA — quem declara é o projetista
  // (`potenciaReservaPorCircuitoVA`). Declarada, cada circuito de reserva entra como carga
  // resistiva na fase menos carregada; não declarada, o alimentador NÃO inclui reserva e isso vira
  // pendência do veredito (nunca "conforme" por omissão).
  const reservaCircuitos = calcularReservaQuadro(circuitosComFase.length)
  const reservaPorCircuitoVA = Number(projeto.potenciaReservaPorCircuitoVA) > 0 ? Number(projeto.potenciaReservaPorCircuitoVA) : null
  const circuitosDeReserva = []
  if (reservaPorCircuitoVA) {
    const cargaFaseComReserva = [...cargaPorFase]
    for (let i = 0; i < reservaCircuitos; i += 1) {
      const fase = cargaFaseComReserva.indexOf(Math.min(...cargaFaseComReserva))
      cargaFaseComReserva[fase] += reservaPorCircuitoVA
      circuitosDeReserva.push({ potenciaVA: reservaPorCircuitoVA, cosPhi: 1, tipoCarga: 'resistiva', fases: [fase + 1] })
    }
  }
  const { correntePorFaseA, correnteNeutroA, fasoresFaseA } = calcularCorrentesVetoriais(
    [...circuitosComFase, ...circuitosDeReserva],
    numeroFases,
    tensaoFaseNeutro,
  )

  const comprimentoRamalInformado = valorInformado(projeto.comprimentoRamalEntrada)
  const comprimentoRamalM = comprimentoRamalInformado ? Number(projeto.comprimentoRamalEntrada) || 0 : 0
  const iccAlimentadorA = valorInformado(projeto.iccPresumidaA) ? Number(projeto.iccPresumidaA) : null
  // Laços fase-neutro e fase-PE: a Icc fase-neutro, se informada junto com a trifásica; senão a
  // trifásica. O curto entre fases sempre parte da trifásica.
  const iccFaseNeutroA = iccAlimentadorA && valorInformado(projeto.iccFaseNeutroA) && Number(projeto.iccFaseNeutroA) > 0
    ? Number(projeto.iccFaseNeutroA)
    : iccAlimentadorA

  // Limite total de queda conforme a situação de alimentação (§6.2.7.1 a-d) e, nos casos de 7%, o
  // acréscimo da nota 3 por linha principal acima de 100 m (a linha principal é o ramal de entrada).
  const limiteQuedaTotalPercentual = limiteQuedaTotal(projeto.fornecimento, comprimentoRamalM)
  const impedanciaAlimentador = impedanciaValida(projeto.impedanciaAlimentador)

  const protecaoGeralBase = dimensionarProtecaoGeral({
    convencao: projeto.convencaoResistividade,
    impedanciaAlimentador,
    limiteQuedaTotalPercentual,
    correntesDisjuntor,
    correntePorFaseA,
    correnteNeutroA,
    fasoresFaseA,
    numeroFases,
    tensaoFaseNeutro,
    comprimentoRamalM,
    comprimentoInformado: comprimentoRamalInformado,
    temperaturaC: projeto.temperaturaAmbienteC,
    temperaturaSoloC: projeto.temperaturaSoloC,
    resistividadeTermicaSoloKmW: projeto.resistividadeTermicaSoloKmW,
    metodoInstalacao: projeto.metodoInstalacaoAlimentador,
    isolacao: projeto.isolacaoAlimentador,
    neutroReduzidoDeclarado: projeto.neutroReduzidoDeclarado,
    neutroEquilibrado: Boolean(projeto.neutroEquilibrado),
    neutroProtegido: Boolean(projeto.neutroProtegido),
    h3Percentual: projeto.h3Percentual,
    classeAQ: projeto.classeAQ,
    terceiraHarmonica: projeto.terceiraHarmonica,
    iccPresumidaA: iccAlimentadorA,
    iccFaseNeutroA,
    curvaDisjuntor: projeto.curvaDisjuntorGeral,
    alimentacaoAerea: projeto.alimentacaoAerea,
    regiaoAltoIndiceDescargas: projeto.regiaoAltoIndiceDescargas,
    exposicaoDescargaDireta: projeto.exposicaoDescargaDireta,
  })

  // Eletroduto do alimentador (§6.2.11.1.6): fases + neutro (a seção real, já reduzida se
  // aplicável — Tabela 48) + terra/PE, todos os condutores físicos do trecho, não só os
  // carregados. Independente do FCA (Tabela 42) usado na ampacidade — ver `eletroduto.js`.
  // Método C (cabo direto na parede, sem eletroduto) não tem o que dimensionar aqui.
  const secaoFaseAlimentador = protecaoGeralBase.condutorFase.secaoMm2
  // PE (§6.4.3.1): Tabela 58 e, com a corrente de falta e o tempo informados, o cálculo — vale o maior; piso de
  // 6.4.3.1.4 para PE fora do cabo (compilado, S7 §4).
  const opcoesPE = {
    iFaltaA: Number(projeto.peFaltaA) > 0 ? Number(projeto.peFaltaA) : null,
    tempoS: Number(projeto.peTempoS) > 0 ? Number(projeto.peTempoS) : null,
    foraDoCabo: Boolean(projeto.peForaDoCabo),
    protecaoMecanica: projeto.peProtecaoMecanica !== false,
  }
  const peAlimentador = dimensionarPE({ secaoFaseMm2: secaoFaseAlimentador, isolacao: protecaoGeralBase.condutorFase.isolacao, ...opcoesPE })
  const opcoesEletroduto = { catalogo: projeto.catalogoEletroduto, areasCabo: projeto.areasCabo }
  const protecaoGeral = {
    ...protecaoGeralBase,
    secaoTerraMm2: peAlimentador.secaoMm2 ?? protecaoGeralBase.secaoTerraMm2,
    peDetalhe: peAlimentador,
    eletroduto:
      secaoFaseAlimentador !== null && projeto.metodoInstalacaoAlimentador !== 'C'
        ? dimensionarEletroduto(
            [...Array(numeroFases).fill(secaoFaseAlimentador), protecaoGeralBase.secaoNeutroMm2, peAlimentador.secaoMm2 ?? protecaoGeralBase.secaoTerraMm2],
            { isolacao: protecaoGeralBase.condutorFase.isolacao, ...opcoesEletroduto },
          )
        : null,
  }

  // Orçamento remanescente de queda para os circuitos terminais: o menor entre o teto que o
  // trecho terminal nunca pode ultrapassar sozinho (4%, §6.2.7.2) e o que sobrou do total de 5%
  // a partir do ponto de entrega (§6.2.7.1 c) depois do que o alimentador já consumiu. Se o
  // alimentador ainda não tem comprimento informado, sua queda é 0 e o terminal recebe o teto
  // cheio de 4% — mas o resultado do alimentador fica marcado como `naoVerificado`, então o
  // total também não pode ser lido como "conforme".
  const quedaAlimentadorPercentual = protecaoGeral.condutorFase.quedaPercentual ?? 0
  const limiteQuedaTerminalDisponivel = Math.max(
    0,
    Math.min(LIMITE_QUEDA_TERMINAL_PERCENTUAL, limiteQuedaTotalPercentual - quedaAlimentadorPercentual),
  )

  const metodoPorId = Object.fromEntries(circuitos.map((c) => [c.id, projeto.metodosInstalacao?.[c.id] || 'B1']))
  const opcoesDimensionamento = {
    temperaturaC: projeto.temperaturaAmbienteC,
    temperaturaSoloC: projeto.temperaturaSoloC,
    resistividadeTermicaSoloKmW: projeto.resistividadeTermicaSoloKmW,
    isolacao: projeto.isolacaoCondutor,
    numeroCircuitosAgrupados: valorInformado(projeto.numeroCircuitosAgrupadosManual)
      ? projeto.numeroCircuitosAgrupadosManual
      : undefined,
    limiteQuedaPercentual: limiteQuedaTerminalDisponivel,
    metodosPorId: projeto.metodosInstalacao,
    convencao: projeto.convencaoResistividade,
    impedanciasPorId: projeto.impedancias,
    pontosCargaPorId: projeto.pontosCarga,
    secoesRetornoPorId: projeto.secoesRetorno,
    correntesDisjuntor,
  }
  // K2 por grupo de agrupamento (S5 §3–5): 1ª passada com os grupos tomados como semelhantes; com as seções
  // obtidas confere-se a regra de "três valores normalizados sucessivos" (6.2.5.5.5 / 6.2.10.2) e, se o grupo
  // não for semelhante, refaz-se com F = 1/√n.
  const grupos1 = resolverAgrupamentos(projeto.agrupamentos, circuitos, metodoPorId)
  let dimensionadosBase = dimensionarCircuitos(circuitos, projeto.comprimentos, { ...opcoesDimensionamento, fatorAgrupamentoPorId: grupos1.fatores })
  const secoesPorId = Object.fromEntries(dimensionadosBase.map((c) => [c.id, c.secaoMm2]))
  let gruposResolvidos = resolverAgrupamentos(projeto.agrupamentos, circuitos, metodoPorId, secoesPorId)
  if (JSON.stringify(gruposResolvidos.fatores) !== JSON.stringify(grupos1.fatores)) {
    dimensionadosBase = dimensionarCircuitos(circuitos, projeto.comprimentos, { ...opcoesDimensionamento, fatorAgrupamentoPorId: gruposResolvidos.fatores })
    gruposResolvidos = resolverAgrupamentos(projeto.agrupamentos, circuitos, metodoPorId, Object.fromEntries(dimensionadosBase.map((c) => [c.id, c.secaoMm2])))
  }
  // Circuito excluído do agrupamento (6.2.5.5.2): corrente de projeto ≤ 30% da capacidade já corrigida pelo
  // agrupamento incorrido — nunca da capacidade sem correção.
  for (const grupo of gruposResolvidos.resultados) {
    for (const id of grupo.excluidos) {
      const c = dimensionadosBase.find((d) => d.id === id)
      if (c?.ampacidadeA && !(c.correnteProjetoA <= 0.3 * c.ampacidadeA)) {
        grupo.problemas.push(`${c.nome}: corrente de projeto (${c.correnteProjetoA.toFixed(1)} A) acima de 30% da capacidade corrigida (${(0.3 * c.ampacidadeA).toFixed(1)} A) — não pode ser excluído do agrupamento`)
      }
    }
  }
  // PE de cada circuito (Tabela 58 e/ou cálculo, S7 §4).
  dimensionadosBase = dimensionadosBase.map((c) => {
    if (!c.secaoMm2) return c
    const pe = dimensionarPE({ secaoFaseMm2: c.secaoMm2, isolacao: c.isolacao, ...opcoesPE })
    return { ...c, secaoTerraMm2: pe.secaoMm2 ?? c.secaoTerraMm2, peDetalhe: pe }
  })

  // Eletroduto de cada circuito terminal (§6.2.11.1.6): 2 condutores na seção de fase
  // (fase+neutro, ou as duas fases de um circuito fase-fase) + 1 na seção de terra/PE. Método C
  // (cabo direto na parede, sem eletroduto) não tem o que dimensionar aqui.
  //
  // Curto-circuito por circuito terminal (§6.2.6.1.2 c / §5.3.5.1): a norma permite determinar a
  // Icc presumida num ponto "por cálculo", então propaga-se a Icc já declarada no alimentador por
  // uma cadeia de impedância (alimentador + o próprio circuito), em vez de exigir uma nova
  // declaração do usuário por circuito — ver `propagarIccTerminal` (curtoCircuito.js). O circuito
  // fase-fase usa o laço entre duas fases (`propagarIccFaseFase`). Reaproveita a mesma curva de
  // disjuntor declarada para o geral (`projeto.curvaDisjuntorGeral`) — a ferramenta não coleta
  // uma curva por circuito terminal.
  //
  // §6.3.4.3.2: a energia (b) é verificada com a Icc MÁXIMA no ponto de instalação do disjuntor —
  // o quadro, `protecaoGeral.iccQuadroA` —, e Ia ≤ Ikmin (a) com a Icc no ponto mais distante do
  // circuito, que só existe com os dois comprimentos (ramal e circuito) informados. No fase-fase,
  // a máxima é a maior entre o curto entre fases e o fase-neutro (a falta fase-massa volta pelo
  // PE, de seção ≤ à da fase, e fica abaixo desta), e a mínima é a do curto entre fases na ponta.
  const trechoAlimentador = {
    comprimentoM: comprimentoRamalM,
    secaoMm2: protecaoGeral.condutorFase.secaoMm2,
    isolacao: protecaoGeral.condutorFase.isolacao,
  }
  // Laço fase-neutro: o retorno pelo neutro REAL do alimentador (pode ser reduzido — Tabela 48), e
  // não pela seção de fase. O curto entre fases (`trechoAlimentador`) não passa pelo neutro.
  const trechoAlimentadorFaseNeutro = { ...trechoAlimentador, secaoVoltaMm2: protecaoGeral.secaoNeutroMm2 }
  // I₂/I_n é atributo do tipo de dispositivo (S7 §2.1): 1,45 para NBR NM 60898; outro tipo exige a relação do
  // fabricante. Sobrecarga prolongada troca a alínea b por I₂ ≤ I_z.
  const opcoesSobrecarga = {
    relacaoI2In: projeto.tipoDispositivo === 'outro' ? Number(projeto.relacaoI2InOutro) || null : 1.45,
    prolongada: Boolean(projeto.sobrecargaProlongada),
  }
  // Partida de motor (6.5.1.3.3, S6 §2.3): com a corrente de partida informada, a queda nos terminais do
  // dispositivo de partida (alimentador + circuito) não passa de 10%; sem ela, pendente — nunca com a corrente
  // de regime.
  const verificarPartida = (circuito) => {
    const equipamento = circuito.equipamentoId && !circuito.equipamentoIds
      ? projeto.comodos.find((comodo) => comodo.id === circuito.comodoId)?.tue?.find((e) => e.id === circuito.equipamentoId)
      : null
    if (!equipamento?.motor) return null
    const correnteA = Number(equipamento.correntePartidaA)
    if (!(correnteA > 0) || !circuito.secaoMm2 || !circuito.comprimentoInformado) return { informada: false, conforme: null }
    const cosPhi = Number(equipamento.cosPhiPartida) > 0 && Number(equipamento.cosPhiPartida) <= 1 ? Number(equipamento.cosPhiPartida) : (Number(equipamento.cosPhi) || 1)
    const quedaCircuito = calcularQuedaPercentual({
      comprimentoM: circuito.comprimentoM, correnteA, secaoMm2: circuito.secaoMm2, tensaoV: circuito.tensao, cosPhi, tipoCarga: 'indutiva',
      isolacao: circuito.isolacao, convencao: projeto.convencaoResistividade,
    })
    const quedaTotal = quedaAlimentadorPercentual + quedaCircuito
    return { informada: true, correnteA, quedaCircuitoPercentual: quedaCircuito, quedaTotalPercentual: quedaTotal, limitePercentual: 10, conforme: quedaTotal <= 10 }
  }
  const iccQuadroFaseFaseA = propagarIccFaseFase({ tensaoFaseNeutroV: tensaoFaseNeutro, iccFonteA: iccAlimentadorA, trechos: [trechoAlimentador] })
  const dimensionados = dimensionadosBase.map((circuito) => {
    const terminal = { comprimentoM: circuito.comprimentoM, secaoMm2: circuito.secaoMm2, isolacao: circuito.isolacao, tensaoV: circuito.tensao }
    const iccPontaA = !comprimentoRamalInformado || !circuito.comprimentoInformado
      ? null
      : circuito.ehFaseFase
        ? propagarIccFaseFase({ tensaoFaseNeutroV: tensaoFaseNeutro, iccFonteA: iccAlimentadorA, trechos: [trechoAlimentador, terminal] })
        : propagarIccTerminal({ tensaoFaseNeutroV: tensaoFaseNeutro, iccFonteA: iccFaseNeutroA, alimentador: trechoAlimentadorFaseNeutro, terminal })

    const iccQuadroA = circuito.ehFaseFase && protecaoGeral.iccQuadroA !== null && iccQuadroFaseFaseA !== null
      ? Math.max(protecaoGeral.iccQuadroA, iccQuadroFaseFaseA)
      : protecaoGeral.iccQuadroA

    return {
      ...circuito,
      iccQuadroA,
      iccPontaA,
      sobrecarga: verificarSobrecarga(circuito.disjuntorA, circuito.ampacidadeA, opcoesSobrecarga),
      eletroduto:
        circuito.secaoMm2 !== null && circuito.metodoInstalacao !== 'C'
          ? dimensionarEletroduto([circuito.secaoMm2, circuito.secaoMm2, circuito.secaoTerraMm2], { isolacao: circuito.isolacao, ...opcoesEletroduto })
          : null,
      partida: verificarPartida(circuito),
      curtoCircuito: verificarCurtoCircuito({
        correnteDisjuntorA: circuito.disjuntorA,
        curvaDisjuntor: projeto.curvaDisjuntorGeral,
        iccPresumidaA: iccQuadroA,
        iccMinimaA: iccPontaA,
        secaoMm2: circuito.secaoMm2,
        isolacao: circuito.isolacao,
      }),
    }
  })

  // §6.3.3.2.6 / §5.1.3.2.2 NOTA 5 — um DR de 30 mA geral (padrão) ou um por grupo de circuitos,
  // com DR tipo S opcional a montante. No modo por grupos, o "IDR geral" passa a ser esse DR de
  // montante (ou nenhum); todo circuito continua sob um DR de 30 mA.
  const fasesPorCircuito = Object.fromEntries(circuitosComFase.map((circuito) => [circuito.id, circuito.fases]))
  const exigencias = Object.fromEntries(dimensionados.map((c) => [c.id, exigenciaDR(c, projeto.comodos)]))
  const exigidosIds = new Set(Object.entries(exigencias).filter(([, e]) => e.exige).map(([id]) => id))
  const drs = dimensionarDRs({
    modoDR: projeto.modoDR,
    grupoDR: projeto.grupoDR,
    dimensionados,
    fasesPorCircuito,
    disjuntorGeralA: protecaoGeral.disjuntorGeralA,
    drMontante: projeto.drMontante,
    exigidosIds,
  })
  dimensionados.forEach((c) => {
    c.exigenciaDR = exigencias[c.id]
    c.sobDR = drs.modo !== 'exigidos' || exigidosIds.has(c.id)
  })
  protecaoGeral.drs = drs
  if (drs.modo !== 'geral') {
    protecaoGeral.idr = drs.montante && protecaoGeral.idr
      ? { ...protecaoGeral.idr, sensibilidadeMA: drs.montante.sensibilidadeMA, tipoS: true }
      : null
  }

  // §5.1.2.2.4 — seccionamento automático, conforme o esquema de aterramento declarado.
  const esquema = projeto.esquemaAterramento
  const ehTN = esquema === 'TN-S' || esquema === 'TN-C-S'
  const trechoAlimentadorFalta = {
    comprimentoM: comprimentoRamalM,
    secaoMm2: protecaoGeral.condutorFase.secaoMm2,
    // No TN-C-S a volta da falta até o quadro é o PEN (o neutro do alimentador); no TN-S, o PE.
    secaoVoltaMm2: esquema === 'TN-C-S' ? protecaoGeral.secaoNeutroMm2 : protecaoGeral.secaoTerraMm2,
    isolacao: protecaoGeral.condutorFase.isolacao,
  }
  const ulV = tensaoContatoLimite(projeto.comodos.some((comodo) => comodo.tipo === 'banheiro'))
  const seccionamentoTT =
    esquema === 'TT'
      ? verificarSeccionamentoTT({ resistenciaOhm: projeto.resistenciaAterramentoOhm, sensibilidadeDrMA: drs.montante?.sensibilidadeMA ?? IDR_SENSIBILIDADE_ALTA_MA, ulV })
      : null
  const seccionamentoAlimentador = ehTN
    ? verificarSeccionamentoTN({
        zsOhm: comprimentoRamalInformado
          ? impedanciaFalta({ tensaoFaseNeutroV: tensaoFaseNeutro, iccFonteA: iccFaseNeutroA, trechos: [trechoAlimentadorFalta] })
          : null,
        tensaoFaseNeutroV: tensaoFaseNeutro,
        correnteDisjuntorA: protecaoGeral.disjuntorGeralA,
        curvaDisjuntor: projeto.curvaDisjuntorGeral,
        sensibilidadeDrMA: null, // o alimentador fica a montante dos DRs
      })
    : null
  for (const circuito of dimensionados) {
    const seccionamento = ehTN
      ? verificarSeccionamentoTN({
          zsOhm:
            comprimentoRamalInformado && circuito.comprimentoInformado
              ? impedanciaFalta({
                  tensaoFaseNeutroV: tensaoFaseNeutro,
                  iccFonteA: iccFaseNeutroA,
                  trechos: [
                    trechoAlimentadorFalta,
                    {
                      comprimentoM: circuito.comprimentoM,
                      secaoMm2: circuito.secaoMm2,
                      secaoVoltaMm2: circuito.secaoTerraMm2,
                      isolacao: circuito.isolacao,
                    },
                  ],
                })
              : null,
          tensaoFaseNeutroV: tensaoFaseNeutro,
          correnteDisjuntorA: circuito.disjuntorA,
          curvaDisjuntor: projeto.curvaDisjuntorGeral,
          sensibilidadeDrMA: circuito.sobDR ? IDR_SENSIBILIDADE_ALTA_MA : null,
        })
      : seccionamentoTT
    circuito.seccionamento = seccionamento
    circuito.seccionamentoAutomaticoVerificado = Boolean(seccionamento?.verificado)
    // Os campos do motor isolado (`dimensionarCircuitos`, que não conhece Icc nem esquema) passam a
    // refletir as verificações feitas aqui; o aviso só fica enquanto alguma delas faltar.
    circuito.curtoCircuitoVerificado = Boolean(circuito.curtoCircuito.verificado)
    if (circuito.curtoCircuitoVerificado && circuito.seccionamentoAutomaticoVerificado) circuito.avisoCurtoCircuito = null
    circuito.fases = fasesPorCircuito[circuito.id] ?? []
    // F8 — seção e disjuntor já instalados, quando o usuário informa (instalação existente).
    circuito.existente = verificarExistente(circuito, projeto.existentes?.[circuito.id], {
      curvaDisjuntor: projeto.curvaDisjuntorGeral,
      // Mesmo cálculo do seccionamento acima, com o que está instalado; o TT não depende da seção.
      seccionar: ehTN
        ? ({ secaoMm2, peMm2, disjuntorA }) =>
            verificarSeccionamentoTN({
              zsOhm:
                peMm2 && comprimentoRamalInformado && circuito.comprimentoInformado
                  ? impedanciaFalta({
                      tensaoFaseNeutroV: tensaoFaseNeutro,
                      iccFonteA: iccFaseNeutroA,
                      trechos: [
                        trechoAlimentadorFalta,
                        { comprimentoM: circuito.comprimentoM, secaoMm2, secaoVoltaMm2: peMm2, isolacao: circuito.isolacao },
                      ],
                    })
                  : null,
              tensaoFaseNeutroV: tensaoFaseNeutro,
              correnteDisjuntorA: disjuntorA,
              curvaDisjuntor: projeto.curvaDisjuntorGeral,
              sensibilidadeDrMA: IDR_SENSIBILIDADE_ALTA_MA,
            })
        : seccionamentoTT
          ? () => seccionamentoTT
          : undefined,
    })
    // N17 — trechos entre caixas, quando o usuário cadastra o percurso.
    circuito.percurso = verificarPercurso(projeto.percursos?.[circuito.id], circuito.eletroduto)
  }

  // §9.1 — locais contendo banheira ou chuveiro: reaproveita o DR que protege os circuitos (o geral,
  // ou o de 30 mA do grupo), só declara equipotencialização suplementar e o checklist de volumes.
  const previsaoDeCarga = calcularPrevisaoDeCarga(projeto.comodos, projeto.aplicarAlternativa600VA)
  const locaisEspeciais = {
    ...avaliarRequisitosBanheiro(
      projeto.comodos,
      drs.modo !== 'geral' ? { sensibilidadeMA: IDR_SENSIBILIDADE_ALTA_MA } : protecaoGeral.idr,
    ),
    ...avaliarPiscinaESauna(projeto.comodos, previsaoDeCarga.porComodo),
  }
  // N18 — demanda de iluminação/tomadas pela norma da distribuidora escolhida (opcional,
  // informativa): ver distribuidoras.js. Nunca substitui o dimensionamento por NBR 5410 acima.
  const demandaConcessionaria = calcularDemandaConcessionaria(
    projeto.distribuidoraId,
    previsaoDeCarga.totais.iluminacaoVA + previsaoDeCarga.totais.tugVA,
  )
  // N17 — o ramal de entrada (medidor → quadro) também tem trechos entre caixas.
  protecaoGeral.percurso = verificarPercurso(projeto.percursos?.[ID_PERCURSO_ALIMENTADOR], protecaoGeral.eletroduto)
  protecaoGeral.sobrecarga = verificarSobrecarga(protecaoGeral.condutorFase.disjuntorA, protecaoGeral.condutorFase.ampacidadeA, opcoesSobrecarga)
  const complementares = verificacoesComplementares({ projeto, protecaoGeral, dimensionados, numeroFases, tensaoFaseNeutro })

  // Eletroduto compartilhado por vários circuitos (S8 §2, §6.6): soma TODOS os condutores dos circuitos do grupo,
  // fases, neutro e PE, e só admite seções em até três valores normalizados sucessivos (6.2.10.2).
  const agrupamentos = gruposResolvidos.resultados.map((grupo) => {
    if (!grupo.eletroduto) return grupo
    const membros = grupo.circuitoIds.map((id) => dimensionados.find((c) => c.id === id)).filter((c) => c?.secaoMm2)
    const eletroduto = membros.length
      ? dimensionarEletroduto(membros.flatMap((c) => [c.secaoMm2, c.secaoMm2, c.secaoTerraMm2]), { isolacao: projeto.isolacaoCondutor, ...opcoesEletroduto })
      : null
    const problemas = [...grupo.problemas]
    if (!secoesDentroDeTresValores(membros.map((c) => c.secaoMm2))) problemas.push('Eletroduto com seções de fase fora de três valores normalizados sucessivos: a norma veda a mistura (6.2.10.2)')
    membros.forEach((c) => { c.eletroduto = eletroduto; c.eletrodutoCompartilhado = grupo.id })
    return { ...grupo, eletrodutoCalculo: eletroduto, problemas }
  })

  // S4 §5.1 / S5 §7.1: "atende ao critério térmico e à seção mínima" NÃO equivale a "dimensionamento completo".
  // O completo exige também queda, sobrecarga, curto-circuito e seccionamento verificados e atendidos.
  for (const c of dimensionados) {
    c.atendeCriterioTermico = c.secaoMm2 !== null && c.sobrecarga?.conforme !== false
    const itens = [c.comprimentoInformado ? true : null, c.sobrecarga?.conforme ?? null, c.curtoCircuito?.verificado ? c.curtoCircuito.conforme : null, c.seccionamento?.verificado ? c.seccionamento.conforme : null]
    c.dimensionamentoCompleto = !c.atendeCriterioTermico || itens.includes(false) ? false : itens.every((i) => i === true) ? true : null
  }

  return {
    circuitos,
    circuitosComFase,
    explicacoesFase: explicacoes,
    cargaPorFase,
    protecaoGeral,
    balanceamento,
    agrupamentos,
    demandaPerfil: demanda,
    reservaAlimentador: { circuitos: reservaCircuitos, potenciaPorCircuitoVA: reservaPorCircuitoVA, considerada: Boolean(reservaPorCircuitoVA) },
    dimensionados,
    limiteQuedaTerminalDisponivel,
    quedaAlimentadorPercentual,
    limiteQuedaTotalPercentual,
    locaisEspeciais,
    demandaConcessionaria,
    complementares,
    seccionamento: { esquema: esquema || null, ulV, tt: seccionamentoTT, alimentador: seccionamentoAlimentador },
  }
}
