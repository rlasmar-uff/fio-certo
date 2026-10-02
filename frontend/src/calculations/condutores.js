import {
  DISJUNTORES_PADRONIZADOS,
  ESQUEMA_CONDUTORES_PADRAO,
  FATOR_NEUTRO_CARREGADO,
  ISOLACAO_PADRAO,
  LIMITE_QUEDA_TERMINAL_PERCENTUAL,
  METODO_INSTALACAO_PADRAO,
  METODOS_INSTALACAO,
  SECAO_MINIMA_MM2,
  SECOES_NOMINAIS_MM2,
  TABELA_46_CONDUTORES_CARREGADOS,
  calcularSecaoTerra,
  esquemaDoCircuito,
  obterAmpacidade,
  obterFatorAgrupamento,
  obterFatorResistividadeSolo,
  obterFatorTemperatura,
} from './constantes.js'
import { calcularQuedaPercentual } from './quedaDeTensao.js'

// §6.2.6.1.2 c) (§5.3.5.1) — proteção contra curto-circuito nos circuitos terminais PODE ser
// verificada (ver `projeto.js`, `propagarIccTerminal` em `curtoCircuito.js`), por propagação de
// impedância a partir da Icc já declarada no alimentador — mas só quando esse dado opcional é
// informado, e só para circuitos fase-neutro. Esta função (`dimensionarCircuito`), sozinha, não
// tem acesso ao alimentador nem à Icc do projeto, então o default aqui é sempre "não verificado" —
// quem enriquece com o valor real é `projeto.js`. §6.2.6.1.2 d) (§5.1.2.2.4, seccionamento
// automático da alimentação) continua fora do escopo desta ferramenta, em qualquer ponto — nunca
// ganhou o mesmo tratamento opcional do curto-circuito.
export const AVISO_CURTO_CIRCUITO =
  'Seccionamento automático da alimentação (§6.2.6.1.2 d) não é verificado em nenhum ponto desta ' +
  'ferramenta — depende de dados de esquema de aterramento e impedância de falta fora do escopo ' +
  'atual. Consulte um profissional habilitado.'

// Corrente de projeto (Ib). circuito.potenciaVA já é potência APARENTE (VA) — para
// iluminação/TUG isso vem direto da norma; para TUE, já foi convertida de W para VA
// usando o fator de potência do equipamento (ver calculations/circuitos.js).
export function calcularCorrenteProjeto(circuito) {
  return circuito.potenciaVA / circuito.tensao
}

// NBR 5410 — coordenação disjuntor/condutor: Ib ≤ In ≤ Iz
// (corrente de projeto ≤ corrente nominal do disjuntor ≤ capacidade de condução do condutor).
export function escolherDisjuntor(correnteProjetoA) {
  return DISJUNTORES_PADRONIZADOS.find((corrente) => corrente >= correnteProjetoA) ?? null
}

