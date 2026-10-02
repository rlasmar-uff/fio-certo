import { TIPOS_COMODO, potenciaTugPorPonto } from './constantes.js'

// NBR 5410 §9.5.2.1.2 — carga MÍNIMA de iluminação:
// até 6 m²: 100VA fixos. Acima de 6 m²: 100VA + 60VA a cada 4 m² INTEIROS adicionais — "4 m²
// inteiros" é piso (floor), não teto: só o incremento completo conta (diferente da contagem de
// pontos de tomada do §9.5.2.2.1, que usa "ou fração" = teto/ceil — não confundir as duas regras).
// A norma regula só essa potência total — ela não define quantidade de pontos nem
// potência por ponto de iluminação (isso é decisão de projeto, não normativa).
export function calcularIluminacaoMinimaVA(area) {
  if (area <= 6) return 100
  const areaAdicional = area - 6
  const incrementos = Math.floor(areaAdicional / 4)
  return 100 + incrementos * 60
}

// NBR 5410 §9.5.2.2.1 — quantidade MÍNIMA de pontos de tomada (TUG) por cômodo.
// §9.5.2.2.1 e) — "demais cômodos" tem 3 faixas: ≤2,25 m² e 2,25-6 m² dão 1 ponto (a diferença
// entre as duas é só sobre ONDE o ponto pode ficar, algo que esta ferramenta não modela); acima
// de 6 m², 1 ponto por 5 m de perímetro ou fração — mesma regra de "salas e dormitórios".
export function calcularQuantidadeTugMinima(comodo) {
  const config = TIPOS_COMODO[comodo.tipo]

  if (comodo.tipo === 'outro') {
    const area = Number(comodo.area) || 0
    if (area <= 6) return 1
    const perimetro = Number(comodo.perimetro) || 0
    if (perimetro <= 0) return 1
    return Math.max(1, Math.ceil(perimetro / config.tugPorMetroPerimetro))
  }

  if (config.tugFixa !== undefined) return config.tugFixa
  const perimetro = Number(comodo.perimetro) || 0
  if (perimetro <= 0) return 1
  return Math.max(1, Math.ceil(perimetro / config.tugPorMetroPerimetro))
}

function somarTugPorQuantidade(quantidade, potenciaBase, limite600VA = 3) {
  let total = 0
  for (let indice = 0; indice < quantidade; indice += 1) {
    total += potenciaTugPorPonto(indice, potenciaBase, limite600VA)
  }
  return total
}

// NBR 5410 §9.5.2.2.2 — potência MÍNIMA total dos pontos de tomada (TUG) de um cômodo.
// `limite600VA` (2 ou 3) vem de `calcularLimite600VA` — depende do projeto inteiro, não só
// deste cômodo, por isso é recebido de fora em vez de fixo.
export function calcularTugMinima(comodo, limite600VA = 3) {
  const config = TIPOS_COMODO[comodo.tipo]
  const quantidade = calcularQuantidadeTugMinima(comodo)
  return { quantidade, totalVA: somarTugPorQuantidade(quantidade, config.tugPotenciaBase, limite600VA) }
}

function valorManualInformado(valor) {
  return valor !== '' && valor !== null && valor !== undefined && !Number.isNaN(Number(valor))
}

// Total de pontos de tomada nos ambientes de 600 VA (banheiros, cozinhas, copas, áreas de
// serviço e análogos) do projeto inteiro — é essa contagem que decide se a alternativa
// permissiva do §9.5.2.2.2 a) chega a ter algum efeito (só acima de 6). Exportada à parte para a
// UI poder decidir se mostra a opção, sem duplicar a conta.
export function contarPontos600VA(comodos) {
  return comodos.reduce((total, comodo) => {
    const config = TIPOS_COMODO[comodo.tipo]
    if (config?.tugPotenciaBase !== 600) return total
    const quantidade = valorManualInformado(comodo.tugPontos)
      ? Number(comodo.tugPontos)
      : calcularQuantidadeTugMinima(comodo)
    return total + quantidade
  }, 0)
}

