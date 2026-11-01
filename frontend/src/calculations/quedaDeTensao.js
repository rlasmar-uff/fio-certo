import { ANGULO_FASE_GRAUS, ISOLACOES, obterReatanciaOhmMetro } from './constantes.js'

// Condutividade do cobre (S·m/mm²) para a convenção de resistividade escolhida. 'operacao' (padrão)
// = condutividade na temperatura de operação do condutor (70 °C PVC, 90 °C EPR/XLPE, ver `ISOLACOES`);
// as convenções didáticas (ρ = 1/56 ou 1/58 Ω·mm²/m, semana 6 do compilado) valem para reproduzir os
// exemplos do documento e DESPREZAM a reatância (os exemplos são modelos resistivos).
export const CONVENCOES_RESISTIVIDADE = {
  operacao: { label: 'Temperatura de operação do condutor (70 °C PVC / 90 °C EPR) — cabo real', rho: null },
  'cu-1/56': { label: 'Didática: cobre ρ = 1/56 Ω·mm²/m (Creder, exemplos da semana 6)', rho: 1 / 56 },
  'cu-1/58': { label: 'Didática: cobre ρ = 1/58 Ω·mm²/m (Creder, tabelas 3.18/3.19 e casos da semana 8)', rho: 1 / 58 },
}
export const CONVENCAO_RESISTIVIDADE_PADRAO = 'operacao'

export function condutividadeCobre(isolacao = 'pvc', convencao = CONVENCAO_RESISTIVIDADE_PADRAO) {
  const rho = CONVENCOES_RESISTIVIDADE[convencao]?.rho
  return rho ? 1 / rho : (ISOLACOES[isolacao]?.condutividade ?? ISOLACOES.pvc.condutividade)
}
const reatanciaConsiderada = (secao, convencao) => (CONVENCOES_RESISTIVIDADE[convencao]?.rho ? 0 : obterReatanciaOhmMetro(secao))

// Queda de tensão em circuito terminal. Dois modos, nunca os dois ao mesmo tempo (S6 §7.1):
// - por resistividade (padrão): R = 1/(σ·S), com reatância por seção na convenção 'operacao';
// - por impedância informada (`impedancia`: r e x em Ω/km): ΔU = k·L·I·(r·cosφ ± x·senφ), L em km.
// k = 2 em circuito de dois condutores (ida e retorno) e 1 no trifásico equilibrado referido à tensão
// fase-neutro (equivale a √3·L·I·(...) sobre a tensão de linha). `secaoRetornoMm2` permite retorno com
// seção diferente da ida: ΔU = I·(R_ida + R_retorno) (S6 §4.2). X positivo para carga indutiva e
// negativo para capacitiva. Resultado em % da `tensaoV`.
export function calcularQuedaPercentual({
  comprimentoM,
  correnteA,
  secaoMm2,
  tensaoV,
  cosPhi = 1,
  tipoCarga = 'resistiva',
  circuitoTrifasico = false,
  isolacao = 'pvc',
  convencao = CONVENCAO_RESISTIVIDADE_PADRAO,
  impedancia = null,
  secaoRetornoMm2 = null,
}) {
  if (!tensaoV || (!impedancia && !secaoMm2)) return null

  const senPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi))
  const sinalReativo = tipoCarga === 'capacitiva' ? -1 : 1

  if (impedancia) {
    const k = circuitoTrifasico ? 1 : 2
    const porKm = Number(impedancia.rOhmKm) * cosPhi + sinalReativo * Number(impedancia.xOhmKm) * senPhi
    return ((k * (comprimentoM / 1000) * correnteA * porKm) / tensaoV) * 100
  }

  const condutividade = condutividadeCobre(isolacao, convencao)
  const ida = (1 / (condutividade * secaoMm2)) * cosPhi + sinalReativo * reatanciaConsiderada(secaoMm2, convencao) * senPhi
  const secaoVolta = secaoRetornoMm2 ?? secaoMm2
  const volta = (1 / (condutividade * secaoVolta)) * cosPhi + sinalReativo * reatanciaConsiderada(secaoVolta, convencao) * senPhi

  const quedaV = circuitoTrifasico ? comprimentoM * correnteA * ida : comprimentoM * correnteA * (ida + volta)
  return (quedaV / tensaoV) * 100
}