// Avalia CADA seção da tabela (a partir da seção mínima normativa do tipo de uso) contra os
// dois critérios que precisam valer ao mesmo tempo — ampacidade CORRIGIDA e queda de tensão — e
// guarda o resultado de cada uma. É esse "passo a passo" que permite explicar por que uma seção
// foi rejeitada e a seguinte foi adotada, em vez de a escolha parecer arbitrária.
//
// §5.3.4.1 define Iz como a ampacidade "nas condições previstas para sua instalação" — o valor
// bruto da tabela AFETADO pelos fatores de temperatura (FCT, Tabela 40) e agrupamento (FCA,
// Tabela 42): Iz = Iz_tabela × FCT × FCA. `fatorTemperatura`/`fatorAgrupamento` default para 1
// (sem correção) só para permitir uso avulso; quem gera os valores reais é
// `calcularProjetoCompleto` (projeto.js), que aplica os defaults corretos.
// `esquema` é o esquema de condutores vivos da Tabela 46 — ele determina, de uma só vez, a
// COLUNA da Tabela 36 (2 ou 3 condutores carregados) e a fórmula de queda de tensão (fator 2
// para mono/fase-fase, 1 para o trifásico referido à tensão fase-neutro). Antes eram dois
// parâmetros independentes e só o segundo existia, o que fazia o alimentador bifásico e o
// trifásico serem dimensionados pela coluna de 2 condutores — ~12% de ampacidade a mais do que
// a norma admite. Uma fonte de verdade só impede que isso volte.
export function avaliarTrilhaSecao(tipoCircuito, parametros) {
  const {
    correnteNominalDisjuntorA,
    correnteProjetoA,
    comprimentoM,
    tensaoV,
    cosPhi,
    tipoCarga,
    fatorTemperatura = 1,
    fatorAgrupamento = 1,
    fatorResistividadeSolo = 1,
    limiteQuedaPercentual = LIMITE_QUEDA_TERMINAL_PERCENTUAL,
    esquema = ESQUEMA_CONDUTORES_PADRAO,
    neutroCarregado = false,
    metodoInstalacao = METODO_INSTALACAO_PADRAO,
    isolacao = ISOLACAO_PADRAO,
  } = parametros
  const secaoMinimaNormativa = SECAO_MINIMA_MM2[tipoCircuito] ?? SECAO_MINIMA_MM2.tug
  const condutoresCarregados = TABELA_46_CONDUTORES_CARREGADOS[esquema]
  const circuitoTrifasico = esquema.startsWith('trifasico')
  // §6.2.5.6.1 — 4 condutores carregados (trifásico com neutro e 3ª harmônica > 15%) não têm
  // coluna própria: aplica-se 0,86 sobre a coluna de 3.
  const fatorNeutroCarregado = neutroCarregado && condutoresCarregados === 3 ? FATOR_NEUTRO_CARREGADO : 1

  return SECOES_NOMINAIS_MM2.filter((secao) => secao >= secaoMinimaNormativa).map((secao) => {
    const ampacidade = obterAmpacidade({ isolacao, metodo: metodoInstalacao, condutoresCarregados, secaoMm2: secao })
    const ampacidadeCorrigida = ampacidade * fatorTemperatura * fatorAgrupamento * fatorResistividadeSolo * fatorNeutroCarregado
    const atendeAmpacidade = ampacidadeCorrigida >= correnteNominalDisjuntorA
    const quedaPercentual = calcularQuedaPercentual({
      comprimentoM,
      correnteA: correnteProjetoA,
      secaoMm2: secao,
      tensaoV,
      cosPhi,
      tipoCarga,
      circuitoTrifasico,
      isolacao,
    })
    const atendeQueda = quedaPercentual === null || quedaPercentual <= limiteQuedaPercentual

    return {
      secao,
      ampacidade,
      ampacidadeCorrigida,
      atendeAmpacidade,
      quedaPercentual,
      atendeQueda,
      aprovada: atendeAmpacidade && atendeQueda,
    }
  })
}

// Escolhe a menor seção aprovada na trilha (ver avaliarTrilhaSecao) — ou seja, a menor que
// atende SIMULTANEAMENTE à seção mínima normativa, à ampacidade CORRIGIDA exigida pelo disjuntor
// e à queda de tensão disponível.
export function escolherSecao(tipoCircuito, parametros) {
  const secaoMinimaNormativa = SECAO_MINIMA_MM2[tipoCircuito] ?? SECAO_MINIMA_MM2.tug
  const trilha = avaliarTrilhaSecao(tipoCircuito, parametros)

  // Seção que atenderia só pelo critério de corrente (sem olhar a queda de tensão) —
  // guardada à parte para mostrar quando a distância exige um cabo maior que isso.
  const opcaoPorAmpacidade = trilha.find((linha) => linha.atendeAmpacidade)
  const opcaoFinal = trilha.find((linha) => linha.aprovada)

  return {
    secaoMinimaNormativa,
    trilha,
    secaoPorAmpacidade: opcaoPorAmpacidade?.secao ?? null,
    secaoMm2: opcaoFinal?.secao ?? null,
    ampacidadeA: opcaoFinal?.ampacidadeCorrigida ?? null,
    ampacidadeTabelaA: opcaoFinal?.ampacidade ?? null,
  }
}

