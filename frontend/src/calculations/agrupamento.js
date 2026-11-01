import { SECOES_NOMINAIS_MM2 } from './constantes.js'

// Maneiras de instalar (NBR 5410, Tabela 33) → método de referência. Só as que o compilado (semana 4 §2)
// enquadra em A1, A2, B1, B2, C e D — instalação residencial com cobre. Primeiro identifica-se a maneira
// real; só então vale o método de referência (os números 1, 7, 11, 61... são maneiras; A1 a G são modelos
// térmicos). "Alvenaria comum" não é "parede termicamente isolante": a maneira 7 é B1, não A1.
export const MANEIRAS_INSTALAR = [
  { codigo: '1', metodo: 'A1', descricao: 'Condutores isolados ou cabos unipolares em eletroduto de seção circular embutido em parede termicamente isolante' },
  { codigo: '71', metodo: 'A1', descricao: 'Condutores isolados ou cabos unipolares em moldura' },
  { codigo: '73', metodo: 'A1', descricao: 'Condutores isolados em eletroduto, cabos unipolares ou cabo multipolar embutido(s) em caixilho de porta' },
  { codigo: '74', metodo: 'A1', descricao: 'Condutores isolados em eletroduto, cabos unipolares ou cabo multipolar embutido(s) em caixilho de janela' },
  { codigo: '2', metodo: 'A2', descricao: 'Cabo multipolar em eletroduto de seção circular embutido em parede termicamente isolante' },
  { codigo: '3', metodo: 'B1', descricao: 'Condutores isolados ou cabos unipolares em eletroduto aparente de seção circular sobre parede ou espaçado desta menos de 0,3 vez o diâmetro do eletroduto' },
  { codigo: '5', metodo: 'B1', descricao: 'Condutores isolados ou cabos unipolares em eletroduto aparente de seção não-circular sobre parede' },
  { codigo: '7', metodo: 'B1', descricao: 'Condutores isolados ou cabos unipolares em eletroduto de seção circular embutido em alvenaria (o caso mais comum)' },
  { codigo: '4', metodo: 'B2', descricao: 'Cabo multipolar em eletroduto aparente de seção circular sobre parede ou espaçado desta menos de 0,3 vez o diâmetro do eletroduto' },
  { codigo: '6', metodo: 'B2', descricao: 'Cabo multipolar em eletroduto aparente de seção não-circular sobre parede' },
  { codigo: '8', metodo: 'B2', descricao: 'Cabo multipolar em eletroduto de seção circular embutido em alvenaria' },
  { codigo: '11', metodo: 'C', descricao: 'Cabos unipolares ou cabo multipolar sobre parede ou espaçado desta menos de 0,3 vez o diâmetro do cabo', arranjo: 'parede' },
  { codigo: '11A', metodo: 'C', descricao: 'Cabos unipolares ou cabo multipolar fixado diretamente no teto', arranjo: 'teto' },
  { codigo: '12', metodo: 'C', descricao: 'Cabos unipolares ou cabo multipolar em bandeja não-perfurada, perfilado ou prateleira', arranjo: 'parede' },
  { codigo: '52', metodo: 'C', descricao: 'Cabos unipolares ou cabo multipolar embutido(s) diretamente em alvenaria sem proteção mecânica adicional', arranjo: 'parede' },
  { codigo: '53', metodo: 'C', descricao: 'Cabos unipolares ou cabo multipolar embutido(s) diretamente em alvenaria com proteção mecânica adicional', arranjo: 'parede' },
  { codigo: '61', metodo: 'D', descricao: 'Cabo multipolar em eletroduto (de seção circular ou não) ou em canaleta não-ventilada enterrado(a)' },
  { codigo: '61A', metodo: 'D', descricao: 'Cabos unipolares em eletroduto (de seção circular ou não) ou em canaleta não-ventilada enterrado(a)' },
  { codigo: '63', metodo: 'D', descricao: 'Cabos unipolares ou cabo multipolar diretamente enterrado(s), com proteção mecânica adicional' },
]
export const MANEIRA_PADRAO = '7'
export const metodoDaManeira = (codigo) => MANEIRAS_INSTALAR.find((m) => m.codigo === codigo)?.metodo ?? null

