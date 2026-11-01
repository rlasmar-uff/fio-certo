import { obterFatorTemperatura } from './constantes.js'

// Métodos de referência E, F e G (ao ar livre; Tabelas 38 e 39 da NBR 5410) — CONSULTA de capacidade de condução
// de corrente para cobre (compilado, semana 4 §5). Não fazem parte do dimensionamento residencial (instalação ao ar
// livre em bandeja, leito ou espaçada é de uso industrial/comercial); o alumínio fica de fora porque o compilado
// manda o site residencial adotar cobre. Colunas: E/2, E/3 (multipolares), F justapostos (2), F trifólio (3), F plano
// justaposto (3), G espaçados horizontal (3), G espaçados vertical (3). Temperatura de referência: 30 °C no ar.
export const FORMACOES_EFG = {
  'E-2': { indice: 0, label: 'E — cabo multipolar, 2 condutores carregados' },
  'E-3': { indice: 1, label: 'E — cabo multipolar, 3 condutores carregados' },
  'F-2': { indice: 2, label: 'F — unipolares justapostos, 2 carregados' },
  'F-trifolio': { indice: 3, label: 'F — 3 carregados em trifólio' },
  'F-plano': { indice: 4, label: 'F — 3 carregados no mesmo plano, justapostos' },
  'G-horizontal': { indice: 5, label: 'G — 3 carregados espaçados, plano horizontal' },
  'G-vertical': { indice: 6, label: 'G — 3 carregados espaçados, plano vertical' },
}
export const TABELA_38_COBRE_PVC = [
  [ 1.5,   22, 18.5,   22,   17,   18,   24,   21],
  [ 2.5,   30,   25,   31,   24,   25,   34,   29],
  [   4,   40,   34,   41,   33,   34,   45,   39],
  [   6,   51,   43,   53,   43,   45,   59,   51],
  [  10,   70,   60,   73,   60,   63,   81,   71],
  [  16,   94,   80,   99,   82,   85,  110,   97],
  [  25,  119,  101,  131,  110,  114,  146,  130],
  [  35,  148,  126,  162,  137,  143,  181,  162],
  [  50,  180,  153,  196,  167,  174,  219,  197],
  [  70,  232,  196,  251,  216,  225,  281,  254],
  [  95,  282,  238,  304,  264,  275,  341,  311],
  [ 120,  328,  276,  352,  308,  321,  396,  362],
  [ 150,  379,  319,  406,  356,  372,  456,  419],
  [ 185,  434,  364,  463,  409,  427,  521,  480],
  [ 240,  514,  430,  546,  485,  507,  615,  569],
]
export const TABELA_39_COBRE_EPR = [
  [ 1.5,   26,   23,   27,   21,   22,   30,   25],
  [ 2.5,   36,   32,   37,   29,   30,   41,   35],
  [   4,   49,   42,   50,   40,   42,   56,   48],
  [   6,   63,   54,   65,   53,   55,   73,   63],
  [  10,   86,   75,   90,   74,   77,  101,   88],
  [  16,  115,  100,  121,  101,  105,  137,  120],
  [  25,  149,  127,  161,  135,  141,  182,  161],
  [  35,  185,  158,  200,  169,  176,  226,  201],
  [  50,  225,  192,  242,  207,  216,  275,  246],
  [  70,  289,  246,  310,  268,  279,  353,  318],
  [  95,  352,  298,  377,  328,  342,  430,  389],
  [ 120,  410,  346,  437,  383,  400,  500,  454],
  [ 150,  473,  399,  504,  444,  464,  577,  527],
  [ 185,  542,  456,  575,  510,  533,  661,  605],
  [ 240,  641,  538,  679,  607,  634,  781,  719],
]

// Capacidade tabelada (antes das correções), em A. null = combinação sem valor tabelado.
export function consultarCapacidadeEFG({ isolacao = 'pvc', secaoMm2, formacao }) {
  const tabela = isolacao === 'epr' ? TABELA_39_COBRE_EPR : TABELA_38_COBRE_PVC
  const linha = tabela.find((l) => l[0] === secaoMm2)
  const coluna = FORMACOES_EFG[formacao]?.indice
  return linha && coluna !== undefined ? linha[coluna + 1] : null
}

// Iz = Iz,tab × K1 (temperatura do ar, tab. 40) × K2 (agrupamento, informado pelo usuário a partir da tab. 42/43).
export function capacidadeCorrigidaEFG({ isolacao = 'pvc', secaoMm2, formacao, temperaturaC = 30, fatorAgrupamento = 1 }) {
  const tabelada = consultarCapacidadeEFG({ isolacao, secaoMm2, formacao })
  const k1 = obterFatorTemperatura(temperaturaC, { isolacao })
  return tabelada === null || k1 === null ? null : { tabeladaA: tabelada, k1, k2: fatorAgrupamento, corrigidaA: tabelada * k1 * fatorAgrupamento }
}