// Circuito radial com derivações (S6 §5.2): ΔU = Σ(ρ·L_j·I_j/S) com a corrente que REALMENTE percorre
// cada trecho — equivale a Σ(corrente da carga × distância dela à origem). `pontos`: [{distanciaM,
// correnteA}] (corrente consumida em cada ponto). Devolve a corrente total e o comprimento equivalente
// (a distância que, com a corrente total, dá a mesma queda), para o cálculo seguir como circuito de um
// trecho. Aplicar a corrente total a todos os trechos após uma derivação superestima a queda.
export function comprimentoEquivalente(pontos) {
  const validos = (pontos ?? []).filter((p) => Number(p.distanciaM) > 0 && Number(p.correnteA) > 0)
  const correnteTotalA = validos.reduce((soma, p) => soma + Number(p.correnteA), 0)
  if (!correnteTotalA) return null
  const somaCorrenteDistanciaAm = validos.reduce((soma, p) => soma + Number(p.correnteA) * Number(p.distanciaM), 0)
  return { correnteTotalA, somaCorrenteDistanciaAm, comprimentoM: somaCorrenteDistanciaAm / correnteTotalA }
}

// Queda de tensão do alimentador por cálculo FASORIAL, fase a fase, com o neutro explícito — vale
// para qualquer carga (desequilibrada, cosφ ≠ 1, capacitiva) sem a hipótese de "trifásico
// equilibrado" de `calcularQuedaPercentual`. A tensão fase-neutro na carga é
//   V_carga,i = V_fonte,i − Z_f·I_i − Z_n·(ΣI_j)
// (a corrente de retorno ΣI_j volta pelo neutro e eleva o potencial do neutro na carga). Com carga
// equilibrada ΣI = 0 e o neutro não pesa; num circuito monofásico (ΣI = I) vira (Z_f + Z_n)·I, o
// mesmo "ida e volta" do caso a 2 condutores. A queda reportada é a da PIOR fase,
// (|V_fonte| − |V_carga|)/|V_fonte| — módulo exato, sem a aproximação R·cosφ + X·senφ.
// `fasores`: corrente de cada fase em A (re/im, sentido fonte→carga), da `calcularCorrentesVetoriais`.
// `impedancia` (r e x em Ω/km) substitui R e X de tabela, para fase e neutro.
export function calcularQuedaAlimentadorFasorial({
  fasores,
  tensaoFaseNeutroV,
  comprimentoM,
  secaoFaseMm2,
  secaoNeutroMm2,
  isolacao = 'pvc',
  convencao = CONVENCAO_RESISTIVIDADE_PADRAO,
  impedancia = null,
}) {
  if ((!impedancia && (!secaoFaseMm2 || !secaoNeutroMm2)) || !tensaoFaseNeutroV || !fasores?.length) return null
  const impedanciaPorMetro = (secao) =>
    impedancia
      ? { re: Number(impedancia.rOhmKm) / 1000, im: Number(impedancia.xOhmKm) / 1000 }
      : { re: 1 / (condutividadeCobre(isolacao, convencao) * secao), im: reatanciaConsiderada(secao, convencao) }
  const zf = impedanciaPorMetro(secaoFaseMm2)
  const zn = impedanciaPorMetro(secaoNeutroMm2)
  const zFase = { re: zf.re * comprimentoM, im: zf.im * comprimentoM }
  const zNeutro = { re: zn.re * comprimentoM, im: zn.im * comprimentoM }
  const produto = (z, i) => ({ re: z.re * i.re - z.im * i.im, im: z.re * i.im + z.im * i.re })
  const retorno = fasores.reduce((total, i) => ({ re: total.re + i.re, im: total.im + i.im }), { re: 0, im: 0 })
  const dropNeutro = produto(zNeutro, retorno)

  let pior = 0
  fasores.forEach((corrente, indice) => {
    const angulo = (ANGULO_FASE_GRAUS[indice] * Math.PI) / 180
    const dropFase = produto(zFase, corrente)
    const carga = {
      re: tensaoFaseNeutroV * Math.cos(angulo) - dropFase.re - dropNeutro.re,
      im: tensaoFaseNeutroV * Math.sin(angulo) - dropFase.im - dropNeutro.im,
    }
    pior = Math.max(pior, ((tensaoFaseNeutroV - Math.hypot(carga.re, carga.im)) / tensaoFaseNeutroV) * 100)
  })
  return pior
}
