import {
  ISOLACAO_PADRAO,
  ISOLACOES,
  TABELA_MULTIPLICADOR_DISPARO_INSTANTANEO,
  TEMPO_DISPARO_INSTANTANEO_S,
  obterK,
  obterReatanciaOhmMetro,
} from './constantes.js'

// NBR 5410 §5.3.5.5.2 — I²·t ≤ k²·S² (aquecimento adiabático do condutor num curto-circuito).
// `iccPresumidaA` é a corrente de curto-circuito presumida NO PONTO — dado da rede real (potência
// do transformador, distância, impedância), não da NBR 5410; só o usuário pode informar (ver
// constantes.js). Ausente, o critério fica NÃO VERIFICADO — nunca "conforme" por omissão, mesmo
// padrão já usado para queda de tensão sem comprimento informado.
//
// Só é possível verificar quando a Icc está na faixa de disparo INSTANTÂNEO (magnético) do
// disjuntor: nessa faixa, o tempo de atuação é curto e previsível (~10 ms, meio ciclo) o bastante
// para usar como aproximação. Abaixo desse limiar, a atuação depende da curva térmica/tempo-
// -corrente completa do disjuntor (dado de fabricante que esta ferramenta não tem) — fica
// NÃO VERIFICADO também, em vez de aplicar o tempo de 10 ms fora do regime em que ele vale.
//
// Ressalva adicional: a fórmula simplificada I²t≤k²S² vale, segundo a própria norma, para
// qualquer duração sem assimetria significativa, ou para curtos assimétricos de 0,1s a 5s. Em
// ~10 ms (disparo instantâneo) a corrente pode ainda ter componente assimétrica relevante — a
// verificação aqui é uma aproximação de triagem, não substitui um estudo de curto-circuito
// completo.
//
// §6.3.4.3.2 separa as duas pontas do trecho protegido:
// - b) a energia (I²t) é verificada com a Icc MÁXIMA no ponto de instalação do disjuntor
//   (`iccPresumidaA`) — é ali que a corrente de falta é maior;
// - a) Ia ≤ Ikmin: o disjuntor precisa atuar rápido também com a Icc MÍNIMA, no ponto mais
//   distante (`iccMinimaA`). Sem a curva do fabricante, a única garantia disponível é Ikmin cair
//   na faixa de disparo instantâneo GARANTIDO; abaixo disso fica não verificado.
// O limiar é o limite SUPERIOR da faixa magnética da curva (C: 10×In). Na IEC 60898 o limite
// inferior (C: 5×In) é o ponto de NÃO atuação instantânea; entre os dois, o disjuntor pode levar
// segundos, e aplicar 10 ms ali seria permissivo.
export function verificarCurtoCircuito({
  correnteDisjuntorA,
  curvaDisjuntor,
  iccPresumidaA,
  iccMinimaA = iccPresumidaA,
  secaoMm2,
  isolacao = ISOLACAO_PADRAO,
}) {
  if (!iccPresumidaA || iccPresumidaA <= 0) {
    return { verificado: false, conforme: null, motivo: 'Corrente de curto-circuito presumida (Icc) não informada.' }
  }
  if (!secaoMm2 || !correnteDisjuntorA) {
    return { verificado: false, conforme: null, motivo: 'Disjuntor/seção ainda não determinados.' }
  }
  if (!iccMinimaA) {
    return {
      verificado: false,
      conforme: null,
      motivo: 'Icc mínima no ponto mais distante não calculada — informe o comprimento do trecho (§6.3.4.3.2 a).',
    }
  }

  const curva = TABELA_MULTIPLICADOR_DISPARO_INSTANTANEO[curvaDisjuntor] ?? TABELA_MULTIPLICADOR_DISPARO_INSTANTANEO.C
  const limiarInstantaneoA = curva.max * correnteDisjuntorA

  if (iccMinimaA < limiarInstantaneoA) {
    const noPontoDistante = iccMinimaA !== iccPresumidaA
    return {
      verificado: false,
      conforme: null,
      limiarInstantaneoA,
      motivo:
        `Icc ${noPontoDistante ? 'mínima, no ponto mais distante' : 'informada'} (${iccMinimaA.toFixed(0)} A) fica abaixo do ` +
        `disparo instantâneo garantido da curva ${curvaDisjuntor} (${limiarInstantaneoA.toFixed(0)} A = ${curva.max}×In) — ` +
        'a atuação cairia na faixa térmica/tempo-corrente do disjuntor, que só a curva do fabricante define (§6.3.4.3.2 a).',
    }
  }

  // Tabela 30, NOTA 1 — k não é normalizado abaixo de 10 mm² (a faixa de praticamente todo
  // circuito terminal residencial). `obterK` devolve `null` nesse caso; sem um k confiável, o
  // critério fica "não verificado" — nunca "conforme" por acidente de `null * secaoMm2 === 0`.
  const k = obterK({ isolacao, secaoMm2 })
  if (k === null) {
    return {
      verificado: false,
      conforme: null,
      limiarInstantaneoA,
      motivo:
        `Seção de ${secaoMm2} mm² fica abaixo de 10 mm² — a Tabela 30 (NOTA 1) não normaliza o fator k nessa faixa, ` +
        'então o critério I²t ≤ k²S² não pode ser verificado com o valor de k desta ferramenta.',
    }
  }

  const energiaPassanteA2s = iccPresumidaA ** 2 * TEMPO_DISPARO_INSTANTANEO_S
  const energiaSuportadaA2s = (k * secaoMm2) ** 2
  const conforme = energiaPassanteA2s <= energiaSuportadaA2s

  return {
    verificado: true,
    conforme,
    limiarInstantaneoA,
    energiaPassanteA2s,
    energiaSuportadaA2s,
    motivo: conforme
      ? null
      : `I²t (${energiaPassanteA2s.toExponential(2)} A²s, em ${(TEMPO_DISPARO_INSTANTANEO_S * 1000).toFixed(0)} ms) ` +
        `excede k²S² (${energiaSuportadaA2s.toExponential(2)} A²s) — o condutor de ${secaoMm2} mm² não suporta ` +
        'essa energia de curto-circuito; considere uma seção maior ou um disjuntor mais rápido.',
  }
}