// `opcoes.comprimentoInformado` distingue "usuário não preencheu o comprimento" de "usuário
// preencheu 0" — comprimento ausente NÃO pode resultar em queda de tensão declarada como
// conforme (§6.2.6.1.2 e): o critério fica marcado como não verificado (`naoVerificado`) em vez
// de aprovado. Por padrão (uso avulso, sem passar por `dimensionarCircuitos`), assume-se que um
// comprimento maior que 0 foi de fato informado.
export function dimensionarCircuito(circuito, comprimentoM = 0, opcoes = {}) {
  const {
    fatorTemperatura = 1,
    fatorAgrupamento = 1,
    fatorResistividadeSolo = 1,
    limiteQuedaPercentual = LIMITE_QUEDA_TERMINAL_PERCENTUAL,
    comprimentoInformado = comprimentoM > 0,
    metodoInstalacao = METODO_INSTALACAO_PADRAO,
    isolacao = ISOLACAO_PADRAO,
  } = opcoes

  // Tabela 46 — derivado do próprio circuito, nunca recebido de fora: um circuito terminal é
  // fase-neutro (monofásico a 2 condutores) ou fase-fase sem neutro. Ambos, 2 carregados.
  const esquema = esquemaDoCircuito(circuito.ehFaseFase)
  const circuitoTrifasico = esquema.startsWith('trifasico')

  const correnteProjetoA = calcularCorrenteProjeto(circuito)
  const disjuntorA = escolherDisjuntor(correnteProjetoA)
  const cosPhi = circuito.cosPhi ?? 1
  const tipoCarga = circuito.tipoCarga ?? 'resistiva'

  if (disjuntorA === null) {
    return {
      ...circuito,
      correnteProjetoA,
      comprimentoM,
      comprimentoInformado,
      cosPhi,
      tipoCarga,
      disjuntorA: null,
      polos: circuito.ehFaseFase ? 2 : 1,
      metodoInstalacao,
      isolacao,
      esquema,
      condutoresCarregados: TABELA_46_CONDUTORES_CARREGADOS[esquema],
      secaoMm2: null,
      ampacidadeA: null,
      ampacidadeTabelaA: null,
      fatorTemperatura: null,
      fatorAgrupamento: null,
      fatorResistividadeSolo: null,
      secaoTerraMm2: null,
      quedaPercentual: null,
      naoVerificado: false,
      curtoCircuitoVerificado: false,
      seccionamentoAutomaticoVerificado: false,
      avisoCurtoCircuito: AVISO_CURTO_CIRCUITO,
      erro: 'Corrente de projeto acima da faixa de disjuntores padronizados considerada nesta versão.',
    }
  }

  // Temperatura declarada fora da faixa tabelada (Tabela 40) para a isolação/ambiente escolhidos
  // — `obterFatorTemperatura` já devolveu `null` em vez de extrapolar (ver constantes.js). Trata
  // como "nenhuma seção verificável", com um erro que aponta a causa real, em vez de deixar a
  // aritmética (null × ampacidade) mascarar isso atrás de "nenhuma seção atende".
  const temperaturaForaDaFaixa = fatorTemperatura === null
  const secaoMinimaNormativa = SECAO_MINIMA_MM2[circuito.tipo] ?? SECAO_MINIMA_MM2.tug
  const { secaoPorAmpacidade, secaoMm2, ampacidadeA, ampacidadeTabelaA, trilha } = temperaturaForaDaFaixa
    ? { secaoPorAmpacidade: null, secaoMm2: null, ampacidadeA: null, ampacidadeTabelaA: null, trilha: [] }
    : escolherSecao(circuito.tipo, {
        correnteNominalDisjuntorA: disjuntorA,
        correnteProjetoA,
        comprimentoM,
        tensaoV: circuito.tensao,
        cosPhi,
        tipoCarga,
        fatorTemperatura,
        fatorAgrupamento,
        fatorResistividadeSolo,
        limiteQuedaPercentual,
        esquema,
        metodoInstalacao,
        isolacao,
      })

  const quedaPercentual =
    secaoMm2 !== null
      ? calcularQuedaPercentual({
          comprimentoM,
          correnteA: correnteProjetoA,
          secaoMm2,
          tensaoV: circuito.tensao,
          cosPhi,
          tipoCarga,
          circuitoTrifasico,
          isolacao,
        })
      : null

  return {
    ...circuito,
    correnteProjetoA,
    comprimentoM,
    comprimentoInformado,
    cosPhi,
    tipoCarga,
    disjuntorA,
    // §9.5.4 — seccionamento simultâneo de todos os condutores de fase: um circuito fase-fase
    // ocupa 2 fases e precisa de disjuntor bipolar; fase-neutro precisa só de 1 polo (unipolar).
    polos: circuito.ehFaseFase ? 2 : 1,
    metodoInstalacao,
    isolacao,
    esquema,
    condutoresCarregados: TABELA_46_CONDUTORES_CARREGADOS[esquema],
    secaoMinimaNormativa,
    secaoPorAmpacidade,
    secaoMm2,
    ampacidadeA,
    ampacidadeTabelaA,
    fatorTemperatura,
    fatorAgrupamento,
    fatorResistividadeSolo,
    // Tabela 58 — condutor de proteção (terra/PE), dimensionado a partir da seção de fase
    // adotada. Antes só era calculado para o alimentador; todo circuito terminal também precisa.
    secaoTerraMm2: calcularSecaoTerra(secaoMm2),
    trilhaSecao: trilha,
    elevadaPorQuedaDeTensao: secaoPorAmpacidade !== null && secaoMm2 !== null && secaoMm2 > secaoPorAmpacidade,
    quedaPercentual,
    limitePercentual: limiteQuedaPercentual,
    conforme: secaoMm2 !== null && comprimentoInformado,
    naoVerificado: secaoMm2 !== null && !comprimentoInformado,
    curtoCircuitoVerificado: false,
    seccionamentoAutomaticoVerificado: false,
    avisoCurtoCircuito: AVISO_CURTO_CIRCUITO,
    erro: temperaturaForaDaFaixa
      ? 'Temperatura ambiente informada está fora da faixa tabelada (Tabela 40) para a isolação escolhida — dimensionamento não verificado.'
      : secaoMm2 === null
        ? 'Nenhuma seção da tabela atende simultaneamente à corrente exigida e à queda de tensão disponível.'
        : null,
  }
}

