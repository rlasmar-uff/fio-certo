import { ISOLACOES, obterReatanciaOhmMetro } from './constantes.js'

// Queda de tensão considerando resistência E reatância do condutor — não só a componente
// resistiva (que só seria exata para cosφ = 1). ΔV% = ΔV / V × 100, com sinal de X positivo
// para carga indutiva (atrasada) e negativo para capacitiva (adiantada); para cosφ = 1
// (resistiva), a parcela de X some.
//
// Circuito monofásico/fase-fase (2 condutores, ida e volta): ΔV = 2·L·I·(R·cosφ + X·senφ).
// Circuito trifásico equilibrado (`circuitoTrifasico=true`, usado só pelo alimentador em
// instalação trifásica): ΔV = √3·L·I·(...)/V_ff, que — referida à tensão fase-neutro já usada
// para `correnteA` e `tensaoV` neste caso — se reduz a L·I·(...)/V_fn: fator efetivo 1, não 2,
// porque não existe um condutor de retorno dedicado carregando a corrente inteira.
//
// A resistência usa a condutividade do cobre NA TEMPERATURA DE OPERAÇÃO do condutor (70°C para
// PVC, 90°C para EPR/XLPE — ver `ISOLACOES`), não a 20°C: usar 20°C subestima a queda em ~20%.
// Isso é independente da temperatura AMBIENTE (que afeta a ampacidade via FCT/Tabela 40) — são
// duas temperaturas diferentes, uma do CONDUTOR (fixa, da isolação) e outra do AMBIENTE (varia
// com a instalação real). A reatância varia por SEÇÃO (`obterReatanciaOhmMetro`, ver
// constantes.js), não por isolação — a diferença fica abaixo da resolução da fonte externa usada.
//
// Assinatura por objeto (não posicional): a lista de parâmetros já tinha 7 itens antes de
// `isolacao` entrar — mais um posicional ficaria ilegível nos pontos de chamada.
export function calcularQuedaPercentual({
  comprimentoM,
  correnteA,
  secaoMm2,
  tensaoV,
  cosPhi = 1,
  tipoCarga = 'resistiva',
  circuitoTrifasico = false,
  isolacao = 'pvc',
}) {
  if (!secaoMm2 || !tensaoV) return null

  const condutividade = ISOLACOES[isolacao]?.condutividade ?? ISOLACOES.pvc.condutividade
  const resistenciaPorMetro = 1 / (condutividade * secaoMm2)
  const reatanciaPorMetro = obterReatanciaOhmMetro(secaoMm2)
  const senPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi))
  const sinalReativo = tipoCarga === 'capacitiva' ? -1 : 1
  const quedaPorMetro = resistenciaPorMetro * cosPhi + sinalReativo * reatanciaPorMetro * senPhi

  const fatorCircuito = circuitoTrifasico ? 1 : 2
  const quedaV = fatorCircuito * comprimentoM * correnteA * quedaPorMetro
  return (quedaV / tensaoV) * 100
}