// Formas de agrupamento (K2): cada uma aponta a tabela da NBR 5410 que vale e os métodos compatíveis.
export const FORMAS_AGRUPAMENTO = {
  feixe: { label: 'Em feixe, embutido ou em conduto fechado — Tabela 42, linha 1', metodos: ['A1', 'A2', 'B1', 'B2'] },
  'camada-parede': { label: 'Camada única sobre parede, piso ou bandeja não perfurada — Tabela 42, linha 2', metodos: ['C'] },
  'camada-teto': { label: 'Camada única no teto — Tabela 42, linha 3', metodos: ['C'] },
  multicamadas: { label: 'Mais de uma camada — Tabela 43', metodos: ['C'] },
  'enterrado-direto': { label: 'Cabos diretamente enterrados — Tabela 44', metodos: ['D'] },
  'enterrado-eletroduto': { label: 'Cabos em eletrodutos enterrados — Tabela 45', metodos: ['D'] },
}

// Tabela 42, linha 1 (feixe): vem de constantes.js. Linha 2 (camada em parede, método C) idem. Linha 3 (teto):
const TAB42_TETO = [[1, 0.95], [2, 0.81], [3, 0.72], [4, 0.68], [5, 0.66], [6, 0.64], [7, 0.63], [8, 0.62], [Infinity, 0.61]]
const TAB42_FEIXE = [[1, 1], [2, 0.8], [3, 0.7], [4, 0.65], [5, 0.6], [6, 0.57], [7, 0.54], [8, 0.52], [11, 0.5], [15, 0.45], [19, 0.41], [Infinity, 0.38]]
const TAB42_PAREDE = [[1, 1], [2, 0.85], [3, 0.79], [4, 0.75], [5, 0.73], [6, 0.72], [7, 0.72], [8, 0.71], [Infinity, 0.7]]
// Tabela 43: linhas = camadas (2, 3, 4-5, 6-8, ≥9); colunas = circuitos por camada (2, 3, 4-5, 6-8, ≥9).
const TAB43 = [
  [0.68, 0.62, 0.6, 0.58, 0.56],
  [0.62, 0.57, 0.55, 0.53, 0.51],
  [0.6, 0.55, 0.52, 0.51, 0.49],
  [0.58, 0.53, 0.51, 0.49, 0.48],
  [0.56, 0.51, 0.49, 0.48, 0.46],
]
const indiceTab43 = (n) => (n < 2 ? null : n === 2 ? 0 : n === 3 ? 1 : n <= 5 ? 2 : n <= 8 ? 3 : 4)
// Tabela 44 (diretamente enterrados), n = 2..6; colunas = distância entre cabos: nula, 1 diâmetro, 0,125 m, 0,25 m, 0,5 m.
export const ESPACAMENTOS_TAB44 = ['nula', '1-diametro', '0.125', '0.25', '0.5']
const TAB44 = [
  [0.75, 0.8, 0.85, 0.9, 0.9],
  [0.65, 0.7, 0.75, 0.8, 0.85],
  [0.6, 0.6, 0.7, 0.75, 0.8],
  [0.55, 0.55, 0.65, 0.7, 0.8],
  [0.5, 0.55, 0.6, 0.7, 0.8],
]
// Tabela 45 (eletrodutos enterrados), n = 2..6; colunas = espaçamento: nulo, 0,25 m, 0,5 m, 1,0 m.
export const ESPACAMENTOS_TAB45 = ['nulo', '0.25', '0.5', '1.0']
const TAB45_MULTIPOLAR = [
  [0.85, 0.9, 0.95, 0.95],
  [0.75, 0.85, 0.9, 0.95],
  [0.7, 0.8, 0.85, 0.9],
  [0.65, 0.8, 0.85, 0.9],
  [0.6, 0.8, 0.8, 0.8],
]
const TAB45_UNIPOLAR = [
  [0.8, 0.9, 0.9, 0.95],
  [0.7, 0.8, 0.85, 0.9],
  [0.65, 0.75, 0.8, 0.9],
  [0.6, 0.7, 0.8, 0.9],
  [0.6, 0.7, 0.8, 0.9],
]
const porFaixa = (tabela, n) => tabela.find(([ate]) => n <= ate)?.[1] ?? null

// 6.2.5.5.5 — grupo NÃO semelhante (seções fora de três valores normalizados sucessivos, ou isolações de
// temperaturas diferentes): quando o cálculo específico não é viável, F = 1/√n substitui o fator de
// agrupamento (não se multiplica por outro K2 para o mesmo efeito).
export const fatorGrupoNaoSemelhante = (n) => (n >= 1 ? 1 / Math.sqrt(n) : null)

// 6.2.5.5.1 e 6.2.10.2 — as seções de fase do grupo devem ficar em até três valores normalizados sucessivos.
export function secoesDentroDeTresValores(secoes) {
  const indices = secoes.map((s) => SECOES_NOMINAIS_MM2.indexOf(s)).filter((i) => i >= 0)
  return indices.length === 0 || Math.max(...indices) - Math.min(...indices) <= 2
}

