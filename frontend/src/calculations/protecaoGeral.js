import { avaliarTrilhaSecao, escolherDisjuntor } from './condutores.js'
import { calcularQuedaPercentual } from './quedaDeTensao.js'
import { propagarIcc, verificarCurtoCircuito } from './curtoCircuito.js'
import {
  CURVA_DISJUNTOR_PADRAO,
  IDR_CORRENTES_PADRONIZADAS,
  IDR_SENSIBILIDADE_ALTA_MA,
  ESQUEMA_CONDUTORES_PADRAO,
  ISOLACAO_PADRAO,
  LIMITE_QUEDA_TOTAL_PERCENTUAL,
  METODO_INSTALACAO_PADRAO,
  METODOS_INSTALACAO,
  PISO_PRATICO_ALIMENTADOR_MM2,
  SECAO_MINIMA_MM2,
  TABELA_46_CONDUTORES_CARREGADOS,
  TAXAS_TERCEIRA_HARMONICA,
  TERCEIRA_HARMONICA_PADRAO,
  calcularSecaoTerra,
  esquemaDoAlimentador,
  obterFatorAgrupamento,
  obterFatorResistividadeSolo,
  obterFatorTemperatura,
  obterSecaoNeutroReduzida,
  recomendarTensaoDps,
} from './constantes.js'

// NBR 5410 — coordenação disjuntor/condutor (Ib ≤ In ≤ Iz), mesmo critério já usado nos
// circuitos terminais, aplicado agora à corrente total de entrada da instalação.
export function dimensionarDisjuntorGeral(correnteEntradaA) {
  return escolherDisjuntor(correnteEntradaA)
}

// NBR 5410 §5.1.3.2.2 — DR de alta sensibilidade (≤ 30 mA) obrigatório para circuitos de
// tomadas em geral e áreas internas molhadas; aqui é dimensionado um IDR geral, à montante de
// todos os circuitos, com corrente nominal padronizada ≥ corrente do disjuntor geral.
export function dimensionarIDR(correnteDisjuntorGeralA, numeroFases) {
  if (correnteDisjuntorGeralA === null) return null
  const correnteA = IDR_CORRENTES_PADRONIZADAS.find((corrente) => corrente >= correnteDisjuntorGeralA) ?? null
  return {
    correnteA,
    polos: numeroFases + 1,
    sensibilidadeMA: IDR_SENSIBILIDADE_ALTA_MA,
  }
}

// NBR 5410 não usa a nomenclatura "Classe I/II/III" pra DPS (é terminologia de mercado, alinhada
// à IEC 61643) — mas as duas cláusulas por trás dela são normativas e objetivas:
// - §5.4.2.1.1: proteção contra surtos só é EXIGÊNCIA normativa quando a instalação é alimentada
//   por linha aérea (total ou parcial) E a região tem alto índice de descargas atmosféricas
//   (influência externa AQ2, >25 dias de trovoada/ano) — ou a região é AQ3 (Tabela 15, não
//   embutida aqui: mapeamento geográfico completo do Brasil foge do escopo desta ferramenta,
//   mesma lógica de outras declarações opt-in como a Tabela 48/Icc). Fora dessas condições, DPS
//   continua recomendação de boa prática, não uma exigência normativa.
// - §6.3.5.2.1 b): quando o objetivo é proteção contra descarga atmosférica DIRETA sobre a
//   edificação ou nas proximidades (edificação isolada, alta, ou com para-raios/SPDA próprio), o
//   mercado chama isso de Classe I — usado JUNTO com a Classe II (§6.3.5.2.1 a, surtos
//   transmitidos pela linha), não no lugar dela. É uma questão independente de `exigidaPelaNorma`
//   (a própria norma permite especificar DPS "independentemente das considerações de 5.4.2.1.1").
// Os 3 fatos são declarações do usuário sobre a instalação real (mapas isocerâunicos INMET/INPE
// são públicos) — nunca inferidos automaticamente.
export function recomendarDPS(tensaoFaseNeutro, opcoes = {}) {
  const { alimentacaoAerea = false, regiaoAltoIndiceDescargas = false, exposicaoDescargaDireta = false } = opcoes
  const exigidaPelaNorma = alimentacaoAerea && regiaoAltoIndiceDescargas

  return {
    classe: exposicaoDescargaDireta ? 'I+II' : 'II',
    tensaoMaximaOperacaoV: recomendarTensaoDps(tensaoFaseNeutro),
    exigidaPelaNorma,
    motivoExigencia: exigidaPelaNorma
      ? 'exigência normativa — NBR 5410 §5.4.2.1.1 a) (alimentação aérea em região de alto índice de descargas atmosféricas)'
      : 'recomendação de boa prática — a NBR 5410 só torna o DPS exigência normativa com alimentação aérea em região de alto índice de descargas (§5.4.2.1.1 a) ou região AQ3, Tabela 15 (§5.4.2.1.1 b)',
  }
}

