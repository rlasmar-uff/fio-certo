import { balancearFases, calcularCorrentesVetoriais, gerarCircuitos } from './circuitos.js'
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
import { verificacoesComplementares, verificarSobrecarga } from './complementares.js'
import { verificarExistente } from './existente.js'
import { ID_PERCURSO_ALIMENTADOR, verificarPercurso } from './percurso.js'
import { IDR_SENSIBILIDADE_ALTA_MA, LIMITE_QUEDA_TERMINAL_PERCENTUAL, LIMITE_QUEDA_TOTAL_PERCENTUAL } from './constantes.js'

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

  const circuitos = gerarCircuitos(projeto.comodos, configInstalacao, projeto.aplicarAlternativa600VA)
  const { cargaPorFase, circuitosComFase, explicacoes } = balancearFases(circuitos, numeroFases)
  // Cálculo vetorial completo (soma de P/Q por fase, ângulo de 120° entre fases) — substitui a
  // soma escalar de VA (`cargaPorFase`, mantida acima só pra explicar a decisão de balanceamento
  // na UI) como base da corrente que dimensiona o disjuntor geral/alimentador, e é a única forma
  // de calcular a corrente real do NEUTRO (nunca calculada antes). Ver circuitos.js.
  const { correntePorFaseA, correnteNeutroA } = calcularCorrentesVetoriais(circuitosComFase, numeroFases, tensaoFaseNeutro)

  const comprimentoRamalInformado = valorInformado(projeto.comprimentoRamalEntrada)
  const comprimentoRamalM = comprimentoRamalInformado ? Number(projeto.comprimentoRamalEntrada) || 0 : 0
  const iccAlimentadorA = valorInformado(projeto.iccPresumidaA) ? Number(projeto.iccPresumidaA) : null
  // Laços fase-neutro e fase-PE: a Icc fase-neutro, se informada junto com a trifásica; senão a
  // trifásica. O curto entre fases sempre parte da trifásica.
  const iccFaseNeutroA = iccAlimentadorA && valorInformado(projeto.iccFaseNeutroA) && Number(projeto.iccFaseNeutroA) > 0
    ? Number(projeto.iccFaseNeutroA)
    : iccAlimentadorA

  const protecaoGeralBase = dimensionarProtecaoGeral({
    correntePorFaseA,
    correnteNeutroA,
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
  const protecaoGeral = {
    ...protecaoGeralBase,
    eletroduto:
      secaoFaseAlimentador !== null && projeto.metodoInstalacaoAlimentador !== 'C'
        ? dimensionarEletroduto(
            [...Array(numeroFases).fill(secaoFaseAlimentador), protecaoGeralBase.secaoNeutroMm2, protecaoGeralBase.secaoTerraMm2],
            { isolacao: protecaoGeralBase.condutorFase.isolacao },
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
    Math.min(LIMITE_QUEDA_TERMINAL_PERCENTUAL, LIMITE_QUEDA_TOTAL_PERCENTUAL - quedaAlimentadorPercentual),
  )

  const dimensionadosBase = dimensionarCircuitos(circuitos, projeto.comprimentos, {
    temperaturaC: projeto.temperaturaAmbienteC,
    temperaturaSoloC: projeto.temperaturaSoloC,
    resistividadeTermicaSoloKmW: projeto.resistividadeTermicaSoloKmW,
    isolacao: projeto.isolacaoCondutor,
    numeroCircuitosAgrupados: valorInformado(projeto.numeroCircuitosAgrupadosManual)
      ? projeto.numeroCircuitosAgrupadosManual
      : undefined,
    limiteQuedaPercentual: limiteQuedaTerminalDisponivel,
    metodosPorId: projeto.metodosInstalacao,
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
  const iccQuadroFaseFaseA = propagarIccFaseFase({ tensaoFaseNeutroV: tensaoFaseNeutro, iccFonteA: iccAlimentadorA, trechos: [trechoAlimentador] })
  const dimensionados = dimensionadosBase.map((circuito) => {
    const terminal = { comprimentoM: circuito.comprimentoM, secaoMm2: circuito.secaoMm2, isolacao: circuito.isolacao, tensaoV: circuito.tensao }
    const iccPontaA = !comprimentoRamalInformado || !circuito.comprimentoInformado
      ? null
      : circuito.ehFaseFase
        ? propagarIccFaseFase({ tensaoFaseNeutroV: tensaoFaseNeutro, iccFonteA: iccAlimentadorA, trechos: [trechoAlimentador, terminal] })
        : propagarIccTerminal({ tensaoFaseNeutroV: tensaoFaseNeutro, iccFonteA: iccFaseNeutroA, alimentador: trechoAlimentador, terminal })

    const iccQuadroA = circuito.ehFaseFase && protecaoGeral.iccQuadroA !== null && iccQuadroFaseFaseA !== null
      ? Math.max(protecaoGeral.iccQuadroA, iccQuadroFaseFaseA)
      : protecaoGeral.iccQuadroA

    return {
      ...circuito,
      iccQuadroA,
      iccPontaA,
      sobrecarga: verificarSobrecarga(circuito.disjuntorA, circuito.ampacidadeA),
      eletroduto:
        circuito.secaoMm2 !== null && circuito.metodoInstalacao !== 'C'
          ? dimensionarEletroduto([circuito.secaoMm2, circuito.secaoMm2, circuito.secaoTerraMm2], { isolacao: circuito.isolacao })
          : null,
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
  const drs = dimensionarDRs({
    modoDR: projeto.modoDR,
    grupoDR: projeto.grupoDR,
    dimensionados,
    fasesPorCircuito,
    disjuntorGeralA: protecaoGeral.disjuntorGeralA,
    drMontante: projeto.drMontante,
  })
  protecaoGeral.drs = drs
  if (drs.modo === 'grupos') {
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
      ? verificarSeccionamentoTT({ resistenciaOhm: projeto.resistenciaAterramentoOhm, sensibilidadeDrMA: IDR_SENSIBILIDADE_ALTA_MA, ulV })
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
          sensibilidadeDrMA: IDR_SENSIBILIDADE_ALTA_MA,
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
      drs.modo === 'grupos' ? { sensibilidadeMA: IDR_SENSIBILIDADE_ALTA_MA } : protecaoGeral.idr,
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
  protecaoGeral.sobrecarga = verificarSobrecarga(protecaoGeral.condutorFase.disjuntorA, protecaoGeral.condutorFase.ampacidadeA)
  const complementares = verificacoesComplementares({ projeto, protecaoGeral, dimensionados, numeroFases, tensaoFaseNeutro })

  return {
    circuitos,
    circuitosComFase,
    explicacoesFase: explicacoes,
    cargaPorFase,
    protecaoGeral,
    dimensionados,
    limiteQuedaTerminalDisponivel,
    quedaAlimentadorPercentual,
    locaisEspeciais,
    demandaConcessionaria,
    complementares,
    seccionamento: { esquema: esquema || null, ulV, tt: seccionamentoTT, alimentador: seccionamentoAlimentador },
  }
}