// K2 de um grupo. `n` = nº de circuitos (ou cabos multipolares) do grupo, sem os excluídos. Fora do alcance
// de qualquer tabela → null (não verificado), nunca o último valor repetido. Para 'multicamadas', n é o
// nº de circuitos por camada. A contagem NÃO é o nº de fios dentro do eletroduto (S5 §3).
export function fatorAgrupamentoGrupo({ forma = 'feixe', n, espacamento, camadas, multipolar = false, homogeneo = true }) {
  if (!(n >= 1)) return null
  if (!homogeneo) return fatorGrupoNaoSemelhante(n)
  switch (forma) {
    case 'feixe': return porFaixa(TAB42_FEIXE, n)
    case 'camada-parede': return porFaixa(TAB42_PAREDE, n)
    case 'camada-teto': return porFaixa(TAB42_TETO, n)
    case 'multicamadas': {
      const linha = indiceTab43(Number(camadas))
      const coluna = indiceTab43(n)
      return linha === null || coluna === null ? null : TAB43[linha][coluna]
    }
    case 'enterrado-direto': {
      if (n === 1) return 1
      const coluna = ESPACAMENTOS_TAB44.indexOf(espacamento ?? 'nula')
      return n > 6 || coluna < 0 ? null : TAB44[n - 2][coluna]
    }
    case 'enterrado-eletroduto': {
      if (n === 1) return 1
      const coluna = ESPACAMENTOS_TAB45.indexOf(espacamento ?? 'nulo')
      const tabela = multipolar ? TAB45_MULTIPOLAR : TAB45_UNIPOLAR
      return n > 6 || coluna < 0 ? null : tabela[n - 2][coluna]
    }
    default: return null
  }
}

// Resolve os grupos de agrupamento definidos no projeto: K2 por circuito (para `dimensionarCircuitos`) e os
// problemas de cadastro. `secoesPorId` (opcional, de uma 1ª passada) detecta grupo não semelhante.
export function resolverAgrupamentos(agrupamentos = [], circuitos, metodoPorId = {}, secoesPorId = null) {
  const fatores = {}
  const resultados = []
  const idsExistentes = new Set(circuitos.map((c) => c.id))
  const jaEmGrupo = new Set()
  for (const grupo of agrupamentos) {
    const ids = (grupo.circuitoIds ?? []).filter((id) => idsExistentes.has(id) && !jaEmGrupo.has(id))
    ids.forEach((id) => jaEmGrupo.add(id))
    const excluidos = ids.filter((id) => (grupo.excluidos ?? []).includes(id))
    const contados = ids.filter((id) => !excluidos.includes(id))
    const problemas = []
    const forma = FORMAS_AGRUPAMENTO[grupo.forma] ? grupo.forma : 'feixe'
    const incompativeis = ids.filter((id) => !FORMAS_AGRUPAMENTO[forma].metodos.includes(metodoPorId[id] ?? 'B1'))
    if (incompativeis.length) problemas.push(`forma de agrupamento "${forma}" incompatível com o método de instalação de ${incompativeis.length} circuito(s) do grupo`)
    const secoes = secoesPorId ? contados.map((id) => secoesPorId[id]).filter(Boolean) : []
    const semelhante = grupo.homogeneo === false ? false : secoesDentroDeTresValores(secoes)
    if (!semelhante && grupo.homogeneo !== false) problemas.push('seções de fase fora de três valores normalizados sucessivos (6.2.5.5.5 / 6.2.10.2): grupo não semelhante, vale F = 1/√n')
    const base = { forma, espacamento: grupo.espacamento, camadas: grupo.camadas, multipolar: grupo.multipolar, homogeneo: semelhante }
    const n = forma === 'multicamadas' ? Number(grupo.circuitosPorCamada) || contados.length : contados.length
    const fator = fatorAgrupamentoGrupo({ ...base, n })
    const fatorExcluido = fatorAgrupamentoGrupo({ ...base, n: forma === 'multicamadas' ? n : ids.length })
    contados.forEach((id) => { fatores[id] = fator })
    excluidos.forEach((id) => { fatores[id] = fatorExcluido })
    resultados.push({ id: grupo.id, nome: grupo.nome, forma, n, circuitoIds: ids, excluidos, fator, semelhante, problemas, eletroduto: Boolean(grupo.eletroduto) })
  }
  return { fatores, resultados }
}