function condutorFaseComErro(erro, comprimentoInformado, isolacao = ISOLACAO_PADRAO) {
  return {
    disjuntorA: null,
    trilha: [],
    secaoMinimaNormativa: SECAO_MINIMA_MM2.geral,
    pisoPraticoMm2: PISO_PRATICO_ALIMENTADOR_MM2,
    elevadaPeloPisoPratico: false,
    secaoMm2: null,
    ampacidadeA: null,
    ampacidadeTabelaA: null,
    isolacao,
    comprimentoInformado,
    quedaPercentual: null,
    naoVerificado: false,
    erro,
  }
}

// Seção do condutor fase do alimentador (ramal de entrada até o quadro geral): mesmo critério
// duplo (ampacidade CORRIGIDA + queda de tensão) já usado nos circuitos terminais, mas com:
// (1) a seção mínima NORMATIVA real de um circuito de distribuição (2,5 mm² — §6.2.6.1.1/Tabela
// 47, cabo isolado; os 10 mm² da tabela são de condutor NU); (2) um piso PRÁTICO de 10 mm²
// aplicado por padrão por cima do mínimo normativo (exigência típica de concessionária, não da
// NBR — ver `PISO_PRATICO_ALIMENTADOR_MM2`); (3) o orçamento de queda TOTAL do §6.2.7.1 c) (5%),
// não o de 4% do circuito terminal — o alimentador consome deste mesmo orçamento total.
export function dimensionarCondutorFaseGeral(correnteEntradaA, comprimentoM, tensaoV, opcoes = {}) {
  const {
    fatorTemperatura = 1,
    fatorAgrupamento = 1,
    fatorResistividadeSolo = 1,
    esquema = ESQUEMA_CONDUTORES_PADRAO,
    neutroCarregado = false,
    comprimentoInformado = comprimentoM > 0,
    metodoInstalacao = METODO_INSTALACAO_PADRAO,
    isolacao = ISOLACAO_PADRAO,
  } = opcoes
  const circuitoTrifasico = esquema.startsWith('trifasico')

  const disjuntorA = escolherDisjuntor(correnteEntradaA)
  if (disjuntorA === null) {
    return condutorFaseComErro(
      'Corrente de entrada acima da faixa de disjuntores padronizados considerada nesta versão.',
      comprimentoInformado,
      isolacao,
    )
  }

  // Temperatura declarada fora da faixa tabelada (Tabela 40) para a isolação/ambiente do
  // alimentador — mesma lógica de `dimensionarCircuito` (condutores.js): nunca extrapolar, nunca
  // deixar a aritmética (null × ampacidade) mascarar a causa real atrás de "nenhuma seção atende".
  if (fatorTemperatura === null) {
    return {
      ...condutorFaseComErro(
        'Temperatura declarada está fora da faixa tabelada (Tabela 40) para a isolação escolhida — dimensionamento não verificado.',
        comprimentoInformado,
        isolacao,
      ),
      disjuntorA,
    }
  }

  const trilha = avaliarTrilhaSecao('geral', {
    correnteNominalDisjuntorA: disjuntorA,
    correnteProjetoA: correnteEntradaA,
    comprimentoM,
    tensaoV,
    cosPhi: 1,
    tipoCarga: 'resistiva',
    fatorTemperatura,
    fatorAgrupamento,
    fatorResistividadeSolo,
    limiteQuedaPercentual: LIMITE_QUEDA_TOTAL_PERCENTUAL,
    esquema,
    neutroCarregado,
    metodoInstalacao,
    isolacao,
  })

  const opcaoNormativa = trilha.find((linha) => linha.aprovada)
  if (!opcaoNormativa) {
    return {
      ...condutorFaseComErro(
        'Nenhuma seção da tabela atende simultaneamente à corrente exigida e à queda de tensão disponível.',
        comprimentoInformado,
        isolacao,
      ),
      disjuntorA,
      trilha,
    }
  }

  // Mesmo quando uma seção menor já atenderia a NBR 5410 sozinha, o piso prático de 10 mm² é
  // aplicado por padrão — sem ele, o resultado seria "conforme à norma" mas não instalável, já
  // que toda concessionária brasileira exige pelo menos essa seção no ramal de entrada. O piso
  // nunca pode DIMINUIR a seção: se a corrente já exige mais que 10 mm² (ex.: disjuntor de 80 A
  // exige 25 mm² pela ampacidade), usa-se a seção maior — o piso só eleva, nunca substitui.
  const secaoComPiso = Math.max(opcaoNormativa.secao, PISO_PRATICO_ALIMENTADOR_MM2)
  const opcaoFinal = trilha.find((linha) => linha.secao === secaoComPiso) ?? opcaoNormativa
  const elevadaPeloPisoPratico = secaoComPiso > opcaoNormativa.secao
  const secaoMm2 = opcaoFinal.secao

  return {
    disjuntorA,
    trilha,
    metodoInstalacao,
    isolacao,
    esquema,
    condutoresCarregados: TABELA_46_CONDUTORES_CARREGADOS[esquema],
    neutroCarregado,
    secaoMinimaNormativa: SECAO_MINIMA_MM2.geral,
    pisoPraticoMm2: PISO_PRATICO_ALIMENTADOR_MM2,
    elevadaPeloPisoPratico,
    secaoMm2,
    ampacidadeA: opcaoFinal.ampacidadeCorrigida,
    ampacidadeTabelaA: opcaoFinal.ampacidade,
    fatorTemperatura,
    fatorAgrupamento,
    fatorResistividadeSolo,
    comprimentoInformado,
    quedaPercentual: calcularQuedaPercentual({
      comprimentoM,
      correnteA: correnteEntradaA,
      secaoMm2,
      tensaoV,
      cosPhi: 1,
      tipoCarga: 'resistiva',
      circuitoTrifasico,
      isolacao,
    }),
    limitePercentual: LIMITE_QUEDA_TOTAL_PERCENTUAL,
    naoVerificado: !comprimentoInformado,
    erro: null,
  }
}