// Impedância de um laço fase+retorno (ida e volta) — SEMPRE 2 condutores, mesmo para o trecho do
// alimentador trifásico: ao contrário da queda de tensão em operação normal balanceada (onde o
// neutro não retorna corrente), um curto-circuito fase-neutro só percorre 1 fase + o neutro,
// nunca as 3 fases. Usa a seção de FASE para os dois condutores do laço (mesmo quando o neutro
// real está reduzido pela Tabela 48) — simplificação deliberadamente conservadora: um neutro mais
// fino teria impedância real MAIOR (Icc real menor), então assumir a seção de fase nos dois
// condutores subestima a impedância e superestima a Icc, no sentido seguro para I²t≤k²S² (mais
// Icc assumida → mais difícil de passar, nunca o contrário). Reaproveita a mesma condutividade
// (ISOLACOES) e reatância por seção (obterReatanciaOhmMetro) já usadas em quedaDeTensao.js.
//
// `secaoVoltaMm2` permite um condutor de retorno de outra seção — é o laço de falta fase-PE do
// seccionamento automático (§5.1.2.2.4.2 d), onde a volta é o PE (ou o PEN), e ali a seção menor é
// o lado seguro (Zs maior). Sem ela, a volta tem a seção da fase, como no curto fase-neutro acima.
function impedanciaLaco({ comprimentoM, secaoMm2, secaoVoltaMm2 = secaoMm2, isolacao }) {
  const condutividade = ISOLACOES[isolacao]?.condutividade ?? ISOLACOES.pvc.condutividade
  return {
    r: comprimentoM * (1 / (condutividade * secaoMm2) + 1 / (condutividade * secaoVoltaMm2)),
    x: comprimentoM * (obterReatanciaOhmMetro(secaoMm2) + obterReatanciaOhmMetro(secaoVoltaMm2)),
  }
}