// NBR 5410 §9.5.2.2.2 a) — banheiros, cozinhas, copas, áreas de serviço e análogos usam 600VA
// até 3 pontos por ambiente; MAS quando o total de tomadas no CONJUNTO desses ambientes (no
// projeto inteiro) passar de 6, a norma ADMITE 600VA até apenas 2 pontos em cada um deles. É uma
// alternativa PERMISSIVA — a norma diz "admite-se", não "deve" — e a leitura "sempre 3" continua
// válida e é mais conservadora.
//
// `aplicarAlternativa` (default `false`) é uma escolha explícita do usuário (ver
// `projeto.aplicarAlternativa600VA`, mesmo padrão de opt-in de `neutroReduzidoDeclarado`), não
// um comportamento automático: até 30/09/2026 a troca para 2 pontos acontecia sozinha sempre que
// o total passava de 6, reduzindo a carga prevista sem que quem assina o projeto soubesse que a
// ferramenta tinha escolhido a leitura permissiva.
export function calcularLimite600VA(comodos, aplicarAlternativa = false) {
  if (!aplicarAlternativa) return 3
  return contarPontos600VA(comodos) > 6 ? 2 : 3
}

// Soma a potência APARENTE (VA) dos equipamentos — para carga resistiva (cosφ = 1) isso
// coincide com a potência ativa (W) do equipamento; para motores/compressores (cosφ < 1),
// a potência aparente é maior, pois é ela que determina a corrente real do circuito.
export function calcularTueVA(comodo) {
  return (comodo.tue ?? []).reduce((total, equipamento) => {
    const quantidade = Number(equipamento.quantidade) || 1
    const potenciaAtivaW = Number(equipamento.potenciaW) || 0
    const cosPhi = Number(equipamento.cosPhi) || 1
    const potenciaVA = cosPhi > 0 ? potenciaAtivaW / cosPhi : potenciaAtivaW
    return total + quantidade * potenciaVA
  }, 0)
}

export function calcularCargaComodo(comodo, limite600VA = 3) {
  const area = Number(comodo.area) || 0

  const iluminacaoMinimaVA = calcularIluminacaoMinimaVA(area)
  const iluminacaoManual =
    valorManualInformado(comodo.iluminacaoQuantidade) && valorManualInformado(comodo.iluminacaoPotenciaUnitariaW)
  const iluminacaoQuantidade = iluminacaoManual ? Number(comodo.iluminacaoQuantidade) : null
  const iluminacaoPotenciaUnitariaW = iluminacaoManual ? Number(comodo.iluminacaoPotenciaUnitariaW) : null
  const iluminacaoVA = iluminacaoManual
    ? iluminacaoQuantidade * iluminacaoPotenciaUnitariaW
    : iluminacaoMinimaVA
  const iluminacaoAbaixoDoMinimo = iluminacaoManual && iluminacaoVA < iluminacaoMinimaVA

  const tugMinima = calcularTugMinima(comodo, limite600VA)
  const tugManual = valorManualInformado(comodo.tugPontos)
  const tugQuantidade = tugManual ? Number(comodo.tugPontos) : tugMinima.quantidade
  const tugVA = tugManual
    ? somarTugPorQuantidade(tugQuantidade, TIPOS_COMODO[comodo.tipo].tugPotenciaBase, limite600VA)
    : tugMinima.totalVA
  const tugAbaixoDoMinimo = tugManual && tugQuantidade < tugMinima.quantidade

  const tueVA = calcularTueVA(comodo)

  return {
    comodoId: comodo.id,
    nome: comodo.nome,
    tipo: comodo.tipo,
    area,
    iluminacaoVA,
    iluminacaoMinimaVA,
    iluminacaoAbaixoDoMinimo,
    tugQuantidade,
    tugVA,
    tugQuantidadeMinima: tugMinima.quantidade,
    tugAbaixoDoMinimo,
    tueVA,
    totalVA: iluminacaoVA + tugVA + tueVA,
  }
}

export function calcularPrevisaoDeCarga(comodos, aplicarAlternativa600VA = false) {
  const limite600VA = calcularLimite600VA(comodos, aplicarAlternativa600VA)
  const porComodo = comodos.map((comodo) => calcularCargaComodo(comodo, limite600VA))
  const totais = porComodo.reduce(
    (acc, item) => ({
      iluminacaoVA: acc.iluminacaoVA + item.iluminacaoVA,
      tugVA: acc.tugVA + item.tugVA,
      tueVA: acc.tueVA + item.tueVA,
      totalVA: acc.totalVA + item.totalVA,
    }),
    { iluminacaoVA: 0, tugVA: 0, tueVA: 0, totalVA: 0 },
  )

  return { porComodo, totais }
}