// NBR 5410 §6.2.6.2 — o neutro só pode ser menor que a fase (Tabela 48) quando TRÊS condições
// valem ao mesmo tempo (§6.2.6.2.6): circuito trifásico com neutro presumivelmente equilibrado em
// serviço normal; 3ª harmônica e múltiplos ≤ 15%; neutro protegido contra sobrecorrente. Essas
// são afirmações sobre o USO futuro da instalação que só quem vai operá-la pode declarar — por
// isso `neutroReduzidoDeclarado` é uma escolha explícita do usuário (checkbox), nunca inferida
// automaticamente. Monofásico e bifásico (§6.2.6.2.2/6.2.6.2.4) NUNCA reduzem: neutro = fase,
// sempre, sem exceção — só um alimentador trifásico com fase > 25 mm² pode reduzir.
export function dimensionarCondutorNeutroGeral(secaoFaseMm2, opcoes = {}) {
  const {
    neutroReduzidoDeclarado = false,
    numeroFases = 1,
    terceiraHarmonica = TERCEIRA_HARMONICA_PADRAO,
  } = opcoes
  // A 2ª das 3 condições (3ª harmônica ≤ 15%) deixou de estar embutida no próprio checkbox e
  // passou a ser declarada à parte, porque ela também governa o fator de 0,86 do §6.2.5.6.1 —
  // ver TAXAS_TERCEIRA_HARMONICA. Sem essa declaração, o neutro não reduz.
  if (numeroFases !== 3 || !neutroReduzidoDeclarado) return secaoFaseMm2
  if (!TAXAS_TERCEIRA_HARMONICA[terceiraHarmonica]?.reduzNeutro) return secaoFaseMm2
  return obterSecaoNeutroReduzida(secaoFaseMm2)
}