// Fonte (reativa, derivada da Icc declarada) + os trechos em série. null se faltar dado.
function somarLaco({ tensaoFaseNeutroV, iccFonteA, trechos }) {
  if (!iccFonteA || iccFonteA <= 0) return null
  if (trechos.some((trecho) => !trecho?.secaoMm2 || trecho.secaoVoltaMm2 === null)) return null
  let r = 0
  let x = tensaoFaseNeutroV / iccFonteA
  for (const trecho of trechos) {
    const z = impedanciaLaco(trecho)
    r += z.r
    x += z.x
  }
  return Math.sqrt(r * r + x * x)
}

// Zs do §5.1.2.2.4.2 d): impedância do percurso da falta fase-massa, da fonte até o ponto e de
// volta pelo condutor de proteção. Mesmo modelo da propagação de Icc, com a volta pelo PE/PEN.
export function impedanciaFalta({ tensaoFaseNeutroV, iccFonteA, trechos }) {
  return somarLaco({ tensaoFaseNeutroV, iccFonteA, trechos })
}

// NBR 5410 §5.3.5.1 — "as correntes de curto-circuito presumidas devem ser determinadas em todos
// os pontos da instalação julgados necessários. Essa determinação pode ser efetuada por CÁLCULO ou
// por medição" — a norma autoriza explicitamente derivar a Icc num circuito terminal a partir da
// Icc já declarada no ponto de entrega, encadeando a impedância do alimentador + do próprio
// circuito terminal, em vez de exigir uma nova declaração do usuário por circuito.
//
// A impedância da fonte (rede/transformador a montante do ponto de entrega) é tratada como
// PURAMENTE REATIVA — convenção usual de estudo de curto-circuito em baixa tensão (a impedância de
// rede é dominada pela reatância); fonte externa de engenharia elétrica geral, não conteúdo da NBR
// 5410 (mesma categoria já registrada em valores-normativos.md para o cálculo vetorial do neutro).
// Somar resistências e reatâncias SEPARADAMENTE (não as magnitudes de cada trecho) é o que mantém
// a estimativa no lado seguro: somar magnitudes diretamente superestimaria a impedância total
// (desigualdade triangular) e subestimaria a Icc — permissivo demais para este critério.
//
// Laço fase-neutro. O circuito fase-fase usa `propagarIccFaseFase`, abaixo.
export function propagarIcc({ tensaoFaseNeutroV, iccFonteA, trechos, tensaoV = tensaoFaseNeutroV }) {
  const z = somarLaco({ tensaoFaseNeutroV, iccFonteA, trechos })
  return z === null ? null : tensaoV / z
}

// Curto entre duas fases (circuito fase-fase). A norma não traz conversão entre tipos de falta
// (§5.3.5.1 só diz "por cálculo"); o modelo é de engenharia, o mesmo da propagação acima: a Icc
// informada é a maior no ponto de entrega (a trifásica simétrica, que a concessionária informa),
// então a reatância da fonte por fase é Uo/Icc. O laço passa por 2 fases da fonte (2·Uo/Icc) e
// pelas 2 fases de cada trecho, sob a tensão fase-fase √3·Uo — na origem, Icc·√3/2.
export function propagarIccFaseFase({ tensaoFaseNeutroV, iccFonteA, trechos }) {
  if (!iccFonteA || iccFonteA <= 0) return null
  return propagarIcc({ tensaoFaseNeutroV, iccFonteA: iccFonteA / 2, trechos, tensaoV: tensaoFaseNeutroV * Math.sqrt(3) })
}

// Icc no ponto mais distante do circuito terminal (fonte + alimentador + o próprio circuito).
export function propagarIccTerminal({ tensaoFaseNeutroV, iccFonteA, alimentador, terminal }) {
  return propagarIcc({ tensaoFaseNeutroV, iccFonteA, trechos: [alimentador, terminal], tensaoV: terminal?.tensaoV })
}