// `opcoes.temperaturaC`/`numeroCircuitosAgrupados` — ajuste manual opcional; quando ausentes,
// usa 30°C (FCT=1, referência da própria Tabela 36) e o total de circuitos gerados pela
// ferramenta (pior caso razoável — ver `valores-normativos.md`, Tabelas 40/42).
// `opcoes.limiteQuedaPercentual` — orçamento de queda disponível para ESTES circuitos terminais,
// calculado por `calcularProjetoCompleto` a partir do que o alimentador já consumiu do total de
// 5% (§6.2.7.1 c). Default = 4% (§6.2.7.2) para uso avulso, sem alimentador considerado.
// `opcoes.metodosPorId` — método de instalação (A1/A2/B1/B2/C/D) por circuito, no mesmo padrão de
// mapa que `comprimentosPorId`; ausente ou sem entrada = B1. O fator de agrupamento (FCA) é
// calculado POR CIRCUITO porque a referência muda com o método (Tabela 42 ref. 1 para A1/A2/B1/B2,
// ref. 2 para C, Tabela 45 para D) — não dá para calcular um FCA único pro lote inteiro.
// `opcoes.isolacao` — PVC ou EPR/XLPE, uma escolha de projeto (não por circuito, ver
// ProjetoContext.jsx). `opcoes.temperaturaSoloC`/`resistividadeTermicaSoloKmW` só entram para os
// circuitos cujo método é ENTERRADO (hoje, só D) — um circuito ao ar continua lendo
// `opcoes.temperaturaC`, mesmo que outro circuito do mesmo projeto esteja enterrado: a
// temperatura do solo nunca vaza para os circuitos ao ar, nem o contrário.
export function dimensionarCircuitos(circuitos, comprimentosPorId = {}, opcoes = {}) {
  const isolacao = opcoes.isolacao ?? ISOLACAO_PADRAO
  const numeroCircuitosAgrupados = opcoes.numeroCircuitosAgrupados ?? circuitos.length
  const limiteQuedaPercentual = opcoes.limiteQuedaPercentual ?? LIMITE_QUEDA_TERMINAL_PERCENTUAL
  const metodosPorId = opcoes.metodosPorId ?? {}

  return circuitos.map((circuito) => {
    const bruto = comprimentosPorId[circuito.id]
    const comprimentoInformado = bruto !== undefined && bruto !== null && bruto !== ''
    const comprimentoM = comprimentoInformado ? Number(bruto) || 0 : 0
    const metodoInstalacao = metodosPorId[circuito.id] || METODO_INSTALACAO_PADRAO
    const enterrado = Boolean(METODOS_INSTALACAO[metodoInstalacao]?.enterrado)
    const fatorTemperatura = obterFatorTemperatura(enterrado ? opcoes.temperaturaSoloC : opcoes.temperaturaC, {
      isolacao,
      enterrado,
    })
    const fatorResistividadeSolo = enterrado ? obterFatorResistividadeSolo(opcoes.resistividadeTermicaSoloKmW) : 1
    const fatorAgrupamento = obterFatorAgrupamento(numeroCircuitosAgrupados, metodoInstalacao)
    return dimensionarCircuito(circuito, comprimentoM, {
      fatorTemperatura,
      fatorAgrupamento,
      fatorResistividadeSolo,
      limiteQuedaPercentual,
      comprimentoInformado,
      metodoInstalacao,
      isolacao,
    })
  })
}