// NBR 5410 Tabela 58 — seção mínima do condutor de proteção (terra/PE) em função da seção de fase.
export function dimensionarCondutorTerraGeral(secaoFaseMm2) {
  return calcularSecaoTerra(secaoFaseMm2)
}

// `numeroCircuitosAgrupados` default 1 — o alimentador roda sozinho do medidor ao quadro geral,
// sem outros circuitos agrupados no mesmo eletroduto, por padrão. `temperaturaC` default 30°C
// (FCT=1). `comprimentoInformado` default: assume informado se `comprimentoRamalM > 0` (mesma
// regra dos circuitos terminais — ver `dimensionarCircuitos`, condutores.js). `metodoInstalacao`
// (B1/B2/C) e `neutroReduzidoDeclarado` (Tabela 48, só efetivo com numeroFases===3 e fase>25mm²)
// são ajustes avançados opcionais. `iccPresumidaA`/`curvaDisjuntor` habilitam a verificação real
// de curto-circuito (§5.3.5) só quando o usuário tiver esse dado — ver `curtoCircuito.js`.
// `correntePorFaseA`/`correnteNeutroA` vêm de `calcularCorrentesVetoriais` (circuitos.js) — soma
// vetorial de P/Q por circuito, não soma escalar de VA (ver o comentário lá pra derivação
// completa). `alimentacaoAerea`/`regiaoAltoIndiceDescargas`/`exposicaoDescargaDireta` são
// declarações opcionais que afetam só a recomendação de DPS — ver `recomendarDPS`.
export function dimensionarProtecaoGeral({
  correntePorFaseA,
  correnteNeutroA,
  numeroFases,
  tensaoFaseNeutro,
  comprimentoRamalM,
  comprimentoInformado = comprimentoRamalM > 0,
  temperaturaC,
  temperaturaSoloC,
  resistividadeTermicaSoloKmW,
  numeroCircuitosAgrupados = 1,
  metodoInstalacao = METODO_INSTALACAO_PADRAO,
  isolacao = ISOLACAO_PADRAO,
  neutroReduzidoDeclarado = false,
  terceiraHarmonica = TERCEIRA_HARMONICA_PADRAO,
  iccPresumidaA = null,
  iccFaseNeutroA = iccPresumidaA,
  curvaDisjuntor = CURVA_DISJUNTOR_PADRAO,
  alimentacaoAerea = false,
  regiaoAltoIndiceDescargas = false,
  exposicaoDescargaDireta = false,
}) {
  const correnteEntradaA = Math.max(...correntePorFaseA)
  // Método D (enterrado) referencia a temperatura do SOLO (20°C), não a do ar (30°C) — a mesma
  // declaração de projeto que os circuitos terminais usam (ver `dimensionarCircuitos`,
  // condutores.js), nunca uma temperatura separada só para o alimentador.
  const enterrado = Boolean(METODOS_INSTALACAO[metodoInstalacao]?.enterrado)
  const fatorTemperatura = obterFatorTemperatura(enterrado ? temperaturaSoloC : temperaturaC, { isolacao, enterrado })
  const fatorResistividadeSolo = enterrado ? obterFatorResistividadeSolo(resistividadeTermicaSoloKmW) : 1
  const fatorAgrupamento = obterFatorAgrupamento(numeroCircuitosAgrupados, metodoInstalacao)
  // Tabela 46 — o alimentador bifásico é "duas fases COM neutro" (3 condutores carregados), não
  // 2 como o código assumia antes; o trifásico com neutro é 3, ou 4 (fator 0,86) quando a 3ª
  // harmônica passa de 15%.
  const esquema = esquemaDoAlimentador(numeroFases)
  const neutroCarregado = Boolean(TAXAS_TERCEIRA_HARMONICA[terceiraHarmonica]?.neutroCarregado)
  // §6.2.6.2.5 — acima de 33% de 3ª harmônica, o neutro PODE PRECISAR SER MAIOR que a fase,
  // dimensionado pelo Anexo F (que exige o conteúdo harmônico real das correntes de fase — dado
  // que esta ferramenta não coleta). Não calculamos essa seção maior; só avisamos, em vez de
  // devolver `secaoNeutroMm2 = secaoFase` em silêncio como se isso resolvesse o caso.
  const avisoNeutroSuperior = Boolean(TAXAS_TERCEIRA_HARMONICA[terceiraHarmonica]?.avisoNeutroSuperior)
  const condutorFase = dimensionarCondutorFaseGeral(correnteEntradaA, comprimentoRamalM, tensaoFaseNeutro, {
    fatorTemperatura,
    fatorAgrupamento,
    fatorResistividadeSolo,
    esquema,
    neutroCarregado,
    comprimentoInformado,
    metodoInstalacao,
    isolacao,
  })
  const idr = dimensionarIDR(condutorFase.disjuntorA, numeroFases)
  const dps = recomendarDPS(tensaoFaseNeutro, { alimentacaoAerea, regiaoAltoIndiceDescargas, exposicaoDescargaDireta })
  const secaoNeutroMm2 = dimensionarCondutorNeutroGeral(condutorFase.secaoMm2, {
    neutroReduzidoDeclarado,
    numeroFases,
    terceiraHarmonica,
  })
  const neutroReduzido = secaoNeutroMm2 !== null && condutorFase.secaoMm2 !== null && secaoNeutroMm2 < condutorFase.secaoMm2
  const secaoTerraMm2 = dimensionarCondutorTerraGeral(condutorFase.secaoMm2)
  // Icc no quadro de distribuição (fim do alimentador, §5.3.5.1 "por cálculo"). É a Icc MÁXIMA no
  // ponto de instalação dos disjuntores dos circuitos terminais e a MÍNIMA do trecho do
  // alimentador. Sem o comprimento do ramal ela vale a da origem — lado seguro para a capacidade
  // de interrupção (maior), mas não serve como Ikmin do alimentador (seria permissivo).
  // O laço é fase-neutro, então parte da Icc fase-neutro quando informada.
  const iccQuadroA = propagarIcc({
    tensaoFaseNeutroV: tensaoFaseNeutro,
    iccFonteA: iccFaseNeutroA,
    trechos: [{ comprimentoM: comprimentoRamalM, secaoMm2: condutorFase.secaoMm2, isolacao }],
  })
  const curtoCircuito = verificarCurtoCircuito({
    correnteDisjuntorA: condutorFase.disjuntorA,
    curvaDisjuntor,
    iccPresumidaA: iccPresumidaA && iccFaseNeutroA ? Math.max(iccPresumidaA, iccFaseNeutroA) : iccPresumidaA,
    iccMinimaA: comprimentoInformado ? iccQuadroA : null,
    secaoMm2: condutorFase.secaoMm2,
    isolacao,
  })

  // Verificação vetorial do neutro (§6.2.6.2) — roda SEMPRE, não só quando reduzido pela Tabela
  // 48: a soma vetorial das 3 correntes de fase pode superar a maior corrente de fase isolada
  // quando cargas em fases diferentes têm fator de potência de sinal oposto (indutiva numa,
  // capacitiva noutra — contraexemplo verificado antes de implementar: 54% acima, com cosφ=0,7
  // nas duas). "Nunca aconteceria com neutro não reduzido" é falso em geral, então a verificação
  // nunca é dispensada. Reaproveita a trilha já calculada pra fase (mesmo método/FCT/FCA — mesmo
  // condutor físico) e busca a linha da seção efetivamente adotada pelo neutro.
  const linhaNeutro = secaoNeutroMm2 !== null ? condutorFase.trilha?.find((linha) => linha.secao === secaoNeutroMm2) : null
  const neutroAmpacidadeA = linhaNeutro?.ampacidadeCorrigida ?? null
  const verificacaoNeutro = {
    correnteA: correnteNeutroA,
    ampacidadeA: neutroAmpacidadeA,
    conforme: neutroAmpacidadeA === null ? null : correnteNeutroA <= neutroAmpacidadeA,
  }

  return {
    correnteEntradaA,
    correntePorFaseA,
    disjuntorGeralA: condutorFase.disjuntorA,
    idr,
    dps,
    condutorFase,
    secaoNeutroMm2,
    neutroReduzido,
    avisoNeutroSuperior,
    verificacaoNeutro,
    secaoTerraMm2,
    curtoCircuito,
    iccQuadroA,
  }
}
